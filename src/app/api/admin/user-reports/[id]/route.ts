import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

const ALLOWED_STATUS = ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const;
const ALLOWED_PRIORITY = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id } = await context.params;

    const report = await prisma.userReport.findUnique({
      where: { id },
      include: {
        reporterUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            accountLockStatus: true,
            lockedAt: true,
            lockReason: true,
          },
        },
        reviewedByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        session: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            studentId: true,
            tutorId: true,
          },
        },
        chatChannel: {
          select: {
            id: true,
            sessionId: true,
            studentId: true,
            tutorId: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, report });
  } catch (error) {
    console.error("GET /api/admin/user-reports/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load report" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await context.params;
    const body = await req.json();

    const status = typeof body?.status === "string" ? body.status : undefined;
    const priority = typeof body?.priority === "string" ? body.priority : undefined;
    const adminNotes =
      typeof body?.adminNotes === "string" ? body.adminNotes.trim() : undefined;

    if (status && !ALLOWED_STATUS.includes(status as (typeof ALLOWED_STATUS)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    if (priority && !ALLOWED_PRIORITY.includes(priority as (typeof ALLOWED_PRIORITY)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid priority" }, { status: 400 });
    }

    const updated = await prisma.userReport.update({
      where: { id },
      data: {
        ...(status ? { status: status as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        reviewedByAdminId: admin.id,
        reviewedAt: new Date(),
        ...(status === "RESOLVED" ? { resolvedAt: new Date() } : {}),
      },
      include: {
        reporterUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            accountLockStatus: true,
            lockedAt: true,
            lockReason: true,
          },
        },
        reviewedByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, report: updated });
  } catch (error) {
    console.error("PATCH /api/admin/user-reports/[id] error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update report" },
      { status: 500 }
    );
  }
}