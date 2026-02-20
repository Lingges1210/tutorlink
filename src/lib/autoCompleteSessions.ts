// src/lib/autoCompleteSessions.ts
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

type DueRow = {
  id: string;
  studentId: string;
  tutorId: string;
  endAt: Date;
};

export async function autoCompleteSessionsIfNeeded() {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 15 * 60 * 1000); // end + 15 min

  // ✅ only pick sessions that are definitely due
  const due = await prisma.$queryRaw<DueRow[]>`
    SELECT
      s."id",
      s."studentId",
      s."tutorId",
      COALESCE(
        s."endsAt",
        s."scheduledAt" + (COALESCE(s."durationMin", 60) || ' minutes')::interval
      ) AS "endAt"
    FROM "Session" s
    WHERE s."status" = 'ACCEPTED'
      AND s."tutorId" IS NOT NULL
      AND COALESCE(
        s."endsAt",
        s."scheduledAt" + (COALESCE(s."durationMin", 60) || ' minutes')::interval
      ) <= ${cutoff}
    ORDER BY s."scheduledAt" ASC
    LIMIT 25
  `;

  if (!due.length) return;

  for (const s of due) {
    // ✅ idempotent (won’t double-complete)
    const upd = await prisma.session.updateMany({
      where: { id: s.id, status: "ACCEPTED" },
      data: { status: "COMPLETED" },
    });

    if (upd.count === 0) continue;

    // ✅ chat closes endAt + 8 hours
    const closeAt = new Date(s.endAt.getTime() + 8 * 60 * 60 * 1000);

    try {
      await prisma.chatChannel.upsert({
        where: { sessionId: s.id },
        create: {
          sessionId: s.id,
          studentId: s.studentId,
          tutorId: s.tutorId,
          closeAt,
        },
        update: { closeAt, closedAt: null },
      });
    } catch {
      // ignore
    }

    // ✅ notify both users (non-blocking)
    try {
      await notify.user({
        userId: s.studentId,
        viewer: "STUDENT",
        type: "SESSION_COMPLETED",
        title: "Session auto-completed ✅",
        body: "Your session was auto-completed 15 minutes after it ended. Chat stays open for 8 hours.",
        data: { sessionId: s.id, auto: true },
      });
    } catch {}

    try {
      await notify.user({
        userId: s.tutorId,
        viewer: "TUTOR",
        type: "SESSION_COMPLETED",
        title: "Session auto-completed ✅",
        body: "This session was auto-completed 15 minutes after it ended. Chat stays open for 8 hours.",
        data: { sessionId: s.id, auto: true },
      });
    } catch {}
  }
}