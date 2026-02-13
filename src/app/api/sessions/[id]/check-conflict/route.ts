import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });

  if (!dbUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const scheduledAtRaw =
    typeof body.scheduledAt === "string" ? body.scheduledAt : null;

  if (!scheduledAtRaw) {
    return NextResponse.json({ message: "Missing date" }, { status: 400 });
  }

  const newStart = new Date(scheduledAtRaw);
  if (Number.isNaN(newStart.getTime())) {
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      tutorId: true,
      durationMin: true,
      studentId: true,
    },
  });

  if (!session || session.studentId !== dbUser.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const durationMin = session.durationMin ?? 60;
  const newEnd = new Date(newStart.getTime() + durationMin * 60_000);

  // Overlap rule
  const studentClash = await prisma.session.findFirst({
    where: {
      id: { not: id },
      studentId: dbUser.id,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: newEnd },
      endsAt: { gt: newStart },
    },
  });

  const tutorClash = await prisma.session.findFirst({
    where: {
      id: { not: id },
      tutorId: session.tutorId,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: newEnd },
      endsAt: { gt: newStart },
    },
  });

  return NextResponse.json({
    studentConflict: !!studentClash,
    tutorConflict: !!tutorClash,
  });
}
