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

  const ch = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { id: true, studentId: true, tutorId: true },
  });

  if (!ch || (ch.studentId !== me.id && ch.tutorId !== me.id)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const otherUserId = ch.studentId === me.id ? ch.tutorId : ch.studentId;

  const row = await prisma.chatTyping.findUnique({
    where: { channelId_userId: { channelId, userId: otherUserId } },
    select: { isTyping: true, updatedAt: true },
  });

  // auto-expire typing if stale (no updates recently)
  const staleMs = 5000;
  const stillTyping =
    row?.isTyping && row?.updatedAt
      ? Date.now() - row.updatedAt.getTime() <= staleMs
      : false;

  return NextResponse.json({ ok: true, otherTyping: !!stillTyping });
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
  if (!me) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
  }

  const ch = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { id: true, studentId: true, tutorId: true },
  });

  if (!ch || (ch.studentId !== me.id && ch.tutorId !== me.id)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  await prisma.chatTyping.upsert({
    where: { channelId_userId: { channelId, userId: me.id } },
    update: { isTyping },
    create: { channelId, userId: me.id, isTyping },
  });

  return NextResponse.json({ ok: true });
}
