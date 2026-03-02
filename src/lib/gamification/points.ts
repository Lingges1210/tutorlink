// src/lib/gamification/points.ts
import { prisma } from "@/lib/prisma";

export async function ensureWallet(userId: string) {
  await prisma.pointsWallet.upsert({
    where: { userId },
    create: { userId, total: 0 },
    update: {},
  });
}

export async function awardPoints(args: {
  userId: string;
  amount: number; // base amount (must be > 0)
  description: string;
  sessionId?: string | null;
  type?: "EARN" | "BONUS";
  applyDouble?: boolean;
}) {
  const {
    userId,
    amount,
    description,
    sessionId,
    type = "EARN",
    applyDouble = true,
  } = args;

  if (amount <= 0) throw new Error("awardPoints amount must be > 0");

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    await tx.pointsWallet.upsert({
      where: { userId },
      create: { userId, total: 0 },
      update: {},
    });

    // ✅ dedupe (use stable description)
    if (sessionId) {
      const existing = await tx.pointsTransaction.findFirst({
        where: { userId, sessionId, description, type },
        select: { id: true },
      });
      if (existing) return { ok: true, skipped: true, multiplier: 1, finalAmount: 0 };
    }

    // ✅ check x2
    let multiplier = 1;
    if (applyDouble) {
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { doubleUntil: true },
      });
      if (u?.doubleUntil && u.doubleUntil > now) multiplier = 2;
    }

    const finalAmount = amount * multiplier;

    await tx.pointsTransaction.create({
      data: {
        userId,
        type,
        amount: finalAmount,
        description, // ✅ keep stable
        sessionId: sessionId ?? null,
      },
    });

    await tx.pointsWallet.update({
      where: { userId },
      data: { total: { increment: finalAmount } },
    });

    return { ok: true, skipped: false, multiplier, finalAmount };
  });
}

export async function redeemPoints(args: {
  userId: string;
  amount: number; // must be > 0
  description: string;
}) {
  const { userId, amount, description } = args;
  if (amount <= 0) throw new Error("redeemPoints amount must be > 0");

  return prisma.$transaction(async (tx) => {
    const wallet = await tx.pointsWallet.upsert({
      where: { userId },
      create: { userId, total: 0 },
      update: {},
    });

    if (wallet.total < amount) throw new Error("Not enough points");

    await tx.pointsTransaction.create({
      data: {
        userId,
        type: "REDEEM",
        amount: -amount,
        description,
      },
    });

    await tx.pointsWallet.update({
      where: { userId },
      data: { total: { decrement: amount } },
    });

    return { ok: true };
  });
}