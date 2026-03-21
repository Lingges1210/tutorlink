// src/app/api/sessions/[id]/available-slots/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import {
  getTutorAvailability,
  getMalaysiaParts,
  dayKeyFromDate,
  toMinutes,
} from "@/lib/tutorAvailability";

const MY_TZ_OFFSET_MIN = 8 * 60;
const SLOT_DAYS_AHEAD = 14;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      tutorId: true,
      studentId: true,
      durationMin: true,
      status: true,
      scheduledAt: true,   // ← need this to exclude current slot
      endsAt: true,
      student: { select: { email: true } },
    },
  });

  if (
    !session ||
    session.student.email.toLowerCase() !== user.email.toLowerCase()
  )
    return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (!session.tutorId)
    return NextResponse.json({ slots: [] }); // no tutor yet → fallback to free pick

  const durationMin = session.durationMin ?? 60;
  const avail = await getTutorAvailability(session.tutorId);
  if (!avail) return NextResponse.json({ slots: [] });

  const windowStart = new Date();
  const windowEnd = new Date(Date.now() + SLOT_DAYS_AHEAD * 24 * 60 * 60_000);

  // Fetch all of tutor's other booked sessions in the window
  // Exclude the current session (id: { not: session.id }) so its slot
  // isn't in busyRanges — but we exclude it separately below
  const bookedSessions = await prisma.session.findMany({
    where: {
      id: { not: session.id },          // exclude self from conflict check
      tutorId: session.tutorId,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: windowEnd },
      endsAt: { gt: windowStart },
    },
    select: { scheduledAt: true, endsAt: true, durationMin: true },
  });

  const busyRanges = bookedSessions.map((s) => ({
    start: new Date(s.scheduledAt).getTime(),
    end: s.endsAt
      ? new Date(s.endsAt).getTime()
      : new Date(s.scheduledAt).getTime() + (s.durationMin ?? 60) * 60_000,
  }));

  // ── Also treat the current session's own time as busy ──────────────────
  // This stops the current booking's slot from appearing in the picker
  const currentStart = new Date(session.scheduledAt).getTime();
  const currentEnd = session.endsAt
    ? new Date(session.endsAt).getTime()
    : currentStart + durationMin * 60_000;

  busyRanges.push({ start: currentStart, end: currentEnd });
  // ───────────────────────────────────────────────────────────────────────

  const slots: { start: string; end: string; label: string }[] = [];
  const now = Date.now();
  const minStart = now + 30 * 60_000; // at least 30 min from now

  for (let dayOffset = 0; dayOffset < SLOT_DAYS_AHEAD; dayOffset++) {
    const dayBase = new Date(now + dayOffset * 24 * 60 * 60_000);
    const dayKey = dayKeyFromDate(dayBase);
    const dayAvail = avail.find((d) => d.day === dayKey);
    if (!dayAvail || dayAvail.off || !dayAvail.slots?.length) continue;

    const myt = getMalaysiaParts(dayBase);
    const dayMidnightUTC =
      Date.UTC(myt.year, myt.month, myt.date) - MY_TZ_OFFSET_MIN * 60_000;

    for (const slot of dayAvail.slots) {
      const slotStartMin = toMinutes(slot.start);
      const slotEndMin = toMinutes(slot.end);

      let cursor = slotStartMin;
      while (cursor + durationMin <= slotEndMin) {
        const candidateStart = dayMidnightUTC + cursor * 60_000;
        const candidateEnd = candidateStart + durationMin * 60_000;

        if (candidateStart >= minStart) {
          const isBusy = busyRanges.some(
            (b) => candidateStart < b.end && candidateEnd > b.start
          );

          if (!isBusy) {
            const startDate = new Date(candidateStart);
            slots.push({
              start: startDate.toISOString(),
              end: new Date(candidateEnd).toISOString(),
              label: startDate.toLocaleString("en-MY", {
                timeZone: "Asia/Kuala_Lumpur",
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
            });
          }
        }
        cursor += durationMin;
      }
    }
  }

  return NextResponse.json({ slots: slots.slice(0, 60) });
}