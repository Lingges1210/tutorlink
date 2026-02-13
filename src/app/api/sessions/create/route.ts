import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
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
  const tutorId = typeof body.tutorId === "string" ? body.tutorId : null;
  const subjectId = typeof body.subjectId === "string" ? body.subjectId : null;
  const scheduledAtRaw =
    typeof body.scheduledAt === "string" ? body.scheduledAt : null;

  const durationMinRaw = body.durationMin;
  const durationMinParsed = Number(durationMinRaw);
  const durationMin = Number.isFinite(durationMinParsed)
    ? clamp(durationMinParsed, 30, 180)
    : 60;

  if (!tutorId || !subjectId || !scheduledAtRaw) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ message: "Invalid date" }, { status: 400 });
  }

  const endsAt = new Date(scheduledAt.getTime() + durationMin * 60_000);

  // ✅ Ensure tutor is eligible + teaches that subject
  const tutorOk = await prisma.tutorSubject.findFirst({
    where: {
      tutorId,
      subjectId,
      tutor: {
        isTutorApproved: true,
        verificationStatus: "AUTO_VERIFIED",
        isDeactivated: false,
      },
    },
    select: { id: true },
  });

  if (!tutorOk) {
    return NextResponse.json(
      { message: "Tutor not available for this subject" },
      { status: 409 }
    );
  }

  // ✅ Overlap rule:
  // clash if (start < otherEnd) AND (end > otherStart)

  // 1) Student overlap check
  const studentClash = await prisma.session.findFirst({
    where: {
      studentId: dbUser.id,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: endsAt },
      endsAt: { gt: scheduledAt },
    },
    select: { id: true },
  });

  if (studentClash) {
    return NextResponse.json(
      { message: "You already have a booking that overlaps this time." },
      { status: 409 }
    );
  }

  // 2) Tutor overlap check
  const tutorClash = await prisma.session.findFirst({
    where: {
      tutorId,
      status: { in: ["PENDING", "ACCEPTED"] },
      scheduledAt: { lt: endsAt },
      endsAt: { gt: scheduledAt },
    },
    select: { id: true },
  });

  if (tutorClash) {
    return NextResponse.json(
      { message: "Tutor is already booked for that time." },
      { status: 409 }
    );
  }

  const created = await prisma.session.create({
    data: {
      studentId: dbUser.id,
      tutorId,
      subjectId,
      scheduledAt,
      durationMin,
      endsAt, // ✅ new field
      status: "PENDING",
    },
    select: { id: true },
  });

  return NextResponse.json({ success: true, id: created.id });
}
