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

  const badgeCount = await prisma.badge.count();
  if (badgeCount === 0) await seedBadgesOnce();

  await prisma.pointsWallet.upsert({
    where: { userId: me.id },
    create: { userId: me.id, total: 0 },
    update: {},
  });

  const wallet = await prisma.pointsWallet.findUnique({ where: { userId: me.id } });

  const history = await prisma.pointsTransaction.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const badges = await prisma.userBadge.findMany({
    where: { userId: me.id },
    include: { badge: true },
    orderBy: { awardedAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    me,
    wallet,
    history,
    badges,
  });
}