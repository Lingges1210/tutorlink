// src/app/api/admin/verify-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendApprovalEmail, sendRejectionEmail } from "@/lib/email";

type Action = "APPROVE" | "REJECT";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    const action = String(body?.action || "").trim().toUpperCase() as Action;
    const reasonRaw = body?.reason;
    const reason = typeof reasonRaw === "string" ? reasonRaw.trim() : undefined;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId is required" },
        { status: 400 }
      );
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, verificationStatus: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Optional: prevent re-processing
    if (user.verificationStatus === "AUTO_VERIFIED" && action === "APPROVE") {
      return NextResponse.json(
        { success: true, message: "User already verified" },
        { status: 200 }
      );
    }
    if (user.verificationStatus === "REJECTED" && action === "REJECT") {
      return NextResponse.json(
        { success: true, message: "User already rejected" },
        { status: 200 }
      );
    }

    if (action === "APPROVE") {
      await prisma.user.update({
        where: { id: userId },
        data: { verificationStatus: "AUTO_VERIFIED" },
      });

      await sendApprovalEmail(user.email, user.name ?? undefined);

      return NextResponse.json({
        success: true,
        message: "User approved + email sent",
      });
    } else {
      // action === "REJECT"
      await prisma.user.update({
        where: { id: userId },
        data: { verificationStatus: "REJECTED" },
      });

      await sendRejectionEmail(user.email, reason);

      return NextResponse.json({
        success: true,
        message: "User rejected + email sent",
      });
    }
  } catch (err) {
    console.error("Verify user error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
