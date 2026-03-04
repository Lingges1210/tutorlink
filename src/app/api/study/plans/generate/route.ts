// src/app/api/study/plans/generate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
const DAY_KEYS: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type PreferredTime = "MORNING" | "AFTERNOON" | "NIGHT";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getMondayOfWeek(today: Date) {
  const d = startOfDay(today);
  const jsDay = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (jsDay + 6) % 7; // how many days since Monday
  return addDays(d, -diff);
}

function dayKeyFromDate(d: Date): DayKey {
  const js = d.getDay();
  return js === 0 ? "SUN" : (["MON", "TUE", "WED", "THU", "FRI", "SAT"][js - 1] as DayKey);
}

async function getMe() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true },
  });
  if (!me || me.isDeactivated) return null;
  return me;
}

type InputSubject = {
  name: string;
  level0to10: number;
  weakTopics: string[];
};

type GenerateBody = {
  title?: string;
  examDate?: string; // ISO
  hoursPerWeek: number;
  style: "SHORT_BURSTS" | "DEEP_STUDY";
  preferredTime?: PreferredTime; // ✅ NEW
  availability: {
    days: DayKey[];
    hoursByDay: Partial<Record<DayKey, number>>;
  };
  subjects: InputSubject[];
};

type TopicRow = {
  subjectName: string;
  topic: string;
  weakness: number;
  topicWeight: number;
};

function buildTopics(subjects: InputSubject[]): TopicRow[] {
  const rows: TopicRow[] = [];
  for (const s of subjects) {
    const lvl = clamp(Number(s.level0to10 ?? 5), 0, 10);
    const baseWeakness = clamp(10 - lvl, 0, 10);

    const weakSet = new Set((s.weakTopics ?? []).map((t) => t.trim()).filter(Boolean));
    const topicList = [...weakSet];

    if (topicList.length === 0) {
      rows.push({
        subjectName: s.name.trim() || "Subject",
        topic: "General revision",
        weakness: clamp(baseWeakness + 2, 0, 10),
        topicWeight: 5,
      });
      continue;
    }

    for (const t of topicList) {
      rows.push({
        subjectName: s.name.trim() || "Subject",
        topic: t,
        weakness: clamp(baseWeakness + 3, 0, 10),
        topicWeight: 7,
      });
    }
  }
  return rows;
}

function examProximityScore(examDate?: Date, taskDate?: Date) {
  if (!examDate || !taskDate) return 4;
  const ms = startOfDay(examDate).getTime() - startOfDay(taskDate).getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return clamp(10 - clamp(days, 0, 30) / 3, 0, 10);
}

function priorityScore(row: TopicRow, examDate?: Date, taskDate?: Date) {
  const weakness = row.weakness;
  const prox = examProximityScore(examDate, taskDate);
  const w = row.topicWeight;
  return weakness * 0.5 + prox * 0.3 + w * 0.2;
}

function pickBlockSize(style: "SHORT_BURSTS" | "DEEP_STUDY") {
  return style === "SHORT_BURSTS" ? 25 : 50;
}

function makeTaskText(type: "STUDY" | "PRACTICE" | "REVIEW" | "TUTOR", topic: string) {
  if (type === "STUDY") return `Learn + understand: ${topic}`;
  if (type === "PRACTICE") return `Practice questions: ${topic}`;
  if (type === "REVIEW") return `Spaced review: ${topic}`;
  return `Tutor session: ${topic}`;
}

function preferredTimeLabel(pref: PreferredTime) {
  if (pref === "MORNING") return "Morning • 8:00–11:00 AM";
  if (pref === "AFTERNOON") return "Afternoon • 1:00–4:00 PM";
  return "Night • 7:00–10:00 PM";
}

