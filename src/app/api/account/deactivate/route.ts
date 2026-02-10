import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason : null;
    const otherReasonRaw =
      typeof body.otherReason === "string" ? body.otherReason : null;

    const otherReason =
      reason === "OTHER" ? (otherReasonRaw?.trim() ? otherReasonRaw.trim() : null) : null;

    await prisma.user.update({
      where: { email: user.email.toLowerCase() },
      data: {
        isDeactivated: true,
        deactivatedAt: new Date(),
        deactivationReason: reason,
        deactivationReasonOther: otherReason,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Deactivate error:", err);
    return NextResponse.json(
      { success: false, message: "Server error during deactivation" },
      { status: 500 }
    );
  }
}
