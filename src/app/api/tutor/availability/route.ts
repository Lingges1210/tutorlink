// src/app/api/tutor/availability/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET() {
  try {
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // ✅ adjust model name if yours differs
    const app = await prisma.tutorApplication.findFirst({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      select: { availability: true, status: true },
    });

    return NextResponse.json({
      success: true,
      availability: app?.availability ?? null,
      status: app?.status ?? null,
    });
  } catch {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const availability = typeof body.availability === "string" ? body.availability : null;

    if (!availability?.trim()) {
      return NextResponse.json({ success: false, message: "Availability is required" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // ✅ update latest application (or create separate tutorProfile table later)
    const latest = await prisma.tutorApplication.findFirst({
      where: { userId: dbUser.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!latest) {
      return NextResponse.json(
        { success: false, message: "No tutor application found." },
        { status: 404 }
      );
    }

    await prisma.tutorApplication.update({
      where: { id: latest.id },
      data: { availability },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
