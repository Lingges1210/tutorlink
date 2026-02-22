import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

const TZ = "Asia/Kuala_Lumpur";

function dayKey(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
}

function computeStreak(dateKeys: string[]) {
  const set = new Set(dateKeys);
  const todayKey = dayKey(new Date());

  // current streak
  let current = 0;
  let cursor = new Date();
  while (set.has(dayKey(cursor))) {
    current++;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }

  // longest streak
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;

  const toDate = (k: string) => new Date(`${k}T00:00:00.000Z`);
  for (const k of sorted) {
    if (!prev) run = 1;
    else {
      const a = toDate(prev).getTime();
      const b = toDate(k).getTime();
      const diffDays = Math.round((b - a) / (24 * 60 * 60 * 1000));
      run = diffDays === 1 ? run + 1 : 1;
    }
    longest = Math.max(longest, run);
    prev = k;
  }

  return {
    todayKey,
    current,
    longest,
    hasToday: set.has(todayKey),
    lastStudyKey: sorted.length ? sorted[sorted.length - 1] : null,
  };
}

export async function GET(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true, verificationStatus: true },
  });

  if (!me || me.isDeactivated) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (me.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ ok: false, message: "Locked until verification." }, { status: 403 });
  }

  const url = new URL(req.url);
  const tab = (url.searchParams.get("tab") ?? "overview").toLowerCase();
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? "10")));
  const subjectId = url.searchParams.get("subjectId")?.trim() || null;

  // ---- Overview: subject progress ----
  const subjectProgress = await prisma.studentSubjectProgress.findMany({
    where: {
      studentId: me.id,
      ...(subjectId ? { subjectId } : {}),
    },
    orderBy: [{ lastSessionAt: "desc" }, { totalSessions: "desc" }],
    select: {
      subjectId: true,
      totalSessions: true,
      totalMinutes: true,
      lastSessionAt: true,
      avgConfGain: true,
      subject: { select: { code: true, title: true } },
    },
  });

  const totals = subjectProgress.reduce(
    (acc, s) => {
      acc.totalSessions += s.totalSessions;
      acc.totalMinutes += s.totalMinutes;
      return acc;
    },
    { totalSessions: 0, totalMinutes: 0 }
  );

  // streak based on COMPLETED sessions (filtered by subject if drilldown)
  const completedSessions = await prisma.session.findMany({
    where: {
      studentId: me.id,
      status: "COMPLETED",
      ...(subjectId ? { subjectId } : {}),
    },
    select: { scheduledAt: true, endsAt: true, durationMin: true },
    orderBy: { scheduledAt: "desc" },
    take: 600,
  });

  const completedDayKeys = Array.from(
    new Set(
      completedSessions.map((s) => {
        const start = new Date(s.scheduledAt);
        const end = s.endsAt ?? new Date(start.getTime() + (s.durationMin ?? 60) * 60_000);
        return dayKey(end);
      })
    )
  );

  const streak = computeStreak(completedDayKeys);

  // ---- Topics (top covered, filtered) ----
  const topTopics = await prisma.studentTopicProgress.findMany({
    where: {
      studentId: me.id,
      ...(subjectId ? { subjectId } : {}),
    },
    orderBy: [{ timesCovered: "desc" }, { lastCoveredAt: "desc" }],
    take: 50,
    select: {
      timesCovered: true,
      lastCoveredAt: true,
      subject: { select: { id: true, code: true, title: true } },
      topic: { select: { id: true, name: true } },
    },
  });

  // ---- History: session summaries (filtered) ----
  const history = await prisma.session.findMany({
    where: {
      studentId: me.id,
      status: "COMPLETED",
      ...(subjectId ? { subjectId } : {}),
    },
    orderBy: { scheduledAt: "desc" },
    take: limit,
    select: {
      id: true,
      scheduledAt: true,
      durationMin: true,
      subject: { select: { id: true, code: true, title: true } },
      tutor: { select: { name: true, email: true } },
      completion: {
        select: {
          summary: true,
          confidenceBefore: true,
          confidenceAfter: true,
          nextSteps: true,
          createdAt: true,
          topics: { select: { topic: { select: { name: true } } } },
        },
      },
    },
  });

  // ---- Analytics: most improved subject + recent gains ----
  const allSubjectsForAnalytics = await prisma.studentSubjectProgress.findMany({
    where: { studentId: me.id },
    select: {
      subjectId: true,
      avgConfGain: true,
      totalSessions: true,
      subject: { select: { code: true, title: true } },
    },
  });

  const best = allSubjectsForAnalytics
    .filter((x) => x.totalSessions > 0)
    .sort((a, b) => b.avgConfGain - a.avgConfGain)[0];

  const recentForTrend = await prisma.session.findMany({
    where: {
      studentId: me.id,
      status: "COMPLETED",
      completion: { isNot: null },
      ...(subjectId ? { subjectId } : {}),
    },
    orderBy: { scheduledAt: "desc" },
    take: 12,
    select: {
      scheduledAt: true,
      subject: { select: { code: true } },
      completion: { select: { confidenceBefore: true, confidenceAfter: true } },
    },
  });

  const trend = recentForTrend
    .map((s) => ({
      at: s.scheduledAt,
      subjectCode: s.subject.code,
      gain: (s.completion!.confidenceAfter ?? 0) - (s.completion!.confidenceBefore ?? 0),
    }))
    .reverse();

  return NextResponse.json({
    ok: true,
    tab,
    subjectId,
    overview: {
      totals,
      streak,
      subjects: subjectProgress.map((s) => ({
        subjectId: s.subjectId,
        code: s.subject.code,
        title: s.subject.title,
        totalSessions: s.totalSessions,
        totalMinutes: s.totalMinutes,
        lastSessionAt: s.lastSessionAt,
        avgConfGain: s.avgConfGain,
      })),
    },
    topics: {
      topTopics: topTopics.map((t) => ({
        subjectId: t.subject.id,
        subjectCode: t.subject.code,
        subjectTitle: t.subject.title,
        topicId: t.topic.id,
        topicName: t.topic.name,
        timesCovered: t.timesCovered,
        lastCoveredAt: t.lastCoveredAt,
      })),
    },
    history: {
      sessions: history.map((s) => ({
        id: s.id,
        scheduledAt: s.scheduledAt,
        durationMin: s.durationMin,
        subject: s.subject,
        tutorName: s.tutor?.name ?? s.tutor?.email ?? "Tutor",
        completion: s.completion
          ? {
              summary: s.completion.summary,
              confidenceBefore: s.completion.confidenceBefore,
              confidenceAfter: s.completion.confidenceAfter,
              nextSteps: s.completion.nextSteps,
              createdAt: s.completion.createdAt,
              topics: s.completion.topics.map((x) => x.topic.name),
            }
          : null,
      })),
    },
    analytics: {
      mostImprovedSubject: best
        ? {
            subjectId: best.subjectId,
            code: best.subject.code,
            title: best.subject.title,
            avgConfGain: best.avgConfGain,
            totalSessions: best.totalSessions,
          }
        : null,
      confidenceTrend: trend,
    },
  });
}