import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    // ── Auth (same pattern as livekit/token/route.ts) ──────────────────────
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true, isDeactivated: true },
    });

    if (!dbUser || dbUser.isDeactivated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse form data ────────────────────────────────────────────────────
    const formData = await req.formData();
    const sessionId = formData.get("sessionId") as string | null;
    const file = formData.get("audio") as File | null;

    if (!sessionId || !file) {
      return NextResponse.json(
        { error: "Missing sessionId or audio" },
        { status: 400 }
      );
    }

    // ── Authorise: user must be student or tutor on this session ───────────
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        OR: [{ studentId: dbUser.id }, { tutorId: dbUser.id }],
      },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Call Groq Whisper ──────────────────────────────────────────────────
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
      language: "en",
    }) as Awaited<ReturnType<typeof groq.audio.transcriptions.create>> & {
      segments?: Array<{ start: number; end: number; text: string }>;
      language?: string;
      duration?: number;
    };

    // ── Upsert transcript (allow re-transcription) ─────────────────────────
    const transcript = await prisma.sessionTranscript.upsert({
      where: { sessionId },
      create: {
        sessionId,
        text: transcription.text,
        segments: transcription.segments ?? [],
        language: transcription.language,
        duration: transcription.duration,
      },
      update: {
        text: transcription.text,
        segments: transcription.segments ?? [],
        language: transcription.language,
        duration: transcription.duration,
      },
    });

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("[POST /api/transcribe] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
