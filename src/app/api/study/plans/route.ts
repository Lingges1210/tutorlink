// src/app/api/study/plans/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysUntil(a?: Date | null) {
  if (!a) return null;
  const ms = startOfDay(a).getTime() - startOfDay(new Date()).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
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

export async function GET() {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    const plan = await prisma.studyPlan.findUnique({
      where: { userId: me.id },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        examDate: true,
        hoursPerWeek: true,
        style: true,
        preferredTime: true, // ✅ NEW
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            date: true,
            subjectName: true,
            topic: true,
            task: true,
            durationMin: true,
            type: true,
            reason: true,
            status: true,
            timeBlock: true, // ✅ NEW
          },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!plan) return NextResponse.json({ ok: true, plan: null });

    const total = plan.items.length;
    const done = plan.items.filter((x) => x.status === "DONE").length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    // ✅ plan-level AI explanation (rule-based but “AI-feel”)
    const dte = daysUntil(plan.examDate);
    const pending = plan.items.filter((x) => x.status !== "DONE");
    const pendingBySubject = new Map<string, number>();
    for (const it of pending) {
      pendingBySubject.set(it.subjectName, (pendingBySubject.get(it.subjectName) ?? 0) + 1);
    }
    const weakSpot = [...pendingBySubject.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const whyPlanParts: string[] = [];
    if (dte !== null) whyPlanParts.push(`Your exam is in ${dte} day${dte === 1 ? "" : "s"}.`);
    whyPlanParts.push(`You set ${plan.hoursPerWeek} hours/week in ${plan.preferredTime.toLowerCase()} study mode.`);
    if (weakSpot) whyPlanParts.push(`Most remaining tasks are currently in ${weakSpot}, so we keep pushing it steadily.`);
    whyPlanParts.push(`We also include spaced reviews (+2 days) to improve retention.`);

    const aiExplanation = whyPlanParts.join(" ");

    return NextResponse.json({
      ok: true,
      plan: {
        id: plan.id,
        title: plan.title,
        startDate: plan.startDate,
        endDate: plan.endDate,
        examDate: plan.examDate,
        hoursPerWeek: plan.hoursPerWeek,
        style: plan.style,
        preferredTime: plan.preferredTime, // ✅ NEW
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        items: plan.items,
        progress: { done, total, pct },
        aiExplanation, // ✅ NEW
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}