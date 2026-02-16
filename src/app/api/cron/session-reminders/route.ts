import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// IMPORTANT: protect this route in production with a secret header
function assertCronAuth(req: Request) {
  const got = req.headers.get("x-cron-secret");
  const want = process.env.CRON_SECRET;
  if (want && got !== want) throw new Error("Unauthorized cron");
}

type ReminderKind = "H24" | "H1" | "M5";

function withinWindow(startMs: number, targetMs: number, windowMs: number) {
  // startMs <= targetMs < startMs + windowMs
  return targetMs >= startMs && targetMs < startMs + windowMs;
}

export async function GET(req: Request) {
  try {
    assertCronAuth(req);

    const now = Date.now();
    const windowMs = 60_000; // ✅ cron runs every 1 min (or 2 min). window prevents missing.

    const sessions = await prisma.session.findMany({
      where: {
        status: "ACCEPTED",
        scheduledAt: { gt: new Date(now - 5 * 60_000) }, // small safety
      },
      select: {
        id: true,
        scheduledAt: true,
        durationMin: true,
        studentId: true,
        tutorId: true,
        subject: { select: { code: true, title: true } },
      },
    });

    let created = 0;

    for (const s of sessions) {
      const start = new Date(s.scheduledAt).getTime();

      const checks: Array<{ kind: ReminderKind; offsetMs: number; title: string; body: (when: string) => string }> = [
        {
          kind: "H24",
          offsetMs: 24 * 60 * 60_000,
          title: "Session reminder (24h)",
          body: (when) => `You have a session in 24 hours: ${when}.`,
        },
        {
          kind: "H1",
          offsetMs: 60 * 60_000,
          title: "Session reminder (1h)",
          body: (when) => `Your session starts in 1 hour: ${when}.`,
        },
        {
          kind: "M5",
          offsetMs: 5 * 60_000,
          title: "Session starting soon (5m)",
          body: (when) => `Your session starts in 5 minutes: ${when}.`,
        },
      ];

      for (const c of checks) {
        const fireAt = start - c.offsetMs;

        if (!withinWindow(now, fireAt, windowMs)) continue;

        // ✅ create reminder record first (unique ensures no duplicates)
        try {
          await prisma.sessionReminder.create({
  data: {
    sessionId: s.id,
    kind: c.kind,
    sendAt: new Date(fireAt),
  },
});
        } catch {
          // already sent
          continue;
        }

        const when = new Date(s.scheduledAt).toLocaleString();

        // ✅ student notification
        if (s.studentId) {
          await prisma.notification.create({
            data: {
              userId: s.studentId,
              type: "SESSION_REMINDER",
              title: c.title,
              body: c.body(when),
              data: {
                sessionId: s.id,
                role: "STUDENT",
                kind: c.kind,
                subjectCode: s.subject?.code,
              },
            },
          });
          created++;
        }

        // ✅ tutor notification
        if (s.tutorId) {
          await prisma.notification.create({
            data: {
              userId: s.tutorId,
              type: "SESSION_REMINDER",
              title: c.title,
              body: c.body(when),
              data: {
                sessionId: s.id,
                role: "TUTOR",
                kind: c.kind,
                subjectCode: s.subject?.code,
              },
            },
          });
          created++;
        }
      }
    }

    return NextResponse.json({ ok: true, created });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Cron failed" },
      { status: 401 }
    );
  }
}
