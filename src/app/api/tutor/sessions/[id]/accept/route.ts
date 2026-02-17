// src/app/api/tutor/sessions/[id]/accept/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";
import {
  scheduleSessionReminderEmail,
  computeOneHourBeforeISO,
  cancelScheduledEmail,
  sendSessionInviteEmail, // ✅ add this
} from "@/lib/email";

export async function POST(
  _req: Request,
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

  const tutor = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      name: true, // ✅ add (for email greeting)
      isDeactivated: true,
      verificationStatus: true,
      isTutorApproved: true,
      role: true,
      roleAssignments: { select: { role: true } },
    },
  });

  if (!tutor || tutor.isDeactivated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isTutor =
    tutor.isTutorApproved ||
    tutor.role === "TUTOR" ||
    tutor.roleAssignments.some((r) => r.role === "TUTOR");

  if (!isTutor || tutor.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // ✅ Need scheduledAt + endsAt for conflict checks + studentId for notification
  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      tutorId: true,
      studentId: true,
      status: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,

      // ✅ scheduled reminder tracking
      studentReminderEmailId: true,

      // ✅ calendar invite tracking
      calendarUid: true,
      calendarSequence: true,

      // ✅ for email contents
      subject: { select: { code: true, title: true } },
      student: { select: { email: true, name: true } },
    },
  });

  if (!session || session.tutorId !== tutor.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.status !== "PENDING") {
    return NextResponse.json(
      { message: "Only pending sessions can be accepted" },
      { status: 409 }
    );
  }

  const start = new Date(session.scheduledAt);
  const end =
    session.endsAt ??
    new Date(start.getTime() + (session.durationMin ?? 60) * 60_000);

  // ✅ Prevent double-booking: any ACCEPTED session overlap => block
  const clash = await prisma.session.findFirst({
    where: {
      tutorId: tutor.id,
      status: "ACCEPTED",
      id: { not: session.id },
      scheduledAt: { lt: end },
      endsAt: { gt: start },
    },
    select: { id: true },
  });

  if (clash) {
    return NextResponse.json(
      {
        message: "You already accepted another session that overlaps this time.",
      },
      { status: 409 }
    );
  }

  // ✅ ensure calendar UID exists (stable across updates)
  const uid =
    session.calendarUid?.trim() ||
    `tutorlink-session-${session.id}@tutorlink.local`;

  const sequence = typeof session.calendarSequence === "number"
    ? session.calendarSequence
    : 0;

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      status: "ACCEPTED",
      // ✅ only set uid if it was missing
      ...(session.calendarUid ? {} : { calendarUid: uid }),
      // ✅ keep sequence unchanged on first accept
      ...(typeof session.calendarSequence === "number"
        ? {}
        : { calendarSequence: 0 }),
    },
    select: {
      id: true,
      tutorId: true,
      studentId: true,
      scheduledAt: true,
    },
  });

  // ✅ Notifications (do not block accept if notification fails)
  try {
    if (updated.studentId && updated.tutorId) {
      await notify.bookingConfirmed(
        updated.studentId,
        updated.tutorId,
        updated.id,
        updated.scheduledAt.toISOString()
      );
    }
  } catch {
    // ignore notification errors
  }

  // ✅ Calendar invite email (.ics) (do not block accept if email fails)
  try {
    const studentEmail = session.student?.email;
    const studentName = session.student?.name ?? null;

    if (studentEmail) {
      await sendSessionInviteEmail({
        mode: "ACCEPTED",
        toEmail: studentEmail,
        toName: studentName,
        subjectCode: session.subject.code,
        subjectTitle: session.subject.title,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        uid,
        sequence,
        organizerName: tutor.name ?? "TutorLink Tutor",
        organizerEmail: user.email.toLowerCase(),
      });
    }

    // ✅ optional: also send to tutor so tutor can add it to their calendar
    await sendSessionInviteEmail({
      mode: "ACCEPTED",
      toEmail: user.email.toLowerCase(),
      toName: tutor.name ?? null,
      subjectCode: session.subject.code,
      subjectTitle: session.subject.title,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      uid,
      sequence,
      organizerName: tutor.name ?? "TutorLink Tutor",
      organizerEmail: user.email.toLowerCase(),
    });
  } catch {
    // ignore calendar email errors
  }

  // ✅ Existing reminder email logic (keep)
  try {
    const toEmail = session.student?.email;
    if (toEmail) {
      // cancel old scheduled reminder if any (safety)
      if (session.studentReminderEmailId) {
        await cancelScheduledEmail(session.studentReminderEmailId);
        await prisma.session.update({
          where: { id: session.id },
          data: { studentReminderEmailId: null },
        });
      }

      const scheduledAtISO = computeOneHourBeforeISO(
        updated.scheduledAt.toISOString()
      );

      await scheduleSessionReminderEmail({
        sessionId: session.id,
        toEmail,
        toName: session.student?.name,
        subjectCode: session.subject.code,
        subjectTitle: session.subject.title,
        scheduledAtISO,
      });
    }
  } catch {
    // ignore email errors
  }

  return NextResponse.json({ success: true, status: "ACCEPTED" });
}
