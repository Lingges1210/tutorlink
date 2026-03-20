// src/app/api/sessions/[id]/reschedule/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";
import {
  scheduleSessionReminderEmail,
  computeOneHourBeforeISO,
  cancelScheduledEmail,
  sendSessionInviteEmail,
} from "@/lib/email";

/* ==========================================================================
   MALAYSIA TIMEZONE HELPERS
   Asia/Kuala_Lumpur = UTC+8, no DST
   ========================================================================== */

const MY_TZ_OFFSET_MIN = 8 * 60;

function getMalaysiaParts(d: Date) {
  const shifted = new Date(d.getTime() + MY_TZ_OFFSET_MIN * 60_000);
  return {
    year:    shifted.getUTCFullYear(),
    month:   shifted.getUTCMonth(),
    date:    shifted.getUTCDate(),
    day:     shifted.getUTCDay(),
    hours:   shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

function sameMalaysiaYMD(a: Date, b: Date) {
  const pa = getMalaysiaParts(a);
  const pb = getMalaysiaParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.date === pb.date;
}

function formatMYT(iso: string): string {
  return (
    new Date(iso).toLocaleString("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }) + " MYT"
  );
}

/* ==========================================================================
   AVAILABILITY HELPERS
   ========================================================================== */

type DayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

function toMinutes(hhmm: string) {
  if (!hhmm) return 0;
  if (hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}

// ✅ Fixed: uses Malaysia day-of-week, not UTC
function dayKeyFromDate(d: Date): DayKey {
  const k: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return k[getMalaysiaParts(d).day];
}

function withinSlots(day: DayAvailability, startMin: number, endMin: number) {
  if (day.off) return false;
  if (!Array.isArray(day.slots) || day.slots.length === 0) return false;
  return day.slots.some((s) => {
    const a = toMinutes(s.start);
    const b = toMinutes(s.end);
    return startMin >= a && endMin <= b;
  });
}

async function getTutorAvailability(
  tutorId: string
): Promise<DayAvailability[] | null> {
  const app = await prisma.tutorApplication
    .findFirst({
      where: { userId: tutorId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: { availability: true },
    })
    .catch(() => null);

  const raw = (app as any)?.availability ?? null;
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
      .filter((x: any) => typeof x.day === "string");

    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

// ✅ Fixed: uses getMalaysiaParts() for hours/minutes and same-day check
async function tutorDeclaredAvailable(
  tutorId: string,
  start: Date,
  end: Date
): Promise<true | false | null> {
  // Must be same calendar day in Malaysia time
  if (!sameMalaysiaYMD(start, end)) return false;

  const avail = await getTutorAvailability(tutorId);
  if (!avail) return null;

  const dayKey = dayKeyFromDate(start);
  const day = avail.find((d) => d.day === dayKey);
  if (!day) return false;

  // ✅ Malaysia hours/minutes, not UTC
  const sp = getMalaysiaParts(start);
  const ep = getMalaysiaParts(end);
  const startMin = sp.hours * 60 + sp.minutes;
  const endMin   = ep.hours * 60 + ep.minutes;

  return withinSlots(day, startMin, endMin);
}

/* ==========================================================================
   INLINE TUTOR REASSIGNMENT
   Replaces the "wait for external cron" pattern.
   Called immediately after a reschedule unassigns the tutor so the student
   gets a tutor straight away instead of waiting indefinitely.
   ========================================================================== */

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function tryReassignTutor(opts: {
  sessionId: string;
  subjectId: string;
  start: Date;
  end: Date;
  excludeTutorId?: string | null; // skip the tutor we just unassigned
}): Promise<string | null> {
  const { sessionId, subjectId, start, end, excludeTutorId } = opts;

  // Find all approved tutors teaching this subject
  const candidates = await prisma.tutorSubject.findMany({
    where: {
      subjectId,
      tutor: {
        isTutorApproved: true,
        verificationStatus: "AUTO_VERIFIED",
        isDeactivated: false,
        // Optionally skip the previously unassigned tutor if they clashed
        ...(excludeTutorId ? { id: { not: excludeTutorId } } : {}),
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

  // Fairness: don't always pick the same tutor
  shuffleInPlace(candidates);

  const tutorIds = candidates.map((c) => c.tutorId);

  // Find tutors with clashing sessions at the new time
  const clashes = await prisma.session.findMany({
    where: {
      id: { not: sessionId }, // exclude the session being rescheduled
      tutorId: { in: tutorIds },
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: end },
      AND: [
        {
          OR: [
            { endsAt: { gt: start } },
            { endsAt: null },
          ],
        },
      ],
    },
    select: { tutorId: true },
  });

  const clashSet = new Set(
    clashes.map((c) => c.tutorId).filter(Boolean) as string[]
  );

  // Pick first candidate that is free and declared available in MYT
  for (const c of candidates) {
    const tid = c.tutorId;
    if (clashSet.has(tid)) continue;

    const availabilityJson =
      c.tutor.tutorApplications?.[0]?.availability ?? null;

    if (!availabilityJson) continue;

    let avail: DayAvailability[] | null = null;
    try {
      const parsed = JSON.parse(availabilityJson);
      if (Array.isArray(parsed)) {
        avail = parsed
          .filter(Boolean)
          .map((x: any) => ({ day: x.day, off: !!x.off, slots: Array.isArray(x.slots) ? x.slots : [] }))
          .filter((x: any) => typeof x.day === "string");
      }
    } catch {
      continue;
    }

    if (!avail || avail.length === 0) continue;

    // ✅ MYT availability check
    if (!sameMalaysiaYMD(start, end)) continue;

    const dayKey = dayKeyFromDate(start);
    const day = avail.find((d) => d.day === dayKey);
    if (!day || day.off) continue;

    const sp = getMalaysiaParts(start);
    const ep = getMalaysiaParts(end);
    const startMin = sp.hours * 60 + sp.minutes;
    const endMin   = ep.hours * 60 + ep.minutes;

    const fits = (day.slots || []).some((s) => {
      const a = toMinutes(s.start);
      const b = toMinutes(s.end);
      return startMin >= a && endMin <= b;
    });

    if (!fits) continue;

    // Race-safe assignment: only assign if session is still unassigned
    const assigned = await prisma.session.updateMany({
      where: { id: sessionId, tutorId: null, status: "PENDING" },
      data: { tutorId: tid },
    });

    if (assigned.count > 0) return tid;
  }

  return null;
}

/* ==========================================================================
   ROUTE
   ========================================================================== */

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      verificationStatus: true,
      isDeactivated: true,
      email: true,
      name: true,
    },
  });

  if (!dbUser || dbUser.isDeactivated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ message: "Not verified" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const scheduledAtRaw =
    typeof body.scheduledAt === "string" ? body.scheduledAt : null;

  if (!scheduledAtRaw) {
    return NextResponse.json({ message: "Missing date" }, { status: 400 });
  }

  const newScheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(newScheduledAt.getTime())) {
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      tutorId: true,
      subjectId: true,
      status: true,
      durationMin: true,
      studentReminderEmailId: true,
      calendarUid: true,
      calendarSequence: true,
      subject: { select: { code: true, title: true } },
      tutor: { select: { email: true, name: true } },
    },
  });

  if (!session || session.studentId !== dbUser.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.status === "CANCELLED" || session.status === "COMPLETED") {
    return NextResponse.json(
      { message: "Cannot reschedule this session" },
      { status: 409 }
    );
  }

  const existingReminderId = session.studentReminderEmailId;
  const subjCode    = session.subject.code;
  const subjTitle   = session.subject.title;
  const studentEmail = dbUser.email;
  const studentName  = dbUser.name;

  const durationMin    = session.durationMin ?? 60;
  const newEndsAt      = new Date(newScheduledAt.getTime() + durationMin * 60_000);
  const prevTutorId    = session.tutorId;
  const uid            = session.calendarUid ?? `${session.id}@tutorlink`;

  // 1) Student overlap check (exclude this session)
  const studentClash = await prisma.session.findFirst({
    where: {
      id: { not: session.id },
      studentId: dbUser.id,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: newEndsAt },
      endsAt: { gt: newScheduledAt },
    },
    select: { id: true },
  });

  if (studentClash) {
    return NextResponse.json(
      { message: "You already have another booking that overlaps this time." },
      { status: 409 }
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function rescheduleReminderEmailSafe(
    finalSessionId: string,
    finalStartISO: string
  ) {
    try {
      if (existingReminderId) {
        await cancelScheduledEmail(existingReminderId);
        await prisma.session.update({
          where: { id: finalSessionId },
          data: { studentReminderEmailId: null },
        });
      }
      const dueISO = computeOneHourBeforeISO(finalStartISO);
      await scheduleSessionReminderEmail({
        sessionId: finalSessionId,
        toEmail: studentEmail,
        toName: studentName,
        subjectCode: subjCode,
        subjectTitle: subjTitle,
        scheduledAtISO: dueISO,
      });
    } catch {
      // ignore email errors
    }
  }

  async function sendCalendarUpdateSafe(opts: {
    finalStart: Date;
    finalEnd: Date;
    tutorEmail?: string | null;
    tutorName?: string | null;
    uid: string;
    sequence: number;
  }) {
    try {
      await sendSessionInviteEmail({
        mode: "RESCHEDULED",
        toEmail: studentEmail,
        toName: studentName,
        subjectCode: subjCode,
        subjectTitle: subjTitle,
        startISO: opts.finalStart.toISOString(),
        endISO: opts.finalEnd.toISOString(),
        uid: opts.uid,
        sequence: opts.sequence,
        organizerName: "TutorLink",
        organizerEmail: process.env.RESEND_FROM_EMAIL!,
      });

      if (opts.tutorEmail) {
        await sendSessionInviteEmail({
          mode: "RESCHEDULED",
          toEmail: opts.tutorEmail,
          toName: opts.tutorName ?? null,
          subjectCode: subjCode,
          subjectTitle: subjTitle,
          startISO: opts.finalStart.toISOString(),
          endISO: opts.finalEnd.toISOString(),
          uid: opts.uid,
          sequence: opts.sequence,
          organizerName: "TutorLink",
          organizerEmail: process.env.RESEND_FROM_EMAIL!,
        });
      }
    } catch {
      // ignore calendar email errors
    }
  }

  // ── Determine if we need to unassign the current tutor ───────────────────

  let shouldUnassign = false;
  let unassignReason: "CLASH" | "UNAVAILABLE" | null = null;

  if (session.tutorId) {
    // 2) Tutor overlap check
    const tutorClash = await prisma.session.findFirst({
      where: {
        id: { not: session.id },
        tutorId: session.tutorId,
        status: { in: ["PENDING", "ACCEPTED"] },
        scheduledAt: { lt: newEndsAt },
        endsAt: { gt: newScheduledAt },
      },
      select: { id: true },
    });

    if (tutorClash) {
      shouldUnassign = true;
      unassignReason = "CLASH";
    } else {
      // 3) ✅ Fixed: MYT availability check (was using UTC getHours/getDay)
      const declared = await tutorDeclaredAvailable(
        session.tutorId,
        newScheduledAt,
        newEndsAt
      );
      if (declared === false) {
        shouldUnassign = true;
        unassignReason = "UNAVAILABLE";
      }
    }
  }

  // ── Perform the DB update ─────────────────────────────────────────────────

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      scheduledAt: newScheduledAt,
      endsAt: newEndsAt,
      rescheduledAt: new Date(),
      status: "PENDING",
      ...(shouldUnassign ? { tutorId: null } : {}),
      calendarUid: uid,
      calendarSequence: { increment: 1 },
    },
    select: {
      id: true,
      tutorId: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
      calendarUid: true,
      calendarSequence: true,
    },
  });

  const finalStart = new Date(updated.scheduledAt);
  const finalEnd   =
    updated.endsAt ??
    new Date(finalStart.getTime() + (updated.durationMin ?? durationMin) * 60_000);

  // ── Emails ────────────────────────────────────────────────────────────────

  await rescheduleReminderEmailSafe(updated.id, updated.scheduledAt.toISOString());

  await sendCalendarUpdateSafe({
    finalStart,
    finalEnd,
    // Only send tutor calendar update if they're still assigned
    tutorEmail: shouldUnassign ? null : (session.tutor?.email ?? null),
    tutorName:  shouldUnassign ? null : (session.tutor?.name  ?? null),
    uid:        updated.calendarUid ?? uid,
    sequence:   updated.calendarSequence ?? 0,
  });

  // ── Notifications ─────────────────────────────────────────────────────────

  try {
    if (shouldUnassign && prevTutorId) {
      const reason =
        unassignReason === "CLASH"
          ? "You're no longer assigned due to a time conflict."
          : "You're no longer assigned because you're unavailable at that time.";

      await notify.user({
        userId: prevTutorId,
        viewer: "TUTOR",
        type: "SESSION_RESCHEDULED_UNASSIGNED",
        title: "Session rescheduled",
        body: `Student rescheduled to ${formatMYT(newScheduledAt.toISOString())}. ${reason}`,
        data: { sessionId: updated.id, newTime: newScheduledAt.toISOString() },
      });
    } else if (!shouldUnassign && updated.tutorId) {
      await notify.sessionRescheduled(
        updated.tutorId,
        updated.id,
        "TUTOR",
        newScheduledAt.toISOString()
      );
    }
  } catch {
    // ignore notification errors
  }

  // ── ✅ Inline reassignment (replaces "wait for external cron") ────────────
  // If the tutor was unassigned, try to immediately find a new one instead
  // of leaving the session stranded waiting for the allocator cron to run.

  if (shouldUnassign) {
    try {
      const newTutorId = await tryReassignTutor({
        sessionId: updated.id,
        subjectId: session.subjectId,
        start: newScheduledAt,
        end: newEndsAt,
        // If clash: exclude old tutor (they're busy). If unavailable: also
        // exclude them since they told us they're not free at this time.
        excludeTutorId: prevTutorId,
      });

      if (newTutorId) {
        // Notify the newly assigned tutor
        try {
          await notify.user({
            userId: newTutorId,
            viewer: "TUTOR",
            type: "SESSION_BOOKED",
            title: "New session assigned",
            body: `You've been assigned a ${subjCode} session on ${formatMYT(newScheduledAt.toISOString())}.`,
            data: {
              sessionId: updated.id,
              scheduledAt: newScheduledAt.toISOString(),
              subjectCode: subjCode,
              subjectTitle: subjTitle,
            },
          });
        } catch {}

        return NextResponse.json({
          success: true,
          queued: false,
          message: "Rescheduled and a new tutor has been assigned.",
        });
      }
    } catch {
      // Reassignment attempt failed — session stays queued for cron fallback
    }

    return NextResponse.json({
      success: true,
      queued: true,
      message:
        unassignReason === "CLASH"
          ? "Rescheduled, but your tutor is busy at that time. We're looking for a new tutor."
          : "Rescheduled, but your tutor isn't available then. We're looking for a new tutor.",
    });
  }

  return NextResponse.json({ success: true, queued: false });
}