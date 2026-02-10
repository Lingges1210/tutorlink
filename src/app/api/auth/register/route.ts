import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase";
import { supabaseServerAnon } from "@/lib/supabaseServerAnon";

import {
  extractTextFromImage,
  matchMatricAndName,
} from "@/lib/googleVision";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const email = String(formData.get("email") || "").trim().toLowerCase();
    const fullName = String(formData.get("fullName") || "").trim();
    const programme = String(formData.get("programme") || "").trim();
    const matricNo = String(formData.get("matricNo") || "").trim();
    const password = String(formData.get("password") || "");
    const captcha = String(formData.get("captcha") || "").trim();
    const matricCard = formData.get("matricCard") as File | null;

    const roleRaw = String(formData.get("role") || "STUDENT").toUpperCase();
    const role = roleRaw === "TUTOR" ? "TUTOR" : "STUDENT";

    // --------------------------
    // Basic validation
    // --------------------------
    if (!email || !fullName || !programme || !matricNo || !password) {
      return NextResponse.json(
        { success: false, message: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    if (captcha.toLowerCase() !== "usm") {
      return NextResponse.json(
        { success: false, message: "Captcha incorrect." },
        { status: 400 }
      );
    }

    if (!matricCard) {
      return NextResponse.json(
        { success: false, message: "Matric card file is required." },
        { status: 400 }
      );
    }

    if (!email.endsWith("@student.usm.my") && !email.endsWith("@usm.my")) {
      return NextResponse.json(
        { success: false, message: "Please use a valid USM email." },
        { status: 400 }
      );
    }

    // --------------------------
    // Prisma uniqueness checks
    // --------------------------
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email is already registered." },
        { status: 400 }
      );
    }

    const existingMatric = await prisma.user.findFirst({ where: { matricNo } });
    if (existingMatric) {
      return NextResponse.json(
        {
          success: false,
          message: "This matric number is already linked to another account.",
        },
        { status: 400 }
      );
    }

    // --------------------------
    // Hash password (local DB)
    // --------------------------
    const passwordHash = await bcrypt.hash(password, 10);

    // --------------------------
    // Upload matric card to Supabase Storage
    // --------------------------
    const bucket = process.env.SUPABASE_STORAGE_BUCKET!;
    const timestamp = Date.now();
    const fileExt = matricCard.name.split(".").pop() || "bin";
    const safeMatric = matricNo.replace(/[^a-zA-Z0-9_-]/g, "");
    const objectPath = `matric-cards/${safeMatric}-${timestamp}.${fileExt}`;

    const buffer = Buffer.from(await matricCard.arrayBuffer());

    const { data: uploadData, error: uploadError } =
      await supabaseServer.storage.from(bucket).upload(objectPath, buffer, {
        contentType: matricCard.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError || !uploadData?.path) {
      return NextResponse.json(
        { success: false, message: "Failed to upload matric card." },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseServer.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    const matricCardUrl = publicUrlData.publicUrl;

    // --------------------------
    // OCR verification (non-blocking)
    // --------------------------
    let ocrText = "";
    let ocrMatchedMatric = false;
    let ocrMatchedName = false;
    let verificationStatus: "AUTO_VERIFIED" | "PENDING_REVIEW" =
      "PENDING_REVIEW";

    try {
      ocrText = await extractTextFromImage(buffer);

      const match = matchMatricAndName({
        ocrText,
        matricNo,
        fullName,
      });

      ocrMatchedMatric = match.matricMatch;
      ocrMatchedName = match.nameMatch;

      const hasUSM =
        ocrText.toLowerCase().includes("usm") ||
        ocrText.toLowerCase().includes("universiti sains malaysia");

      if (ocrMatchedMatric && ocrMatchedName && hasUSM) {
        verificationStatus = "AUTO_VERIFIED";
      }

      console.log("OCR RESULT:", {
        ocrMatchedMatric,
        ocrMatchedName,
        hasUSM,
        verificationStatus,
      });
    } catch (err) {
      console.warn("OCR failed → manual review:", err);
    }

    // --------------------------
    // Create Supabase Auth user
    // --------------------------
    const supabaseAnon = supabaseServerAnon();

    const { data: authData, error: authError } =
      await (await supabaseAnon).auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          data: {
            role: role.toLowerCase(),
            full_name: fullName,
            programme,
            matricNo,
            matricCardUrl,
            verificationStatus,
          },
        },
      });

    if (authError) {
      await supabaseServer.storage.from(bucket).remove([uploadData.path]);
      return NextResponse.json(
        { success: false, message: authError.message },
        { status: 400 }
      );
    }

    // --------------------------
    // Create Prisma user
    // --------------------------
    const user = await prisma.user.create({
      data: {
        email,
        name: fullName,
        programme,
        matricNo,
        passwordHash,
        matricCardUrl,
        role,
        verificationStatus,
        ocrText: ocrText.slice(0, 5000),
        ocrMatchedMatric,
        ocrMatchedName,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          verificationStatus === "AUTO_VERIFIED"
            ? "Registration successful and verified."
            : "Registration submitted. Pending admin verification.",
        user,
        supabaseUserId: authData.user?.id ?? null,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
