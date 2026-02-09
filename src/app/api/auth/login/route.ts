// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerAnon } from "@/lib/supabaseServerAnon"; // returns SupabaseClient

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // ✅ IMPORTANT: call the factory to get the client
    const supabase = supabaseServerAnon();

    // 1) Supabase Auth sign-in (source of truth)
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      const msg = (signInError.message || "").toLowerCase();

      if (msg.includes("email not confirmed")) {
        return NextResponse.json(
          {
            success: false,
            code: "EMAIL_NOT_CONFIRMED",
            message: "Please verify your email first. Check your inbox/spam.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    const authUser = signInData.user;

    // Extra safety check
    if (!authUser?.email_confirmed_at) {
      await supabase.auth.signOut();

      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_NOT_CONFIRMED",
          message: "Please verify your email first. Check your inbox/spam.",
        },
        { status: 403 }
      );
    }

    // 2) Load local user profile from Prisma
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Account exists but profile is missing. Please contact support.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isTutorApproved: user.isTutorApproved,
        },
        supabaseUserId: authUser.id,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { success: false, message: "Server error during login" },
      { status: 500 }
    );
  }
}
