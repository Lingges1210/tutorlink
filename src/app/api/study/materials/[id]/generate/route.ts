// src/app/api/study/materials/[id]/generate/route.ts
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

// ---- tiny fallback generator (so route always works) ----
function clampText(s: string, max: number) {
  return (s || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function keywordConcepts(text: string, max = 50) {
  const stop = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "in",
    "is",
    "are",
    "was",
    "were",
    "be",
    "as",
    "at",
    "by",
    "for",
    "from",
    "that",
    "this",
    "these",
    "those",
    "with",
    "it",
    "its",
    "on",
    "into",
    "than",
    "then",
    "not",
    "we",
    "you",
    "i",
    "they",
    "their",
    "our",
    "your",
    "can",
    "will",
    "would",
    "should",
    "could",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w));

  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

function makeFlashcards(concepts: string[], max = 20) {
  const base = concepts.slice(0, max);
  const cards = base.map((c) => ({
    q: `Define: ${c}`,
    a: `Write a short definition for "${c}" based on your notes.`,
  }));

  // If we don't have enough concepts, pad so UX still feels "full"
  while (cards.length < Math.min(12, max)) {
    const n = cards.length + 1;
    cards.push({
      q: `Key idea #${n}`,
      a: "Write a 1–2 sentence explanation from your notes.",
    });
  }

  return cards;
}

/**
 * Generates EXACTLY quizCount questions.
 * Uses concepts when available, otherwise pads with generic recall questions.
 */
function makeQuiz(concepts: string[], quizCount: number) {
  const base = concepts.slice(0, quizCount);

  const quiz = base.map((c, i) => {
    const options = [
      `Definition of ${c}`,
      `Example of ${c}`,
      `Opposite of ${c}`,
      `Unrelated concept`,
    ];

    return {
      q: `Which option best matches "${c}"?`,
      options,
      answerIndex: 0,
      explanation: `Best answer is the definition of "${c}".`,
      difficulty: i < Math.ceil(quizCount * 0.33) ? "easy" : i < Math.ceil(quizCount * 0.66) ? "medium" : "hard",
      topic: c,
    };
  });

  // Pad up to quizCount if concepts are fewer than requested
  while (quiz.length < quizCount) {
    const idx = quiz.length + 1;
    quiz.push({
      q: `Recall #${idx}: Based on your notes, which statement is most accurate?`,
      options: ["Statement A", "Statement B", "Statement C", "Statement D"],
      answerIndex: 0,
      explanation: "Review your notes and pick the most accurate option.",
      difficulty: quiz.length < Math.ceil(quizCount * 0.33) ? "easy" : quiz.length < Math.ceil(quizCount * 0.66) ? "medium" : "hard",
      topic: "general",
    });
  }

  return quiz.slice(0, quizCount);
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const x = typeof n === "string" ? Number(n) : typeof n === "number" ? n : NaN;
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(x)));
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getMe();
    if (!me || me.isDeactivated) return NextResponse.json({ ok: false }, { status: 401 });

    const { id: materialId } = await ctx.params;

    // ✅ Option A: accept quizCount from client
    const body = await req.json().catch(() => ({}));
    const quizCount = clampInt(body?.quizCount, 20, 50, 20); // change min 20 -> 10 if you want

    const material = await prisma.studyMaterial.findFirst({
      where: { id: materialId, userId: me.id },
      select: { id: true, title: true, rawText: true },
    });

    if (!material) {
      return NextResponse.json({ ok: false, error: "Material not found" }, { status: 404 });
    }

    const raw = material.rawText || "";
    const summary = clampText(raw, 1200) || "No summary available.";

    // Pull more concepts so we can support up to 50 Qs
    const concepts = keywordConcepts(raw, Math.max(12, quizCount));

    const flashcards = makeFlashcards(concepts, Math.min(30, Math.max(12, Math.ceil(quizCount * 0.6))));
    const quiz = makeQuiz(concepts, quizCount);

    const pack = await prisma.studyPack.create({
      data: {
        materialId: material.id,
        summary,
        concepts,
        flashcards,
        quiz,
        // Optional: if your schema allows, you can store quizCount too (only if column exists)
        // quizCount,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, packId: pack.id, quizCount: quiz.length });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Generate failed" },
      { status: 500 }
    );
  }
}