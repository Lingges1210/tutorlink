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

export async function POST(req: Request) {
  const me = await getMe();
  if (!me || me.isDeactivated)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { sessionId, rating, easierToFindTutor, improvedUnderstanding, wouldRecommend, comment } =
    await req.json();

  if (!rating || rating < 1 || rating > 5)
    return NextResponse.json({ success: false, message: "Invalid rating" }, { status: 400 });

  if (sessionId) {
    const tutorSession = await prisma.session.findFirst({
      where: { id: sessionId, studentId: me.id, status: "COMPLETED" },
    });
    if (!tutorSession)
      return NextResponse.json({ success: false, message: "Session not found" }, { status: 404 });
  }

  const survey = await prisma.surveyResponse.upsert({
    where: { sessionId: sessionId ?? "" },
    update: { rating, easierToFindTutor, improvedUnderstanding, wouldRecommend, comment },
    create: {
      userId: me.id,
      sessionId: sessionId ?? null,
      rating,
      easierToFindTutor,
      improvedUnderstanding,
      wouldRecommend,
      comment: comment ?? null,
    },
  });

  return NextResponse.json({ success: true, survey });
}