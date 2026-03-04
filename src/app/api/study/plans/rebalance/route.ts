// src/app/api/study/plans/rebalance/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
const DAY_KEYS: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

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

function dayKeyFromDate(d: Date): DayKey {
  const js = d.getDay(); // 0..6
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

export async function POST() {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    // ✅ single plan per user: pick the plan for this user
    const plan = await prisma.studyPlan.findFirst({
      where: { userId: me.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    if (!plan) return NextResponse.json({ ok: false, error: "No plan yet" }, { status: 404 });

    const today = startOfDay(new Date());

    const availability = plan.availability as any;
    const hoursByDay: Record<DayKey, number> =
      availability?.hoursByDay ?? { MON: 1, TUE: 1, WED: 1, THU: 1, FRI: 1, SAT: 2, SUN: 2 };
    const days: DayKey[] = availability?.days ?? DAY_KEYS;

    // Build capacity map for the plan week
    const caps: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = addDays(new Date(plan.startDate), i);
      const key = startOfDay(d).toISOString();
      const dk = dayKeyFromDate(d);
      const cap = days.includes(dk) ? Math.round((hoursByDay[dk] ?? 1) * 60) : 0;
      caps[key] = cap;
    }

    // Movable tasks: missed + still pending
    const movable = plan.items.filter(
      (it) => it.status === "PENDING" && startOfDay(new Date(it.date)) < today
    );

    // Keep tasks: everything else
    const movableIds = new Set(movable.map((m) => m.id));
    const keep = plan.items.filter((it) => !movableIds.has(it.id));

    // subtract already scheduled minutes (keep tasks)
    for (const it of keep) {
      const key = startOfDay(new Date(it.date)).toISOString();
      caps[key] = Math.max(0, (caps[key] ?? 0) - (it.durationMin ?? 0));
    }

    // target dates = today..end
    const targetDates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(new Date(plan.startDate), i);
      const sd = startOfDay(d);
      if (sd >= today && sd <= startOfDay(new Date(plan.endDate))) targetDates.push(sd);
    }

    // Move smallest first
    movable.sort((a, b) => (a.durationMin ?? 0) - (b.durationMin ?? 0));

    const updates: { id: string; date: Date; reason: string }[] = [];

    for (const it of movable) {
      const dur = it.durationMin ?? 25;
      let placed = false;

      for (const d of targetDates) {
        const key = startOfDay(d).toISOString();
        if ((caps[key] ?? 0) >= dur) {
          caps[key] -= dur;
          updates.push({
            id: it.id,
            date: d,
            reason: `${it.reason ?? "Auto plan"} Rebalanced after missed day.`,
          });
          placed = true;
          break;
        }
      }

      // overflow -> today
      if (!placed && targetDates[0]) {
        updates.push({
          id: it.id,
          date: targetDates[0],
          reason: `${it.reason ?? "Auto plan"} Rebalanced (overflow).`,
        });
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ ok: true, moved: 0 });
    }

    await prisma.$transaction(
      updates.map((u) =>
        prisma.studyPlanItem.update({
          where: { id: u.id },
          data: { date: u.date, reason: u.reason },
        })
      )
    );

    return NextResponse.json({ ok: true, moved: updates.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}