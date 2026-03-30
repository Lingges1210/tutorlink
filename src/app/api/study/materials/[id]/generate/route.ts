import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

// ✅ Fix 1: No thinking, no JSON mime type (allows faster streaming internally)
function getModel() {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.4,
      // ❌ removed responseMimeType: "application/json" — forces full buffering
    },
    // ✅ disable thinking — not needed for structured study content
    // @ts-ignore — thinkingConfig is valid but not yet in all SDK typedefs
    thinkingConfig: { thinkingBudget: 0 },
  });
}

// ✅ Fix 2: Split into 2 parallel calls — summary/concepts vs flashcards/quiz
// Each call is smaller and they run concurrently
async function callGemini(prompt: string): Promise<string> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  // Strip markdown code fences if present (since we removed responseMimeType)
  return text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function generateSummaryAndConcepts(rawText: string) {
  const prompt = `You are a study assistant. Read the following study material and generate:
1. A SUMMARY (3-5 paragraphs, plain English, covering main topics and key concepts)
2. CONCEPTS (exactly 20 key terms or topics from the material)

STUDY MATERIAL:
${chunkText(rawText, 12000)}

Respond with ONLY this JSON (no extra text, no code fences):
{
  "summary": "3-5 paragraph summary here",
  "concepts": ["concept1", "concept2", ...]
}`;

  const raw = await callGemini(prompt);
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

  const prompt = `You are a study assistant. Read the following study material and generate:
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

Respond with ONLY this JSON (no extra text, no code fences):
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

  const raw = await callGemini(prompt);
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

    // ✅ Fix 3: Run both calls in parallel — cuts total time roughly in half
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

    if (e?.message?.includes("429") || e?.message?.includes("quota")) {
      return NextResponse.json(
        { ok: false, error: "Gemini API quota exceeded. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { ok: false, error: e?.message || "Generate failed" },
      { status: 500 }
    );
  }
}