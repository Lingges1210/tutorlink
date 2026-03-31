// src/app/api/tutor/sessions/[id]/complete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { seedBadgesOnce } from "@/lib/gamification/badges";
import { GAMIFICATION_RULES } from "@/lib/gamification/rules";
import { notify } from "@/lib/notify";
import { queueStudypalReward } from "@/lib/studypalServerReward";

async function triggerAllocator() {
  const appUrl = process.env.APP_URL;
  const secret = process.env.ALLOCATOR_SECRET;
  if (!appUrl || !secret) return;
  try {
    await fetch(`${appUrl}/api/sessions/allocate`, {
      method: "POST",
      headers: { "x-allocator-secret": secret },
      cache: "no-store",
    });
  } catch {}
}

function normalizeTopicLabel(s: string) {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s\-+.#/()]/gu, "");
}

async function awardPointsInTx(
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
      select: { multiplierUntil: true, activeMultiplierKey: true, boostUntil: true },
    });

    if (u?.multiplierUntil && u.multiplierUntil > now && u.activeMultiplierKey) {
      switch (u.activeMultiplierKey) {
        case "POINTS_SURGE_6H": multiplier = 5; break;
        case "COMBO_MULTIPLIER_24H": multiplier = 2; break;
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
          multiplier = (day === 0 || day === 6) ? 3 : 1;
          break;
        }
        case "CATCHUP_BOOST_48H": multiplier = 2; break;
        default: multiplier = 1;
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

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const summary = String(body?.summary ?? "").trim();
  const rawTopics: string[] = Array.isArray(body?.topics) ? body.topics : [];
  const topics = rawTopics
    .map((t) => normalizeTopicLabel(String(t ?? "")))
    .filter(Boolean)
    .slice(0, 12);

  // ── Parse confidence scores ──────────────────────────────────────────────
  const confidenceBefore =
    typeof body?.confidenceBefore === "number" &&
    Number.isInteger(body.confidenceBefore) &&
    body.confidenceBefore >= 0 &&
    body.confidenceBefore <= 10
      ? body.confidenceBefore
      : 0;

  const confidenceAfter =
    typeof body?.confidenceAfter === "number" &&
    Number.isInteger(body.confidenceAfter) &&
    body.confidenceAfter >= 0 &&
    body.confidenceAfter <= 10
      ? body.confidenceAfter
      : 0;

  const nextSteps =
    typeof body?.nextSteps === "string" ? body.nextSteps.trim() || null : null;

  if (!summary) {
    return NextResponse.json(
      { message: "Session summary is required." },
      { status: 400 }
    );
  }

  if (topics.length === 0) {
    return NextResponse.json(
      { message: "Please provide at least 1 topic covered." },
      { status: 400 }
    );
  }

  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tutor = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      isDeactivated: true,
      verificationStatus: true,
      isTutorApproved: true,
      role: true,
      roleAssignments: { select: { role: true } },
    },
  });

  if (!tutor || tutor.isDeactivated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const isTutor =
    tutor.isTutorApproved ||
    tutor.role === "TUTOR" ||
    tutor.roleAssignments.some((r) => r.role === "TUTOR");

  if (!isTutor || tutor.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      id: true,
      tutorId: true,
      studentId: true,
      status: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
      subjectId: true,
    },
  });

  if (!session || session.tutorId !== tutor.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (session.status !== "ACCEPTED") {
    return NextResponse.json(
      { message: "Only accepted sessions can be completed" },
      { status: 409 }
    );
  }

  if (new Date() < new Date(session.scheduledAt)) {
    return NextResponse.json(
      { message: "You can complete this after the session starts." },
      { status: 409 }
    );
  }

  try { await seedBadgesOnce(); } catch {}

try {
    await prisma.$transaction(async (tx) => {
      // 1. Mark session completed
      await tx.session.update({
        where: { id: session.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      // 2. Upsert all Topic records in parallel
      const topicIds: string[] = await Promise.all(
        topics.map(async (label) => {
          const topic = await tx.topic.upsert({
            where: {
              subjectId_name: { subjectId: session.subjectId, name: label },
            },
            create: { subjectId: session.subjectId, name: label },
            update: {},
            select: { id: true },
          });
          return topic.id;
        })
      );

      // 3. Create SessionCompletion with linked SessionTopics
      await tx.sessionCompletion.create({
        data: {
          sessionId: session.id,
          summary,
          confidenceBefore,
          confidenceAfter,
          nextSteps,
          topics: {
            create: topicIds.map((topicId) => ({ topicId })),
          },
        },
        select: { id: true },
      });

      const studentId = session.studentId;
      const tutorId = session.tutorId;
      if (!tutorId) throw new Error("Missing tutorId");

      // 4. All remaining reads in parallel
      const [existingProgress, studentWallet, tutorWallet, studentPointsCheck, tutorPointsCheck] =
        await Promise.all([
          studentId
            ? tx.studentSubjectProgress.findUnique({
                where: {
                  studentId_subjectId: { studentId, subjectId: session.subjectId },
                },
                select: { totalSessions: true, avgConfGain: true },
              })
            : Promise.resolve(null),
          studentId
            ? tx.pointsWallet.findUnique({ where: { userId: studentId }, select: { userId: true } })
            : Promise.resolve(null),
          tx.pointsWallet.findUnique({ where: { userId: tutorId }, select: { userId: true } }),
          studentId
            ? tx.pointsTransaction.findFirst({
                where: { userId: studentId, sessionId: session.id, description: "Session completed" },
                select: { id: true },
              })
            : Promise.resolve(null),
          tx.pointsTransaction.findFirst({
            where: { userId: tutorId, sessionId: session.id, description: "Tutored a session" },
            select: { id: true },
          }),
        ]);

      // 5. All writes in parallel
      const writes: Promise<any>[] = [];

      if (studentId) {
        const gain = confidenceAfter - confidenceBefore;

        // Subject progress
        if (!existingProgress) {
          writes.push(
            tx.studentSubjectProgress.create({
              data: {
                studentId,
                subjectId: session.subjectId,
                totalSessions: 1,
                totalMinutes: session.durationMin ?? 0,
                avgConfGain: gain,
                lastSessionAt: new Date(),
              },
            })
          );
        } else {
          const newCount = existingProgress.totalSessions + 1;
          const newAvg =
            (existingProgress.avgConfGain * existingProgress.totalSessions + gain) / newCount;
          writes.push(
            tx.studentSubjectProgress.update({
              where: {
                studentId_subjectId: { studentId, subjectId: session.subjectId },
              },
              data: {
                totalSessions: newCount,
                totalMinutes: { increment: session.durationMin ?? 0 },
                avgConfGain: newAvg,
                lastSessionAt: new Date(),
              },
            })
          );
        }

        // Topic progress
        for (const topicId of topicIds) {
          writes.push(
            tx.studentTopicProgress.upsert({
              where: { studentId_topicId: { studentId, topicId } },
              create: {
                studentId,
                subjectId: session.subjectId,
                topicId,
                timesCovered: 1,
                lastCoveredAt: new Date(),
              },
              update: {
                timesCovered: { increment: 1 },
                lastCoveredAt: new Date(),
              },
            })
          );
        }

        // Student wallet + points
        if (!studentWallet) {
          writes.push(tx.pointsWallet.create({ data: { userId: studentId, total: 0 } }));
        }
        if (!studentPointsCheck) {
          const amt = GAMIFICATION_RULES.student.sessionCompleted;
          writes.push(
            tx.pointsTransaction.create({
              data: {
                userId: studentId,
                type: "EARN",
                amount: amt,
                description: "Session completed",
                sessionId: session.id,
              },
            }),
            tx.pointsWallet.update({
              where: { userId: studentId },
              data: { total: { increment: amt } },
            })
          );
        }
      }

      // Tutor wallet + points
      if (!tutorWallet) {
        writes.push(tx.pointsWallet.create({ data: { userId: tutorId, total: 0 } }));
      }
      if (!tutorPointsCheck) {
        const amt = GAMIFICATION_RULES.tutor.sessionCompleted;
        writes.push(
          tx.pointsTransaction.create({
            data: {
              userId: tutorId,
              type: "EARN",
              amount: amt,
              description: "Tutored a session",
              sessionId: session.id,
            },
          }),
          tx.pointsWallet.update({
            where: { userId: tutorId },
            data: { total: { increment: amt } },
          })
        );
      }

      await Promise.all(writes);
    }, {
      timeout: 20000,
    });
  } catch (err) {
    console.error("[complete] transaction failed:", err);
    return NextResponse.json(
      { message: "Unable to save completion details." },
      { status: 500 }
    );
  }

  await triggerAllocator();

  if (session.studentId) {
    await queueStudypalReward(session.studentId, "session");
  }

  if (session.studentId) {
    try {
      await notify.user({
        userId: session.studentId,
        viewer: "STUDENT",
        type: "RATE_SESSION",
        title: "How was your session?",
        body: "Your session has ended. Take a moment to rate your tutor.",
        data: { sessionId: session.id },
      });
    } catch {}
  }

  return NextResponse.json({
    success: true,
    status: "COMPLETED",
    chatCloseHours: 8,
  });
}