import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { seedBadgesOnce } from "@/lib/gamification/badges";

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function parseTargetFromKey(key: string): number | null {
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

  // Seed once per process — no count() check on every request
  await seedBadgesOnce();

  // Wallet upsert + earned badges + all badges — all in parallel
  // upsert returns the record directly, so no second findUnique needed
  const [wallet, earned, allBadges] = await Promise.all([
    prisma.pointsWallet.upsert({
      where: { userId: me.id },
      create: { userId: me.id, total: 0 },
      update: {},
    }),
    prisma.userBadge.findMany({
      where: { userId: me.id },
      select: { badge: { select: { key: true } } },
    }),
    prisma.badge.findMany({
      select: { id: true, key: true, name: true, description: true, icon: true },
    }),
  ]);

  const totalPoints = wallet.total ?? 0;
  const earnedKeys = new Set(earned.map((x) => x.badge.key));

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
        remainingText:
          remaining === 0 ? "Ready to unlock" : `${remaining} pts away`,
        target,
      };
    })
    .sort((a, b) => a.remaining - b.remaining)
    .slice(0, 3);

  return NextResponse.json({
    ok: true,
    totalPoints,
    recommendations: candidates,
  });
}