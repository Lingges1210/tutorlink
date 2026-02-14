import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

function isoToDate(v: unknown) {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

  // required
  const proposedAt = isoToDate(body.proposedAt);
  if (!proposedAt) {
    return NextResponse.json(
      { message: "proposedAt is required and must be a valid ISO date." },
      { status: 400 }
    );
  }

  // optional: allow tutor to propose end time; else compute from duration
  const proposedEndAt = isoToDate(body.proposedEndAt);

  const noteRaw = typeof body.note === "string" ? body.note : "";
  const note = noteRaw.trim() || null;

  if (proposedAt.getTime() < Date.now() + 5 * 60_000) {
    return NextResponse.json(
      { message: "Choose a time at least 5 minutes from now." },
      { status: 400 }
    );
  }

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      tutorId: true,
      status: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
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

  // don’t allow proposing after session ended
  const start = new Date(session.scheduledAt);
  const end =
    session.endsAt ??
    new Date(start.getTime() + (session.durationMin ?? 60) * 60_000);

  if (new Date() >= end) {
    return NextResponse.json(
      { message: "You can’t propose a new time after the session ended." },
      { status: 409 }
    );
  }

  const finalProposedEndAt =
    proposedEndAt ??
    new Date(proposedAt.getTime() + (session.durationMin ?? 60) * 60_000);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      proposedAt,
      proposedEndAt: finalProposedEndAt,
      proposedNote: note,
      proposalStatus: "PENDING",
      proposedByUserId: tutor.id,
    },
  });

  return NextResponse.json({
    success: true,
    proposalStatus: "PENDING",
    proposedAt: proposedAt.toISOString(),
    proposedEndAt: finalProposedEndAt.toISOString(),
  });
}
