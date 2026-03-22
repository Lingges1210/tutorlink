import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** ---------- Malaysia timezone helpers ---------- */
const MY_TZ_OFFSET_MIN = 8 * 60;

function getMalaysiaParts(d: Date) {
  const shifted = new Date(d.getTime() + MY_TZ_OFFSET_MIN * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),
    day: shifted.getUTCDay(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

function sameMalaysiaYMD(a: Date, b: Date) {
  const pa = getMalaysiaParts(a);
  const pb = getMalaysiaParts(b);
  return (
    pa.year === pb.year &&
    pa.month === pb.month &&
    pa.date === pb.date
  );
}

/** ---------- helpers ---------- */
function toMinutes(hhmm: string) {
  if (!hhmm || hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

// Fixed: uses Malaysia day, not UTC day
function getDayKey(d: Date): DayKey {
  const map: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return map[getMalaysiaParts(d).day];
}

/**
 * Fixed: uses Malaysia hours/minutes for startMin/endMin,
 * and Malaysia calendar date for same-day check.
 * Previously used raw UTC getHours()/getDay() which caused wrong
 * availability results for any session scheduled in MYT morning (UTC night).
 */
function isWithinAvailability(
  availabilityJson: string | null | undefined,
  start: Date,
  end: Date
) {
  if (!availabilityJson) return false;

  let parsed: DayAvailability[] | null = null;
  try {
    parsed = JSON.parse(availabilityJson);
  } catch {
    return false;
  }
  if (!Array.isArray(parsed)) return false;

  // Same-day check using Malaysia calendar date
  if (!sameMalaysiaYMD(start, end)) return false;

  // Day-of-week using Malaysia time
  const startDay = getDayKey(start);
  const endDay = getDayKey(end);
  if (startDay !== endDay) return false;

  const day = parsed.find((x) => x?.day === startDay);
  if (!day || day.off) return false;
  if (!Array.isArray(day.slots) || day.slots.length === 0) return false;

  // Hours/minutes in Malaysia time, not UTC
  const sp = getMalaysiaParts(start);
  const ep = getMalaysiaParts(end);
  const startMin = sp.hours * 60 + sp.minutes;
  const endMin = ep.hours * 60 + ep.minutes;

  return day.slots.some((s) => {
    const a = toMinutes(s.start);
    const b = toMinutes(s.end);
    return startMin >= a && endMin <= b;
  });
}

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Picks first eligible tutor:
 * - teaches subjectId (tutorSubject join)
 * - approved + verified + not deactivated
 * - availability covers slot (checked in MYT)
 * - no overlap with existing PENDING/ACCEPTED sessions
 */
async function pickTutorForExactSubject(opts: {
  subjectId: string;
  start: Date;
  end: Date;
}) {
  const { subjectId, start, end } = opts;

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
          id: true,
          tutorApplications: {
            select: { availability: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    take: 50,
  });

  if (candidates.length === 0) return null;

  // fairness: don't always pick same tutor
  shuffleInPlace(candidates);

  const tutorIds = Array.from(new Set(candidates.map((c) => c.tutorId)));

  const clashes = await prisma.session.findMany({
    where: {
      tutorId: { in: tutorIds },
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: end },
      AND: [
        {
          OR: [
            { endsAt: { gt: start } },
            { endsAt: null }, // conservative guard for legacy rows
          ],
        },
      ],
    },
    select: { tutorId: true },
  });

  const clashSet = new Set(
    clashes.map((c) => c.tutorId).filter(Boolean) as string[]
  );

  for (const c of candidates) {
    const tid = c.tutorId;
    if (clashSet.has(tid)) continue;

    const availabilityJson = c.tutor.tutorApplications?.[0]?.availability ?? null;
    if (!isWithinAvailability(availabilityJson, start, end)) continue;

    return tid;
  }

  return null;
}

export async function POST(req: Request) {
  // 🔒 Simple protection: require a shared secret for cron/trigger calls
  const secret = req.headers.get("x-allocator-secret");
  if (!process.env.ALLOCATOR_SECRET || secret !== process.env.ALLOCATOR_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Process small batch for safety
  const queued = await prisma.session.findMany({
    where: {
      tutorId: null,
      status: "PENDING",
      scheduledAt: { gt: now },
    },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: 25,
    select: {
      id: true,
      subjectId: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
    },
  });

  let assignedCount = 0;

  for (const s of queued) {
    const start = new Date(s.scheduledAt);
    const end =
      s.endsAt ?? new Date(start.getTime() + (s.durationMin ?? 60) * 60_000);

    const tutorId = await pickTutorForExactSubject({
      subjectId: s.subjectId,
      start,
      end,
    });

    if (!tutorId) continue;

    // race-safe assignment (only assign if still unassigned)
    const updated = await prisma.session.updateMany({
      where: { id: s.id, tutorId: null, status: "PENDING" },
      data: { tutorId },
    });

    if (updated.count > 0) assignedCount += 1;
  }

  return NextResponse.json({
    success: true,
    queued: queued.length,
    assigned: assignedCount,
  });
}