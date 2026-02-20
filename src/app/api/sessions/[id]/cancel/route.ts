import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";
import { cancelScheduledEmail, sendSessionInviteEmail } from "@/lib/email"; // ✅ added

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
    select: { id: true, verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ message: "Not verified" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  // ✅ expanded select (calendar + subject + tutor email)
  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      tutorId: true,
      status: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
      cancelReason: true,
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
    return NextResponse.json({ message: "Already closed" }, { status: 409 });
  }

  // ✅ ensure calendar UID exists
  const uid = session.calendarUid ?? `${session.id}@tutorlink`;

  const updated = await prisma.session.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason || null,

      // ✅ calendar tracking
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

    // ✅ NEW: close chat immediately when session cancelled
  await prisma.chatChannel.updateMany({
    where: { sessionId: updated.id },
    data: {
      closeAt: new Date(),
      closedAt: new Date(),
    },
  });

  // ✅ Cancel scheduled reminder email (if any)
  try {
    if (session.studentReminderEmailId) {
      await cancelScheduledEmail(session.studentReminderEmailId);
      await prisma.session.update({
        where: { id: session.id },
        data: { studentReminderEmailId: null },
        select: { id: true },
      });
    }
  } catch {
    // ignore
  }

  // ✅ Notify tutor if assigned (viewer must be TUTOR)
  try {
    if (updated.tutorId) {
      await notify.sessionCancelled(
        updated.tutorId,
        updated.id,
        "TUTOR",
        reason || "Cancelled by student"
      );
    }
  } catch {
    // ignore
  }

  // ✅ NEW: Send calendar cancellation email (.ics) to student + tutor
  try {
    const start = new Date(updated.scheduledAt);
    const end =
      updated.endsAt ??
      new Date(start.getTime() + (updated.durationMin ?? 60) * 60_000);

    // Student cancellation notice
    await sendSessionInviteEmail({
      mode: "CANCELLED",
      toEmail: user.email.toLowerCase(),
      toName: null,
      subjectCode: session.subject.code,
      subjectTitle: session.subject.title,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      uid: updated.calendarUid ?? uid,
      sequence: updated.calendarSequence ?? 0,
      organizerName: "TutorLink",
      organizerEmail: process.env.RESEND_FROM_EMAIL!,
      cancelReason: reason || null,
    });

    // Tutor cancellation notice
    if (session.tutor?.email) {
      await sendSessionInviteEmail({
        mode: "CANCELLED",
        toEmail: session.tutor.email,
        toName: session.tutor.name,
        subjectCode: session.subject.code,
        subjectTitle: session.subject.title,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        uid: updated.calendarUid ?? uid,
        sequence: updated.calendarSequence ?? 0,
        organizerName: "TutorLink",
        organizerEmail: process.env.RESEND_FROM_EMAIL!,
        cancelReason: reason || null,
      });
    }
  } catch {
    // ignore calendar email errors
  }

  return NextResponse.json({ success: true });
}
