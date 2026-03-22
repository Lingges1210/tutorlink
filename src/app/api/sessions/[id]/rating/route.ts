// src/app/api/sessions/[id]/rating/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { notify } from "@/lib/notify";
import { awardPointsInTx } from "@/lib/gamification/awardPoints";
import { GAMIFICATION_RULES } from "@/lib/gamification/rules";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await ctx.params;

  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true },
  });
  if (!me || me.isDeactivated) return NextResponse.json({ ok: false }, { status: 401 });

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, studentId: true, tutorId: true },
  });
  if (!session || session.studentId !== me.id) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const rating = await prisma.sessionRating.findUnique({
    where: { sessionId },
    select: {
      id: true,
      sessionId: true,
      studentId: true,
      tutorId: true,
      rating: true,
      comment: true,
      confirmed: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, rating: rating ?? null });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await ctx.params;

  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true, verificationStatus: true },
  });
  if (!me || me.isDeactivated) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (me.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ message: "Not verified" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const ratingRaw = body?.rating;
  const commentRaw = typeof body?.comment === "string" ? body.comment.trim() : "";
  const confirmed = body?.confirmed === true ? true : body?.confirmed === false ? false : null;

  const rating = Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ message: "Rating must be an integer from 1 to 5" }, { status: 400 });
  }
  if (commentRaw.length > 500) {
    return NextResponse.json({ message: "Comment too long (max 500 chars)" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, studentId: true, tutorId: true },
  });
  if (!session || session.studentId !== me.id) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (session.status !== "COMPLETED") {
    return NextResponse.json({ message: "You can rate only after the session is completed." }, { status: 409 });
  }
  if (!session.tutorId) {
    return NextResponse.json({ message: "Session has no tutor assigned." }, { status: 409 });
  }

  const exists = await prisma.sessionRating.findUnique({
    where: { sessionId },
    select: { id: true },
  });
  if (exists) {
    return NextResponse.json({ message: "You already rated this session." }, { status: 409 });
  }

  const created = await prisma.$transaction(async (tx) => {
    // Create the rating
    const newRating = await tx.sessionRating.create({
      data: {
        sessionId,
        studentId: me.id,
        tutorId: session.tutorId!,
        rating,
        comment: commentRaw ? commentRaw : null,
        confirmed,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        confirmed: true,
        createdAt: true,
        tutorId: true,
      },
    });

    // Award points to student for rating — multiplier applies
    await awardPointsInTx(tx, {
      userId: me.id,
      amount: GAMIFICATION_RULES.student.sessionRated ?? 10,
      description: "Rated a session",
      sessionId,
      type: "EARN",
    });

    // Update tutor avg rating
    const agg = await tx.sessionRating.aggregate({
      where: { tutorId: session.tutorId! },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const avg = Math.round((agg._avg.rating ?? 0) * 10) / 10;

    await tx.user.update({
      where: { id: session.tutorId! },
      data: { avgRating: avg, ratingCount: agg._count.rating },
    });

    return { newRating, avg, ratingCount: agg._count.rating };
  });

  // Notify tutor outside transaction
  try {
    await notify.user({
      userId: session.tutorId,
      viewer: "TUTOR",
      type: "SESSION_RATED",
      title: "New rating received",
      body: `A student rated your session (${rating}/5).`,
      data: { sessionId, rating, confirmed },
    });
  } catch {}

  return NextResponse.json({
    ok: true,
    rating: created.newRating,
    tutorStats: { avgRating: created.avg, ratingCount: created.ratingCount },
  });
}