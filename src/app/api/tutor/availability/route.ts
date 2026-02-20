// src/app/api/tutor/availability/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

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
    // ignore - allocator cron will still handle it
  }
}

export async function GET() {
  try {
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ✅ IMPORTANT: read from APPROVED application only
    const app = await prisma.tutorApplication.findFirst({
      where: { userId: dbUser.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: { availability: true, status: true },
    });

    return NextResponse.json({
      success: true,
      availability: app?.availability ?? null,
      status: app?.status ?? null,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const availability =
      typeof body.availability === "string" ? body.availability.trim() : "";

    if (!availability) {
      return NextResponse.json(
        { success: false, message: "Availability is required" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ✅ IMPORTANT: only update APPROVED application
    const approved = await prisma.tutorApplication.findFirst({
      where: { userId: dbUser.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!approved) {
      return NextResponse.json(
        { success: false, message: "You are not an approved tutor yet." },
        { status: 403 }
      );
    }

    await prisma.tutorApplication.update({
      where: { id: approved.id },
      data: { availability },
    });

    await triggerAllocator();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}