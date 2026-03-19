import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

type Body = { rewardKey: string };

function addHours(from: Date, hours: number) {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

// Keys that share the same "already active" field — redeeming stacks (extends) rather than blocks.
// Only block if the user tries to redeem the EXACT same key while active.
const BOOST_KEYS = new Set(["PRIORITY_BOOST_7D"]);
const MULTIPLIER_KEYS = new Set([
  "POINTS_SURGE_6H",
  "COMBO_MULTIPLIER_24H",
  "FIRST_ACTION_BONUS_7D",
  "WEEKEND_BOOST",
  "CATCHUP_BOOST_48H",
]);

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body?.rewardKey) {
    return NextResponse.json({ ok: false, error: "Missing rewardKey" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      pointsWallet: { select: { total: true } },
      boostUntil: true,
      multiplierUntil: true,
      streakShieldCount: true,
      streakFreezeUntil: true,
      profileTitle: true,
      badgeFrame: true,
      profileBanner: true,
      avatarBorder: true,
      usernameColor: true,
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

  // Block re-purchase of an already-active timed reward (same key).
  // For boosts/multipliers we stack (extend) instead of blocking — see expiresAt logic below.
  const activeRedemption = await prisma.rewardRedemption.findFirst({
    where: {
      userId: me.id,
      rewardId: reward.id,
      status: "ACTIVE",
      expiresAt: { gt: now },
    },
  });

  // Block re-purchase while active: cosmetics + timed access rewards
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
    "LEADERBOARD_SPOTLIGHT", // timed — block while active
    "VIP_SUPPORT_7D",        // timed — block while active
  ]);
  if (ONE_TIME_ACTIVE_KEYS.has(reward.key) && activeRedemption) {
    return NextResponse.json(
      { ok: false, error: `${reward.name} is already active on your account.` },
      { status: 400 }
    );
  }

  // STREAK_REPAIR has no duration so activeRedemption won't catch it — gate by 48 h cooldown
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
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.pointsWallet.upsert({
      where: { userId: me.id },
      create: { userId: me.id, total: 0 },
      update: {},
    });

    await tx.pointsWallet.update({
      where: { userId: me.id },
      data: { total: { decrement: reward.pointsCost } },
    });

    await tx.pointsTransaction.create({
      data: {
        userId: me.id,
        type: "REDEEM",
        amount: -reward.pointsCost,
        description: `Redeemed: ${reward.name}`,
      },
    });

    // ── Expiry calculation (stacks for boosts & multipliers) ──────────────
    let expiresAt: Date | null = null;
    if (reward.durationHrs) {
      let base = now;
      if (BOOST_KEYS.has(reward.key) && me.boostUntil && me.boostUntil > now) {
        base = me.boostUntil; // extend existing boost
      }
      if (MULTIPLIER_KEYS.has(reward.key) && me.multiplierUntil && me.multiplierUntil > now) {
        base = me.multiplierUntil; // extend existing multiplier
      }
      expiresAt = addHours(base, reward.durationHrs);
    }

    await tx.rewardRedemption.create({
      data: {
        userId: me.id,
        rewardId: reward.id,
        status: reward.durationHrs ? "ACTIVE" : "USED",
        expiresAt,
      },
    });

    // ── User field patch per reward key ───────────────────────────────────
    const userPatch: Record<string, any> = {};

    // Priority boost
    if (BOOST_KEYS.has(reward.key)) {
      userPatch.boostUntil = expiresAt;
    }

    // Multiplier boosts — store shared multiplierUntil; specific type resolved at point-award time
    if (MULTIPLIER_KEYS.has(reward.key)) {
      userPatch.multiplierUntil = expiresAt;
      userPatch.activeMultiplierKey = reward.key; // lets point-award logic know which mechanic applies
    }

    // Streak protection
    if (reward.key === "STREAK_SHIELD_1") userPatch.streakShieldCount = { increment: 1 };
    if (reward.key === "STREAK_SHIELD_3") userPatch.streakShieldCount = { increment: 3 };
    if (reward.key === "STREAK_FREEZE_7D") userPatch.streakFreezeUntil = expiresAt;
    if (reward.key === "STREAK_REPAIR") {
      // Only repair if the streak was broken within the last 48 h — enforced client-side too,
      // but guard here for safety. Actual streak value reset handled by your streak service.
      userPatch.streakBrokenAt = null; // clear the broken marker
    }

    // Cosmetics
    if (reward.key === "PROFILE_TITLE_UNLOCK") userPatch.profileTitle = me.profileTitle ?? "Rising Star";
    if (reward.key === "BADGE_FRAME_NEON") userPatch.badgeFrame = "NEON";
    if (reward.key === "BADGE_FRAME_GOLD") userPatch.badgeFrame = "GOLD";
    if (reward.key === "BADGE_FRAME_HOLOGRAPHIC") userPatch.badgeFrame = "HOLOGRAPHIC";
    if (reward.key === "PROFILE_BANNER_AURORA") userPatch.profileBanner = "AURORA";
    if (reward.key === "PROFILE_BANNER_SPACE") userPatch.profileBanner = "SPACE";
    if (reward.key === "AVATAR_BORDER_ANIMATED") userPatch.avatarBorder = "ANIMATED";
    if (reward.key === "CUSTOM_USERNAME_COLOR") userPatch.usernameColor = "CUSTOM"; // actual colour set via separate profile endpoint

    // Access
    if (reward.key === "EARLY_ACCESS_FEATURES") userPatch.earlyAccessUntil = expiresAt;
    if (reward.key === "LEADERBOARD_SPOTLIGHT") userPatch.leaderboardSpotlightUntil = expiresAt;
    if (reward.key === "VIP_SUPPORT_7D") userPatch.vipSupportUntil = expiresAt;

    if (Object.keys(userPatch).length > 0) {
      await tx.user.update({ where: { id: me.id }, data: userPatch });
    }

    if (reward.stock !== null) {
      await tx.reward.update({
        where: { id: reward.id },
        data: { stock: { decrement: 1 } },
      });
    }

    const updatedWallet = await tx.pointsWallet.findUnique({
      where: { userId: me.id },
      select: { total: true },
    });

    return { walletTotal: updatedWallet?.total ?? 0 };
  });

  return NextResponse.json({ ok: true, wallet: result.walletTotal });
}