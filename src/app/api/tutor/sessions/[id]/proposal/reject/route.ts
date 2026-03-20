// src/app/api/tutor/sessions/[id]/proposal/reject/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";

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
      proposedAt: true,
      proposedByUserId: true,
      proposalStatus: true,
    },
  });

  if (!session || session.tutorId !== tutor.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.status === "CANCELLED" || session.status === "COMPLETED") {
    return NextResponse.json(
      { message: "Cannot reject proposal for a closed session." },
      { status: 409 }
    );
  }

  if (session.proposalStatus !== "PENDING" || !session.proposedAt) {
    return NextResponse.json(
      { message: "No pending proposal to reject." },
      { status: 409 }
    );
  }

  // Guard: only reject proposals that came FROM the student
  if (session.proposedByUserId !== session.studentId) {
    return NextResponse.json(
      { message: "This proposal was not made by the student." },
      { status: 409 }
    );
  }

  // Clear the proposal — session time stays unchanged
  await prisma.session.update({
    where: { id: session.id },
    data: {
      proposalStatus:   "REJECTED",
      proposedAt:       null,
      proposedEndAt:    null,
      proposedNote:     null,
      proposedByUserId: null,
    },
  });

  // Notify student their request was rejected
  try {
    await notify.user({
      userId: session.studentId,
      viewer: "STUDENT",
      type:   "TIME_PROPOSAL_REJECTED",
      title:  "Reschedule declined",
      body:   "Your tutor declined your reschedule request. The session time remains unchanged.",
      data:   { sessionId: session.id },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ success: true });
}