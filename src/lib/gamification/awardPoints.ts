// src/lib/gamification/awardPoints.ts
import { GAMIFICATION_RULES } from "@/lib/gamification/rules";

export async function awardPointsInTx(
  tx: any,
  args: {
    userId: string;
    amount: number;
    description: string;
    sessionId?: string | null;
    type?: "EARN" | "BONUS";
    applyDouble?: boolean;
  }
) {
  const {
    userId,
    amount,
    description,
    sessionId,
    type = "EARN",
    applyDouble = true,
  } = args;

  if (!userId || amount <= 0) return { ok: false, skipped: true };

  const now = new Date();

  await tx.pointsWallet.upsert({
    where: { userId },
    create: { userId, total: 0 },
    update: {},
  });

  if (sessionId) {
    const existing = await tx.pointsTransaction.findFirst({
      where: { userId, sessionId, description, type },
      select: { id: true },
    });
    if (existing) return { ok: true, skipped: true, multiplier: 1, finalAmount: 0 };
  }

  let multiplier = 1;

  if (applyDouble) {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { multiplierUntil: true, activeMultiplierKey: true },
    });

    if (u?.multiplierUntil && u.multiplierUntil > now && u.activeMultiplierKey) {
      switch (u.activeMultiplierKey) {
        case "POINTS_SURGE_6H":
          multiplier = 5;
          break;
        case "COMBO_MULTIPLIER_24H":
          multiplier = 2;
          break;
        case "FIRST_ACTION_BONUS_7D": {
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);
          const earnedToday = await tx.pointsTransaction.findFirst({
            where: { userId, type: "EARN", createdAt: { gte: todayStart } },
            select: { id: true },
          });
          multiplier = earnedToday ? 1 : 4;
          break;
        }
        case "WEEKEND_BOOST": {
          const day = now.getDay();
          multiplier = day === 0 || day === 6 ? 3 : 1;
          break;
        }
        case "CATCHUP_BOOST_48H":
          multiplier = 2;
          break;
        default:
          multiplier = 1;
      }
    }
  }

  const finalAmount = amount * multiplier;

  await tx.pointsTransaction.create({
    data: {
      userId,
      type,
      amount: finalAmount,
      description: multiplier > 1 ? `${description} (${multiplier}x multiplier)` : description,
      sessionId: sessionId ?? null,
    },
  });

  await tx.pointsWallet.update({
    where: { userId },
    data: { total: { increment: finalAmount } },
  });

  return { ok: true, skipped: false, multiplier, finalAmount };
}