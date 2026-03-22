import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status   = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const q        = searchParams.get("q")?.trim();

    const reports = await prisma.userReport.findMany({
      where: {
        ...(status   ? { status:   status   as any } : {}),
        ...(category ? { category: category as any } : {}),
        ...(priority ? { priority: priority as any } : {}),
        ...(q ? {
          OR: [
            { subject:      { contains: q, mode: "insensitive" } },
            { description:  { contains: q, mode: "insensitive" } },
            { reporterUser: { name:  { contains: q, mode: "insensitive" } } },
            { reporterUser: { email: { contains: q, mode: "insensitive" } } },
            { reportedUser: { name:  { contains: q, mode: "insensitive" } } },
            { reportedUser: { email: { contains: q, mode: "insensitive" } } },
          ],
        } : {}),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        reporterUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            vipSupportUntil: true,   // ← add
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
          select: { id: true, name: true, email: true },
        },
        session: {
          select: { id: true, scheduledAt: true, status: true },
        },
        chatChannel: {
          select: { id: true, sessionId: true, createdAt: true },
        },
      },
    });

    const now = new Date();

    // Tag each report with isVip, then sort VIP open reports to the top
    const tagged = reports.map((r) => ({
      ...r,
      isVip: !!(r.reporterUser?.vipSupportUntil && r.reporterUser.vipSupportUntil > now),
    }));

    tagged.sort((a, b) => {
      // VIP + OPEN beats everything else
      const aVipOpen = a.isVip && a.status === "OPEN" ? 0 : 1;
      const bVipOpen = b.isVip && b.status === "OPEN" ? 0 : 1;
      if (aVipOpen !== bVipOpen) return aVipOpen - bVipOpen;
      // Then VIP any status
      if (a.isVip !== b.isVip) return a.isVip ? -1 : 1;
      // Then original order (status asc, createdAt desc already applied by Prisma)
      return 0;
    });

    return NextResponse.json({ ok: true, reports: tagged });
  } catch (error) {
    console.error("GET /api/admin/user-reports error:", error);
    return NextResponse.json({ ok: false, error: "Failed to load admin reports" }, { status: 500 });
  }
}