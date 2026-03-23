// src/lib/studypalServerReward.ts
//
// Server-side only. Import in API routes to queue StudyPal rewards.
// Never throws — reward failure is silently swallowed so parent routes
// are unaffected.
//
// Usage:
//   import { queueStudypalReward } from "@/lib/studypalServerReward";
//   await queueStudypalReward(studentId, "session");

import { prisma } from "@/lib/prisma";

export type SPActivityId = "quiz" | "streak" | "booking" | "session" | "sos" | "badge";

const ACTIVITY_REWARDS: Record<SPActivityId, { xp: number; treats: number; name: string }> = {
  quiz:    { xp: 9,  treats: 3,  name: "Completed a quiz"      },
  streak:  { xp: 6,  treats: 2,  name: "Daily study streak"    },
  booking: { xp: 15, treats: 5,  name: "Booked a tutor"        },
  session: { xp: 24, treats: 8,  name: "Completed a session"   },
  sos:     { xp: 12, treats: 4,  name: "SOS resolved"          },
  badge:   { xp: 30, treats: 10, name: "Earned an achievement" },
};

const TREATS_MAX = 15;
const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500];
const DROPPABLE_ACCS = [
  "bow","headband","glasses","hat","cap","scarf",
  "ribbon","sunglasses","earring","monocle","halo",
  "bandana","wizard","crown",
] as const;

function getLevelIndex(xp: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--)
    if (xp >= LEVEL_THRESHOLDS[i]) return i;
  return 0;
}
function pickDrop(owned: string[]): string | null {
  const avail = DROPPABLE_ACCS.filter(id => !owned.includes(id));
  return avail.length ? avail[Math.floor(Math.random() * avail.length)] : null;
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function yesterdayISO() {
  const d = new Date(Date.now() - 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export async function queueStudypalReward(
  userId: string,
  activityId: SPActivityId,
): Promise<void> {
  const reward = ACTIVITY_REWARDS[activityId];
  if (!reward || !userId) return;

  try {
    const existing = await prisma.studyPalState.findUnique({
      where: { userId },
      select: {
        xp: true, treats: true, points: true, pending: true,
        owned: true, streakCount: true, lastStreakDate: true,
        activityLog: true,
      },
    });

    const today = todayISO();

    if (!existing) {
      await prisma.studyPalState.create({
        data: {
          userId,
          xp:             reward.xp,
          treats:         0,
          points:         reward.xp,
          pending:        reward.treats,
          streakCount:    1,
          lastStreakDate: today,
          activityLog: [{
            activityId, activityName: reward.name,
            xp: reward.xp, treats: reward.treats, timestamp: Date.now(),
          }],
        },
      });
      return;
    }

    // Streak
    const yesterday = yesterdayISO();
    let newStreak = existing.streakCount ?? 0;
    let newStreakDate = existing.lastStreakDate;
    if (existing.lastStreakDate !== today) {
      newStreak = existing.lastStreakDate === yesterday ? newStreak + 1 : 1;
      newStreakDate = today;
    }

    // XP + level
    const newXP    = existing.xp + reward.xp;
    const leveledUp = getLevelIndex(newXP) > getLevelIndex(existing.xp);

    // Owned + drop
    const owned   = Array.isArray(existing.owned) ? (existing.owned as string[]) : ["none"];
    let newOwned  = owned;
    let pendingDrop: string | null = null;
    if (leveledUp) {
      pendingDrop = pickDrop(owned);
      if (pendingDrop) newOwned = [...owned, pendingDrop];
    }

    // Treat cap
    const treatCapReached = (existing.treats + existing.pending + reward.treats) > TREATS_MAX;

    // Log
    const prevLog = Array.isArray(existing.activityLog) ? (existing.activityLog as object[]) : [];
    const newLog  = [
      { activityId, activityName: reward.name, xp: reward.xp, treats: reward.treats, timestamp: Date.now() },
      ...prevLog,
    ].slice(0, 10);

    await prisma.studyPalState.update({
      where: { userId },
      data: {
        xp:             newXP,
        points:         existing.points + reward.xp,
        pending:        existing.pending + reward.treats,
        owned:          newOwned,
        streakCount:    newStreak,
        lastStreakDate: newStreakDate ?? today,
        activityLog:    newLog,
        ...(leveledUp    && { leveledUp: true }),
        ...(pendingDrop  && { pendingDrop }),
        ...(treatCapReached && { treatCapReached: true }),
      },
    });
  } catch (err) {
    console.error("[studypal] queueStudypalReward failed silently:", err);
  }
}