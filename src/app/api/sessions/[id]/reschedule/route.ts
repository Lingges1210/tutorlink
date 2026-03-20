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
   ========================================================================== */

const MY_TZ_OFFSET_MIN = 8 * 60;

function getMalaysiaParts(d: Date) {
  const shifted = new Date(d.getTime() + MY_TZ_OFFSET_MIN * 60_000);
  return {
    year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(),
    date: shifted.getUTCDate(),    day:   shifted.getUTCDay(),
    hours: shifted.getUTCHours(), minutes: shifted.getUTCMinutes(),
  };
}

function sameMalaysiaYMD(a: Date, b: Date) {
  const pa = getMalaysiaParts(a), pb = getMalaysiaParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.date === pb.date;
}

function formatMYT(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur", weekday: "short", day: "numeric",
    month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }) + " MYT";
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

function dayKeyFromDate(d: Date): DayKey {
  const k: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return k[getMalaysiaParts(d).day];
}

function withinSlots(day: DayAvailability, startMin: number, endMin: number) {
  if (day.off) return false;
  if (!Array.isArray(day.slots) || day.slots.length === 0) return false;
  return day.slots.some((s) => {
    const a = toMinutes(s.start), b = toMinutes(s.end);
    return startMin >= a && endMin <= b;
  });
}

async function getTutorAvailability(tutorId: string): Promise<DayAvailability[] | null> {
  const app = await prisma.tutorApplication.findFirst({
    where: { userId: tutorId, status: "APPROVED" },
    orderBy: { createdAt: "desc" }, select: { availability: true },
  }).catch(() => null);
  const raw = (app as any)?.availability ?? null;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const cleaned: DayAvailability[] = parsed.filter(Boolean)
      .map((x: any) => ({ day: x.day, off: !!x.off, slots: Array.isArray(x.slots) ? x.slots : [] }))
      .filter((x: any) => typeof x.day === "string");
    return cleaned.length ? cleaned : null;
  } catch { return null; }
}

async function tutorDeclaredAvailable(tutorId: string, start: Date, end: Date): Promise<true | false | null> {
  if (!sameMalaysiaYMD(start, end)) return false;
  const avail = await getTutorAvailability(tutorId);
  if (!avail) return null;
  const dayKey = dayKeyFromDate(start);
  const day = avail.find((d) => d.day === dayKey);
  if (!day) return false;
  const sp = getMalaysiaParts(start), ep = getMalaysiaParts(end);
  return withinSlots(day, sp.hours * 60 + sp.minutes, ep.hours * 60 + ep.minutes);
}

