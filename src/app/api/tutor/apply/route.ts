import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const subjects = typeof body.subjects === "string" ? body.subjects.trim() : "";
  const cgpa = typeof body.cgpa === "number" ? body.cgpa : null;
  const availability =
    typeof body.availability === "string" ? body.availability.trim() : "";

  // ✅ NEW: transcriptPath from body
  const transcriptPath =
    typeof body.transcriptPath === "string" ? body.transcriptPath.trim() : "";


  if (cgpa === null || !Number.isFinite(cgpa)) {
    return NextResponse.json({ success: false, message: "CGPA is required" }, { status: 400 });
  }

  if (!availability) {
    return NextResponse.json(
      { success: false, message: "Availability is required" },
      { status: 400 }
    );
  }

  if (!transcriptPath) {
    return NextResponse.json(
      { success: false, message: "Academic transcript is required" },
      { status: 400 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, verificationStatus: true, isDeactivated: true, isTutorApproved: true },
  });

  if (!dbUser) {
    return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
  }

  if (dbUser.isDeactivated) {
    return NextResponse.json({ success: false, message: "Account deactivated" }, { status: 403 });
  }

  if (dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json(
      { success: false, message: "Please complete verification first" },
      { status: 403 }
    );
  }

  if (dbUser.isTutorApproved) {
    return NextResponse.json(
      { success: false, message: "You are already an approved tutor" },
      { status: 409 }
    );
  }

  // Block duplicate pending applications
  const existingPending = await prisma.tutorApplication.findFirst({
    where: { userId: dbUser.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  if (existingPending) {
    return NextResponse.json(
      { success: false, message: "You already have a pending application" },
      { status: 409 }
    );
  }

  // ✅ Create application
  const application = await prisma.tutorApplication.create({
    data: {
      userId: dbUser.id,
      subjects,
      cgpa,
      availability,
      transcriptPath, // ✅ now defined
      status: "PENDING",
    },
  });

  return NextResponse.json({ success: true, application });
}
