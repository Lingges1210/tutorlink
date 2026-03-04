import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

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

    // ✅ single plan per user
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
    createdAt: true,
    updatedAt: true,
    subjects: true,
    availability: true,
    items: {
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
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
      },
    },
  },
});

    if (!plan) return NextResponse.json({ ok: true, plan: null });

const total = plan.items.length;
const done = plan.items.filter((x) => x.status === "DONE").length;
const pct = total ? Math.round((done / total) * 100) : 0;

return NextResponse.json({
  ok: true,
  plan: {
    ...plan,
    progress: { done, total, pct },
  },
});
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}