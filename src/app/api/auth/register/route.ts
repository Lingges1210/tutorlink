// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabase"; // service-role storage client (server only)
import { supabaseServerAnon } from "@/lib/supabaseServerAnon"; // anon client for auth.signUp

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

    // Optional role coming from your register form
    const roleRaw = String(formData.get("role") || "STUDENT").trim().toUpperCase();
    const role = roleRaw === "TUTOR" ? "TUTOR" : "STUDENT";

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

    // Enforce USM email
    if (!email.endsWith("@student.usm.my") && !email.endsWith("@usm.my")) {
      return NextResponse.json(
        { success: false, message: "Please use a valid USM email." },
        { status: 400 }
      );
    }

    // Check if already registered in Prisma DB
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email is already registered." },
        { status: 400 }
      );
    }

    // Check matricNo uniqueness in Prisma DB
    const existingMatric = await prisma.user.findFirst({ where: { matricNo } });
    if (existingMatric) {
      return NextResponse.json(
        { success: false, message: "This matric number is already linked to another account." },
        { status: 400 }
      );
    }

    // Hash password for your local DB (you can remove later if you fully migrate auth to Supabase)
    const passwordHash = await bcrypt.hash(password, 10);

    // --------------------------
    // 1) Upload matric card to Supabase Storage (service role client)
    // --------------------------
    const bucket = process.env.SUPABASE_STORAGE_BUCKET!;
    const timestamp = Date.now();
    const fileExt = matricCard.name.split(".").pop() || "bin";
    const safeMatric = matricNo.replace(/[^a-zA-Z0-9_-]/g, "");
    const objectPath = `matric-cards/${safeMatric}-${timestamp}.${fileExt}`;

    const arrayBuffer = await matricCard.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from(bucket)
      .upload(objectPath, buffer, {
        contentType: matricCard.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError || !uploadData?.path) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { success: false, message: "Failed to upload matric card. Please try again." },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseServer.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    const matricCardUrl = publicUrlData.publicUrl;

    // --------------------------
    // 2) Create Supabase Auth user (THIS makes it show in Supabase → Auth → Users)
    // --------------------------
  const supabaseAnon = supabaseServerAnon();

const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: "http://localhost:3000/auth/callback",
    data: {
      role: role === "TUTOR" ? "tutor" : "student",
      full_name: fullName,
      programme,
      matricNo,
      matricCardUrl,
    },
  },
});


    if (authError) {
      // Optional cleanup: delete uploaded file if signUp fails
      try {
        await supabaseServer.storage.from(bucket).remove([uploadData.path]);
      } catch (cleanupErr) {
        console.warn("Cleanup warning (could not remove uploaded file):", cleanupErr);
      }

      return NextResponse.json(
        { success: false, message: authError.message },
        { status: 400 }
      );
    }

    // --------------------------
    // 3) Create user in Prisma DB (local DB)
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
      },
      select: {
        id: true,
        email: true,
        name: true,
        programme: true,
        matricNo: true,
        matricCardUrl: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful. You can now log in.",
        user,
        supabaseUserId: authData.user?.id ?? null,
        sessionCreated: Boolean(authData.session),
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
