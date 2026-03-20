// src/app/api/chat/pusher-auth/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

function extractChannelId(channelName: string): string | null {
  const m = channelName.match(/^(?:private|presence)-chat-(.+)$/);
  return m ? m[1] : null;
}

export async function POST(req: Request) {
  let socketId: string | undefined;
  let channelName: string | undefined;

  const rawText = await req.text();

  // Always try form-encoded first — pusher-js sends socket_id=...&channel_name=...
  // even when the content-type header also includes "application/json"
  const params = new URLSearchParams(rawText);
  socketId = params.get("socket_id") ?? undefined;
  channelName = params.get("channel_name") ?? undefined;

  // Fallback to JSON if form-encoded yielded nothing
  if (!socketId || !channelName) {
    try {
      const body = JSON.parse(rawText);
      socketId = body.socket_id;
      channelName = body.channel_name;
    } catch {}
  }

  if (!socketId || !channelName) {
    return NextResponse.json(
      { error: "Missing socket_id or channel_name" },
      { status: 400 }
    );
  }

  // Auth user via Supabase session (cookie-based)
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true, name: true },
  });

  if (!me) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const channelId = extractChannelId(channelName);

  if (!channelId) {
    return NextResponse.json({ error: "Invalid channel name" }, { status: 400 });
  }

  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { id: true, studentId: true, tutorId: true },
  });

  if (!channel || (channel.studentId !== me.id && channel.tutorId !== me.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Sign the auth response
  if (channelName.startsWith("presence-")) {
    const auth = pusherServer.authorizeChannel(socketId, channelName, {
      user_id: me.id,
      user_info: { name: me.name ?? "User" },
    });
    return NextResponse.json(auth);
  }

  const auth = pusherServer.authorizeChannel(socketId, channelName);
  return NextResponse.json(auth);
}