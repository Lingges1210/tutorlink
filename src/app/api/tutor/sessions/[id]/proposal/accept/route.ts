// src/app/api/tutor/sessions/[id]/proposal/accept/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";
import { sendSessionInviteEmail } from "@/lib/email";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  void request;
  const { id } = await ctx.params;

  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tutor = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
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

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      tutorId: true,
      studentId: true,
      status: true,
      durationMin: true,
      proposedAt: true,
      proposedEndAt: true,
      proposedByUserId: true,
      proposalStatus: true,
      calendarUid: true,
      calendarSequence: true,
      subject: { select: { code: true, title: true } },
      student: { select: { email: true, name: true } },
    },
  });

  if (!session || session.tutorId !== tutor.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.status === "CANCELLED" || session.status === "COMPLETED") {
    return NextResponse.json(
      { message: "Cannot accept proposal for a closed session." },
      { status: 409 }
    );
  }

  if (session.proposalStatus !== "PENDING" || !session.proposedAt) {
    return NextResponse.json(
      { message: "No pending proposal to accept." },
      { status: 409 }
    );
  }

  // Guard: only accept proposals that came FROM the student
  if (session.proposedByUserId !== session.studentId) {
    return NextResponse.json(
      { message: "This proposal was not made by the student." },
      { status: 409 }
    );
  }

  const durationMin    = session.durationMin ?? 60;
  const newScheduledAt = new Date(session.proposedAt);
  const newEndsAt      =
    session.proposedEndAt ??
    new Date(newScheduledAt.getTime() + durationMin * 60_000);

  // Tutor overlap check (exclude this session)
  const tutorClash = await prisma.session.findFirst({
    where: {
      id: { not: session.id },
      tutorId: tutor.id,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: newEndsAt },
      endsAt: { gt: newScheduledAt },
    },
    select: { id: true },
  });

  if (tutorClash) {
    return NextResponse.json(
      { message: "You have another session that conflicts with this proposed time." },
      { status: 409 }
    );
  }

  // Student overlap check (exclude this session)
  const studentClash = await prisma.session.findFirst({
    where: {
      id: { not: session.id },
      studentId: session.studentId,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: newEndsAt },
      endsAt: { gt: newScheduledAt },
    },
    select: { id: true },
  });

  if (studentClash) {
    return NextResponse.json(
      { message: "The student has another booking that overlaps this proposed time." },
      { status: 409 }
    );
  }

  const uid      = session.calendarUid ?? `${session.id}@tutorlink`;
  const sequence = typeof session.calendarSequence === "number"
    ? session.calendarSequence + 1
    : 1;

  // Apply the proposal as the new schedule
  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      scheduledAt:      newScheduledAt,
      endsAt:           newEndsAt,
      rescheduledAt:    new Date(),
      status:           "PENDING",
      proposalStatus:   "ACCEPTED",
      proposedAt:       null,
      proposedEndAt:    null,
      proposedNote:     null,
      proposedByUserId: null,
      calendarUid:      uid,
      calendarSequence: sequence,
    },
    select: {
      id: true,
      studentId: true,
      scheduledAt: true,
    },
  });

  // Send calendar update emails to both parties
  try {
    const startISO  = updated.scheduledAt.toISOString();
    const endISO    = newEndsAt.toISOString();
    const subjCode  = session.subject.code;
    const subjTitle = session.subject.title;

    if (session.student?.email) {
      await sendSessionInviteEmail({
        mode: "RESCHEDULED",
        toEmail: session.student.email,
        toName:  session.student.name ?? null,
        subjectCode: subjCode, subjectTitle: subjTitle,
        startISO, endISO,
        uid, sequence,
        organizerName:  tutor.name ?? "TutorLink Tutor",
        organizerEmail: tutor.email,
      });
    }

    await sendSessionInviteEmail({
      mode: "RESCHEDULED",
      toEmail: tutor.email,
      toName:  tutor.name ?? null,
      subjectCode: subjCode, subjectTitle: subjTitle,
      startISO, endISO,
      uid, sequence,
      organizerName:  tutor.name ?? "TutorLink Tutor",
      organizerEmail: tutor.email,
    });
  } catch {
    // ignore email errors
  }

  // Notify student that their reschedule was accepted
  try {
    const when = new Date(newScheduledAt).toLocaleString("en-MY", {
      timeZone: "Asia/Kuala_Lumpur",
      weekday: "short", day: "numeric", month: "short",
      hour: "numeric", minute: "2-digit", hour12: true,
    }) + " MYT";

    await notify.user({
      userId: updated.studentId,
      viewer: "STUDENT",
      type:   "TIME_PROPOSAL_ACCEPTED",
      title:  "Reschedule accepted",
      body:   `Your tutor accepted your reschedule request. Session updated to ${when}.`,
      data:   { sessionId: updated.id, newTime: newScheduledAt.toISOString() },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ success: true });
}