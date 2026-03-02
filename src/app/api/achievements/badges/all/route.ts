import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { seedBadgesOnce } from "@/lib/gamification/badges";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, name: true, role: true, isDeactivated: true },
  });

  if (!me || me.isDeactivated) return NextResponse.json({ ok: false }, { status: 401 });

  // Ensure badge definitions exist
  const badgeCount = await prisma.badge.count();
  if (badgeCount === 0) await seedBadgesOnce();

  // Ensure wallet exists
  await prisma.pointsWallet.upsert({
    where: { userId: me.id },
    create: { userId: me.id, total: 0 },
    update: {},
  });

  const [wallet, allBadges, earned] = await Promise.all([
    prisma.pointsWallet.findUnique({
      where: { userId: me.id },
      select: { total: true },
    }),
    prisma.badge.findMany({
      select: { id: true, key: true, name: true, description: true, icon: true },
      orderBy: { key: "asc" },
    }),
    prisma.userBadge.findMany({
      where: { userId: me.id },
      select: { badgeId: true, awardedAt: true },
    }),
  ]);

  const earnedMap = new Map(earned.map((e) => [e.badgeId, e.awardedAt]));

  return NextResponse.json({
    ok: true,
    totalPoints: wallet?.total ?? 0,
    badges: allBadges.map((b) => ({
      ...b,
      earned: earnedMap.has(b.id),
      awardedAt: earnedMap.get(b.id) ?? null,
    })),
  });
}