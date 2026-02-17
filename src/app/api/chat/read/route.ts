// src/app/api/chat/read/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const email = data.user.email.toLowerCase();
  const body = await req.json().catch(() => ({}));
  const channelId = body?.channelId as string | undefined;

  if (!channelId) {
    return NextResponse.json({ ok: false, message: "Missing channelId" }, { status: 400 });
  }

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!me) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
  }

  // ✅ Verify membership using ChatChannel itself (most reliable)
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { id: true, studentId: true, tutorId: true },
  });

  if (!channel) {
    return NextResponse.json({ ok: false, message: "Channel not found" }, { status: 404 });
  }

  const isMember = channel.studentId === me.id || channel.tutorId === me.id;
  if (!isMember) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  // ✅ Upsert ChatRead so old channels don't break
  await prisma.chatRead.upsert({
    where: {
      channelId_userId: {
        channelId: channel.id,
        userId: me.id,
      },
    },
    create: {
      channelId: channel.id,
      userId: me.id,
      lastReadAt: new Date(),
    },
    update: {
      lastReadAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
