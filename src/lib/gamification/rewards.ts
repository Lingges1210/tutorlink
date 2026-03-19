import { prisma } from "@/lib/prisma";

export const REWARD_CATALOG = [
  {
    key: "PRIORITY_BOOST_24H",
    name: "Priority Boost (24h)",
    description: "Your requests get priority matching for the next 24 hours.",
    pointsCost: 300,
    durationHrs: 24,
    stock: null as number | null,
  },
  {
    key: "PRIORITY_BOOST_7D",
    name: "Priority Boost (7d)",
    description: "Priority matching for the next 7 days.",
    pointsCost: 1200,
    durationHrs: 24 * 7,
    stock: null as number | null,
  },
  {
    key: "STREAK_SHIELD_1",
    name: "Streak Shield (1 use)",
    description: "Protect your streak once if you miss a day.",
    pointsCost: 200,
    durationHrs: null as number | null,
    stock: null as number | null,
  },
  {
    key: "PROFILE_TITLE_UNLOCK",
    name: "Profile Title Unlock",
    description: "Unlock a special title shown on your profile.",
    pointsCost: 150,
    durationHrs: null as number | null,
    stock: null as number | null,
  },
  {
    key: "BADGE_FRAME_NEON",
    name: "Badge Frame: Neon Glow",
    description: "Adds a neon glow frame around your badge display.",
    pointsCost: 250,
    durationHrs: null as number | null,
    stock: null as number | null,
  },
  {
    key: "DOUBLE_POINTS_24H",
    name: "Double Points (24h)",
    description: "Earn 2x points for the next 24 hours.",
    pointsCost: 400,
    durationHrs: 24,
    stock: null as number | null,
  },
] as const;

// ✅ Same global flag pattern as badges — no count() hit on every request
declare global {
  var __rewardsSeeded: boolean | undefined;
  var __rewardsSeedingPromise: Promise<void> | undefined;
}

export async function seedRewardsOnce() {
  // Already seeded in this server process
  if (global.__rewardsSeeded) return;

  // If another request is already seeding, await it (single-flight)
  if (global.__rewardsSeedingPromise) {
    await global.__rewardsSeedingPromise;
    return;
  }

  global.__rewardsSeedingPromise = (async () => {
    await prisma.reward.createMany({
      data: REWARD_CATALOG.map((r) => ({
        key: r.key,
        name: r.name,
        description: r.description,
        pointsCost: r.pointsCost,
        durationHrs: r.durationHrs ?? undefined,
        stock: r.stock ?? undefined,
      })),
      skipDuplicates: true,
    });
    global.__rewardsSeeded = true;
  })();

  try {
    await global.__rewardsSeedingPromise;
  } finally {
    global.__rewardsSeedingPromise = undefined;
  }
}