// src/app/api/chat/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const email = user.email.toLowerCase();
  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!me) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { channelId, text, attachments } = (body ?? {}) as {
    channelId?: string;
    text?: string;
    attachments?: {
      bucket: string;
      objectPath: string;
      fileName: string;
      contentType: string;
      sizeBytes: number;
    }[];
  };

  if (!channelId) {
    return NextResponse.json({ ok: false, message: "Missing channelId" }, { status: 400 });
  }

  const cleanText = (text ?? "").trim();
  const hasFiles = Array.isArray(attachments) && attachments.length > 0;

  if (!cleanText && !hasFiles) {
    return NextResponse.json({ ok: false, message: "Nothing to send" }, { status: 400 });
  }

  const created = await prisma.chatMessage.create({
    data: {
      channelId,
      senderId: me.id,
      text: cleanText,
      attachments: hasFiles
        ? {
            createMany: {
              data: attachments!.map((a) => ({
                bucket: a.bucket,
                objectPath: a.objectPath,
                fileName: a.fileName,
                contentType: a.contentType,
                sizeBytes: a.sizeBytes,
              })),
            },
          }
        : undefined,
    },
    include: {
      attachments: true, // NOTE: this includes DB fields only (no url)
    },
  });

  //  frontend expects: { ok: true, message: created }
  return NextResponse.json({ ok: true, message: created });
}