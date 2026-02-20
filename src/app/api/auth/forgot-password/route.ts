// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerAnon } from "@/lib/supabaseServerAnon";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    const cleanedEmail = String(email || "").trim().toLowerCase();
    if (!cleanedEmail) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 }
      );
    }

    if (
      !cleanedEmail.endsWith("@student.usm.my") &&
      !cleanedEmail.endsWith("@usm.my")
    ) {
      return NextResponse.json(
        { success: false, message: "Please use a valid USM email." },
        { status: 400 }
      );
    }

    // ✅ FIX: await (because supabaseServerAnon returns Promise<SupabaseClient>)
    const supabase = await supabaseServerAnon();

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    console.log("RESET redirectTo:", `${origin}/auth/reset-password`);

    const { error } = await supabase.auth.resetPasswordForEmail(cleanedEmail, {
      redirectTo: `${origin}/auth/reset-password`,
    });

    // Keep success response even if user doesn't exist (security best practice)
    if (error) {
      console.warn("resetPasswordForEmail error:", error.message);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}