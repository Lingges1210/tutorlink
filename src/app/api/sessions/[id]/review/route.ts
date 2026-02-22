import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";
import { SessionStatus } from "@prisma/client";

function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await ctx.params;

  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const student = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true },
  });

  if (!student?.id || student.isDeactivated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const rating = clampInt(Number(body?.rating), 1, 5);
  const feedback =
    typeof body?.feedback === "string" && body.feedback.trim()
      ? body.feedback.trim()
      : null;

  // optional confirm: true/false/null
  const confirmed =
    body?.confirmed === true ? true : body?.confirmed === false ? false : null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      studentId: true,
      tutorId: true,
      subject: { select: { code: true } },
    },
  });

  if (!session || session.studentId !== student.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (session.status !== SessionStatus.COMPLETED) {
    return NextResponse.json(
      { message: "You can review only after the tutor completes the session." },
      { status: 409 }
    );
  }

  try {
    await prisma.sessionReview.create({
      data: {
        sessionId,
        studentId: session.studentId,
        tutorId: session.tutorId!,
        rating,
        feedback,
        confirmed,
      },
    });
  } catch (e: any) {
    // sessionId unique => prevent double submit
    if (String(e?.code) === "P2002") {
      return NextResponse.json(
        { message: "You already reviewed this session." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Unable to submit review." },
      { status: 500 }
    );
  }

  // notify tutor AFTER student submits rating
  try {
    if (session.tutorId) {
      await notify.user({
        userId: session.tutorId,
        viewer: "TUTOR",
        type: "SESSION_RATED",
        title: "New rating received",
        body: `A student rated your session (${rating}/5).`,
        data: { sessionId, rating, subjectCode: session.subject?.code },
      });
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
}