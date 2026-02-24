import { prisma } from "@/lib/prisma";

/* =======================================================
   BADGE DEFINITIONS (50+)
   ======================================================= */

type BadgeKey = string;

type BadgeDef = {
  key: BadgeKey;
  name: string;
  description: string;
  icon: string;
};

const badgeDefs: BadgeDef[] = [
  /* -------------------------
     SESSION COUNT (STUDENT + TUTOR)
  --------------------------*/
  { key: "SESSIONS_1", name: "First Step", description: "Completed 1 session.", icon: "sparkles" },
  { key: "SESSIONS_5", name: "Getting Started", description: "Completed 5 sessions.", icon: "flame" },
  { key: "SESSIONS_10", name: "Study Warrior", description: "Completed 10 sessions.", icon: "swords" },
  { key: "SESSIONS_25", name: "Dedicated Learner", description: "Completed 25 sessions.", icon: "shield" },
  { key: "SESSIONS_50", name: "Half Century", description: "Completed 50 sessions.", icon: "trophy" },
  { key: "SESSIONS_100", name: "Centurion", description: "Completed 100 sessions.", icon: "crown" },

  /* -------------------------
     POINTS MILESTONES
  --------------------------*/
  { key: "POINTS_100", name: "100 Club", description: "Reached 100 points.", icon: "star" },
  { key: "POINTS_250", name: "250 Club", description: "Reached 250 points.", icon: "star" },
  { key: "POINTS_500", name: "500 Club", description: "Reached 500 points.", icon: "medal" },
  { key: "POINTS_1000", name: "1K Club", description: "Reached 1000 points.", icon: "trophy" },
  { key: "POINTS_2500", name: "Elite", description: "Reached 2500 points.", icon: "gem" },
  { key: "POINTS_5000", name: "Legend", description: "Reached 5000 points.", icon: "crown" },

  /* -------------------------
     STREAK BADGES
  --------------------------*/
  { key: "STREAK_3", name: "Momentum", description: "3 day learning streak.", icon: "flame" },
  { key: "STREAK_7", name: "On Fire", description: "7 day learning streak.", icon: "flame" },
  { key: "STREAK_14", name: "Unstoppable", description: "14 day learning streak.", icon: "fire" },
  { key: "STREAK_30", name: "Master of Consistency", description: "30 day streak.", icon: "crown" },

  /* -------------------------
     STUDENT TOPIC COVERAGE
  --------------------------*/
  { key: "TOPICS_5", name: "Explorer", description: "Covered 5 different topics.", icon: "compass" },
  { key: "TOPICS_15", name: "Deep Thinker", description: "Covered 15 different topics.", icon: "brain" },
  { key: "TOPICS_30", name: "Knowledge Hunter", description: "Covered 30 different topics.", icon: "book" },

  /* -------------------------
     TUTOR PERFORMANCE
  --------------------------*/
  { key: "TUTOR_5", name: "First Students", description: "Tutored 5 sessions.", icon: "users" },
  { key: "TUTOR_25", name: "Mentor", description: "Tutored 25 sessions.", icon: "award" },
  { key: "TUTOR_75", name: "Guide", description: "Tutored 75 sessions.", icon: "shield" },
  { key: "TUTOR_150", name: "Master Tutor", description: "Tutored 150 sessions.", icon: "crown" },

  /* -------------------------
     ACTIVITY BADGES
  --------------------------*/
  { key: "EARLY_BIRD", name: "Early Bird", description: "Completed a session before 8AM.", icon: "sun" },
  { key: "NIGHT_OWL", name: "Night Owl", description: "Completed a session after 10PM.", icon: "moon" },
  { key: "WEEKEND_WARRIOR", name: "Weekend Warrior", description: "Completed 5 weekend sessions.", icon: "calendar" },

  /* -------------------------
     ENGAGEMENT
  --------------------------*/
  { key: "CONFIDENCE_BOOSTER", name: "Confidence Booster", description: "Improved confidence by 20+ total points.", icon: "zap" },
  { key: "FEEDBACK_GIVER", name: "Helpful Reviewer", description: "Left 10 session reviews.", icon: "message-circle" },

  /* -------------------------
     SPECIAL / HIDDEN
  --------------------------*/
  { key: "FIRST_WEEK", name: "First Week Active", description: "Completed a session in your first week.", icon: "clock" },
  { key: "POWER_USER", name: "Power User", description: "Used the platform for 90 days.", icon: "rocket" },
  { key: "SECRET_MASTER", name: "Secret Master", description: "Discovered a hidden achievement.", icon: "key" },
];

/* =======================================================
   SEED BADGES
   ======================================================= */

declare global {
  // eslint-disable-next-line no-var
  var __badgesSeeded: boolean | undefined;
  // eslint-disable-next-line no-var
  var __badgesSeedingPromise: Promise<void> | undefined;
}

export async function seedBadgesOnce() {
  // already seeded in this server process
  if (global.__badgesSeeded) return;

  // if another request is already seeding, await it (single-flight)
  if (global.__badgesSeedingPromise) {
    await global.__badgesSeedingPromise;
    return;
  }

  global.__badgesSeedingPromise = (async () => {
    // ✅ sequential upserts = no pool explosion
    for (const b of badgeDefs) {
      await prisma.badge.upsert({
        where: { key: b.key },
        create: b,
        update: { name: b.name, description: b.description, icon: b.icon },
      });
    }
    global.__badgesSeeded = true;
  })();

  try {
    await global.__badgesSeedingPromise;
  } finally {
    global.__badgesSeedingPromise = undefined;
  }
}

/* =======================================================
   GRANT HELPER
   ======================================================= */

async function grant(userId: string, key: BadgeKey) {
  const badge = await prisma.badge.findUnique({ where: { key } });
  if (!badge) return;

  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
    create: { userId, badgeId: badge.id },
    update: {},
  });
}

/* =======================================================
   CHECK & AWARD LOGIC
   ======================================================= */

export async function checkAndAwardBadges(args: {
  userId: string;
  completedSessionsCount: number;
  totalPoints: number;
  topicCount?: number;
  streak?: number;
  tutoredSessionsCount?: number;
}) {
  const { userId, completedSessionsCount, totalPoints, topicCount = 0, streak = 0, tutoredSessionsCount = 0 } = args;

  // Session Milestones
  const sessionMilestones = [1, 5, 10, 25, 50, 100];
  for (const n of sessionMilestones) {
    if (completedSessionsCount >= n) {
      await grant(userId, `SESSIONS_${n}`);
    }
  }

  // Points
  const pointMilestones = [100, 250, 500, 1000, 2500, 5000];
  for (const n of pointMilestones) {
    if (totalPoints >= n) {
      await grant(userId, `POINTS_${n}`);
    }
  }

  // Streak
  const streakMilestones = [3, 7, 14, 30];
  for (const n of streakMilestones) {
    if (streak >= n) {
      await grant(userId, `STREAK_${n}`);
    }
  }

  // Topic coverage
  const topicMilestones = [5, 15, 30];
  for (const n of topicMilestones) {
    if (topicCount >= n) {
      await grant(userId, `TOPICS_${n}`);
    }
  }

  // ✅ Tutor milestones
  const tutorMilestones = [5, 25, 75, 150];
  for (const n of tutorMilestones) {
    if (tutoredSessionsCount >= n) {
      await grant(userId, `TUTOR_${n}`);
    }
  }
}