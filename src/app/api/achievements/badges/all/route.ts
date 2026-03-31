import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { seedBadgesOnce, checkAndAwardBadges } from "@/lib/gamification/badges";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, name: true, role: true, isDeactivated: true, streakCount: true },
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

  const [wallet, allBadges, earned, completedSessionsCount, tutoredSessionsCount, topicRows] =
    await Promise.all([
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
      // Completed sessions as student — uses Session model with studentId + status
      prisma.session.count({
        where: { studentId: me.id, status: "COMPLETED" },
      }),
      // Completed sessions as tutor
      prisma.session.count({
        where: { tutorId: me.id, status: "COMPLETED" },
      }),
      // Distinct subjects covered as student (via StudentSubjectProgress)
      prisma.studentSubjectProgress.findMany({
        where: { studentId: me.id },
        select: { subjectId: true },
      }),
    ]);

  const topicCount = new Set(topicRows.map((r) => r.subjectId)).size;

  // ✅ Backfill: award any badges the user has earned but never received
  await checkAndAwardBadges({
    userId: me.id,
    totalPoints: wallet?.total ?? 0,
    completedSessionsCount,
    tutoredSessionsCount,
    topicCount,
    streak: me.streakCount ?? 0,
  });

  // Re-fetch earned badges after potential new awards
  const earnedFresh = await prisma.userBadge.findMany({
    where: { userId: me.id },
    select: { badgeId: true, awardedAt: true },
  });

  const earnedMap = new Map(earnedFresh.map((e) => [e.badgeId, e.awardedAt]));

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