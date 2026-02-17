// src/app/api/tutor/sessions/[id]/complete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";

async function triggerAllocator() {
  const appUrl = process.env.APP_URL;
  const secret = process.env.ALLOCATOR_SECRET;
  if (!appUrl || !secret) return;

  try {
    await fetch(`${appUrl}/api/sessions/allocate`, {
      method: "POST",
      headers: { "x-allocator-secret": secret },
      cache: "no-store",
    });
  } catch {
    // ignore
  }
}

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

  if (session.status !== "ACCEPTED") {
    return NextResponse.json(
      { message: "Only accepted sessions can be completed" },
      { status: 409 }
    );
  }

  const start = new Date(session.scheduledAt);
  const end =
    session.endsAt ??
    new Date(start.getTime() + (session.durationMin ?? 60) * 60_000);

  if (new Date() < end) {
    return NextResponse.json(
      { message: "You can complete this after the session ends." },
      { status: 409 }
    );
  }

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: { status: "COMPLETED" },
    select: { id: true, studentId: true },
  });

  // ✅ keep chat open for 8 hours after tutor completes
try {
  const closeAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

  await prisma.chatChannel.upsert({
    where: { sessionId: updated.id },
    create: {
      sessionId: updated.id,
      studentId: session.studentId,
      tutorId: session.tutorId!, // ACCEPTED => tutorId exists
      closeAt,
    },
    update: { closeAt, closedAt: null },
  });
} catch {
  // ignore
}



  // ✅ Notify student (viewer must be STUDENT)
  try {
    if (updated.studentId) {
      await notify.user({
        userId: updated.studentId,
        viewer: "STUDENT",
        type: "SESSION_COMPLETED",
        title: "Session completed ✅",
        body: "Your tutoring session has been marked as completed. Chat stays open for 8 hours.",
        data: { sessionId: updated.id },
      });
    }
  } catch {
    // ignore
  }

  await triggerAllocator();

  return NextResponse.json({
    success: true,
    status: "COMPLETED",
    chatCloseHours: 8,
  });
}
