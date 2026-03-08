import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const ALLOWED_CATEGORIES = [
  "ACCOUNT_LOCK_APPEAL",
  "MISCONDUCT",
  "NO_SHOW",
  "INAPPROPRIATE_CHAT",
  "SESSION_ISSUE",
  "TECHNICAL_ISSUE",
  "GENERAL_COMPLAINT",
] as const;

const ALLOWED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServerComponent();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const formData = await req.formData();

    const category = String(formData.get("category") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const description = String(formData.get("description") || "").trim();

    const reportedUserIdRaw = String(formData.get("reportedUserId") || "").trim();
    const sessionIdRaw = String(formData.get("sessionId") || "").trim();
    const chatChannelIdRaw = String(formData.get("chatChannelId") || "").trim();

    const reportedUserId = reportedUserIdRaw || null;
    const sessionId = sessionIdRaw || null;
    const chatChannelId = chatChannelIdRaw || null;

    if (!ALLOWED_CATEGORIES.includes(category as (typeof ALLOWED_CATEGORIES)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid category" }, { status: 400 });
    }

    if (!subject || subject.length < 3) {
      return NextResponse.json({ ok: false, error: "Subject is required" }, { status: 400 });
    }

    if (!description || description.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Description must be at least 10 characters" },
        { status: 400 }
      );
    }

    if (reportedUserId) {
      const reportedUser = await prisma.user.findUnique({
        where: { id: reportedUserId },
        select: { id: true },
      });

      if (!reportedUser) {
        return NextResponse.json(
          { ok: false, error: "Reported user not found" },
          { status: 404 }
        );
      }
    }

    if (sessionId) {
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          OR: [{ studentId: dbUser.id }, { tutorId: dbUser.id }],
        },
        select: { id: true },
      });

      if (!session) {
        return NextResponse.json(
          { ok: false, error: "Related session not found or not accessible" },
          { status: 404 }
        );
      }
    }

    if (chatChannelId) {
      const channel = await prisma.chatChannel.findFirst({
        where: {
          id: chatChannelId,
          OR: [{ studentId: dbUser.id }, { tutorId: dbUser.id }],
        },
        select: { id: true },
      });

      if (!channel) {
        return NextResponse.json(
          { ok: false, error: "Related chat channel not found or not accessible" },
          { status: 404 }
        );
      }
    }

    let evidenceUrl: string | null = null;

    const evidence = formData.get("evidence");
    if (evidence && evidence instanceof File && evidence.size > 0) {
      if (!ALLOWED_FILE_TYPES.includes(evidence.type)) {
        return NextResponse.json(
          { ok: false, error: `Unsupported evidence type: ${evidence.type}` },
          { status: 400 }
        );
      }

      if (evidence.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { ok: false, error: "Evidence file too large. Max 5MB." },
          { status: 400 }
        );
      }

      const ext =
        evidence.name.split(".").pop()?.toLowerCase() ||
        (evidence.type === "application/pdf" ? "pdf" : "jpg");

      const safeName = `report_${Date.now()}_${safeFileName(
        evidence.name || `evidence.${ext}`
      )}`;
      const storagePath = `${dbUser.id}/${safeName}`;

      const arrayBuffer = await evidence.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const { error: uploadErr } = await adminSupabase.storage
        .from("report-evidence")
        .upload(storagePath, bytes, {
          contentType: evidence.type,
          upsert: false,
        });

      if (uploadErr) {
        console.error("REPORT EVIDENCE UPLOAD ERROR:", uploadErr);
        return NextResponse.json(
          { ok: false, error: uploadErr.message || "Failed to upload evidence" },
          { status: 500 }
        );
      }

      evidenceUrl = storagePath;
    }

    const report = await prisma.userReport.create({
      data: {
        reporterUserId: dbUser.id,
        reportedUserId,
        sessionId,
        chatChannelId,
        category: category as any,
        subject,
        description,
        evidenceUrl,
        priority: category === "ACCOUNT_LOCK_APPEAL" ? "HIGH" : "MEDIUM",
      },
      include: {
        reporterUser: {
          select: { id: true, name: true, email: true, role: true },
        },
        reportedUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json({ ok: true, report }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reports error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create report" },
      { status: 500 }
    );
  }
}