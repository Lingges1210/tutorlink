import { prisma } from "@/lib/prisma";

export const REWARD_CATALOG = [
  // ── Boosts & Multipliers ─────────────────────────────────────────────────
  {
    key: "PRIORITY_BOOST_7D",
    name: "Priority Boost (7d)",
    description: "Priority matching for the next 7 days.",
    pointsCost: 1200,
    durationHrs: 24 * 7,
    stock: null as number | null,
  },
  {
    key: "POINTS_SURGE_6H",
    name: "Points Surge (6h)",
    description: "Earn 5x points for a 6-hour burst. Go hard, go fast.",
    pointsCost: 350,
    durationHrs: 6,
    stock: null as number | null,
  },
  {
    key: "COMBO_MULTIPLIER_24H",
    name: "Combo Multiplier (24h)",
    description: "Each consecutive action in a session stacks +10% bonus points, up to 3x.",
    pointsCost: 600,
    durationHrs: 24,
    stock: null as number | null,
  },
  {
    key: "FIRST_ACTION_BONUS_7D",
    name: "First Action Bonus (7d)",
    description: "Your first action each day earns 4x points for 7 days.",
    pointsCost: 900,
    durationHrs: 24 * 7,
    stock: null as number | null,
  },
  {
    key: "WEEKEND_BOOST",
    name: "Weekend Warrior Boost",
    description: "Earn 3x points on Saturday and Sunday for the next 4 weeks.",
    pointsCost: 1100,
    durationHrs: 24 * 7 * 4,
    stock: null as number | null,
  },
  {
    key: "CATCHUP_BOOST_48H",
    name: "Catch-Up Boost (48h)",
    description: "Earn 2x points for 48 hours — perfect after a quiet spell.",
    pointsCost: 450,
    durationHrs: 48,
    stock: null as number | null,
  },

  // ── Streak & Protection ──────────────────────────────────────────────────
  {
    key: "STREAK_SHIELD_1",
    name: "Streak Shield (1 use)",
    description: "Protect your streak once if you miss a day.",
    pointsCost: 200,
    durationHrs: null as number | null,
    stock: null as number | null,
  },
  {
    key: "STREAK_SHIELD_3",
    name: "Streak Shield (3 uses)",
    description: "Protect your streak up to 3 times before it expires.",
    pointsCost: 500,
    durationHrs: null as number | null,
    stock: null as number | null,
  },
  {
    key: "STREAK_FREEZE_7D",
    name: "Streak Freeze (7d)",
    description: "Pause your streak counter for up to 7 days — no progress lost.",
    pointsCost: 700,
    durationHrs: 24 * 7,
    stock: null as number | null,
  },
  {
    key: "STREAK_REPAIR",
    name: "Streak Repair",
    description: "Restore a streak that was broken within the last 48 hours.",
    pointsCost: 800,
    durationHrs: null as number | null,
    stock: null as number | null,
  },

  // ── Cosmetics ────────────────────────────────────────────────────────────
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
    key: "BADGE_FRAME_GOLD",
    name: "Badge Frame: Gold Foil",
    description: "A prestigious gold foil frame for your badge.",
    pointsCost: 350,
    durationHrs: null as number | null,
    stock: null as number | null,
  },
  {
    key: "BADGE_FRAME_HOLOGRAPHIC",
    name: "Badge Frame: Holographic",
    description: "A rare holographic shimmer frame. Limited prestige.",
    pointsCost: 600,
    durationHrs: null as number | null,
    stock: 100 as number | null, // scarce
  },
  {
    key: "PROFILE_BANNER_AURORA",
    name: "Profile Banner: Aurora",
    description: "An animated aurora borealis banner for your profile page.",
    pointsCost: 500,
    durationHrs: null as number | null,
    stock: null as number | null,
  },
  {
    key: "PROFILE_BANNER_SPACE",
    name: "Profile Banner: Deep Space",
    description: "A deep space starfield banner for your profile page.",
    pointsCost: 500,
    durationHrs: null as number | null,
    stock: null as number | null,
  },
  {
    key: "AVATAR_BORDER_ANIMATED",
    name: "Animated Avatar Border",
    description: "An animated gradient ring around your profile avatar.",
    pointsCost: 450,
    durationHrs: null as number | null,
    stock: null as number | null,
  },

  // ── Exclusive Access ─────────────────────────────────────────────────────
  {
    key: "EARLY_ACCESS_FEATURES",
    name: "Early Access Pass",
    description: "Get early access to beta features before they roll out.",
    pointsCost: 1000,
    durationHrs: 24 * 30,
    stock: null as number | null,
  },
  {
    key: "CUSTOM_USERNAME_COLOR",
    name: "Custom Username Color",
    description: "Set a custom color for your display name across the platform.",
    pointsCost: 750,
    durationHrs: null as number | null,
    stock: null as number | null,
  },
  {
    key: "LEADERBOARD_SPOTLIGHT",
    name: "Leaderboard Spotlight (7d)",
    description: "Your profile is highlighted on the leaderboard for 7 days.",
    pointsCost: 600,
    durationHrs: 24 * 7,
    stock: null as number | null,
  },
  {
    key: "VIP_SUPPORT_7D",
    name: "VIP Support (7d)",
    description: "Get expedited support responses for the next 7 days.",
    pointsCost: 850,
    durationHrs: 24 * 7,
    stock: null as number | null,
  },
] as const;

// Same global flag pattern as badges — no count() hit on every request
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