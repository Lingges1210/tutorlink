// src/app/api/chat/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");
  const take = Number(url.searchParams.get("take") ?? "30");
  const cursor = url.searchParams.get("cursor");

  if (!channelId) {
    return NextResponse.json({ ok: false, message: "Missing channelId" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true },
  });

  if (!me) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
  }

  // Ensure user belongs to channel
  const ch = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { id: true, studentId: true, tutorId: true },
  });

  if (!ch || (ch.studentId !== me.id && ch.tutorId !== me.id)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  // 🔥 READ RECEIPTS SECTION
  const otherUserId = ch.studentId === me.id ? ch.tutorId : ch.studentId;

  const reads = await prisma.chatRead.findMany({
    where: { channelId },
    select: { userId: true, lastReadAt: true },
  });

  const meLastReadAt =
    reads.find((r) => r.userId === me.id)?.lastReadAt ?? new Date(0);

  const otherLastReadAt =
    reads.find((r) => r.userId === otherUserId)?.lastReadAt ?? new Date(0);

  // Messages
  const messages = await prisma.chatMessage.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(take, 1), 50),
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    select: { id: true, senderId: true, text: true, createdAt: true },
  });

  const nextCursor =
    messages.length >= Math.min(Math.max(take, 1), 50)
      ? messages[messages.length - 1].id
      : null;

  return NextResponse.json({
    ok: true,
    items: messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
    nextCursor,
    read: {
      meLastReadAt: meLastReadAt.toISOString(),
      otherLastReadAt: otherLastReadAt.toISOString(),
    },
  });
}

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const channelId = body?.channelId as string | undefined;
  const text = (body?.text as string | undefined)?.trim();

  if (!channelId || !text) {
    return NextResponse.json(
      { ok: false, message: "Missing channelId/text" },
      { status: 400 }
    );
  }

  const me = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true },
  });

  if (!me) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
  }

  // Ensure user belongs to channel
  const ch = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { id: true, studentId: true, tutorId: true },
  });

  if (!ch || (ch.studentId !== me.id && ch.tutorId !== me.id)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const msg = await prisma.chatMessage.create({
    data: {
      channelId,
      senderId: me.id,
      text,
    },
    select: { id: true, senderId: true, text: true, createdAt: true },
  });

  // ✅ sender has read up to now (including this sent message)
await prisma.chatRead.upsert({
  where: { channelId_userId: { channelId, userId: me.id } }, // needs @@unique([channelId,userId])
  update: { lastReadAt: new Date() },
  create: { channelId, userId: me.id, lastReadAt: new Date() },
});

  return NextResponse.json({
    ok: true,
    message: {
      ...msg,
      createdAt: msg.createdAt.toISOString(),
    },
  });
}
