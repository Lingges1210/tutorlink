import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";
import { logAdminAction } from "@/lib/admin-audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await params;

    const body = await req.json().catch(() => ({} as any));
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;

    const app = await prisma.tutorApplication.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!app) {
      return NextResponse.json(
        { success: false, message: "Application not found" },
        { status: 404 }
      );
    }

    await prisma.tutorApplication.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await logAdminAction({
      adminId: admin.id,
      targetUserId: app.userId,
      actionType: "TUTOR_APP_REJECT",
      entityType: "TUTOR_APPLICATION",
      entityId: app.id,
      reason,
      metadata: {
        previousStatus: app.status,
        newStatus: "REJECTED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const message = error?.message || "Failed to reject tutor application";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}