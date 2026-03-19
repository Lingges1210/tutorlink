import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";
import { logAdminAction } from "@/lib/admin-audit";
import { sendTutorRejectedEmail } from "@/lib/email";

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
        user: { select: { email: true, name: true } },
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

    // In-app notification (upsert so re-rejections update the body with the latest reason)
    const notifBody = reason
      ? `Your application was not approved. Reason: ${reason}. You may update your details and reapply.`
      : "Your tutor application was not approved. You may update your details and reapply.";

    await prisma.notification.upsert({
      where: {
        userId_dedupeKey: {
          userId: app.userId,
          dedupeKey: `tutor_app_rejected_${app.id}`,
        },
      },
      update: {
        body: notifBody,
        readAt: null, // re-surface as unread on re-rejection
        status: "SENT",
        sentAt: new Date(),
      },
      create: {
        userId: app.userId,
        type: "TUTOR_APP_REJECTED",
        title: "Tutor application not approved",
        body: notifBody,
        status: "SENT",
        sentAt: new Date(),
        data: {
          href: "/dashboard/student/apply-tutor",
          viewer: "STUDENT",
        },
        dedupeKey: `tutor_app_rejected_${app.id}`,
      },
    });

    // Email (best-effort — Resend failure won't break the response)
    await sendTutorRejectedEmail(app.user.email, app.user.name, reason).catch(() => null);

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