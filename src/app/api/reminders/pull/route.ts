import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { Prisma, SessionStatus } from "@prisma/client";

type ReminderKind = "H24" | "H1" | "M5";

function withinWindow(nowMs: number, targetMs: number, windowMs: number) {
  return targetMs >= nowMs && targetMs < nowMs + windowMs;
}

export async function GET() {
  try {
    //  require login
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    //  map auth user -> your DB user (for id + role)
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true, role: true },
    });

    if (!dbUser?.id) {
      return NextResponse.json(
        { ok: false, message: "User not found" },
        { status: 404 }
      );
    }

    const now = Date.now();
    const windowMs = 60_000; // check every 1 min

    //  load sessions for THIS user only
    const sessions = await prisma.session.findMany({
      where: {
        status: SessionStatus.ACCEPTED,
        scheduledAt: { gt: new Date(now - 2 * 60 * 60_000) }, // safety
        OR: [{ studentId: dbUser.id }, { tutorId: dbUser.id }],
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

    const checks: Array<{
      kind: ReminderKind;
      offsetMs: number;
      title: string;
      body: (when: string) => string;
    }> = [
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

    for (const s of sessions) {
      const startMs = new Date(s.scheduledAt).getTime();
      const when = new Date(s.scheduledAt).toLocaleString();

      for (const c of checks) {
        const fireAt = startMs - c.offsetMs;
        if (!withinWindow(now, fireAt, windowMs)) continue;

        //  Strong dedupe: DB unique (userId + dedupeKey)
        const dedupeKey = `rem:${s.id}:${c.kind}:${dbUser.id}`;

        try {
          await prisma.notification.create({
            data: {
              userId: dbUser.id,
              type: "SESSION_REMINDER",
              title: c.title,
              body: c.body(when),
              data: {
                sessionId: s.id,
                kind: c.kind,
                subjectCode: s.subject?.code,
                role: dbUser.role,
              },
              dedupeKey,
            },
          });

          created++;
        } catch (err: any) {
          // already created (unique constraint hit)
          if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code === "P2002") continue;
          }
          throw err;
        }
      }
    }

    return NextResponse.json({ ok: true, created });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Reminder pull failed" },
      { status: 500 }
    );
  }
}
