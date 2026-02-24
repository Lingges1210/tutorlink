// src/lib/gamification/leaderboard.ts
import { prisma } from "@/lib/prisma";

export type LeaderboardMode = "ALL" | "STUDENTS" | "TUTORS";

function startOfWeek(d: Date) {
  // Monday start (common for apps); adjust if you want Sunday start
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Mon=0 ... Sun=6
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getWeekRange(now = new Date()) {
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function isTutorUser(u: {
  role?: string | null;
  roleAssignments?: Array<{ role: string }>;
}) {
  const r = String(u.role ?? "").toUpperCase();
  if (r === "TUTOR") return true;
  if (Array.isArray(u.roleAssignments)) {
    return u.roleAssignments.some((a) => String(a.role).toUpperCase() === "TUTOR");
  }
  return false;
}

export async function getWeeklyLeaderboard(args?: {
  limit?: number;
  mode?: LeaderboardMode;
  now?: Date;
}) {
  const limit = Math.min(args?.limit ?? 10, 50);
  const mode: LeaderboardMode = args?.mode ?? "ALL";
  const { start, end } = getWeekRange(args?.now ?? new Date());

  // We may need to fetch more than 'limit' so filtering doesn't empty results.
  const preLimit = mode === "ALL" ? limit : Math.min(limit * 6, 300);

  const grouped = await prisma.pointsTransaction.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: start, lt: end } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: preLimit,
  });

  const userIds = grouped.map((g) => g.userId);

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      roleAssignments: { select: { role: true } }, // ✅ needed for tutor detection
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const filtered = grouped.filter((g) => {
    if (mode === "ALL") return true;

    const u = userMap.get(g.userId);
    if (!u) return false;

    const tutor = isTutorUser(u);

    if (mode === "TUTORS") return tutor;
    // STUDENTS: treat "not tutor" as student bucket (keeps it simple)
    return !tutor;
  });

  const sliced = filtered.slice(0, limit);

  return sliced.map((g, idx) => {
    const u = userMap.get(g.userId);

    return {
      rank: idx + 1,
      userId: g.userId,
      points: g._sum.amount ?? 0,
      user:
        u ??
        ({
          id: g.userId,
          name: null,
          email: "",
          role: "UNKNOWN",
        } as any),
    };
  });
}