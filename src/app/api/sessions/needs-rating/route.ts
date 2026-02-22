// src/app/api/sessions/needs-rating/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ items: [] });

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true },
  });

  if (!me || me.isDeactivated) return NextResponse.json({ items: [] });

  // 1) Get sessionIds already rated by this student
  const rated = await prisma.sessionRating.findMany({
    where: { studentId: me.id },
    select: { sessionId: true },
  });

  const ratedIds = rated.map((r) => r.sessionId);

  // 2) Sessions that are COMPLETED but not yet rated
  const items = await prisma.session.findMany({
    where: {
      studentId: me.id,
      status: "COMPLETED",
      ...(ratedIds.length > 0 ? { id: { notIn: ratedIds } } : {}),
    },
    orderBy: { scheduledAt: "desc" },
    take: 25,
    select: {
      id: true,
      scheduledAt: true,
      durationMin: true,
      subject: { select: { code: true, title: true } },
      tutor: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  return NextResponse.json({ items });
}