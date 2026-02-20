import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";
import { cancelScheduledEmail, sendSessionInviteEmail } from "@/lib/email";

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

  const tutor = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      name: true, // ✅ add (for organizerName + greeting)
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

  const body = await req.json().catch(() => ({}));
  const reasonRaw = typeof body.reason === "string" ? body.reason : "";
  const reason = reasonRaw.trim() || "Cancelled by tutor";

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

      // ✅ need student email to send cancel invite
      student: { select: { email: true, name: true } },
    },
  });

  if (!session || session.tutorId !== tutor.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.status === "CANCELLED" || session.status === "COMPLETED") {
    return NextResponse.json(
      { message: "This session is already closed." },
      { status: 409 }
    );
  }

  const start = new Date(session.scheduledAt);
  const end =
    session.endsAt ??
    new Date(start.getTime() + (session.durationMin ?? 60) * 60_000);

  if (new Date() >= end) {
    return NextResponse.json(
      { message: "You can’t cancel after the session has ended." },
      { status: 409 }
    );
  }

  // ✅ ensure calendar UID exists (stable across updates)
  const uid =
    session.calendarUid?.trim() ||
    `tutorlink-session-${session.id}@tutorlink.local`;

  const sequence =
    typeof session.calendarSequence === "number" ? session.calendarSequence : 0;

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,

      // ✅ clear any pending proposal so student UI won't show "waiting confirmation"
      proposedAt: null,
      proposedNote: null,
      proposalStatus: null, // or "REJECTED" if your DB expects a value

      // ✅ only set uid if it was missing
      ...(session.calendarUid ? {} : { calendarUid: uid }),
      // ✅ keep sequence unchanged here (or set to 0 if missing)
      ...(typeof session.calendarSequence === "number"
        ? {}
        : { calendarSequence: 0 }),
    },
    select: { id: true, studentId: true },
  });

    // ✅ NEW: close chat immediately when session cancelled
  await prisma.chatChannel.updateMany({
    where: { sessionId: session.id },
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

  // ✅ Calendar cancellation email (.ics) (do not block cancel if email fails)
  try {
    const studentEmail = session.student?.email;
    const studentName = session.student?.name ?? null;

    if (studentEmail) {
      await sendSessionInviteEmail({
        mode: "CANCELLED",
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
        cancelReason: reason,
      });
    }

    // ✅ optional: send cancellation to tutor too (keeps their calendar clean)
    await sendSessionInviteEmail({
      mode: "CANCELLED",
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
      cancelReason: reason,
    });
  } catch {
    // ignore calendar email errors
  }

  // ✅ Notify student (viewer must be STUDENT)
  try {
    if (updated.studentId) {
      await notify.sessionCancelled(updated.studentId, updated.id, "STUDENT", reason);
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ success: true, status: "CANCELLED" });
}
