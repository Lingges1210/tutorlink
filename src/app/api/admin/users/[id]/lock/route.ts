import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-audit";
import { requireAdminUser } from "@/lib/requireAdminUser";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        accountLockStatus: true,
      },
    });

    if (!target) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (target.accountLockStatus === "LOCKED") {
      return NextResponse.json(
        { success: false, message: "User is already locked" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: {
        accountLockStatus: "LOCKED",
        lockedAt: new Date(),
        lockReason: reason || null,
        lockedByAdminId: admin.id,
      },
    });

    await logAdminAction({
      adminId: admin.id,
      targetUserId: id,
      actionType: "USER_LOCK",
      entityType: "USER",
      entityId: id,
      reason: reason || null,
      metadata: {
        previousLockStatus: "ACTIVE",
        newLockStatus: "LOCKED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "User locked successfully",
    });
  } catch (error: any) {
    const message = error?.message || "Failed to lock user";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status }
    );
  }
}