/* ==========================================================================
   INLINE TUTOR REASSIGNMENT
   ========================================================================== */

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function tryReassignTutor(opts: {
  sessionId: string; subjectId: string; start: Date; end: Date; excludeTutorId?: string | null;
}): Promise<string | null> {
  const { sessionId, subjectId, start, end, excludeTutorId } = opts;
  const candidates = await prisma.tutorSubject.findMany({
    where: {
      subjectId,
      tutor: {
        isTutorApproved: true, verificationStatus: "AUTO_VERIFIED", isDeactivated: false,
        ...(excludeTutorId ? { id: { not: excludeTutorId } } : {}),
      },
    },
    select: { tutorId: true, tutor: { select: { id: true, tutorApplications: { select: { availability: true }, orderBy: { createdAt: "desc" }, take: 1 } } } },
    take: 50,
  });
  if (candidates.length === 0) return null;
  shuffleInPlace(candidates);
  const tutorIds = candidates.map((c) => c.tutorId);
  const clashes = await prisma.session.findMany({
    where: { id: { not: sessionId }, tutorId: { in: tutorIds }, status: { in: ["PENDING", "ACCEPTED"] }, scheduledAt: { lt: end }, AND: [{ OR: [{ endsAt: { gt: start } }, { endsAt: null }] }] },
    select: { tutorId: true },
  });
  const clashSet = new Set(clashes.map((c) => c.tutorId).filter(Boolean) as string[]);
  for (const c of candidates) {
    const tid = c.tutorId;
    if (clashSet.has(tid)) continue;
    const availabilityJson = c.tutor.tutorApplications?.[0]?.availability ?? null;
    if (!availabilityJson) continue;
    let avail: DayAvailability[] | null = null;
    try {
      const parsed = JSON.parse(availabilityJson);
      if (Array.isArray(parsed)) avail = parsed.filter(Boolean).map((x: any) => ({ day: x.day, off: !!x.off, slots: Array.isArray(x.slots) ? x.slots : [] })).filter((x: any) => typeof x.day === "string");
    } catch { continue; }
    if (!avail || avail.length === 0) continue;
    if (!sameMalaysiaYMD(start, end)) continue;
    const dayKey = dayKeyFromDate(start);
    const day = avail.find((d) => d.day === dayKey);
    if (!day || day.off) continue;
    const sp = getMalaysiaParts(start), ep = getMalaysiaParts(end);
    const fits = (day.slots || []).some((s) => { const a = toMinutes(s.start), b = toMinutes(s.end); return (sp.hours * 60 + sp.minutes) >= a && (ep.hours * 60 + ep.minutes) <= b; });
    if (!fits) continue;
    const assigned = await prisma.session.updateMany({ where: { id: sessionId, tutorId: null, status: "PENDING" }, data: { tutorId: tid } });
    if (assigned.count > 0) return tid;
  }
  return null;
}