export async function POST(req: Request) {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    const body = (await req.json()) as GenerateBody;

    const hoursPerWeek = clamp(Number(body.hoursPerWeek ?? 6), 1, 60);
    const style = body.style === "DEEP_STUDY" ? "DEEP_STUDY" : "SHORT_BURSTS";
    const subjects = (body.subjects ?? []).filter((s) => (s.name ?? "").trim().length > 0);

    const preferredTime: PreferredTime =
      body.preferredTime === "MORNING" || body.preferredTime === "AFTERNOON" || body.preferredTime === "NIGHT"
        ? body.preferredTime
        : "NIGHT";

    const availability = body.availability ?? { days: DAY_KEYS, hoursByDay: {} };
    const selectedDays = (availability.days ?? DAY_KEYS).filter((d) => DAY_KEYS.includes(d));
    const hoursByDay: Record<DayKey, number> = {
      MON: Number(availability.hoursByDay?.MON ?? 1),
      TUE: Number(availability.hoursByDay?.TUE ?? 1),
      WED: Number(availability.hoursByDay?.WED ?? 1),
      THU: Number(availability.hoursByDay?.THU ?? 1),
      FRI: Number(availability.hoursByDay?.FRI ?? 1),
      SAT: Number(availability.hoursByDay?.SAT ?? 2),
      SUN: Number(availability.hoursByDay?.SUN ?? 2),
    };

    const today = new Date();
    const start = getMondayOfWeek(today);
    const end = addDays(start, 6);

    const examDate = body.examDate ? new Date(body.examDate) : undefined;
    const title =
      (body.title ?? "").trim() ||
      (examDate ? `Plan for ${examDate.toDateString()}` : "Weekly Study Plan");

    const topics = buildTopics(subjects);
    if (topics.length === 0) {
      return NextResponse.json({ ok: false, error: "Add at least one subject." }, { status: 400 });
    }

    const block = pickBlockSize(style);
    const totalMinutesTarget = hoursPerWeek * 60;

    // capacities
    const dayCaps: Record<DayKey, number> = { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0, SAT: 0, SUN: 0 };
    let capSum = 0;
    for (const d of DAY_KEYS) {
      const isOn = selectedDays.includes(d);
      const mins = isOn ? clamp(Math.round(hoursByDay[d] * 60), 0, 8 * 60) : 0;
      dayCaps[d] = mins;
      capSum += mins;
    }
    const scale = capSum > 0 ? totalMinutesTarget / capSum : 1;

    const dayRemaining: Record<DayKey, number> = { ...dayCaps };
    for (const d of DAY_KEYS) dayRemaining[d] = Math.floor(dayRemaining[d] * scale);

    type Item = {
      date: Date;
      subjectName: string;
      topic: string;
      task: string;
      durationMin: number;
      type: "STUDY" | "PRACTICE" | "REVIEW" | "TUTOR";
      reason?: string;
      timeBlock?: string;
    };

    const items: Item[] = [];
    const timeBlock = preferredTimeLabel(preferredTime);

    function pushItem(
      date: Date,
      subjectName: string,
      topic: string,
      type: Item["type"],
      durationMin: number,
      reason?: string
    ) {
      items.push({
        date: startOfDay(date),
        subjectName,
        topic,
        task: makeTaskText(type, topic),
        durationMin,
        type,
        reason,
        timeBlock,
      });
    }

    const weakMins = Math.round(totalMinutesTarget * 0.6);
    const practiceMins = Math.round(totalMinutesTarget * 0.3);
    const recapMins = Math.max(0, totalMinutesTarget - weakMins - practiceMins);

    // (still okay to keep tutor tasks internally; you just won’t have a booking button in UI)
    const daysToExam =
      examDate
        ? Math.ceil((startOfDay(examDate).getTime() - startOfDay(today).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

    const tutorSlots: { day: DayKey; minutes: number; reason: string }[] = [];
    tutorSlots.push({ day: "WED", minutes: 60, reason: "Midweek checkpoint: fix confusion early." });
    if (daysToExam <= 21) tutorSlots.push({ day: "SAT", minutes: 60, reason: "Exam is soon: do targeted drilling." });

    for (const t of tutorSlots) {
      if (dayRemaining[t.day] >= t.minutes) dayRemaining[t.day] -= t.minutes;
    }

    function scheduleBucket(bucketMinutes: number, type: "STUDY" | "PRACTICE" | "REVIEW", labelReason: string) {
      let remaining = bucketMinutes;

      for (let dayOffset = 0; dayOffset < 7 && remaining > 0; dayOffset++) {
        const date = addDays(start, dayOffset);
        const dayKey = dayKeyFromDate(date);
        if (dayRemaining[dayKey] < block) continue;

        const scored = topics
          .map((r) => ({ ...r, score: priorityScore(r, examDate, date) }))
          .sort((a, b) => b.score - a.score);

        const picked = scored[dayOffset % Math.max(1, scored.length)];

        const dur = clamp(block, 15, 60);
        if (dayRemaining[dayKey] >= dur && remaining >= 15) {
          const why =
            `${labelReason} ` +
            `Chosen because ${picked.topic} is a weaker area and it fits your ${preferredTime.toLowerCase()} study preference.`;

          pushItem(date, picked.subjectName, picked.topic, type, dur, why);
          dayRemaining[dayKey] -= dur;
          remaining -= dur;

          // +2 day review
          const review2 = addDays(date, 2);
          if (review2 <= end) {
            const dk2 = dayKeyFromDate(review2);
            if (dayRemaining[dk2] >= 15) {
              pushItem(
                review2,
                picked.subjectName,
                picked.topic,
                "REVIEW",
                15,
                `Spaced repetition (+2 days) to lock in memory for ${picked.topic}.`
              );
              dayRemaining[dk2] -= 15;
            }
          }
        }
      }
    }

    for (const t of tutorSlots) {
      const date = addDays(start, DAY_KEYS.indexOf(t.day));
      const picked = topics
        .map((r) => ({ ...r, score: priorityScore(r, examDate, date) }))
        .sort((a, b) => b.score - a.score)[0];

      pushItem(
        date,
        picked.subjectName,
        picked.topic,
        "TUTOR",
        t.minutes,
        `Tutor-style checkpoint: ${t.reason} Focus topic: ${picked.topic}.`
      );
    }

    scheduleBucket(weakMins, "STUDY", "Priority: weak topic focus (60%).");
    scheduleBucket(practiceMins, "PRACTICE", "Priority: practice/past questions (30%).");
    scheduleBucket(recapMins, "REVIEW", "Priority: recap + retention (10%).");

    // ✅ SINGLE-PLAN OVERWRITE (create if none, otherwise update + replace items)
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.studyPlan.findFirst({
        where: { userId: me.id },
        select: { id: true },
      });

      if (!existing) {
        const created = await tx.studyPlan.create({
          data: {
            userId: me.id,
            title,
            startDate: start,
            endDate: end,
            examDate: examDate ?? null,
            hoursPerWeek,
            style,
            subjects: subjects as any,
            availability: { days: selectedDays, hoursByDay } as any,
            preferredTime, // ✅ NEW
            items: {
              create: items.map((it) => ({
                date: it.date,
                subjectName: it.subjectName,
                topic: it.topic,
                task: it.task,
                durationMin: it.durationMin,
                type: it.type,
                reason: it.reason ?? null,
                timeBlock: it.timeBlock ?? null, // ✅ NEW
                status: "PENDING",
              })),
            },
          },
          select: { id: true },
        });

        return { planId: created.id };
      }

      await tx.studyPlan.update({
        where: { id: existing.id },
        data: {
          title,
          startDate: start,
          endDate: end,
          examDate: examDate ?? null,
          hoursPerWeek,
          style,
          subjects: subjects as any,
          availability: { days: selectedDays, hoursByDay } as any,
          preferredTime, // ✅ NEW
        },
        select: { id: true },
      });

      await tx.studyPlanItem.deleteMany({ where: { planId: existing.id } });

      await tx.studyPlanItem.createMany({
        data: items.map((it) => ({
          planId: existing.id,
          date: it.date,
          subjectName: it.subjectName,
          topic: it.topic,
          task: it.task,
          durationMin: it.durationMin,
          type: it.type,
          reason: it.reason ?? null,
          timeBlock: it.timeBlock ?? null, // ✅ NEW
          status: "PENDING",
        })),
      });

      return { planId: existing.id };
    });

    return NextResponse.json({ ok: true, planId: result.planId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}