import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

function getStartOfWeek(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay(); // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function GET() {
  try {
    await requireAdminUser();

    const startOfWeek = getStartOfWeek();

    const [
      totalUsers,
      activeTutors,
      sessionsThisWeek,
      sosRequestsThisWeek,
      pendingVerifications,
      pendingTutorApps,
      lockedUsersAgg,
      avgTutorRatingAgg,
    ] = await Promise.all([
      prisma.user.count(),

      prisma.userRoleAssignment.count({
        where: {
          role: "TUTOR",
          user: {
            isTutorApproved: true,
          },
        },
      }),

      prisma.session.count({
        where: {
          status: "COMPLETED",
          completedAt: {
            gte: startOfWeek,
          },
        },
      }),

      prisma.sOSRequest.count({
        where: {
          createdAt: {
            gte: startOfWeek,
          },
        },
      }),

      prisma.user.count({
        where: {
          verificationStatus: "PENDING_REVIEW",
        },
      }),

      prisma.tutorApplication.count({
        where: {
          status: "PENDING",
        },
      }),

      prisma.user.aggregate({
        _count: {
          _all: true,
        },
        where: {
          accountLockStatus: "LOCKED",
        },
      }),

      prisma.user.aggregate({
        _avg: {
          avgRating: true,
        },
        where: {
          isTutorApproved: true,
          ratingCount: {
            gt: 0,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeTutors,
        sessionsThisWeek,
        sosRequestsThisWeek,
        pendingVerifications,
        pendingTutorApps,
        lockedUsers: lockedUsersAgg._count._all ?? 0,
        avgTutorRating: Number((avgTutorRatingAgg._avg.avgRating ?? 0).toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error("Admin analytics overview error:", error);

    const message = error?.message || "Server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json({ success: false, message }, { status });
  }
}