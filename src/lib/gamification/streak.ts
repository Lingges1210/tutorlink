import { prisma } from "@/lib/prisma";

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

function toMYTDayString(date: Date): string {
  const myt = new Date(date.getTime() + MYT_OFFSET_MS);
  return myt.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function recordLoginStreak(userId: string): Promise<{
  streakCount: number;
  isNewDay: boolean;
}> {
  const now = new Date();
  const todayStr = toMYTDayString(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      streakCount: true,
      streakLastSeen: true,
      streakBrokenAt: true,
      streakFreezeUntil: true,
      streakShieldCount: true,
    },
  });

  if (!user) return { streakCount: 0, isNewDay: false };

  const lastSeenStr = user.streakLastSeen
    ? toMYTDayString(user.streakLastSeen)
    : null;

  // Already recorded today — no change
  if (lastSeenStr === todayStr) {
    return { streakCount: user.streakCount, isNewDay: false };
  }

  const yesterday = new Date(now.getTime() + MYT_OFFSET_MS);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const isConsecutive = lastSeenStr === yesterdayStr;
  const isFrozen = user.streakFreezeUntil && user.streakFreezeUntil > now;

  let newCount: number;
  let streakBrokenAt: Date | null = user.streakBrokenAt;

  if (!lastSeenStr) {
    // First ever login
    newCount = 1;
  } else if (isConsecutive) {
    // Consecutive day — increment
    newCount = user.streakCount + 1;
  } else if (isFrozen) {
    // Streak frozen — keep count, don't break
    newCount = user.streakCount;
  } else if (user.streakShieldCount > 0) {
    // Shield absorbs the break — keep count, consume one shield
    newCount = user.streakCount;
    await prisma.user.update({
      where: { id: userId },
      data: { streakShieldCount: { decrement: 1 } },
    });
  } else {
    // Broken — reset to 1, record broken time
    newCount = 1;
    streakBrokenAt = user.streakLastSeen ?? now;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      streakCount: newCount,
      streakLastSeen: now,
      streakBrokenAt,
    },
  });

  return { streakCount: newCount, isNewDay: true };
}

export async function repairStreak(userId: string): Promise<{
  ok: boolean;
  error?: string;
  streakCount?: number;
}> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      streakCount: true,
      streakLastSeen: true,
      streakBrokenAt: true,
    },
  });

  if (!user) return { ok: false, error: "User not found" };

  if (!user.streakBrokenAt) {
    return { ok: false, error: "No broken streak to repair." };
  }

  if (user.streakBrokenAt < cutoff) {
    return { ok: false, error: "Streak was broken more than 48 hours ago." };
  }

  // Restore streak to what it was before the break
  // We don't know the old count so we restore to current + 1 as a reasonable restore
  const restoredCount = user.streakCount + 1;

  await prisma.user.update({
    where: { id: userId },
    data: {
      streakCount: restoredCount,
      streakBrokenAt: null,
      streakLastSeen: now,
    },
  });

  return { ok: true, streakCount: restoredCount };
}