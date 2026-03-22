import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { seedRewardsOnce } from "@/lib/gamification/rewards";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  // Run user lookup + seed in parallel
  const [me] = await Promise.all([
    prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: {
        id: true,
        role: true,
        boostUntil: true,
        doubleUntil: true,
        streakShieldCount: true,
        profileTitle: true,
        badgeFrame: true,
        pointsWallet: { select: { total: true } },
      },
    }),
    seedRewardsOnce(),
  ]);

  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

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

  return NextResponse.json({
    ok: true,
    wallet: me.pointsWallet?.total ?? 0,
    boostUntil: me.boostUntil,
    doubleUntil: me.doubleUntil,
    effects: {
      boostUntil: me.boostUntil,
      doubleUntil: me.doubleUntil,
      streakShieldCount: me.streakShieldCount,
      profileTitle: me.profileTitle,
      badgeFrame: me.badgeFrame,
    },
    rewards,
  });
}