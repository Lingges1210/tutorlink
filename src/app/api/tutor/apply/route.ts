import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const subjects = typeof body.subjects === "string" ? body.subjects.trim() : "";
  const cgpa = typeof body.cgpa === "number" ? body.cgpa : null;
  const availability = typeof body.availability === "string" ? body.availability.trim() : null;

  if (!subjects) {
    return NextResponse.json({ success: false, message: "Subjects are required" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });

  if (!dbUser) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  // prevent duplicate pending applications
  const existing = await prisma.tutorApplication.findFirst({
    where: { userId: dbUser.id, status: "PENDING" },
  });

  if (existing) {
    return NextResponse.json({ success: false, message: "You already have a pending application." }, { status: 409 });
  }

  const app = await prisma.tutorApplication.create({
    data: {
      userId: dbUser.id,
      subjects,
      cgpa: cgpa ?? undefined,
      availability: availability ?? undefined,
      status: "PENDING",
    },
  });

  return NextResponse.json({ success: true, application: app });
}
