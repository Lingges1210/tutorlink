// src/app/api/subjects/suggest/[subjectsId]/availability/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

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

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function clampDate(d: Date, min: Date, max: Date) {
  return new Date(Math.max(min.getTime(), Math.min(max.getTime(), d.getTime())));
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

/** Parse JSON availability safely */
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
 * We will read tutor availability from TutorApplication.availability
 * (your schema has it there).
 * We pick the most recent application row for each tutor.
 */
async function getTutorAvailabilityFromDB(
  tutorId: string
): Promise<DayAvailability[] | null> {
  const row = await prisma.tutorApplication.findFirst({
    where: { userId: tutorId },
    orderBy: { createdAt: "desc" },
    select: { availability: true },
  });

  return parseAvailability(row?.availability ?? null);
}

/**
 * Generate candidate start times for ONE tutor on one day,
 * inside their availability slots, stepping by stepMin.
 */
function generateCandidateStartsForDay(args: {
  dayDate: Date; // local date (00:00)
  dayAvail: DayAvailability | null;
  durationMin: number;
  stepMin: number;
  windowStart: Date;
  windowEnd: Date;
}) {
  const { dayDate, dayAvail, durationMin, stepMin, windowStart, windowEnd } = args;

  if (
    !dayAvail ||
    dayAvail.off ||
    !Array.isArray(dayAvail.slots) ||
    dayAvail.slots.length === 0
  ) {
    return [] as Date[];
  }

  const out: Date[] = [];
  const dayStart = startOfDay(dayDate);
  const dayEnd = addDays(dayStart, 1);

  // clamp to requested window
  const wStart = clampDate(dayStart, windowStart, windowEnd);
  const wEnd = clampDate(dayEnd, windowStart, windowEnd);

  for (const slot of dayAvail.slots) {
    const slotStartMin = toMinutes(slot.start);
    const slotEndMin = toMinutes(slot.end);

    // slot start/end as Date
    const slotStart = new Date(dayStart);
    slotStart.setMinutes(slotStartMin, 0, 0);

    const slotEnd = new Date(dayStart);
    slotEnd.setMinutes(slotEndMin, 0, 0);

    // slot must be within the day
    const sStart = clampDate(slotStart, wStart, wEnd);
    const sEnd = clampDate(slotEnd, wStart, wEnd);

    // iterate start times
    for (
      let t = new Date(sStart);
      t.getTime() + durationMin * 60_000 <= sEnd.getTime();
      t = new Date(t.getTime() + stepMin * 60_000)
    ) {
      out.push(t);
    }
  }

  return out;
}

/** Check if tutor has clash at [start,end) */
function hasClash(
  existing: { scheduledAt: Date; endsAt: Date | null; durationMin: number }[],
  start: Date,
  end: Date
) {
  const aStart = start.getTime();
  const aEnd = end.getTime();

  return existing.some((x) => {
    const bStart = x.scheduledAt.getTime();
    const bEnd = x.endsAt
      ? x.endsAt.getTime()
      : bStart + (x.durationMin ?? 60) * 60_000;
    return overlaps(aStart, aEnd, bStart, bEnd);
  });
}

/**
 * IMPORTANT:
 * Folder is [subjectsId] so params key MUST be subjectsId
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ subjectsId: string }> }
) {
  const { subjectsId } = await params;

  // keep old variable name so rest of code unchanged
  const subjectId = subjectsId;

  // optional auth (recommended) - keep it consistent with your app
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ items: [] });

  const url = new URL(_req.url);
  const fromStr = url.searchParams.get("from"); // YYYY-MM-DD
  const daysStr = url.searchParams.get("days");
  const durationStr = url.searchParams.get("durationMin");
  const stepStr = url.searchParams.get("stepMin");

  const days = Math.min(Math.max(parseInt(daysStr ?? "7", 10) || 7, 1), 14);
  const durationMin = Math.min(
    Math.max(parseInt(durationStr ?? "60", 10) || 60, 15),
    180
  );
  const stepMin = Math.min(Math.max(parseInt(stepStr ?? "30", 10) || 30, 5), 60);

  const from = fromStr ? new Date(`${fromStr}T00:00:00`) : startOfDay(new Date());
  if (Number.isNaN(from.getTime())) return NextResponse.json({ items: [] });

  const windowStart = startOfDay(from);
  const windowEnd = addDays(windowStart, days);

  // get tutors who can teach this subject
  const tutorLinks = await prisma.tutorSubject.findMany({
    where: { subjectId },
    select: { tutorId: true },
  });

  const tutorIds = tutorLinks.map((x) => x.tutorId);
  if (tutorIds.length === 0) return NextResponse.json({ items: [] });

  // only approved tutors (based on your schema)
  const approvedTutors = await prisma.user.findMany({
    where: {
      id: { in: tutorIds },
      isTutorApproved: true,
      isDeactivated: false,
      verificationStatus: "AUTO_VERIFIED",
    },
    select: { id: true },
  });

  const finalTutorIds = approvedTutors.map((t) => t.id);
  if (finalTutorIds.length === 0) return NextResponse.json({ items: [] });

  // preload tutors existing active sessions in window
  const activeSessions = await prisma.session.findMany({
    where: {
      tutorId: { in: finalTutorIds },
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: windowEnd },
    },
    select: {
      tutorId: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
    },
  });

  const sessionsByTutor = new Map<
    string,
    { scheduledAt: Date; endsAt: Date | null; durationMin: number }[]
  >();

  for (const s of activeSessions) {
    if (!s.tutorId) continue;
    const arr = sessionsByTutor.get(s.tutorId) ?? [];
    arr.push({ scheduledAt: s.scheduledAt, endsAt: s.endsAt, durationMin: s.durationMin });
    sessionsByTutor.set(s.tutorId, arr);
  }

  // Build merged availability map: startISO -> {count, tutorIds[]}
  const map = new Map<
    string,
    { start: string; end: string; count: number; tutorIds: string[] }
  >();

  for (const tutorId of finalTutorIds) {
    const avail = await getTutorAvailabilityFromDB(tutorId);
    if (!avail) continue;

    const tutorExisting = sessionsByTutor.get(tutorId) ?? [];

    for (let i = 0; i < days; i++) {
      const dayDate = addDays(windowStart, i);
      const dk = dayKeyFromDate(dayDate);
      const dayAvail = avail.find((d) => d.day === dk) ?? null;

      const starts = generateCandidateStartsForDay({
        dayDate,
        dayAvail,
        durationMin,
        stepMin,
        windowStart,
        windowEnd,
      });

      for (const st of starts) {
        const en = new Date(st.getTime() + durationMin * 60_000);

        // clash filter
        if (hasClash(tutorExisting, st, en)) continue;

        const startIso = st.toISOString();
        const endIso = en.toISOString();

        const cur = map.get(startIso);
        if (!cur) {
          map.set(startIso, {
            start: startIso,
            end: endIso,
            count: 1,
            tutorIds: [tutorId],
          });
        } else {
          cur.count += 1;
          cur.tutorIds.push(tutorId);
        }
      }
    }
  }

  const items = Array.from(map.values()).sort(
    (a, b) => +new Date(a.start) - +new Date(b.start)
  );

  return NextResponse.json({
    meta: { subjectId, from: windowStart.toISOString(), days, durationMin, stepMin },
    items,
  });
}