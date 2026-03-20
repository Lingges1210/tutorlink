// src/app/api/chat/messages/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const existing = await prisma.chatMessage.findUnique({
    where: { id },
    select: { id: true, senderId: true, isDeleted: true, channelId: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, message: "Message not found" }, { status: 404 });
  }

  if (existing.senderId !== me.id) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  // Already deleted — idempotent
  if (existing.isDeleted) {
    return NextResponse.json({
      ok: true,
      message: { id: existing.id, deletedAt: null },
    });
  }

  const deleted = await prisma.chatMessage.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date(), text: "" },
    select: { id: true, isDeleted: true, deletedAt: true, channelId: true },
  });

  // 🔔 Pusher: notify both participants the message was deleted
  await pusherServer.trigger(
    `private-chat-${deleted.channelId}`,
    "message-deleted",
    {
      messageId: deleted.id,
      isDeleted: true,
      deletedAt: deleted.deletedAt?.toISOString() ?? null,
    }
  );

  return NextResponse.json({
    ok: true,
    message: {
      id: deleted.id,
      isDeleted: deleted.isDeleted,
      deletedAt: deleted.deletedAt?.toISOString() ?? null,
    },
  });
}