import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export const runtime = "nodejs";

async function getMe() {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;

  return prisma.user.findUnique({
    where: { email },
    select: { id: true, isDeactivated: true },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me || me.isDeactivated) return NextResponse.json({ ok: false }, { status: 401 });

  const { id: packId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const answers = body?.answers as number[]; // selected option index per question

  if (!Array.isArray(answers)) {
    return NextResponse.json({ ok: false, error: "answers must be array" }, { status: 400 });
  }

  const pack = await prisma.studyPack.findFirst({
    where: { id: packId, material: { userId: me.id } },
    select: { id: true, quiz: true },
  });

  if (!pack) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const quiz = pack.quiz as any[];
  const total = quiz.length;

  let score = 0;
  const detailed = quiz.map((q, i) => {
    const chosen = answers[i];
    const correct = q.answerIndex;
    const isCorrect = chosen === correct;
    if (isCorrect) score += 1;
    return { i, chosen, correct, isCorrect };
  });

  await prisma.quizAttempt.create({
    data: {
      packId: pack.id,
      userId: me.id,
      score,
      total,
      answers: { answers, detailed },
    },
  });

  return NextResponse.json({ ok: true, score, total, detailed });
}