// src/app/api/chat/typing/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

// ── In-memory typing store (zero DB hits) ──────────────────────────────
// channelId → Map<userId, expiresAt>
const typingStore = new Map<string, Map<string, number>>();
const TTL_MS = 5000;

function setTyping(channelId: string, userId: string) {
  if (!typingStore.has(channelId)) typingStore.set(channelId, new Map());
  typingStore.get(channelId)!.set(userId, Date.now() + TTL_MS);
}

function clearTyping(channelId: string, userId: string) {
  typingStore.get(channelId)?.delete(userId);
}

function getTypers(channelId: string, excludeUserId: string): boolean {
  const channel = typingStore.get(channelId);
  if (!channel) return false;
  const now = Date.now();
  for (const [uid, expiry] of channel) {
    if (expiry < now) { channel.delete(uid); continue; }
    if (uid !== excludeUserId) return true;
  }
  return false;
}

// ── Shared auth helper — resolves userId from email once per request ───
async function resolveUserId(email: string): Promise<string | null> {
  const me = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return me?.id ?? null;
}

// ── Channel membership cache (in-memory, short TTL) ───────────────────
// Avoids re-fetching channel on every typing poll
const channelCache = new Map<string, { studentId: string; tutorId: string; at: number }>();
const CHANNEL_TTL = 60_000; // 1 min

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

export async function GET(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();
  if (!data?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");
  if (!channelId) {
    return NextResponse.json({ ok: false, message: "Missing channelId" }, { status: 400 });
  }

  const userId = await resolveUserId(data.user.email);
  if (!userId) return NextResponse.json({ ok: false }, { status: 404 });

  const ch = await getChannel(channelId);
  if (!ch || (ch.studentId !== userId && ch.tutorId !== userId)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  // Zero DB hit — read from memory
  const otherTyping = getTypers(channelId, userId);
  return NextResponse.json({ ok: true, otherTyping, typing: otherTyping ? ["typing"] : [] });
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

  const userId = await resolveUserId(data.user.email);
  if (!userId) return NextResponse.json({ ok: false }, { status: 404 });

  const ch = await getChannel(channelId);
  if (!ch || (ch.studentId !== userId && ch.tutorId !== userId)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  // Zero DB hit — write to memory only
  if (isTyping) {
    setTyping(channelId, userId);
  } else {
    clearTyping(channelId, userId);
  }

  return NextResponse.json({ ok: true });
}