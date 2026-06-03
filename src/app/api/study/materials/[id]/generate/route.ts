import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

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

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const x = typeof n === "string" ? Number(n) : typeof n === "number" ? n : NaN;
  if (!Number.isFinite(x)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(x)));
}

function chunkText(text: string, maxChars = 12000): string {
  return text.slice(0, maxChars);
}

async function callGroq(prompt: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "You are a study assistant. Always respond with valid JSON only — no extra text, no markdown code fences.",
      },
      { role: "user", content: prompt },
    ],
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return text
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/[\u0000-\u001F\u007F]/g, (ch) => {
      // Preserve legitimate JSON whitespace control chars, escape the rest
      if (ch === "\n") return "\\n";
      if (ch === "\r") return "\\r";
      if (ch === "\t") return "\\t";
      return "";
    })
    .trim();
}

async function generateSummaryAndConcepts(rawText: string) {
  const prompt = `Read the following study material and generate:
1. A SUMMARY (3-5 paragraphs, plain English, covering main topics and key concepts)
2. CONCEPTS (exactly 20 key terms or topics from the material)

STUDY MATERIAL:
${chunkText(rawText, 12000)}

Respond with ONLY this JSON:
{
  "summary": "3-5 paragraph summary here",
  "concepts": ["concept1", "concept2", ...]
}`;

  const raw = await callGroq(prompt);
  const parsed = JSON.parse(raw);
  return {
    summary: parsed.summary || "No summary available.",
    concepts: parsed.concepts || [],
  };
}

async function generateFlashcardsAndQuiz(
  rawText: string,
  quizCount: number,
  flashcardCount: number
) {
  const easyCount = Math.ceil(quizCount * 0.33);
  const mediumCount = Math.ceil(quizCount * 0.34);
  const hardCount = quizCount - easyCount - mediumCount;

  const prompt = `Read the following study material and generate:
1. FLASHCARDS (exactly ${flashcardCount} flashcards)
2. QUIZ (exactly ${quizCount} multiple choice questions: ${easyCount} easy, ${mediumCount} medium, ${hardCount} hard)

Rules for flashcards:
- Questions must test understanding, not just definitions
- Answers must be 1-3 sentences, based only on the material

Rules for quiz:
- Each question has exactly 4 options, only one correct
- Wrong options must be plausible but clearly incorrect to someone who studied
- Include an explanation for why the correct answer is right
- Cover different topics spread throughout the material

STUDY MATERIAL:
${chunkText(rawText, 8000)}

Respond with ONLY this JSON:
{
  "flashcards": [{"q": "question", "a": "answer"}],
  "quiz": [{
    "q": "question",
    "options": ["A", "B", "C", "D"],
    "answerIndex": 0,
    "explanation": "why correct",
    "difficulty": "easy",
    "topic": "topic name"
  }]
}`;

  const raw = await callGroq(prompt);
  const parsed = JSON.parse(raw);
  return {
    flashcards: parsed.flashcards || [],
    quiz: parsed.quiz || [],
  };
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getMe();
    if (!me || me.isDeactivated) return NextResponse.json({ ok: false }, { status: 401 });

    const { id: materialId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const quizCount = clampInt(body?.quizCount, 10, 50, 20);
    const flashcardCount = clampInt(body?.flashcardCount, 10, 30, 20);

    const material = await prisma.studyMaterial.findFirst({
      where: { id: materialId, userId: me.id },
      select: { id: true, title: true, rawText: true },
    });

    if (!material) {
      return NextResponse.json({ ok: false, error: "Material not found" }, { status: 404 });
    }

    const rawText = material.rawText || "";
    if (rawText.length < 50) {
      return NextResponse.json(
        { ok: false, error: "Material text is too short to generate study pack" },
        { status: 400 }
      );
    }

    const [{ summary, concepts }, { flashcards, quiz }] = await Promise.all([
      generateSummaryAndConcepts(rawText),
      generateFlashcardsAndQuiz(rawText, quizCount, flashcardCount),
    ]);

    const pack = await prisma.studyPack.create({
      data: { materialId: material.id, summary, concepts, flashcards, quiz },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      packId: pack.id,
      quizCount: quiz.length,
      flashcardCount: flashcards.length,
    });
  } catch (e: any) {
    console.error("Generate failed:", e);

    if (e?.status === 429 || String(e?.message ?? "").includes("429")) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { ok: false, error: e?.message || "Generate failed" },
      { status: 500 }
    );
  }
}