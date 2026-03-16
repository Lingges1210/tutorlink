import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

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
    const description = String(formData.get("description") || "").trim();

    if (!description || description.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Description must be at least 10 characters" },
        { status: 400 }
      );
    }

    const existingAppeal = await prisma.userReport.findFirst({
      where: {
        reporterUserId: dbUser.id,
        category: "ACCOUNT_LOCK_APPEAL",
        status: {
          in: ["OPEN", "IN_REVIEW"],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingAppeal) {
      return NextResponse.json(
        { ok: false, error: "You already have an active lock appeal." },
        { status: 409 }
      );
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

      const safeName = `appeal_${Date.now()}_${safeFileName(
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
        console.error("ACCOUNT LOCK APPEAL EVIDENCE UPLOAD ERROR:", uploadErr);
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
        category: "ACCOUNT_LOCK_APPEAL",
        subject: "Account Lock Appeal",
        description,
        evidenceUrl,
        priority: "HIGH",
      },
      include: {
        reporterUser: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json({ ok: true, report }, { status: 201 });
  } catch (error) {
    console.error("POST /api/account-lock-appeal error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to submit appeal" },
      { status: 500 }
    );
  }
}