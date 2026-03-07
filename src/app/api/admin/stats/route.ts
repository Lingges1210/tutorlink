import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

export async function GET() {
  try {
    await requireAdminUser();

    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay(); // 0 Sun, 1 Mon...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const totalUsers = await prisma.user.count();

    const activeTutors = await prisma.userRoleAssignment.count({
      where: {
        role: "TUTOR",
        user: { isTutorApproved: true },
      },
    });

    const sessionsThisWeek = await prisma.session.count({
      where: {
        status: "COMPLETED",
        completedAt: {
          gte: startOfWeek,
        },
      },
    });

    const sosRequestsThisWeek = await prisma.sOSRequest.count({
      where: {
        createdAt: {
          gte: startOfWeek,
        },
      },
    });

    return NextResponse.json({
      success: true,
      totalUsers,
      activeTutors,
      sessionsThisWeek,
      sosRequestsThisWeek,
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);

    const message = error?.message || "Server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json({ success: false, message }, { status });
  }
}