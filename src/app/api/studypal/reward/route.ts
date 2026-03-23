// src/app/api/studypal/reward/route.ts
//
// Called server-side by other API routes to queue treats + XP
// into the student's StudyPalState.
//
// Usage (from another API route, after auth):
//   import { queueStudypalReward } from "@/lib/studypalServerReward";
//   await queueStudypalReward(studentId, "session");

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export type SPActivityId = "quiz" | "streak" | "booking" | "session" | "sos" | "badge";

const ACTIVITY_REWARDS: Record<SPActivityId, { xp: number; treats: number; name: string }> = {
  quiz:    { xp: 9,  treats: 3,  name: "Completed a quiz"        },
  streak:  { xp: 6,  treats: 2,  name: "Daily study streak"      },
  booking: { xp: 15, treats: 5,  name: "Booked a tutor"          },
  session: { xp: 24, treats: 8,  name: "Completed a session"     },
  sos:     { xp: 12, treats: 4,  name: "SOS resolved"            },
  badge:   { xp: 30, treats: 10, name: "Earned an achievement"   },
};

const TREATS_MAX = 15;
const LEVEL_THRESHOLDS = [
  { name: "Beginner", xp: 0   },
  { name: "Learner",  xp: 50  },
  { name: "Scholar",  xp: 150 },
  { name: "Ace",      xp: 300 },
  { name: "Legend",   xp: 500 },
];
const DROPPABLE_ACCS = [
  "bow","headband","glasses","hat","cap","scarf",
  "ribbon","sunglasses","earring","monocle","halo",
  "bandana","wizard","crown",
] as const;

function getLevelIndex(xp: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--)
    if (xp >= LEVEL_THRESHOLDS[i].xp) return i;
  return 0;
}
function pickDrop(owned: string[]): string | null {
  const available = DROPPABLE_ACCS.filter(id => !owned.includes(id));
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ── POST handler (called from client if needed) ──────────────
export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ ok: false }, { status: 401 });

  const { activityId } = await req.json().catch(() => ({}));
  if (!activityId || !(activityId in ACTIVITY_REWARDS))
    return NextResponse.json({ ok: false, error: "Invalid activityId" }, { status: 400 });

  await queueStudypalReward(dbUser.id, activityId as SPActivityId);
  return NextResponse.json({ ok: true });
}

// ── Shared server utility ────────────────────────────────────
// Import and call this from other API routes:
//   import { queueStudypalReward } from "@/lib/studypalServerReward";
// (or copy the function body inline)
export async function queueStudypalReward(
  userId: string,
  activityId: SPActivityId,
): Promise<void> {
  const reward = ACTIVITY_REWARDS[activityId];
  if (!reward) return;

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
      // First-time: create row
      await prisma.studyPalState.create({
        data: {
          userId,
          xp:            reward.xp,
          treats:        0,
          points:        reward.xp,
          pending:       reward.treats,
          streakCount:   1,
          lastStreakDate: today,
          activityLog:   [{
            activityId,
            activityName: reward.name,
            xp: reward.xp,
            treats: reward.treats,
            timestamp: Date.now(),
          }],
        },
      });
      return;
    }

    // Streak logic
    const yesterday = (() => {
      const d = new Date(Date.now() - 86_400_000);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    })();
    let newStreak = existing.streakCount;
    let newStreakDate = existing.lastStreakDate;
    if (existing.lastStreakDate !== today) {
      if (existing.lastStreakDate === yesterday) {
        newStreak = (existing.streakCount ?? 0) + 1;
      } else {
        newStreak = 1;
      }
      newStreakDate = today;
    }

    // Level-up check
    const prevLevel = getLevelIndex(existing.xp);
    const newXP = existing.xp + reward.xp;
    const newLevel = getLevelIndex(newXP);
    const leveledUp = newLevel > prevLevel;

    // Treat cap
    const projectedTreats = existing.treats + existing.pending + reward.treats;
    const treatCapReached = projectedTreats > TREATS_MAX;

    // Level-up drop
    const owned: string[] = Array.isArray(existing.owned)
      ? (existing.owned as string[])
      : ["none"];
    let newOwned = owned;
    let pendingDrop: string | null = null;
    if (leveledUp) {
      pendingDrop = pickDrop(owned);
      if (pendingDrop) newOwned = [...owned, pendingDrop];
    }

    // Activity log (cap at 10)
    const prevLog = Array.isArray(existing.activityLog)
      ? (existing.activityLog as object[])
      : [];
    const newLog = [
      { activityId, activityName: reward.name, xp: reward.xp, treats: reward.treats, timestamp: Date.now() },
      ...prevLog,
    ].slice(0, 10);

    await prisma.studyPalState.update({
      where: { userId },
      data: {
        xp:            newXP,
        points:        existing.points + reward.xp,
        pending:       existing.pending + reward.treats,
        owned:         newOwned,
        streakCount:   newStreak,
        lastStreakDate: newStreakDate ?? today,
        activityLog:   newLog,
        ...(leveledUp && { leveledUp: true }),
        ...(pendingDrop && { pendingDrop }),
        ...(treatCapReached && { treatCapReached: true }),
      },
    });
  } catch (err) {
    // Never throw — reward failure must not break the parent route
    console.error("[studypal] queueStudypalReward failed:", err);
  }
}