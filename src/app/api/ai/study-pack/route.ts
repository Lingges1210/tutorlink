import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type StudyPack = {
  summary: string;
  concepts: string[];
  flashcards: { q: string; a: string }[];
  quiz: {
    q: string;
    options: [string, string, string, string];
    answerIndex: 0 | 1 | 2 | 3;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
    topic?: string;
  }[];
};

function extractJsonObject(raw: string) {
  // Try strict extraction first
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1);

  // Fallback: some models wrap JSON in ```json ... ```
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  return null;
}

function validatePack(pack: any): pack is StudyPack {
  if (!pack || typeof pack !== "object") return false;
  if (typeof pack.summary !== "string") return false;
  if (!Array.isArray(pack.concepts)) return false;
  if (!Array.isArray(pack.flashcards)) return false;
  if (!Array.isArray(pack.quiz)) return false;
  return true;
}

// ✅ This prevents your browser from spamming 405
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Use POST with { title, text } to generate a study pack.",
    example: {
      title: "Bio Notes",
      text: "Paste at least ~50 characters of notes here...",
    },
  });
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();

  try {
    const body = await req.json().catch(() => ({}));
    const text = body?.text;
    const title = (body?.title ?? "Study Material").toString();

    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json(
        { ok: false, error: "Provide 'text' (min ~50 chars).", requestId },
        { status: 400 }
      );
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return NextResponse.json(
        { ok: false, error: "Missing GEMINI_API_KEY", requestId },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are NovaMind-style study coach inside a tutoring app (TutorLink).
Your job: FORCE active recall, not passive summary.

Return ONLY valid JSON (no markdown, no extra text).
Format MUST be exactly:

{
  "summary": "string (max 8 bullet-like sentences, concise)",
  "concepts": ["string", "..."],
  "flashcards": [{"q":"string","a":"string"}],
  "quiz": [
    {
      "q":"string",
      "options":["A","B","C","D"],
      "answerIndex":0,
      "explanation":"string",
      "difficulty":"easy|medium|hard",
      "topic":"string"
    }
  ]
}

Rules:
- concepts: 8 to 12 items
- flashcards: 10 to 14 items
- quiz: exactly 12 questions
- options must be 4 short choices (no super long paragraphs)
- answerIndex must be 0-3
- explanation must teach briefly why the answer is correct
- Make questions contextual to the content (not generic textbook)
- Include a mix of easy/medium/hard
- topic should match one concept.

TITLE: ${title}

CONTENT:
${text.slice(0, 16000)}
`.trim();

    // ✅ Add a timeout so you don’t wait forever
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25_000);

    let raw = "";
    try {
      const result = await model.generateContent(prompt, { signal: controller.signal } as any);
      raw = result.response.text().trim();
    } finally {
      clearTimeout(t);
    }

    const jsonText = extractJsonObject(raw);
    if (!jsonText) {
      return NextResponse.json(
        { ok: false, error: "Model did not return JSON", raw: raw.slice(0, 500), requestId },
        { status: 500 }
      );
    }

    let pack: StudyPack;
    try {
      pack = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON from model", raw: jsonText.slice(0, 500), requestId },
        { status: 500 }
      );
    }

    if (!validatePack(pack)) {
      return NextResponse.json(
        { ok: false, error: "JSON missing required fields", pack, requestId },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, pack, requestId });
  } catch (e: any) {
    const msg =
      e?.name === "AbortError"
        ? "AI timed out (try shorter text)."
        : e?.message ?? String(e);

    return NextResponse.json({ ok: false, error: msg, requestId }, { status: 500 });
  }
}