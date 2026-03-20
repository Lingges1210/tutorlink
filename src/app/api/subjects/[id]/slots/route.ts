import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

/** -------- types matching your availability picker -------- */
type DayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

/**
 * Malaysia timezone helpers
 * Asia/Kuala_Lumpur = UTC+8, no DST
 */
const MY_TZ_OFFSET_MIN = 8 * 60;
const DAY_KEYS: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

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

function createMalaysiaDate(
  year: number,
  month: number,
  date: number,
  hours = 0,
  minutes = 0
) {
  return new Date(
    Date.UTC(year, month, date, hours, minutes) - MY_TZ_OFFSET_MIN * 60_000
  );
}

function toMinutes(hhmm: string) {
  if (!hhmm) return 0;
  if (hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function dayKeyFromDate(d: Date): DayKey {
  return DAY_KEYS[getMalaysiaParts(d).day];
}

function parseAvailability(raw: string | null): DayAvailability[] | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const cleaned: DayAvailability[] = parsed
      .filter(Boolean)
      .map((x: any) => ({
        day: x?.day as DayKey,
        off: !!x?.off,
        slots: Array.isArray(x?.slots) ? x.slots : [],
      }))
      .filter((x) => typeof x.day === "string");

    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

function formatISO(d: Date) {
  return d.toISOString();
}

function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60_000);
}

function sameYMD(a: Date, b: Date) {
  const pa = getMalaysiaParts(a);
  const pb = getMalaysiaParts(b);
  return (
    pa.year === pb.year &&
    pa.month === pb.month &&
    pa.date === pb.date
  );
}

/** Does [start,end] fully fit inside one declared slot on that weekday? */
function fitsDeclaredAvailability(
  availability: DayAvailability[],
  start: Date,
  end: Date
) {
  if (!sameYMD(start, end)) return false;

  const dayKey = dayKeyFromDate(start);
  const day = availability.find((d) => d.day === dayKey);
  if (!day || day.off) return false;

  const startParts = getMalaysiaParts(start);
  const endParts = getMalaysiaParts(end);

  const startMin = startParts.hours * 60 + startParts.minutes;
  const endMin = endParts.hours * 60 + endParts.minutes;

  return (day.slots || []).some((s) => {
    const a = toMinutes(s.start);
    const b = toMinutes(s.end);
    return startMin >= a && endMin <= b;
  });
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: subjectId } = await ctx.params;

  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ items: [] });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true, verificationStatus: true },
  });

  if (!dbUser || dbUser.isDeactivated || dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ items: [] });
  }

  const url = new URL(req.url);
  const durationMin = Math.max(
    30,
    Math.min(180, parseInt(url.searchParams.get("durationMin") || "60", 10) || 60)
  );

  const tutors = await prisma.user.findMany({
    where: {
      isTutorApproved: true,
      tutorSubjects: { some: { subjectId } },
      isDeactivated: false,
      verificationStatus: "AUTO_VERIFIED",
    },
    select: {
      id: true,
      tutorApplications: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { availability: true, status: true },
      },
    },
  });

  const tutorAvail: { tutorId: string; availability: DayAvailability[] }[] = [];
  for (const t of tutors) {
    const app = t.tutorApplications?.[0];
    if (!app || app.status !== "APPROVED") continue;

    const avail = parseAvailability(app.availability ?? null);
    if (!avail) continue;

    tutorAvail.push({ tutorId: t.id, availability: avail });
  }

  if (tutorAvail.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const now = new Date();
  const horizon = addMinutes(now, 7 * 24 * 60);

  const tutorIds = tutorAvail.map((x) => x.tutorId);

  const existing = await prisma.session.findMany({
    where: {
      tutorId: { in: tutorIds },
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: horizon },
    },
    select: {
      tutorId: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
    },
  });

  function tutorIsFree(tutorId: string, start: Date, end: Date) {
    const s0 = start.getTime();
    const e0 = end.getTime();

    for (const s of existing) {
      if (s.tutorId !== tutorId) continue;

      const sStart = new Date(s.scheduledAt).getTime();
      const sEnd = s.endsAt
        ? new Date(s.endsAt).getTime()
        : sStart + (s.durationMin ?? 60) * 60_000;

      if (overlaps(s0, e0, sStart, sEnd)) return false;
    }
    return true;
  }

  const stepMin = 30;
  const slotsMap = new Map<
    string,
    { start: string; end: string; tutorCount: number; tutorIds: string[] }
  >();

  const nowMY = getMalaysiaParts(now);

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayBase = createMalaysiaDate(
      nowMY.year,
      nowMY.month,
      nowMY.date + dayOffset,
      0,
      0
    );

    for (const t of tutorAvail) {
      for (let mins = 0; mins <= 24 * 60 - stepMin; mins += stepMin) {
        const start = addMinutes(dayBase, mins);

        if (start.getTime() < now.getTime()) continue;

        const end = addMinutes(start, durationMin);

        if (!sameYMD(start, end)) continue;
        if (!fitsDeclaredAvailability(t.availability, start, end)) continue;
        if (!tutorIsFree(t.tutorId, start, end)) continue;

        const startISO = formatISO(start);
        const endISO = formatISO(end);
        const key = `${startISO}|${endISO}`;

        const existingSlot = slotsMap.get(key);
        if (existingSlot) {
          if (!existingSlot.tutorIds.includes(t.tutorId)) {
            existingSlot.tutorIds.push(t.tutorId);
            existingSlot.tutorCount += 1;
          }
        } else {
          slotsMap.set(key, {
            start: startISO,
            end: endISO,
            tutorCount: 1,
            tutorIds: [t.tutorId],
          });
        }
      }
    }
  }

  const items = Array.from(slotsMap.values())
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    .slice(0, 120);

  return NextResponse.json({ items, durationMin });
}