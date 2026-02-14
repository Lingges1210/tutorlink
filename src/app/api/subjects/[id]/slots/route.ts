import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

/** -------- types matching your availability picker -------- */
type DayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

function toMinutes(hhmm: string) {
  if (!hhmm) return 0;
  if (hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

function dayKeyFromDate(d: Date): DayKey {
  const k: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return k[d.getDay()];
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
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Does [start,end] fully fit inside one declared slot on that weekday? */
function fitsDeclaredAvailability(
  availability: DayAvailability[],
  start: Date,
  end: Date
) {
  // v1: only same-day sessions
  if (!sameYMD(start, end)) return false;

  const dayKey = dayKeyFromDate(start);
  const day = availability.find((d) => d.day === dayKey);
  if (!day || day.off) return false;

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();

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

  // auth (same style as your other routes)
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

  // read duration from query
  const url = new URL(req.url);
  const durationMin = Math.max(
    30,
    Math.min(180, parseInt(url.searchParams.get("durationMin") || "60", 10) || 60)
  );

  // find tutors who teach this subject and are approved
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
        // take the latest (you can change this logic)
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { availability: true, status: true },
      },
    },
  });

  // build tutor availability map
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

  // fetch existing tutor sessions for next 7 days to filter overlaps
  const now = new Date();
  const horizon = addMinutes(now, 7 * 24 * 60);

  const tutorIds = tutorAvail.map((x) => x.tutorId);

  const existing = await prisma.session.findMany({
    where: {
      tutorId: { in: tutorIds },
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: horizon },
      // endsAt should ideally be set for all active sessions
    },
    select: {
      tutorId: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
    },
  });

  // helper: for a tutor, check clash with existing sessions
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

  // generate slots for next 7 days with 30-min step
  const stepMin = 30;
  const slotsMap = new Map<
    string,
    { start: string; end: string; tutorCount: number; tutorIds: string[] }
  >();

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayBase = new Date(now.getTime());
    dayBase.setDate(now.getDate() + dayOffset);

    // iterate all tutors
    for (const t of tutorAvail) {
      // generate time candidates 00:00 -> 23:30 (local server time)
      // (If you want Malaysia timezone consistent, we’ll later shift to Asia/Kuala_Lumpur at DB level.)
      for (let mins = 0; mins <= 24 * 60 - stepMin; mins += stepMin) {
        const start = new Date(dayBase.getTime());
        start.setHours(0, 0, 0, 0);
        start.setMinutes(mins);

        // skip past times (today)
        if (start.getTime() < now.getTime()) continue;

        const end = addMinutes(start, durationMin);

        // ensure same-day end in v1
        if (!sameYMD(start, end)) continue;

        // must fit declared availability
        if (!fitsDeclaredAvailability(t.availability, start, end)) continue;

        // must be free (no overlap)
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

  // turn into list + sort
  const items = Array.from(slotsMap.values())
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    .slice(0, 120); // cap

  return NextResponse.json({ items, durationMin });
}
