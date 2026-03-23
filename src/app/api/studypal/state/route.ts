import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ ok: false }, { status: 401 });

  const state = await prisma.studyPalState.findUnique({
    where: { userId: dbUser.id },
  });

  // No row yet — client uses localStorage defaults
  if (!state) return NextResponse.json({ ok: true, state: null });

  return NextResponse.json({
    ok: true,
    state: {
      xp:            state.xp,
      treats:        state.treats,
      points:        state.points,
      petType:       state.petType,
      petName:       state.petName,
      acc:           state.acc,
      owned:         state.owned,
      pending:       state.pending,
      streakCount:   state.streakCount,
      lastStreakDate: state.lastStreakDate,
      lastFedAt:     state.lastFedAt?.getTime() ?? null,
      lastDecayedAt: state.lastDecayedAt?.getTime() ?? null,
      activityLog:   state.activityLog,
      onboarded:     state.onboarded,
      updatedAt:     state.updatedAt.getTime(),
    },
  });
}

type Body = {
  xp: number;
  treats: number;
  points: number;
  petType: string;
  petName: string;
  acc: string;
  owned: string[];
  pending: number;
  streakCount: number;
  lastStreakDate?: string | null;
  lastFedAt?: number | null;
  lastDecayedAt?: number | null;
  activityLog: unknown[];
  onboarded: boolean;
  clientUpdatedAt: number;
};

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ ok: false }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  // Conflict resolution: if DB row is newer than what client sent, tell client to reload
  const existing = await prisma.studyPalState.findUnique({
    where: { userId: dbUser.id },
    select: { updatedAt: true },
  });

  if (existing && existing.updatedAt.getTime() > (body.clientUpdatedAt ?? 0)) {
    return NextResponse.json({ ok: true, stale: true });
  }

  await prisma.studyPalState.upsert({
    where: { userId: dbUser.id },
    create: {
      userId:         dbUser.id,
      xp:             body.xp            ?? 0,
      treats:         body.treats        ?? 8,
      points:         body.points        ?? 120,
      petType:        body.petType       ?? "cat",
      petName:        body.petName       ?? "Mochi",
      acc:            body.acc           ?? "none",
      owned:          body.owned         ?? ["none"],
      pending:        body.pending       ?? 0,
      streakCount:    body.streakCount   ?? 0,
      lastStreakDate: body.lastStreakDate ?? null,
      lastFedAt:      body.lastFedAt     ? new Date(body.lastFedAt)     : null,
      lastDecayedAt:  body.lastDecayedAt ? new Date(body.lastDecayedAt) : null,
      activityLog:    (body.activityLog  ?? []) as object[],
      onboarded:      body.onboarded     ?? false,
    },
    update: {
      xp:             body.xp,
      treats:         body.treats,
      points:         body.points,
      petType:        body.petType,
      petName:        body.petName,
      acc:            body.acc,
      owned:          body.owned,
      pending:        body.pending,
      streakCount:    body.streakCount,
      lastStreakDate: body.lastStreakDate ?? null,
      lastFedAt:      body.lastFedAt     ? new Date(body.lastFedAt)     : null,
      lastDecayedAt:  body.lastDecayedAt ? new Date(body.lastDecayedAt) : null,
      activityLog:    (body.activityLog  ?? []) as object[],
      onboarded:      body.onboarded,
    },
  });

  return NextResponse.json({ ok: true, stale: false });
}