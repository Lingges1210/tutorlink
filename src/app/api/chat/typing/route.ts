// src/app/api/chat/typing/route.ts
//
// Typing indicators via Pusher.
// POST  { channelId, isTyping: true|false }
//   → triggers "typing" event on private-chat-{channelId}
//
// GET is no longer needed (was a polling fallback). Kept as a 405 stub
// so any stale client code fails loudly rather than silently.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

// Channel membership cache (same pattern as before, avoids repeated DB hits)
const channelCache = new Map<string, { studentId: string; tutorId: string; at: number }>();
const CHANNEL_TTL = 60_000;

async function getChannel(channelId: string) {
  const cached = channelCache.get(channelId);
  if (cached && Date.now() - cached.at < CHANNEL_TTL) return cached;

  const ch = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { studentId: true, tutorId: true },
  });

  if (!ch) return null;
  const entry = { ...ch, at: Date.now() };
  channelCache.set(channelId, entry);
  return entry;
}

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const channelId = body?.channelId as string | undefined;
  const isTyping = !!body?.isTyping;

  if (!channelId) {
    return NextResponse.json({ ok: false, message: "Missing channelId" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true },
  });

  if (!me) return NextResponse.json({ ok: false }, { status: 404 });

  const ch = await getChannel(channelId);
  if (!ch || (ch.studentId !== me.id && ch.tutorId !== me.id)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  // Trigger typing event — the receiving client filters out its own userId
  await pusherServer.trigger(`private-chat-${channelId}`, "typing", {
    userId: me.id,
    isTyping,
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, message: "Polling removed. Use Pusher subscription." },
    { status: 405 }
  );
}