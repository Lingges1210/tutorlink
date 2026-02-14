import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

/** ---------- helpers ---------- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

function toMinutes(hhmm: string) {
  if (!hhmm || hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function getDayKey(d: Date): DayKey {
  const map: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return map[d.getDay()];
}

function parseAvailability(raw: string | null | undefined): DayAvailability[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as DayAvailability[];
  } catch {
    return null;
  }
}

/**
 * Check if availability JSON covers the whole interval [start,end)
 * - local-time based (datetime-local)
 * - only same-day sessions (simple)
 */
function isWithinAvailability(
  availabilityJson: string | null | undefined,
  start: Date,
  end: Date
) {
  const avail = parseAvailability(availabilityJson);
  if (!avail) return false;

  const startDay = getDayKey(start);
  const endDay = getDayKey(end);
  if (startDay !== endDay) return false;

  const day = avail.find((x) => x?.day === startDay);
  if (!day || day.off) return false;
  if (!Array.isArray(day.slots) || day.slots.length === 0) return false;

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();

  return day.slots.some((s) => {
    const a = toMinutes(s.start);
    const b = toMinutes(s.end);
    return startMin >= a && endMin <= b;
  });
}

function pickRandom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns list of tutorIds who:
 * - teach this subject
 * - are approved + verified + active
 * - declared available for this time
 * - have no overlap with their existing sessions
 */
async function getFreeTutorsForSlot(opts: {
  subjectId: string;
  start: Date;
  end: Date;
}) {
  const { subjectId, start, end } = opts;

  // 1) candidates who can teach subject
  const candidates = await prisma.tutorSubject.findMany({
    where: {
      subjectId,
      tutor: {
        isTutorApproved: true,
        verificationStatus: "AUTO_VERIFIED",
        isDeactivated: false,
      },
    },
    select: {
      tutorId: true,
      tutor: {
        select: {
          tutorApplications: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { availability: true, status: true },
          },
        },
      },
    },
  });

  if (candidates.length === 0) return [];

  // 2) filter by availability first
  const availOkTutorIds = candidates
    .filter((c) => {
      const app = c.tutor.tutorApplications?.[0];
      if (!app || app.status !== "APPROVED") return false;
      return isWithinAvailability(app.availability, start, end);
    })
    .map((c) => c.tutorId);

  const tutorIds = Array.from(new Set(availOkTutorIds));
  if (tutorIds.length === 0) return [];

  // 3) remove overlaps in one query
  const clashes = await prisma.session.findMany({
    where: {
      tutorId: { in: tutorIds },
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: end },
      // endsAt must exist; fallback to duration if endsAt missing
    },
    select: { tutorId: true, scheduledAt: true, endsAt: true, durationMin: true },
  });

  const clashSet = new Set<string>();

  for (const s of clashes) {
    const sStart = new Date(s.scheduledAt);
    const sEnd = s.endsAt
      ? new Date(s.endsAt)
      : new Date(sStart.getTime() + (s.durationMin ?? 60) * 60_000);

    // overlap: start < sEnd && end > sStart
    if (start < sEnd && end > sStart) {
      if (s.tutorId) clashSet.add(s.tutorId);
    }
  }

  return tutorIds.filter((tid) => !clashSet.has(tid));
}

/**
 * Fair-ish selection:
 * - choose among free tutors
 * - prefer tutors with fewer upcoming active sessions (load)
 * - tie-break random
 */
async function chooseTutorFairly(freeTutorIds: string[], start: Date) {
  if (freeTutorIds.length === 1) return freeTutorIds[0];

  const horizon = new Date(start.getTime() + 7 * 24 * 60 * 60_000);

  const loads = await prisma.session.groupBy({
    by: ["tutorId"],
    where: {
      tutorId: { in: freeTutorIds },
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { gte: start, lt: horizon },
    },
    _count: { _all: true },
  });

  const loadMap = new Map<string, number>();
  for (const tid of freeTutorIds) loadMap.set(tid, 0);
  for (const row of loads) {
    if (row.tutorId) loadMap.set(row.tutorId, row._count._all);
  }

  const minLoad = Math.min(...freeTutorIds.map((t) => loadMap.get(t) ?? 0));
  const leastLoaded = freeTutorIds.filter((t) => (loadMap.get(t) ?? 0) === minLoad);

  return pickRandom(leastLoaded);
}

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ message: "Not verified" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : null;
  const scheduledAtRaw = typeof body.scheduledAt === "string" ? body.scheduledAt : null;

  const durationMinRaw = Number(body.durationMin);
  const durationMin = Number.isFinite(durationMinRaw) ? clamp(durationMinRaw, 30, 180) : 60;

  if (!subjectId || !scheduledAtRaw) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  }

  // too soon / past
  if (scheduledAt.getTime() < Date.now() + 5 * 60_000) {
    return NextResponse.json(
      { message: "Choose a time at least 5 minutes from now." },
      { status: 400 }
    );
  }

  const endsAt = new Date(scheduledAt.getTime() + durationMin * 60_000);

  // 1) student overlap check
  const studentClash = await prisma.session.findFirst({
    where: {
      studentId: dbUser.id,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: endsAt },
      endsAt: { gt: scheduledAt },
    },
    select: { id: true },
  });

  if (studentClash) {
    return NextResponse.json(
      { message: "You already have a booking that overlaps this time." },
      { status: 409 }
    );
  }

  // 2) re-check free tutors (race-condition safe)
  const freeTutorIds = await getFreeTutorsForSlot({
    subjectId,
    start: scheduledAt,
    end: endsAt,
  });

  if (freeTutorIds.length === 0) {
    return NextResponse.json(
      { message: "That slot is no longer available. Please refresh and pick another slot." },
      { status: 409 }
    );
  }

  const tutorId = await chooseTutorFairly(freeTutorIds, scheduledAt);

  // 3) create session (assigned instantly)
  const created = await prisma.session.create({
    data: {
      studentId: dbUser.id,
      tutorId,
      subjectId,
      scheduledAt,
      durationMin,
      endsAt,
      status: "PENDING",
    },
    select: { id: true, tutorId: true },
  });

  return NextResponse.json({
    success: true,
    id: created.id,
    assigned: true,
  });
}
