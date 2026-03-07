import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendApprovalEmail, sendRejectionEmail } from "@/lib/email";
import { requireAdminUser } from "@/lib/requireAdminUser";
import { logAdminAction } from "@/lib/admin-audit";

type Action = "APPROVE" | "REJECT";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser();

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
      select: {
        id: true,
        email: true,
        name: true,
        verificationStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

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

      await logAdminAction({
        adminId: admin.id,
        targetUserId: userId,
        actionType: "VERIFY_USER_APPROVE",
        entityType: "USER",
        entityId: userId,
        metadata: {
          previousVerificationStatus: user.verificationStatus,
          newVerificationStatus: "AUTO_VERIFIED",
        },
      });

      await sendApprovalEmail(user.email, user.name ?? undefined);

      return NextResponse.json({
        success: true,
        message: "User approved + email sent",
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: "REJECTED" },
    });

    await logAdminAction({
      adminId: admin.id,
      targetUserId: userId,
      actionType: "VERIFY_USER_REJECT",
      entityType: "USER",
      entityId: userId,
      reason: reason ?? null,
      metadata: {
        previousVerificationStatus: user.verificationStatus,
        newVerificationStatus: "REJECTED",
      },
    });

    await sendRejectionEmail(user.email, reason);

    return NextResponse.json({
      success: true,
      message: "User rejected + email sent",
    });
  } catch (error: any) {
    console.error("Verify user error:", error);

    const message = error?.message || "Server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}