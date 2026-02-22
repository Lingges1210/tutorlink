// src/app/api/tutor/sessions/[id]/complete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";

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

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  //  Parse body (now required)
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

  //  Transaction: completion + topics + progress + mark session completed
  let updatedSession: { id: string; studentId: string | null } | null = null;

  try {
    updatedSession = await prisma.$transaction(async (tx) => {
      // 1) Mark session completed
      const updated = await tx.session.update({
        where: { id: session.id },
        data: { status: "COMPLETED", completedAt: new Date() },
        select: { id: true, studentId: true },
      });

      // 2) Create (or update) completion record (unique by sessionId)
      const completion = await tx.sessionCompletion.upsert({
        where: { sessionId: session.id },
        create: {
          sessionId: session.id,
          summary,
          confidenceBefore,
          confidenceAfter,
          nextSteps,
        },
        update: {
          summary,
          confidenceBefore,
          confidenceAfter,
          nextSteps,
        },
        select: { id: true },
      });

      // 3) Upsert topics for this subject
      const topicRows = await Promise.all(
        topics.map((name) =>
          tx.topic.upsert({
            where: { subjectId_name: { subjectId: session.subjectId, name } },
            create: { subjectId: session.subjectId, name },
            update: {},
            select: { id: true, name: true },
          })
        )
      );

      // 4) Link completion ↔ topics (clear then re-add for idempotency)
      await tx.sessionTopic.deleteMany({
        where: { completionId: completion.id },
      });

      await tx.sessionTopic.createMany({
        data: topicRows.map((t) => ({
          completionId: completion.id,
          topicId: t.id,
        })),
        skipDuplicates: true,
      });

      // 5) Update student progress aggregates
      if (session.studentId) {
        const gain = confidenceAfter - confidenceBefore;
        const minutes = session.durationMin ?? 60;

        // subject-level progress
        const existing = await tx.studentSubjectProgress.findUnique({
          where: {
            studentId_subjectId: {
              studentId: session.studentId,
              subjectId: session.subjectId,
            },
          },
          select: { id: true, totalSessions: true, avgConfGain: true },
        });

        if (!existing) {
          await tx.studentSubjectProgress.create({
            data: {
              studentId: session.studentId,
              subjectId: session.subjectId,
              totalSessions: 1,
              totalMinutes: minutes,
              lastSessionAt: end,
              avgConfGain: gain,
            },
          });
        } else {
          const newTotal = existing.totalSessions + 1;
          const newAvg =
            (existing.avgConfGain * existing.totalSessions + gain) / newTotal;

          await tx.studentSubjectProgress.update({
            where: { id: existing.id },
            data: {
              totalSessions: newTotal,
              totalMinutes: { increment: minutes },
              lastSessionAt: end,
              avgConfGain: newAvg,
            },
          });
        }

        // topic-level progress
        for (const t of topicRows) {
          await tx.studentTopicProgress.upsert({
            where: { studentId_topicId: { studentId: session.studentId, topicId: t.id } },
            create: {
              studentId: session.studentId,
              subjectId: session.subjectId,
              topicId: t.id,
              timesCovered: 1,
              lastCoveredAt: end,
            },
            update: {
              timesCovered: { increment: 1 },
              lastCoveredAt: end,
              subjectId: session.subjectId,
            },
          });
        }
      }

      return updated;
    });
  } catch (e: any) {
    // If completion models not migrated yet, or constraint mismatch
    return NextResponse.json(
      { message: "Unable to save completion details. Check DB migrations." },
      { status: 500 }
    );
  }

  // keep chat open for 8 hours after session end
  try {
    const closeAt = new Date(end.getTime() + 8 * 60 * 60 * 1000);

    await prisma.chatChannel.upsert({
      where: { sessionId: updatedSession!.id },
      create: {
        sessionId: updatedSession!.id,
        studentId: session.studentId,
        tutorId: session.tutorId!, // ACCEPTED => tutorId exists
        closeAt,
      },
      update: { closeAt, closedAt: null },
    });
  } catch {
    // ignore
  }

  // Notify student (viewer must be STUDENT)
  try {
    if (updatedSession?.studentId) {
      await notify.user({
  userId: updatedSession.studentId,
  viewer: "STUDENT",
  type: "SESSION_COMPLETED",
  title: "Session Completed",
  body: "Your tutor completed the session. Please rate your tutor and leave feedback.",
  data: { sessionId: updatedSession.id, action: "RATE_SESSION" },
});
    }
  } catch {
    // ignore
  }

  await triggerAllocator();

  return NextResponse.json({
    success: true,
    status: "COMPLETED",
    chatCloseHours: 8,
  });
}