import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET() {
  try {
    await requireAdminUser();

    const now = new Date();

    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const completedSessions = await prisma.session.findMany({
      where: {
        status: "COMPLETED",
        completedAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        completedAt: true,
        subject: {
          select: {
            title: true,
            code: true,
          },
        },
      },
    });

    const countsByDay = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const label = DAY_LABELS[d.getDay()];
      countsByDay.set(label, 0);
    }

    const subjectCounts = new Map<string, number>();

    for (const session of completedSessions) {
      if (!session.completedAt) continue;

      const label = DAY_LABELS[new Date(session.completedAt).getDay()];
      countsByDay.set(label, (countsByDay.get(label) || 0) + 1);

      const rawSubjectName =
  session.subject?.title?.trim() ||
  session.subject?.code?.trim() ||
  "Unknown Subject";

    const subjectName =
  rawSubjectName.replace(/^[:\-\s]+/, "").trim() || "Unknown Subject";

      subjectCounts.set(subjectName, (subjectCounts.get(subjectName) || 0) + 1);
    }

    const weeklySessions = Array.from(countsByDay.entries()).map(([day, value]) => ({
      day,
      value,
    }));

    const topSubjects = Array.from(subjectCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      weeklySessions,
      subjectDemand: topSubjects,
    });
  } catch (error: any) {
    console.error("Admin analytics error:", error);

    const message = error?.message || "Server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json({ success: false, message }, { status });
  }
}