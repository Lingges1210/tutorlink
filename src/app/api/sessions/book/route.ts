import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

//  ADD: booking notification helper (adjust path/name to match your existing notifier)
import { notify } from "@/lib/notify";

/** ---------- availability types ---------- */
type DayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

const DAY_KEYS: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function toMinutes(hhmm: string) {
  if (!hhmm) return 0;
  if (hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

function dayKeyFromDate(d: Date): DayKey {
  return DAY_KEYS[d.getDay()];
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

function parseAvailability(raw: unknown): DayAvailability[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const cleaned: DayAvailability[] = parsed
      .filter(Boolean)
      .map((x: any) => ({
        day: x.day,
        off: !!x.off,
        slots: Array.isArray(x.slots) ? x.slots : [],
      }))
      .filter((x: any) => DAY_KEYS.includes(x.day));

    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

/**
 * Availability stored in TutorApplication.availability (your schema).
 * Use latest application record for the tutor.
 */
async function getTutorAvailabilityFromDB(tutorId: string): Promise<DayAvailability[] | null> {
  const row = await prisma.tutorApplication.findFirst({
    where: { userId: tutorId },
    orderBy: { createdAt: "desc" },
    select: { availability: true },
  });

  return parseAvailability(row?.availability ?? null);
}

/** Must fully fit inside one slot */
function tutorDeclaredAvailable(avail: DayAvailability[], start: Date, end: Date): boolean {
  // enforce same-day (your system should do sessions within a day)
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (!sameDay) return false;

  const dk = dayKeyFromDate(start);
  const day = avail.find((d) => d.day === dk);
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

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true, verificationStatus: true },
  });

  if (!dbUser || dbUser.isDeactivated) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  if (dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ success: false, message: "Not verified" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : null;
  const scheduledAtRaw = typeof body.scheduledAt === "string" ? body.scheduledAt : null;
  const durationMinRaw = body.durationMin;

  const durationMin =
    typeof durationMinRaw === "number" && Number.isFinite(durationMinRaw)
      ? Math.min(Math.max(Math.floor(durationMinRaw), 15), 180)
      : 60;

  if (!subjectId || !scheduledAtRaw) {
    return NextResponse.json({ success: false, message: "Missing subjectId / scheduledAt" }, { status: 400 });
  }

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ success: false, message: "Invalid scheduledAt" }, { status: 400 });
  }

  if (scheduledAt.getTime() < Date.now() + 5 * 60_000) {
    return NextResponse.json({ success: false, message: "Choose a time at least 5 minutes from now." }, { status: 400 });
  }

  const endsAt = new Date(scheduledAt.getTime() + durationMin * 60_000);

  // subject exists?
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });

  if (!subject) {
    return NextResponse.json({ success: false, message: "Subject not found" }, { status: 404 });
  }

  // student overlap check
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
      { success: false, message: "You already have another booking that overlaps this time." },
      { status: 409 }
    );
  }

  // Find tutors who teach subject
  const links = await prisma.tutorSubject.findMany({
    where: { subjectId },
    select: { tutorId: true },
  });

  const tutorIds = links.map((x) => x.tutorId);
  if (tutorIds.length === 0) {
    return NextResponse.json({ success: false, message: "No tutors for this subject yet." }, { status: 409 });
  }

  // Approved + verified tutors only
  const tutors = await prisma.user.findMany({
    where: {
      id: { in: tutorIds },
      isTutorApproved: true,
      isDeactivated: false,
      verificationStatus: "AUTO_VERIFIED",
    },
    select: { id: true },
  });

  const eligibleTutorIds = tutors.map((t) => t.id);
  if (eligibleTutorIds.length === 0) {
    return NextResponse.json({ success: false, message: "No eligible tutors available." }, { status: 409 });
  }

  // Load active sessions for tutors around this time (for overlap check + load)
  const tutorActive = await prisma.session.findMany({
    where: {
      tutorId: { in: eligibleTutorIds },
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: endsAt },
      endsAt: { gt: scheduledAt },
    },
    select: { id: true, tutorId: true, scheduledAt: true, endsAt: true, durationMin: true },
  });

  const clashByTutor = new Map<string, boolean>();
  for (const s of tutorActive) {
    if (!s.tutorId) continue;
    // if any row exists in this range => clash
    clashByTutor.set(s.tutorId, true);
  }

  // Filter tutors: availability + no clash
  const availableTutors: string[] = [];
  for (const tutorId of eligibleTutorIds) {
    if (clashByTutor.get(tutorId)) continue;

    const avail = await getTutorAvailabilityFromDB(tutorId);
    if (!avail) continue; // no availability -> not selectable for slot booking model
    if (!tutorDeclaredAvailable(avail, scheduledAt, endsAt)) continue;

    availableTutors.push(tutorId);
  }

  if (availableTutors.length === 0) {
    return NextResponse.json(
      { success: false, message: "That slot is no longer available. Pick another time." },
      { status: 409 }
    );
  }

  // Fair pick: least load (upcoming PENDING/ACCEPTED in next 7 days), then random tie-break
  const loadWindowEnd = new Date(Date.now() + 7 * 24 * 60 * 60_000);

  const loads = await prisma.session.groupBy({
    by: ["tutorId"],
    where: {
      tutorId: { in: availableTutors },
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: loadWindowEnd },
    },
    _count: { _all: true },
  });

  const loadMap = new Map<string, number>();
  for (const r of loads) loadMap.set(r.tutorId as string, r._count._all);

  let minLoad = Infinity;
  for (const t of availableTutors) minLoad = Math.min(minLoad, loadMap.get(t) ?? 0);
  const leastLoaded = availableTutors.filter((t) => (loadMap.get(t) ?? 0) === minLoad);

  const chosenTutorId = leastLoaded[Math.floor(Math.random() * leastLoaded.length)];

  // Create session in a transaction to reduce race issues
  try {
    const created = await prisma.$transaction(async (tx) => {
      // re-check tutor clash inside transaction
      const clash = await tx.session.findFirst({
        where: {
          tutorId: chosenTutorId,
          status: { in: ["PENDING", "ACCEPTED"] },
          scheduledAt: { lt: endsAt },
          endsAt: { gt: scheduledAt },
        },
        select: { id: true },
      });

      if (clash) {
        throw new Error("RACE_CLASH");
      }

      return tx.session.create({
        data: {
          studentId: dbUser.id,
          tutorId: chosenTutorId,
          subjectId,
          scheduledAt,
          endsAt,
          durationMin,
          status: "PENDING", // assigned but awaiting tutor accept
        },
        select: {
          id: true,
          scheduledAt: true,
          endsAt: true,
          durationMin: true,
          status: true,

          //  ADD: ids needed for notifications
          tutorId: true,
          studentId: true,

          tutor: { select: { id: true, name: true, programme: true, avatarUrl: true, email: true } },
          subject: { select: { code: true, title: true } },
        },
      });
    });


    //  ADD: notify after booking is confirmed created
    // (wrapped so booking doesn't fail if notification fails)
    try {
      await notify.user({
        userId: created.tutorId!, //  notify the tutor
        type: "SESSION_BOOKED",
        title: "New booking request",
        body: `${created.subject?.code ?? "Subject"} ${
          created.subject?.title ? `— ${created.subject.title}` : ""
        }\n${new Date(created.scheduledAt).toLocaleString()}`,
        viewer: "TUTOR",
        data: {
          sessionId: created.id,
          studentId: created.studentId,
          tutorId: created.tutorId,
          scheduledAt: created.scheduledAt,
          endsAt: created.endsAt,
          durationMin: created.durationMin,
          subjectCode: created.subject?.code ?? null,
          subjectTitle: created.subject?.title ?? null,
        },
      });
    } catch (err) {
      console.error("notify.user booking failed:", err);
    }

    return NextResponse.json({
      success: true,
      item: {
        ...created,
        assigned: true,
      },
    });

  } catch (e: any) {
    if (String(e?.message) === "RACE_CLASH") {
      return NextResponse.json(
        { success: false, message: "That slot was just taken. Please choose another time." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, message: "Booking failed" }, { status: 500 });
  }
}
