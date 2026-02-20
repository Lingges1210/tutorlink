// src/app/api/sessions/auto-complete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

type Row = {
  id: string;
  studentId: string;
  tutorId: string | null;
  endAt: Date;
};

export async function POST(req: Request) {
  //  protect endpoint (so random people can't trigger it)
  const secret = process.env.AUTO_COMPLETE_SECRET;
  const got = req.headers.get("x-auto-complete-secret");

  if (!secret || got !== secret) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const cutoff = new Date(now.getTime() - 15 * 60 * 1000); // now - 15 min

  //  find sessions that should be auto-completed
  // endAt = COALESCE(endsAt, scheduledAt + durationMin minutes)
  const due = await prisma.$queryRaw<Row[]>`
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
      AND COALESCE(
        s."endsAt",
        s."scheduledAt" + (COALESCE(s."durationMin", 60) || ' minutes')::interval
      ) <= ${cutoff}
  `;

  let completed = 0;

  for (const s of due) {
    //  idempotent: only update if still ACCEPTED
    const upd = await prisma.session.updateMany({
      where: { id: s.id, status: "ACCEPTED" },
      data: { status: "COMPLETED" },
    });

    if (upd.count === 0) continue; // already handled elsewhere
    completed++;

    //  chat close: end + 8 hours
    const closeAt = new Date(s.endAt.getTime() + 8 * 60 * 60 * 1000);

    try {
      await prisma.chatChannel.upsert({
        where: { sessionId: s.id },
        create: {
          sessionId: s.id,
          studentId: s.studentId,
          tutorId: s.tutorId!, // accepted sessions should have tutorId, but keep it strict
          closeAt,
        },
        update: { closeAt, closedAt: null },
      });
    } catch {
      // ignore
    }

    //  notify both (don’t block automation if notify fails)
    try {
      await notify.user({
        userId: s.studentId,
        viewer: "STUDENT",
        type: "SESSION_COMPLETED",
        title: "Session completed ",
        body: "Your session was auto-completed after it ended. Chat stays open for 8 hours.",
        data: { sessionId: s.id, auto: true },
      });
    } catch {}

    try {
      if (s.tutorId) {
        await notify.user({
          userId: s.tutorId,
          viewer: "TUTOR",
          type: "SESSION_COMPLETED",
          title: "Session completed ",
          body: "This session was auto-completed after it ended. Chat stays open for 8 hours.",
          data: { sessionId: s.id, auto: true },
        });
      }
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    checked: due.length,
    completed,
    cutoffISO: cutoff.toISOString(),
  });
}