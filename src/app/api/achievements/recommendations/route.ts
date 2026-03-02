// src/app/api/achievements/recommendations/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { seedBadgesOnce } from "@/lib/gamification/badges";

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function parseTargetFromKey(key: string): number | null {
  // Supports: POINTS_100, POINTS_250, ...
  if (key?.startsWith("POINTS_")) {
    const n = Number(key.replace("POINTS_", ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function GET() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true },
  });

  if (!me || me.isDeactivated)
    return NextResponse.json({ ok: false }, { status: 401 });

  // Ensure badges exist
  const badgeCount = await prisma.badge.count();
  if (badgeCount === 0) await seedBadgesOnce();

  // Ensure wallet exists
  await prisma.pointsWallet.upsert({
    where: { userId: me.id },
    create: { userId: me.id, total: 0 },
    update: {},
  });

  const wallet = await prisma.pointsWallet.findUnique({
    where: { userId: me.id },
    select: { total: true },
  });

  const totalPoints = wallet?.total ?? 0;

  // Earned badge keys
  const earned = await prisma.userBadge.findMany({
    where: { userId: me.id },
    select: { badge: { select: { key: true } } },
  });

  const earnedKeys = new Set(earned.map((x) => x.badge.key));

  // Candidate badges (only ones not earned)
  const allBadges = await prisma.badge.findMany({
    select: { id: true, key: true, name: true, description: true, icon: true },
  });

  const candidates = allBadges
    .filter((b) => !earnedKeys.has(b.key))
    .map((b) => {
      const target = parseTargetFromKey(b.key);

      if (!target) {
        return {
          id: b.id,
          key: b.key,
          name: b.name,
          description: b.description,
          icon: b.icon,
          supported: false,
          pct: 0,
          remaining: Number.MAX_SAFE_INTEGER,
          remainingText: "Progress coming soon",
          target: null as number | null,
        };
      }

      const pct = clampPct((totalPoints / target) * 100);
      const remaining = Math.max(0, target - totalPoints);

      return {
        id: b.id,
        key: b.key,
        name: b.name,
        description: b.description,
        icon: b.icon,
        supported: true,
        pct,
        remaining,
        remainingText: remaining === 0 ? "Ready to unlock" : `${remaining} pts away`,
        target,
      };
    })
    // closest first (supported badges always float up because they have small remaining)
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 3);

  return NextResponse.json({
    ok: true,
    totalPoints,
    recommendations: candidates,
  });
}