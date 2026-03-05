import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPasswordResetEmail } from "@/lib/email";

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

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const redirectTo = `${origin}/auth/reset-password`;
    console.log("RESET redirectTo:", redirectTo);

    // ✅ Generate a recovery link (Supabase will NOT email it)
    const supabase = supabaseAdmin();

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: cleanedEmail,
      options: { redirectTo },
    });

    // ✅ Security: never reveal if user exists
    if (error) {
      console.warn("generateLink(recovery) error:", error.message);
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, a reset link has been sent.",
      });
    }

    const resetLink = (data as any)?.properties?.action_link as string | undefined;

    if (!resetLink) {
      console.warn("generateLink returned no action_link");
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, a reset link has been sent.",
      });
    }

    // ✅ Send your branded email
    await sendPasswordResetEmail({
      toEmail: cleanedEmail,
      toName: null,
      resetLink,
    });

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