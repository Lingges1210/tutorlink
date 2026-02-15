// src/app/api/tutor/sessions/[id]/accept/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";

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
        message:
          "You already accepted another session that overlaps this time.",
      },
      { status: 409 }
    );
  }

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: { status: "ACCEPTED" },
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


  return NextResponse.json({ success: true, status: "ACCEPTED" });
}
