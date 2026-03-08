import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/auth/requireDbUser";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser();
    const { id } = await ctx.params;

    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, isDeactivated: true, accountLockStatus: true },
    });

    if (!me || me.role !== "ADMIN" || me.isDeactivated || me.accountLockStatus === "LOCKED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const moderationReason = String(body.moderationReason || "").trim();
    const adminNotes = String(body.adminNotes || "").trim();

    if (!moderationReason) {
      return NextResponse.json(
        { error: "moderationReason is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.sOSRequest.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        status: true,
        moderationStatus: true,
        subjectId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "SOS not found" }, { status: 404 });
    }

    const updated = await prisma.sOSRequest.update({
      where: { id },
      data: {
        moderationStatus: "REMOVED_BY_ADMIN",
        moderationReason,
        adminNotes: adminNotes || null,
        moderatedAt: new Date(),
        moderatedByAdminId: user.id,
        isFlagged: false,
        status:
  ["SEARCHING", "ACCEPTED", "IN_PROGRESS"].includes(existing.status)
    ? "CANCELLED"
    : existing.status,
      },
      include: {
        subject: { select: { id: true, code: true, title: true } },
        student: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.notification.upsert({
  where: {
    userId_dedupeKey: {
      userId: existing.studentId,
      dedupeKey: `sos:${existing.id}:removed`,
    },
  },
  update: {
    body: "Your SOS request was removed by admin due to guideline violation.",
    data: {
      sosId: existing.id,
      moderationReason,
    },
    status: "QUEUED",
  },
  create: {
    userId: existing.studentId,
    type: "SOS_REMOVED_BY_ADMIN",
    title: "SOS post removed",
    body: "Your SOS request was removed by admin due to guideline violation.",
    data: {
      sosId: existing.id,
      moderationReason,
    },
    dedupeKey: `sos:${existing.id}:removed`,
    status: "QUEUED",
  },
});

    await prisma.adminAuditLog.create({
      data: {
        adminId: user.id,
        targetUserId: existing.studentId,
        actionType: "SOS_REMOVE",
        entityType: "SOS_REQUEST",
        entityId: existing.id,
        reason: moderationReason,
        metadata: {
          adminNotes: adminNotes || null,
          subjectId: existing.subjectId,
        },
      },
    });

    return NextResponse.json({ ok: true, sos: updated });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}