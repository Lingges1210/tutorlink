// src/app/api/rewards/redeem/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

type Body = { rewardKey: string };

function addHours(from: Date, hours: number) {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body?.rewardKey) {
    return NextResponse.json(
      { ok: false, error: "Missing rewardKey" },
      { status: 400 }
    );
  }

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      pointsWallet: { select: { total: true } },
      boostUntil: true,
      doubleUntil: true,
      streakShieldCount: true,
      profileTitle: true,
      badgeFrame: true,
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

  if (!reward)
    return NextResponse.json(
      { ok: false, error: "Reward not found" },
      { status: 404 }
    );

  // stock check
  if (reward.stock !== null && reward.stock <= 0) {
    return NextResponse.json(
      { ok: false, error: "Out of stock" },
      { status: 400 }
    );
  }

  const walletTotal = me.pointsWallet?.total ?? 0;
  if (walletTotal < reward.pointsCost) {
    return NextResponse.json(
      { ok: false, error: "Not enough points" },
      { status: 400 }
    );
  }

  const now = new Date();

  //  NEW: Disable redeem if already active (NO stacking)
  if (reward.key === "DOUBLE_POINTS_24H") {
    if (me.doubleUntil && me.doubleUntil > now) {
      return NextResponse.json(
        { ok: false, error: "Double Points is already active." },
        { status: 400 }
      );
    }
  }

  if (reward.key === "PRIORITY_BOOST_24H" || reward.key === "PRIORITY_BOOST_7D") {
    if (me.boostUntil && me.boostUntil > now) {
      return NextResponse.json(
        { ok: false, error: "Priority Boost is already active." },
        { status: 400 }
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    //  ensure wallet exists
    await tx.pointsWallet.upsert({
      where: { userId: me.id },
      create: { userId: me.id, total: 0 },
      update: {},
    });

    //  deduct points
    await tx.pointsWallet.update({
      where: { userId: me.id },
      data: { total: { decrement: reward.pointsCost } },
    });

    //  transaction should be NEGATIVE (points spent)
    await tx.pointsTransaction.create({
      data: {
        userId: me.id,
        type: "REDEEM",
        amount: -reward.pointsCost,
        description: `Redeemed: ${reward.name}`,
      },
    });

    //  compute expiresAt + stacking for timed rewards
    let expiresAt: Date | null = null;

    if (reward.durationHrs) {
      // base time for stacking: if already active, extend from that, else from now
      let base = now;

      if (
        reward.key === "DOUBLE_POINTS_24H" &&
        me.doubleUntil &&
        me.doubleUntil > now
      ) {
        base = me.doubleUntil;
      }
      if (
        (reward.key === "PRIORITY_BOOST_24H" ||
          reward.key === "PRIORITY_BOOST_7D") &&
        me.boostUntil &&
        me.boostUntil > now
      ) {
        base = me.boostUntil;
      }

      expiresAt = addHours(base, reward.durationHrs);
    }

    // record redemption
    await tx.rewardRedemption.create({
      data: {
        userId: me.id,
        rewardId: reward.id,
        status: reward.durationHrs ? "ACTIVE" : "USED",
        expiresAt,
      },
    });

    // apply effect on User
    const userPatch: Record<string, any> = {};

    if (reward.key === "PRIORITY_BOOST_24H" || reward.key === "PRIORITY_BOOST_7D") {
      userPatch.boostUntil = expiresAt;
    }

    if (reward.key === "DOUBLE_POINTS_24H") {
      userPatch.doubleUntil = expiresAt;
    }

    if (reward.key === "STREAK_SHIELD_1") {
      userPatch.streakShieldCount = { increment: 1 };
    }

    if (reward.key === "PROFILE_TITLE_UNLOCK") {
      userPatch.profileTitle = me.profileTitle ?? "Rising Star";
    }

    if (reward.key === "BADGE_FRAME_NEON") {
      userPatch.badgeFrame = "NEON";
    }

    if (Object.keys(userPatch).length > 0) {
      await tx.user.update({
        where: { id: me.id },
        data: userPatch,
      });
    }

    // stock decrement
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

  return NextResponse.json({
    ok: true,
    wallet: result.walletTotal,
  });
}