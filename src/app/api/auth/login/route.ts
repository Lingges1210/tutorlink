import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerAnon } from "@/lib/supabaseServerAnon";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // ✅ Resolve ONCE — reuse the same client throughout
    const supabase = await supabaseServerAnon();

    // 1) Supabase Auth (sets cookies!)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.session) {
      const msg = (error?.message || "").toLowerCase();

      if (msg.includes("email not confirmed")) {
        return NextResponse.json(
          {
            success: false,
            code: "EMAIL_NOT_CONFIRMED",
            message: "Please verify your email first. Check your inbox or spam.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Extra safety — email not confirmed at Supabase level
    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut(); // ✅ reuse same instance
      return NextResponse.json(
        {
          success: false,
          message: "Please verify your email first.",
        },
        { status: 403 }
      );
    }

    // 2) Load Prisma user
    const user = await prisma.user.findUnique({
      where: { email: data.user.email!.toLowerCase() },
      select: {
        id: true,
        email: true,
        role: true,
        isTutorApproved: true,
        verificationStatus: true,
        isDeactivated: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Account exists but profile is missing. Please contact support.",
        },
        { status: 409 }
      );
    }

    if (user.isDeactivated) {
      await supabase.auth.signOut(); // ✅ reuse same instance
      return NextResponse.json(
        {
          success: false,
          code: "ACCOUNT_DEACTIVATED",
          message: "Your account has been deactivated. Please contact support.",
        },
        { status: 403 }
      );
    }

    // Cookies are already written by Supabase
    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isTutorApproved: user.isTutorApproved,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { success: false, message: "Server error during login" },
      { status: 500 }
    );
  }
}