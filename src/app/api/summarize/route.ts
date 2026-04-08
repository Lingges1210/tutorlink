import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServerComponent();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true, isDeactivated: true },
    });
    if (!dbUser || dbUser.isDeactivated) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { transcript, sessionId } = await req.json();
    if (!transcript) return NextResponse.json({ error: "Missing transcript" }, { status: 400 });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are an expert at summarizing tutoring sessions. Given a transcript, produce a structured summary with these sections:

## Overview
A 2-3 sentence summary of what the session covered.

## Key Topics
Bullet points of the main topics discussed.

## Key Points & Takeaways
The most important concepts, explanations, or insights from the session.

## Action Items
Specific tasks, homework, or follow-ups the student should do.

## Questions Raised
Any questions that came up during the session, answered or unanswered.

Be concise and specific. Use the actual content from the transcript.`,
        },
        {
          role: "user",
          content: `Here is the session transcript:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const summary = completion.choices[0]?.message?.content ?? "No summary generated.";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("[POST /api/summarize] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}