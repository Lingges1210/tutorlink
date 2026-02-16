import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";
import { cancelScheduledEmail } from "@/lib/email";

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
      tutorId: true,
      studentId: true,
      status: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
      studentReminderEmailId: true, // ✅ added
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

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
    },
    select: { id: true, studentId: true },
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

  // ✅ Notify student (viewer must be STUDENT)
  try {
    if (updated.studentId) {
      await notify.sessionCancelled(
        updated.studentId,
        updated.id,
        "STUDENT",
        reason
      );
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ success: true, status: "CANCELLED" });
}
