import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase";
import { extractTextFromImage, matchMatricAndName } from "@/lib/googleVision";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const email      = String(formData.get("email") || "").trim().toLowerCase();
    const fullName   = String(formData.get("fullName") || "").trim();
    const programme  = String(formData.get("programme") || "").trim();
    const matricNo   = String(formData.get("matricNo") || "").trim();
    const password   = String(formData.get("password") || "");
    const captcha    = String(formData.get("captcha") || "").trim();
    const matricCard = formData.get("matricCard") as File | null;

    const roleRaw = String(formData.get("role") || "STUDENT").toUpperCase();
    const role    = roleRaw === "TUTOR" ? "TUTOR" : "STUDENT";

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

    // Early duplicate checks (fast path before expensive ops)
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
        { success: false, message: "This matric number is already linked to another account." },
        { status: 400 }
      );
    }

    // Clean up any orphaned Supabase auth user from a previous failed attempt
    try {
      const { data: { users } } = await supabaseServer.auth.admin.listUsers({
        perPage: 1000,
        page: 1,
      });
      const orphanedUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (orphanedUser) {
        console.warn(`Cleaning up orphaned Supabase user for ${email}`);
        await supabaseServer.auth.admin.deleteUser(orphanedUser.id);
      }
    } catch (cleanupErr) {
      console.warn("Failed to check/cleanup orphaned Supabase user:", cleanupErr);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const bucket     = process.env.SUPABASE_STORAGE_BUCKET!;
    const timestamp  = Date.now();
    const fileExt    = matricCard.name.split(".").pop() || "bin";
    const safeMatric = matricNo.replace(/[^a-zA-Z0-9_-]/g, "");
    const objectPath = `matric-cards/${safeMatric}-${timestamp}.${fileExt}`;
    const buffer     = Buffer.from(await matricCard.arrayBuffer());

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

    let ocrText          = "";
    let ocrMatchedMatric = false;
    let ocrMatchedName   = false;
    let verificationStatus: "AUTO_VERIFIED" | "PENDING_REVIEW" = "PENDING_REVIEW";

    try {
      ocrText = await extractTextFromImage(buffer);
      const match = matchMatricAndName({ ocrText, matricNo, fullName });
      ocrMatchedMatric = match.matricMatch;
      ocrMatchedName   = match.nameMatch;

      const hasUSM =
        ocrText.toLowerCase().includes("usm") ||
        ocrText.toLowerCase().includes("universiti sains malaysia");

      if (ocrMatchedMatric && ocrMatchedName && hasUSM) {
        verificationStatus = "AUTO_VERIFIED";
      }

      console.log("OCR RESULT:", { ocrMatchedMatric, ocrMatchedName, hasUSM, verificationStatus });
    } catch (err) {
      console.warn("OCR failed → manual review:", err);
    }

    // Create Supabase auth user via admin (no auto email sent by Supabase)
    const { data: authData, error: authError } =
      await supabaseServer.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: {
          role: role.toLowerCase(),
          full_name: fullName,
          programme,
          matricNo,
          matricCardUrl,
          verificationStatus,
        },
      });

    if (authError) {
      await supabaseServer.storage.from(bucket).remove([uploadData.path]);
      return NextResponse.json(
        { success: false, message: authError.message },
        { status: 400 }
      );
    }

    // Create Prisma user inside a transaction with a re-check to prevent
    // race conditions from simultaneous requests slipping past the early check
    let user;
    try {
      user = await prisma.$transaction(async (tx) => {
        // Re-check inside transaction — atomic, prevents race condition
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) throw new Error("EMAIL_EXISTS");

        const existingMatricInTx = await tx.user.findFirst({ where: { matricNo } });
        if (existingMatricInTx) throw new Error("MATRIC_EXISTS");

        return tx.user.create({
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
      });
    } catch (err: any) {
      // Rollback: delete the Supabase auth user and uploaded file
      if (authData?.user?.id) {
        await supabaseServer.auth.admin.deleteUser(authData.user.id);
      }
      await supabaseServer.storage.from(bucket).remove([uploadData.path]);

      if (err.code === "P2002" || err.message === "EMAIL_EXISTS") {
        return NextResponse.json(
          { success: false, message: "Email is already registered." },
          { status: 400 }
        );
      }
      if (err.message === "MATRIC_EXISTS") {
        return NextResponse.json(
          { success: false, message: "This matric number is already linked to another account." },
          { status: 400 }
        );
      }
      throw err;
    }

    // Send verification email via Resend
    try {
      const { data: linkData, error: linkError } =
        await supabaseServer.auth.admin.generateLink({
          type: "signup",
          email,
          password,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          },
        });

      if (!linkError && linkData?.properties?.action_link) {
        await sendVerificationEmail({
          toEmail: email,
          toName: fullName,
          verificationLink: linkData.properties.action_link,
        });
      } else {
        console.warn("Failed to generate verification link:", linkError);
      }
    } catch (emailErr) {
      console.warn("Verification email failed:", emailErr);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          verificationStatus === "AUTO_VERIFIED"
            ? "Registration successful and verified."
            : "Registration submitted. Please check your email to verify your account.",
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