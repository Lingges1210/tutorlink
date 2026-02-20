// src/app/api/sessions/[id]/reschedule/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";
import {
  scheduleSessionReminderEmail,
  computeOneHourBeforeISO,
  cancelScheduledEmail,
  sendSessionInviteEmail, //  added
} from "@/lib/email";

/** ---------- availability parsing helpers (best-effort) ---------- */
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
  return k[d.getDay()];
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
  //  get latest APPROVED tutor application
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

async function tutorDeclaredAvailable(
  tutorId: string,
  start: Date,
  end: Date
): Promise<true | false | null> {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (!sameDay) return false;

  const avail = await getTutorAvailability(tutorId);
  if (!avail) return null;

  const dayKey = dayKeyFromDate(start);
  const day = avail.find((d) => d.day === dayKey);
  if (!day) return false;

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();

  return withinSlots(day, startMin, endMin);
}

/** ---------- route ---------- */
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

  //  Fetch existing session details
  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      tutorId: true, // may be null
      subjectId: true,
      status: true,
      durationMin: true,

      //  for cancelling old scheduled email
      studentReminderEmailId: true,

      //  calendar tracking
      calendarUid: true,
      calendarSequence: true,

      //  for email subject/body
      subject: { select: { code: true, title: true } },

      //  tutor email for calendar update email (if assigned)
      tutor: { select: { email: true, name: true } },
    },
  });

  if (!session || session.studentId !== dbUser.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  //  capture non-null values for TS (avoid "possibly null" inside helper)
  const existingReminderId = session.studentReminderEmailId;
  const subjCode = session.subject.code;
  const subjTitle = session.subject.title;

  const studentEmail = dbUser.email;
  const studentName = dbUser.name;

  const sessionId = session.id;

  if (session.status === "CANCELLED" || session.status === "COMPLETED") {
    return NextResponse.json(
      { message: "Cannot reschedule this session" },
      { status: 409 }
    );
  }

  const durationMin = session.durationMin ?? 60;
  const newEndsAt = new Date(newScheduledAt.getTime() + durationMin * 60_000);

  //  1) Student overlap check (exclude this session)
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

  const prevTutorId = session.tutorId; //  keep old tutor for notifications

  async function rescheduleReminderEmailSafe(
    finalSessionId: string,
    finalStartISO: string
  ) {
    try {
      // cancel old scheduled email if exists
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

  //  helper: send UPDATED calendar invite to student + tutor
  async function sendCalendarUpdateSafe(opts: {
    finalStart: Date;
    finalEnd: Date;
    tutorEmail?: string | null;
    tutorName?: string | null;
    uid: string;
    sequence: number;
  }) {
    try {
      // student update
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

      // tutor update (only if we have email)
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

  //  ensure calendar UID exists
  const uid = session.calendarUid ?? `${session.id}@tutorlink`;

  //  If tutor is assigned, enforce tutor availability + overlap
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
      // 👉 queue behavior: unassign tutor instead of hard-failing
      const updated = await prisma.session.update({
        where: { id: session.id },
        data: {
          scheduledAt: newScheduledAt,
          endsAt: newEndsAt,
          rescheduledAt: new Date(),
          status: "PENDING",
          tutorId: null,

          //  calendar tracking
          calendarUid: uid,
          calendarSequence: { increment: 1 },
        },
        select: {
          id: true,
          scheduledAt: true,
          endsAt: true,
          durationMin: true,
          calendarUid: true,
          calendarSequence: true,
        },
      });

      //  email: cancel old + schedule new (still meaningful for student)
      await rescheduleReminderEmailSafe(updated.id, updated.scheduledAt.toISOString());

      //  calendar UPDATED invite to student only (tutor is unassigned now)
      const end =
        updated.endsAt ??
        new Date(
          new Date(updated.scheduledAt).getTime() +
            (updated.durationMin ?? durationMin) * 60_000
        );

      await sendCalendarUpdateSafe({
        finalStart: new Date(updated.scheduledAt),
        finalEnd: end,
        tutorEmail: null,
        tutorName: null,
        uid: updated.calendarUid ?? uid,
        sequence: updated.calendarSequence ?? 0,
      });

      //  Notify old tutor that student rescheduled and tutor was unassigned
      try {
        if (prevTutorId) {
          await notify.user({
            userId: prevTutorId,
            viewer: "TUTOR", //  FIX
            type: "SESSION_RESCHEDULED_UNASSIGNED",
            title: "Session rescheduled 🔄",
            body: `Student rescheduled the session to ${newScheduledAt.toLocaleString()}. You’re no longer assigned due to a time conflict.`,
            data: { sessionId: updated.id, newTime: newScheduledAt.toISOString() },
          });
        }
      } catch {}

      return NextResponse.json({
        success: true,
        queued: true,
        message:
          "Rescheduled, but your tutor is busy at that time. You’ve been queued for reassignment.",
      });
    }

    // 3) Declared availability check (best-effort)
    const declared = await tutorDeclaredAvailable(
      session.tutorId,
      newScheduledAt,
      newEndsAt
    );

    if (declared === false) {
      const updated = await prisma.session.update({
        where: { id: session.id },
        data: {
          scheduledAt: newScheduledAt,
          endsAt: newEndsAt,
          rescheduledAt: new Date(),
          status: "PENDING",
          tutorId: null,

          //  calendar tracking
          calendarUid: uid,
          calendarSequence: { increment: 1 },
        },
        select: {
          id: true,
          scheduledAt: true,
          endsAt: true,
          durationMin: true,
          calendarUid: true,
          calendarSequence: true,
        },
      });

      //  email: cancel old + schedule new
      await rescheduleReminderEmailSafe(updated.id, updated.scheduledAt.toISOString());

      //  calendar UPDATED invite to student only (tutor unassigned)
      const end =
        updated.endsAt ??
        new Date(
          new Date(updated.scheduledAt).getTime() +
            (updated.durationMin ?? durationMin) * 60_000
        );

      await sendCalendarUpdateSafe({
        finalStart: new Date(updated.scheduledAt),
        finalEnd: end,
        tutorEmail: null,
        tutorName: null,
        uid: updated.calendarUid ?? uid,
        sequence: updated.calendarSequence ?? 0,
      });

      //  Notify old tutor that student rescheduled and tutor was unassigned
      try {
        if (prevTutorId) {
          await notify.user({
            userId: prevTutorId,
            viewer: "TUTOR", //  FIX
            type: "SESSION_RESCHEDULED_UNASSIGNED",
            title: "Session rescheduled 🔄",
            body: `Student rescheduled the session to ${newScheduledAt.toLocaleString()}. You’re no longer assigned because you’re unavailable at that time.`,
            data: { sessionId: updated.id, newTime: newScheduledAt.toISOString() },
          });
        }
      } catch {}

      return NextResponse.json({
        success: true,
        queued: true,
        message:
          "Rescheduled, but your tutor isn’t available then. You’ve been queued for reassignment.",
      });
    }
  }

  //  No tutor assigned OR tutor is fine -> normal reschedule
  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      scheduledAt: newScheduledAt,
      endsAt: newEndsAt,
      rescheduledAt: new Date(),
      status: "PENDING",

      //  calendar tracking
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

  //  email: cancel old + schedule new
  await rescheduleReminderEmailSafe(updated.id, updated.scheduledAt.toISOString());

  //  calendar UPDATED invite to student + (if assigned) tutor
  const finalStart = new Date(updated.scheduledAt);
  const finalEnd =
    updated.endsAt ??
    new Date(finalStart.getTime() + (updated.durationMin ?? durationMin) * 60_000);

  await sendCalendarUpdateSafe({
    finalStart,
    finalEnd,
    tutorEmail: session.tutorId ? session.tutor?.email : null,
    tutorName: session.tutorId ? session.tutor?.name : null,
    uid: updated.calendarUid ?? uid,
    sequence: updated.calendarSequence ?? 0,
  });

  //  Notify tutor if still assigned (viewer must be TUTOR)
  try {
    if (updated.tutorId) {
      await notify.sessionRescheduled(
        updated.tutorId,
        updated.id,
        "TUTOR",
        newScheduledAt.toISOString()
      );
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ success: true, queued: !session.tutorId });
}
