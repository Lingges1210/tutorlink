import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-audit";
import { requireAdminUser } from "@/lib/requireAdminUser";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await params;

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

    if (target.accountLockStatus !== "LOCKED") {
      return NextResponse.json(
        { success: false, message: "User is not locked" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: {
        accountLockStatus: "ACTIVE",
        lockedAt: null,
        lockReason: null,
        lockedByAdminId: null,
      },
    });

    await logAdminAction({
      adminId: admin.id,
      targetUserId: id,
      actionType: "USER_UNLOCK",
      entityType: "USER",
      entityId: id,
      metadata: {
        previousLockStatus: "LOCKED",
        newLockStatus: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      message: "User unlocked successfully",
    });
  } catch (error: any) {
    const message = error?.message || "Failed to unlock user";
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