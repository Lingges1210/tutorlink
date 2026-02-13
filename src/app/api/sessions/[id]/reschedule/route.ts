import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

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
  const scheduledAtRaw =
    typeof body.scheduledAt === "string" ? body.scheduledAt : null;

  if (!scheduledAtRaw) {
    return NextResponse.json({ message: "Missing date" }, { status: 400 });
  }

  const newScheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(newScheduledAt.getTime())) {
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  }

  // ✅ Fetch existing session details (need tutorId + durationMin)
  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      tutorId: true,
      status: true,
      durationMin: true,
    },
  });

  if (!session || session.studentId !== dbUser.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.status === "CANCELLED" || session.status === "COMPLETED") {
    return NextResponse.json(
      { message: "Cannot reschedule this session" },
      { status: 409 }
    );
  }

  const durationMin = session.durationMin ?? 60;
  const newEndsAt = new Date(newScheduledAt.getTime() + durationMin * 60_000);

  // ✅ Overlap rule: start < otherEnd && end > otherStart
  // Exclude THIS session (id: { not: session.id })

  // 1) Student overlap check
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
    return NextResponse.json(
      { message: "Tutor is already booked for that time." },
      { status: 409 }
    );
  }

  await prisma.session.update({
    where: { id: session.id },
    data: {
      scheduledAt: newScheduledAt,
      endsAt: newEndsAt,        // ✅ keep endsAt consistent
      rescheduledAt: new Date(),
      status: "PENDING",
    },
  });

  return NextResponse.json({ success: true });
}
