import { prisma } from "@/lib/prisma";

type BadgeKey =
  | "FIRST_SESSION"
  | "FIVE_SESSIONS"
  | "TEN_SESSIONS"
  | "POINTS_500"
  | "POINTS_1000";

const badgeDefs: Record<BadgeKey, { name: string; description: string; icon: string }> = {
  FIRST_SESSION: { name: "First Session", description: "Completed your first session.", icon: "sparkles" },
  FIVE_SESSIONS: { name: "Getting Serious", description: "Completed 5 sessions.", icon: "flame" },
  TEN_SESSIONS: { name: "Study Warrior", description: "Completed 10 sessions.", icon: "swords" },
  POINTS_500: { name: "500 Club", description: "Reached 500 total points.", icon: "trophy" },
  POINTS_1000: { name: "1K Club", description: "Reached 1000 total points.", icon: "crown" },
};

export async function seedBadgesOnce() {
  // safe to call many times
  await Promise.all(
    (Object.keys(badgeDefs) as BadgeKey[]).map((key) =>
      prisma.badge.upsert({
        where: { key },
        create: { key, ...badgeDefs[key] },
        update: { ...badgeDefs[key] },
      })
    )
  );
}

async function grant(userId: string, key: BadgeKey, badgeIdMap: Map<BadgeKey, string>) {
  const badgeId = badgeIdMap.get(key);
  if (!badgeId) return;

  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId } },
    create: { userId, badgeId },
    update: {},
  });
}

export async function checkAndAwardBadges(args: {
  userId: string;
  completedSessionsCount: number;
  totalPoints: number;
}) {
  const { userId, completedSessionsCount, totalPoints } = args;

  const badges = await prisma.badge.findMany({
    where: { key: { in: Object.keys(badgeDefs) as BadgeKey[] } },
    select: { id: true, key: true },
  });

  const badgeIdMap = new Map(badges.map((b) => [b.key as BadgeKey, b.id]));

  if (completedSessionsCount >= 1) await grant(userId, "FIRST_SESSION", badgeIdMap);
  if (completedSessionsCount >= 5) await grant(userId, "FIVE_SESSIONS", badgeIdMap);
  if (completedSessionsCount >= 10) await grant(userId, "TEN_SESSIONS", badgeIdMap);
  if (totalPoints >= 500) await grant(userId, "POINTS_500", badgeIdMap);
  if (totalPoints >= 1000) await grant(userId, "POINTS_1000", badgeIdMap);
}