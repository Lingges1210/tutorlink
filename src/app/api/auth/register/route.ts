// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma"; // adjust if your import is different
import { supabaseServer } from "@/lib/supabase";

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
        {
          success: false,
          message: "Please use a valid USM email.",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email is already registered." },
        { status: 400 }
      );
    }

    // Check matricNo uniqueness
    const existingMatric = await prisma.user.findFirst({
      where: { matricNo },
    });

    if (existingMatric) {
      return NextResponse.json(
        {
          success: false,
          message: "This matric number is already linked to another account.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 🔹 Upload matric card to Supabase Storage
    const bucket = process.env.SUPABASE_STORAGE_BUCKET!;
    const timestamp = Date.now();
    const fileExt = matricCard.name.split(".").pop() || "bin";
    const safeMatric = matricNo.replace(/[^a-zA-Z0-9_-]/g, "");
    const objectPath = `matric-cards/${safeMatric}-${timestamp}.${fileExt}`;

    const arrayBuffer = await matricCard.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabaseServer
      .storage
      .from(bucket)
      .upload(objectPath, buffer, {
        contentType: matricCard.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to upload matric card. Please try again.",
        },
        { status: 500 }
      );
    }

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabaseServer.storage
      .from(bucket)
      .getPublicUrl(uploadData.path);

    const matricCardUrl = publicUrlData.publicUrl;

    // 🔹 Create user in DB
    const user = await prisma.user.create({
      data: {
        email,
        name: fullName,
        programme,
        matricNo,
        passwordHash,
        matricCardUrl,
        role: "STUDENT", // default role
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
        message: "Registration successful.",
        user,
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
