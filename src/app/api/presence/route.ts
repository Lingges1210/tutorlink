// src/app/api/presence/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

// Skip a DB write if presence was updated within this window
const PRESENCE_SKIP_MS = 4 * 60 * 1000; // 4 minutes

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });
  if (!me) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const isOnline = body?.isOnline !== false; // default true
  const now = new Date();

  // ── Short-circuit: skip the upsert if presence is already fresh ───────
  // This avoids a DB write on every poll when nothing has changed
  if (isOnline) {
    const existing = await prisma.userPresence.findUnique({
      where: { userId: me.id },
      select: { isOnline: true, lastSeenAt: true },
    });

    const isRecent =
      existing?.isOnline &&
      existing.lastSeenAt &&
      now.getTime() - existing.lastSeenAt.getTime() < PRESENCE_SKIP_MS;

    if (isRecent) {
      // Already fresh — return early without writing
      return NextResponse.json({
        ok: true,
        presence: { userId: me.id, isOnline: true, lastSeenAt: existing!.lastSeenAt.toISOString() },
      });
    }
  }

  // Only write when state has actually changed or record is stale
  await prisma.userPresence.upsert({
    where: { userId: me.id },
    update: { isOnline, lastSeenAt: now },
    create: { userId: me.id, isOnline, lastSeenAt: now },
  });

  return NextResponse.json({
    ok: true,
    presence: { userId: me.id, isOnline, lastSeenAt: now.toISOString() },
  });
}