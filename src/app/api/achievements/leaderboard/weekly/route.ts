// src/app/api/achievements/leaderboard/weekly/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { getWeeklyLeaderboard, type LeaderboardMode } from "@/lib/gamification/leaderboard";

export async function GET(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true },
  });

  if (!me || me.isDeactivated) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const limit = Math.min(Number(searchParams.get("limit") || "10"), 50);

  // accept either mode= or scope= (so UI can use either)
  const raw =
    (searchParams.get("mode") || searchParams.get("scope") || "ALL").toUpperCase();

  const mode: LeaderboardMode =
    raw === "STUDENTS" || raw === "TUTORS" || raw === "ALL" ? (raw as LeaderboardMode) : "ALL";

  const rows = await getWeeklyLeaderboard({ limit, mode });

  return NextResponse.json({ ok: true, mode, rows });
}