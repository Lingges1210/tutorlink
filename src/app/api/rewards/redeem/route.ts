// src/app/api/rewards/redeem/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { repairStreak } from "@/lib/gamification/streak";

type Body = { rewardKey: string };

function addHours(from: Date, hours: number) {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

function isFuture(d: Date | null | undefined): d is Date {
  return !!d && d > new Date();
}

const BOOST_KEYS = new Set(["PRIORITY_BOOST_7D"]);
const MULTIPLIER_KEYS = new Set([
  "POINTS_SURGE_6H",
  "COMBO_MULTIPLIER_24H",
  "FIRST_ACTION_BONUS_7D",
  "WEEKEND_BOOST",
  "CATCHUP_BOOST_48H",
]);
const ONE_TIME_ACTIVE_KEYS = new Set([
  "PROFILE_TITLE_UNLOCK",
  "BADGE_FRAME_NEON",
  "BADGE_FRAME_GOLD",
  "BADGE_FRAME_HOLOGRAPHIC",
  "PROFILE_BANNER_AURORA",
  "PROFILE_BANNER_SPACE",
  "AVATAR_BORDER_ANIMATED",
  "CUSTOM_USERNAME_COLOR",
  "EARLY_ACCESS_FEATURES",
  "LEADERBOARD_SPOTLIGHT",
  "VIP_SUPPORT_7D",
]);

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body?.rewardKey) {
    return NextResponse.json({ ok: false, error: "Missing rewardKey" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      boostUntil: true,
      multiplierUntil: true,
      activeMultiplierKey: true,
      streakShieldCount: true,
      streakFreezeUntil: true,
      profileTitle: true,
      badgeFrame: true,
      profileBanner: true,
      avatarBorder: true,
      usernameColor: true,
      pointsWallet: { select: { total: true } },
    },
  });
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  const reward = await prisma.reward.findUnique({
    where: { key: body.rewardKey },
    select: {
      id: true,
      key: true,
      name: true,
      pointsCost: true,
      stock: true,
      durationHrs: true,
    },
  });
  if (!reward) return NextResponse.json({ ok: false, error: "Reward not found" }, { status: 404 });

  if (reward.stock !== null && reward.stock <= 0) {
    return NextResponse.json({ ok: false, error: "Out of stock" }, { status: 400 });
  }

  const walletTotal = me.pointsWallet?.total ?? 0;
  if (walletTotal < reward.pointsCost) {
    return NextResponse.json({ ok: false, error: "Not enough points" }, { status: 400 });
  }

  const now = new Date();

  // Block re-purchase of already-active one-time/cosmetic rewards
  if (ONE_TIME_ACTIVE_KEYS.has(reward.key)) {
    const activeRedemption = await prisma.rewardRedemption.findFirst({
      where: {
        userId: me.id,
        rewardId: reward.id,
        status: "ACTIVE",
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
    });
    if (activeRedemption) {
      return NextResponse.json(
        { ok: false, error: `${reward.name} is already active on your account.` },
        { status: 400 }
      );
    }
  }

  // Streak repair: 48h cooldown check + actual repair before transaction
  if (reward.key === "STREAK_REPAIR") {
    const recentRepair = await prisma.rewardRedemption.findFirst({
      where: {
        userId: me.id,
        rewardId: reward.id,
        createdAt: { gt: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
      },
    });
    if (recentRepair) {
      return NextResponse.json(
        { ok: false, error: "Streak Repair was already used in the last 48 hours." },
        { status: 400 }
      );
    }

    // Validate and repair streak before deducting points
    const repairResult = await repairStreak(me.id);
    if (!repairResult.ok) {
      return NextResponse.json(
        { ok: false, error: repairResult.error ?? "No broken streak to repair." },
        { status: 400 }
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Ensure wallet exists
    await tx.pointsWallet.upsert({
      where: { userId: me.id },
      create: { userId: me.id, total: 0 },
      update: {},
    });

    // Deduct points
    await tx.pointsWallet.update({
      where: { userId: me.id },
      data: { total: { decrement: reward.pointsCost } },
    });

    // Log transaction
    await tx.pointsTransaction.create({
      data: {
        userId: me.id,
        type: "REDEEM",
        amount: -reward.pointsCost,
        description: `Redeemed: ${reward.name}`,
      },
    });

    // Expiry: stack for boosts & multipliers, fresh start otherwise
    let expiresAt: Date | null = null;
    if (reward.durationHrs) {
      let base = now;
      if (BOOST_KEYS.has(reward.key) && isFuture(me.boostUntil)) {
        base = me.boostUntil;
      }
      if (MULTIPLIER_KEYS.has(reward.key) && isFuture(me.multiplierUntil)) {
        base = me.multiplierUntil;
      }
      expiresAt = addHours(base, reward.durationHrs);
    }

    await tx.rewardRedemption.create({
  data: {
    userId: me.id,
    rewardId: reward.id,
    // Use ACTIVE for one-time cosmetics so catalog can detect them
    status: (reward.durationHrs || ONE_TIME_ACTIVE_KEYS.has(reward.key))
      ? "ACTIVE"
      : "USED",
    expiresAt,
  },
});

    // Build user patch
    const userPatch: Record<string, any> = {};

    if (BOOST_KEYS.has(reward.key)) {
      userPatch.boostUntil = expiresAt;
    }
    if (MULTIPLIER_KEYS.has(reward.key)) {
      userPatch.multiplierUntil = expiresAt;
      userPatch.activeMultiplierKey = reward.key;
    }

    // Streak shields & freeze
    if (reward.key === "STREAK_SHIELD_1")  userPatch.streakShieldCount = { increment: 1 };
    if (reward.key === "STREAK_SHIELD_3")  userPatch.streakShieldCount = { increment: 3 };
    if (reward.key === "STREAK_FREEZE_7D") userPatch.streakFreezeUntil = expiresAt;
    // STREAK_REPAIR: already handled above via repairStreak() — no userPatch needed

    // Cosmetics
    if (reward.key === "PROFILE_TITLE_UNLOCK")   userPatch.profileTitle = me.profileTitle ?? "Rising Star";
    if (reward.key === "BADGE_FRAME_NEON")        userPatch.badgeFrame = "NEON";
    if (reward.key === "BADGE_FRAME_GOLD")        userPatch.badgeFrame = "GOLD";
    if (reward.key === "BADGE_FRAME_HOLOGRAPHIC") userPatch.badgeFrame = "HOLOGRAPHIC";
    if (reward.key === "PROFILE_BANNER_AURORA")   userPatch.profileBanner = "AURORA";
    if (reward.key === "PROFILE_BANNER_SPACE")    userPatch.profileBanner = "SPACE";
    if (reward.key === "AVATAR_BORDER_ANIMATED")  userPatch.avatarBorder = "ANIMATED";
    if (reward.key === "CUSTOM_USERNAME_COLOR")   userPatch.usernameColor = "CUSTOM";

    // Access
    if (reward.key === "EARLY_ACCESS_FEATURES")    userPatch.earlyAccessUntil = expiresAt;
    if (reward.key === "LEADERBOARD_SPOTLIGHT")    userPatch.leaderboardSpotlightUntil = expiresAt;
    if (reward.key === "VIP_SUPPORT_7D")           userPatch.vipSupportUntil = expiresAt;

    if (Object.keys(userPatch).length > 0) {
      await tx.user.update({ where: { id: me.id }, data: userPatch });
    }

    if (reward.stock !== null) {
      await tx.reward.update({
        where: { id: reward.id },
        data: { stock: { decrement: 1 } },
      });
    }

    const [updatedWallet, updatedUser] = await Promise.all([
      tx.pointsWallet.findUnique({
        where: { userId: me.id },
        select: { total: true },
      }),
      tx.user.findUnique({
        where: { id: me.id },
        select: {
          boostUntil: true,
          multiplierUntil: true,
          activeMultiplierKey: true,
          streakShieldCount: true,
          streakFreezeUntil: true,
          profileTitle: true,
          badgeFrame: true,
          profileBanner: true,
          avatarBorder: true,
          usernameColor: true,
          earlyAccessUntil: true,
          leaderboardSpotlightUntil: true,
          vipSupportUntil: true,
        },
      }),
    ]);

    return {
      walletTotal: updatedWallet?.total ?? 0,
      boostUntil: updatedUser?.boostUntil ?? null,
      multiplierUntil: updatedUser?.multiplierUntil ?? null,
      activeMultiplierKey: updatedUser?.activeMultiplierKey ?? null,
      streakShieldCount: updatedUser?.streakShieldCount ?? 0,
      streakFreezeUntil: updatedUser?.streakFreezeUntil ?? null,
      profileTitle: updatedUser?.profileTitle ?? null,
      badgeFrame: updatedUser?.badgeFrame ?? null,
      profileBanner: updatedUser?.profileBanner ?? null,
      avatarBorder: updatedUser?.avatarBorder ?? null,
      usernameColor: updatedUser?.usernameColor ?? null,
      earlyAccessUntil: updatedUser?.earlyAccessUntil ?? null,
      leaderboardSpotlightUntil: updatedUser?.leaderboardSpotlightUntil ?? null,
      vipSupportUntil: updatedUser?.vipSupportUntil ?? null,
    };
  });

  return NextResponse.json({
    ok: true,
    wallet: result.walletTotal,
    boostUntil: result.boostUntil,
    multiplierUntil: result.multiplierUntil,
    activeMultiplierKey: result.activeMultiplierKey,
    effects: {
      boostUntil: result.boostUntil,
      multiplierUntil: result.multiplierUntil,
      activeMultiplierKey: result.activeMultiplierKey,
      streakShieldCount: result.streakShieldCount,
      streakFreezeUntil: result.streakFreezeUntil,
      profileTitle: result.profileTitle,
      badgeFrame: result.badgeFrame,
      profileBanner: result.profileBanner,
      avatarBorder: result.avatarBorder,
      usernameColor: result.usernameColor,
      earlyAccessUntil: result.earlyAccessUntil,
      leaderboardSpotlightUntil: result.leaderboardSpotlightUntil,
      vipSupportUntil: result.vipSupportUntil,
    },
  });
}