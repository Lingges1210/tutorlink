// src/app/api/rewards/catalog/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { seedRewardsOnce } from "@/lib/gamification/rewards";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const [me] = await Promise.all([
    prisma.user.findUnique({
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
        earlyAccessUntil: true,
        leaderboardSpotlightUntil: true,
        vipSupportUntil: true,
        pointsWallet: { select: { total: true } },
      },
    }),
    seedRewardsOnce(),
  ]);

  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  const now = new Date();

  const activeRedemptions = await prisma.rewardRedemption.findMany({
    where: {
      userId: me.id,
      status: "ACTIVE",
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    select: { rewardId: true },
  });
  const activeRewardIds = new Set(activeRedemptions.map((r) => r.rewardId));

  const rewards = await prisma.reward.findMany({
    orderBy: { pointsCost: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      pointsCost: true,
      stock: true,
      durationHrs: true,
    },
  });

  const rewardsWithStatus = rewards.map((r) => ({
    ...r,
    isActive: activeRewardIds.has(r.id),
  }));

  return NextResponse.json({
    ok: true,
    wallet: me.pointsWallet?.total ?? 0,
    boostUntil: me.boostUntil,
    multiplierUntil: me.multiplierUntil,
    activeMultiplierKey: me.activeMultiplierKey ?? null,
    effects: {
      boostUntil: me.boostUntil,
      multiplierUntil: me.multiplierUntil,
      activeMultiplierKey: me.activeMultiplierKey ?? null,
      streakShieldCount: me.streakShieldCount,
      streakFreezeUntil: me.streakFreezeUntil,
      profileTitle: me.profileTitle,
      badgeFrame: me.badgeFrame,
      profileBanner: me.profileBanner,
      avatarBorder: me.avatarBorder,
      usernameColor: me.usernameColor,
      earlyAccessUntil: me.earlyAccessUntil,
      leaderboardSpotlightUntil: me.leaderboardSpotlightUntil,
      vipSupportUntil: me.vipSupportUntil,
    },
    rewards: rewardsWithStatus,
  });
}