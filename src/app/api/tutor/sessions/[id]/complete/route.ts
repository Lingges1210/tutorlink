// src/app/api/tutor/sessions/[id]/complete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";
import { seedBadgesOnce, checkAndAwardBadges } from "@/lib/gamification/badges";
import { GAMIFICATION_RULES } from "@/lib/gamification/rules";

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
  } catch {
    // ignore
  }
}

function normalizeTopicLabel(s: string) {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s\-+.#/()]/gu, "");
}

function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/* =====================================================
   UPDATED: awardPointsInTx (Double Points integrated)
===================================================== */

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

  if (!userId || amount <= 0) {
    return { ok: false, skipped: true };
  }

  const now = new Date();

  // ensure wallet exists
  await tx.pointsWallet.upsert({
    where: { userId },
    create: { userId, total: 0 },
    update: {},
  });

  // idempotency guard
  if (sessionId) {
    const existing = await tx.pointsTransaction.findFirst({
      where: { userId, sessionId, description, type },
      select: { id: true },
    });
    if (existing) {
      return { ok: true, skipped: true, multiplier: 1, finalAmount: 0 };
    }
  }

  // 🔥 DOUBLE POINTS LOGIC
  let multiplier = 1;

  if (applyDouble) {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { doubleUntil: true },
    });

    if (u?.doubleUntil && u.doubleUntil > now) {
      multiplier = 2;
    }
  }

  const finalAmount = amount * multiplier;

  await tx.pointsTransaction.create({
    data: {
      userId,
      type,
      amount: finalAmount,
      description,
      sessionId: sessionId ?? null,
    },
  });

  await tx.pointsWallet.update({
    where: { userId },
    data: { total: { increment: finalAmount } },
  });

  return { ok: true, skipped: false, multiplier, finalAmount };
}

/* =====================================================
   REST OF FILE UNCHANGED
===================================================== */

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  const summary = String(body?.summary ?? "").trim();
  const nextSteps =
    typeof body?.nextSteps === "string" && body.nextSteps.trim()
      ? body.nextSteps.trim()
      : null;

  const confidenceBefore = clampInt(Number(body?.confidenceBefore), 1, 5);
  const confidenceAfter = clampInt(Number(body?.confidenceAfter), 1, 5);

  const rawTopics: string[] = Array.isArray(body?.topics) ? body.topics : [];
  const topics = rawTopics
    .map((t) => normalizeTopicLabel(String(t ?? "")))
    .filter(Boolean)
    .slice(0, 12);

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const start = new Date(session.scheduledAt);
  const end =
    session.endsAt ??
    new Date(start.getTime() + (session.durationMin ?? 60) * 60_000);

  if (new Date() < end) {
    return NextResponse.json(
      { message: "You can complete this after the session ends." },
      { status: 409 }
    );
  }

  try {
    await seedBadgesOnce();
  } catch {}

  let updatedSession: { id: string; studentId: string | null } | null = null;

  try {
    updatedSession = await prisma.$transaction(async (tx) => {
      const updated = await tx.session.update({
        where: { id: session.id },
        data: { status: "COMPLETED", completedAt: new Date() },
        select: { id: true, studentId: true },
      });

      const studentId = session.studentId ?? null;

      if (studentId) {
        await awardPointsInTx(tx, {
          userId: studentId,
          amount: GAMIFICATION_RULES.student.sessionCompleted,
          description: "Session completed",
          sessionId: session.id,
          type: "EARN",
        });
      }

      const tutorId = session.tutorId ?? null;

      if (!tutorId) throw new Error("Missing tutorId");

      await awardPointsInTx(tx, {
        userId: tutorId,
        amount: GAMIFICATION_RULES.tutor.sessionCompleted,
        description: "Tutored a session",
        sessionId: session.id,
        type: "EARN",
      });

      return updated;
    });
  } catch {
    return NextResponse.json(
      { message: "Unable to save completion details." },
      { status: 500 }
    );
  }

  await triggerAllocator();

  return NextResponse.json({
    success: true,
    status: "COMPLETED",
    chatCloseHours: 8,
  });
}