/* ==========================================================================
   ROUTE
   ========================================================================== */

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, verificationStatus: true, isDeactivated: true, email: true, name: true },
  });
  if (!dbUser || dbUser.isDeactivated) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (dbUser.verificationStatus !== "AUTO_VERIFIED") return NextResponse.json({ message: "Not verified" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const scheduledAtRaw = typeof body.scheduledAt === "string" ? body.scheduledAt : null;
  const proposalNote   = typeof body.note === "string" ? body.note.trim() || null : null;

  if (!scheduledAtRaw) return NextResponse.json({ message: "Missing date" }, { status: 400 });

  const newScheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(newScheduledAt.getTime())) return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  if (newScheduledAt.getTime() < Date.now() + 5 * 60_000) return NextResponse.json({ message: "Choose a time at least 5 minutes from now." }, { status: 400 });

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true, studentId: true, tutorId: true, subjectId: true, status: true,
      durationMin: true, studentReminderEmailId: true, calendarUid: true, calendarSequence: true,
      proposalStatus: true,
      subject: { select: { code: true, title: true } },
      tutor: { select: { email: true, name: true } },
    },
  });

  if (!session || session.studentId !== dbUser.id) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (session.status === "CANCELLED" || session.status === "COMPLETED") return NextResponse.json({ message: "Cannot reschedule this session" }, { status: 409 });

  // Block if there's already a pending proposal (either direction)
  if (session.proposalStatus === "PENDING") {
    return NextResponse.json(
      { message: "There is already a pending proposal on this session. Please resolve it first." },
      { status: 409 }
    );
  }

  const existingReminderId = session.studentReminderEmailId;
  const subjCode     = session.subject.code;
  const subjTitle    = session.subject.title;
  const studentEmail = dbUser.email;
  const studentName  = dbUser.name;
  const durationMin  = session.durationMin ?? 60;
  const newEndsAt    = new Date(newScheduledAt.getTime() + durationMin * 60_000);
  const prevTutorId  = session.tutorId;
  const uid          = session.calendarUid ?? `${session.id}@tutorlink`;

  // Student overlap check
  const studentClash = await prisma.session.findFirst({
    where: { id: { not: session.id }, studentId: dbUser.id, status: { in: ["PENDING", "ACCEPTED"] }, scheduledAt: { lt: newEndsAt }, endsAt: { gt: newScheduledAt } },
    select: { id: true },
  });
  if (studentClash) return NextResponse.json({ message: "You already have another booking that overlaps this time." }, { status: 409 });

  // ── Email helpers ─────────────────────────────────────────────────────────

  async function rescheduleReminderEmailSafe(finalSessionId: string, finalStartISO: string) {
    try {
      if (existingReminderId) {
        await cancelScheduledEmail(existingReminderId);
        await prisma.session.update({ where: { id: finalSessionId }, data: { studentReminderEmailId: null } });
      }
      await scheduleSessionReminderEmail({ sessionId: finalSessionId, toEmail: studentEmail, toName: studentName, subjectCode: subjCode, subjectTitle: subjTitle, scheduledAtISO: computeOneHourBeforeISO(finalStartISO) });
    } catch {}
  }

  async function sendCalendarUpdateSafe(opts: { finalStart: Date; finalEnd: Date; tutorEmail?: string | null; tutorName?: string | null; uid: string; sequence: number; }) {
    try {
      await sendSessionInviteEmail({ mode: "RESCHEDULED", toEmail: studentEmail, toName: studentName, subjectCode: subjCode, subjectTitle: subjTitle, startISO: opts.finalStart.toISOString(), endISO: opts.finalEnd.toISOString(), uid: opts.uid, sequence: opts.sequence, organizerName: "TutorLink", organizerEmail: process.env.RESEND_FROM_EMAIL! });
      if (opts.tutorEmail) await sendSessionInviteEmail({ mode: "RESCHEDULED", toEmail: opts.tutorEmail, toName: opts.tutorName ?? null, subjectCode: subjCode, subjectTitle: subjTitle, startISO: opts.finalStart.toISOString(), endISO: opts.finalEnd.toISOString(), uid: opts.uid, sequence: opts.sequence, organizerName: "TutorLink", organizerEmail: process.env.RESEND_FROM_EMAIL! });
    } catch {}
  }

  // =========================================================================
  // CASE A: Tutor IS assigned → send proposal, don't change time yet
  // =========================================================================

  if (session.tutorId) {
    // Hard clash check — tutor already booked at new time
    const tutorClash = await prisma.session.findFirst({
      where: { id: { not: session.id }, tutorId: session.tutorId, status: { in: ["PENDING", "ACCEPTED"] }, scheduledAt: { lt: newEndsAt }, endsAt: { gt: newScheduledAt } },
      select: { id: true },
    });

    if (tutorClash) {
      // Hard clash → unassign + inline reassign (direct update OK here since tutor can't take it)
      const updated = await prisma.session.update({
        where: { id: session.id },
        data: {
          scheduledAt: newScheduledAt, endsAt: newEndsAt, rescheduledAt: new Date(),
          status: "PENDING", tutorId: null,
          proposedAt: null, proposedEndAt: null, proposedNote: null, proposedByUserId: null, proposalStatus: null,
          calendarUid: uid, calendarSequence: { increment: 1 },
        },
        select: { id: true, scheduledAt: true, endsAt: true, durationMin: true, calendarUid: true, calendarSequence: true },
      });

      await rescheduleReminderEmailSafe(updated.id, updated.scheduledAt.toISOString());
      const fe = updated.endsAt ?? new Date(new Date(updated.scheduledAt).getTime() + durationMin * 60_000);
      await sendCalendarUpdateSafe({ finalStart: new Date(updated.scheduledAt), finalEnd: fe, tutorEmail: null, tutorName: null, uid: updated.calendarUid ?? uid, sequence: updated.calendarSequence ?? 0 });

      try {
        if (prevTutorId) await notify.user({ userId: prevTutorId, viewer: "TUTOR", type: "SESSION_RESCHEDULED_UNASSIGNED", title: "Session rescheduled", body: `Student rescheduled to ${formatMYT(newScheduledAt.toISOString())}. You're no longer assigned due to a time conflict.`, data: { sessionId: updated.id, newTime: newScheduledAt.toISOString() } });
      } catch {}

      try {
        const newTutorId = await tryReassignTutor({ sessionId: updated.id, subjectId: session.subjectId, start: newScheduledAt, end: newEndsAt, excludeTutorId: prevTutorId });
        if (newTutorId) {
          try { await notify.user({ userId: newTutorId, viewer: "TUTOR", type: "SESSION_BOOKED", title: "New session assigned", body: `You've been assigned a ${subjCode} session on ${formatMYT(newScheduledAt.toISOString())}.`, data: { sessionId: updated.id, scheduledAt: newScheduledAt.toISOString(), subjectCode: subjCode, subjectTitle: subjTitle } }); } catch {}
          return NextResponse.json({ success: true, queued: false, message: "Rescheduled and a new tutor has been assigned." });
        }
      } catch {}

      return NextResponse.json({ success: true, queued: true, message: "Rescheduled, but your tutor is busy at that time. We're finding a new tutor." });
    }

    // ── No hard clash → save as PENDING proposal for tutor to accept/reject ──
    // scheduledAt is NOT changed yet. Tutor sees banner, clicks Accept to apply.
    await prisma.session.update({
      where: { id: session.id },
      data: {
        proposedAt:       newScheduledAt,
        proposedEndAt:    newEndsAt,
        proposedNote:     proposalNote,
        proposedByUserId: dbUser.id,   // ← student's id = student proposal
        proposalStatus:   "PENDING",
        // scheduledAt / endsAt deliberately NOT updated here
      },
    });

    try {
      await notify.user({
        userId: session.tutorId,
        viewer: "TUTOR",
        type:   "TIME_PROPOSAL",
        title:  "Student proposed a new time",
        body:   `Your student wants to reschedule to ${formatMYT(newScheduledAt.toISOString())}. Please review and respond.`,
        data:   { sessionId: session.id, studentId: dbUser.id, proposedAt: newScheduledAt.toISOString() },
      });
    } catch {}

    return NextResponse.json({
      success:  true,
      proposed: true,
      message:  "Reschedule request sent to your tutor. The session time will update once they accept.",
    });
  }

  // =========================================================================
  // CASE B: No tutor assigned → direct reschedule + inline reassign
  // =========================================================================

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: { scheduledAt: newScheduledAt, endsAt: newEndsAt, rescheduledAt: new Date(), status: "PENDING", calendarUid: uid, calendarSequence: { increment: 1 } },
    select: { id: true, tutorId: true, scheduledAt: true, endsAt: true, durationMin: true, calendarUid: true, calendarSequence: true },
  });

  const finalStart = new Date(updated.scheduledAt);
  const finalEnd   = updated.endsAt ?? new Date(finalStart.getTime() + (updated.durationMin ?? durationMin) * 60_000);

  await rescheduleReminderEmailSafe(updated.id, updated.scheduledAt.toISOString());
  await sendCalendarUpdateSafe({ finalStart, finalEnd, tutorEmail: null, tutorName: null, uid: updated.calendarUid ?? uid, sequence: updated.calendarSequence ?? 0 });

  try {
    const newTutorId = await tryReassignTutor({ sessionId: updated.id, subjectId: session.subjectId, start: newScheduledAt, end: newEndsAt, excludeTutorId: null });
    if (newTutorId) {
      try { await notify.user({ userId: newTutorId, viewer: "TUTOR", type: "SESSION_BOOKED", title: "New session assigned", body: `You've been assigned a ${subjCode} session on ${formatMYT(newScheduledAt.toISOString())}.`, data: { sessionId: updated.id, scheduledAt: newScheduledAt.toISOString(), subjectCode: subjCode, subjectTitle: subjTitle } }); } catch {}
      return NextResponse.json({ success: true, queued: false });
    }
  } catch {}

  return NextResponse.json({ success: true, queued: true });
}