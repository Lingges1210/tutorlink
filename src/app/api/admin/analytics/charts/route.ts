import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function getLast7DaysRange() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

function sanitizeLabel(value: string | null | undefined) {
  return (value || "Unknown").replace(/^[:\-\s]+/, "").trim() || "Unknown";
}

export async function GET() {
  try {
    await requireAdminUser();

    const { start, end } = getLast7DaysRange();

    const [completedSessions, sosRequests, sessionStatuses] = await Promise.all([
      prisma.session.findMany({
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
              code: true,
              title: true,
            },
          },
        },
      }),

      prisma.sOSRequest.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          createdAt: true,
        },
      }),

      prisma.session.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),
    ]);

    const weeklySessionsMap = new Map<string, number>();
    const weeklySosMap = new Map<string, number>();

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const label = DAY_LABELS[d.getDay()];
      weeklySessionsMap.set(label, 0);
      weeklySosMap.set(label, 0);
    }

    const subjectCounts = new Map<string, number>();

    for (const session of completedSessions) {
      if (!session.completedAt) continue;

      const label = DAY_LABELS[new Date(session.completedAt).getDay()];
      weeklySessionsMap.set(label, (weeklySessionsMap.get(label) || 0) + 1);

      const rawName = session.subject?.title || session.subject?.code || "Unknown Subject";
      const subjectName = sanitizeLabel(rawName);
      subjectCounts.set(subjectName, (subjectCounts.get(subjectName) || 0) + 1);
    }

    for (const sos of sosRequests) {
      const label = DAY_LABELS[new Date(sos.createdAt).getDay()];
      weeklySosMap.set(label, (weeklySosMap.get(label) || 0) + 1);
    }

    const weeklySessions = Array.from(weeklySessionsMap.entries()).map(([day, value]) => ({
      day,
      value,
    }));

    const weeklySos = Array.from(weeklySosMap.entries()).map(([day, value]) => ({
      day,
      value,
    }));

    const topSubjects = Array.from(subjectCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const sessionStatusBreakdown = sessionStatuses.map((row) => ({
      status: row.status,
      value: row._count._all,
    }));

    return NextResponse.json({
      success: true,
      weeklySessions,
      weeklySos,
      topSubjects,
      sessionStatusBreakdown,
    });
  } catch (error: any) {
    console.error("Admin analytics charts error:", error);

    const message = error?.message || "Server error";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json({ success: false, message }, { status });
  }
}