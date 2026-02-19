// src/app/api/chat/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type IncomingAttachment = {
  bucket: string;
  objectPath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export async function GET(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.email) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const channelId = url.searchParams.get("channelId");
  const take = Number(url.searchParams.get("take") ?? "30");
  const cursor = url.searchParams.get("cursor");

  if (!channelId) {
    return NextResponse.json(
      { ok: false, message: "Missing channelId" },
      { status: 400 }
    );
  }

  const me = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true },
  });

  if (!me) {
    return NextResponse.json(
      { ok: false, message: "User not found" },
      { status: 404 }
    );
  }

  // Ensure user belongs to channel
  const ch = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      studentId: true,
      tutorId: true,
      closeAt: true,
      closedAt: true,
    },
  });

  if (!ch || (ch.studentId !== me.id && ch.tutorId !== me.id)) {
    return NextResponse.json(
      { ok: false, message: "Forbidden" },
      { status: 403 }
    );
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

  // Messages + attachments
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
    select: {
      id: true,
      senderId: true,
      text: true,
      createdAt: true,
      isDeleted: true,
      deletedAt: true,
      attachments: {
        select: {
          id: true,
          bucket: true,
          objectPath: true,
          fileName: true,
          contentType: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
    },
  });

  const nextCursor =
    messages.length >= Math.min(Math.max(take, 1), 50)
      ? messages[messages.length - 1].id
      : null;

  // ✅ include close window info for UI (no other behavior change)
  const isChatClosed =
    !!ch.closedAt ||
    (ch.closeAt ? new Date().getTime() >= ch.closeAt.getTime() : false);

  // Signed URLs (1 hour) - only if message not deleted
  const admin = supabaseAdmin();

  const items = await Promise.all(
    messages.map(async (m) => {
      const atts = await Promise.all(
        (m.attachments ?? []).map(async (a) => {
          // If message deleted, don't return working URLs
          if (m.isDeleted) {
            return {
              id: a.id,
              fileName: a.fileName,
              contentType: a.contentType,
              sizeBytes: a.sizeBytes,
              url: null as string | null,
              createdAt: a.createdAt.toISOString(),
            };
          }

          const { data: signed } = await admin.storage
            .from(a.bucket)
            .createSignedUrl(a.objectPath, 60 * 60);

          return {
            id: a.id,
            fileName: a.fileName,
            contentType: a.contentType,
            sizeBytes: a.sizeBytes,
            url: signed?.signedUrl ?? null,
            createdAt: a.createdAt.toISOString(),
          };
        })
      );

      return {
        ...m,
        createdAt: m.createdAt.toISOString(),
        deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
        attachments: atts,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    items,
    nextCursor,
    read: {
      meLastReadAt: meLastReadAt.toISOString(),
      otherLastReadAt: otherLastReadAt.toISOString(),
    },
    chatCloseAt: ch.closeAt ? ch.closeAt.toISOString() : null,
    isChatClosed,
  });
}

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.email) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const channelId = body?.channelId as string | undefined;
  const textRaw = body?.text as string | undefined;

  const attachments = (Array.isArray(body?.attachments)
    ? body.attachments
    : []) as IncomingAttachment[];

  const text = (textRaw ?? "").trim();

  // ✅ allow: text-only OR attachment-only OR both
  if (!channelId || (!text && attachments.length === 0)) {
    return NextResponse.json(
      { ok: false, message: "Missing channelId or content" },
      { status: 400 }
    );
  }

  const me = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true },
  });

  if (!me) {
    return NextResponse.json(
      { ok: false, message: "User not found" },
      { status: 404 }
    );
  }

  // Ensure user belongs to channel + close window
  const ch = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: {
      id: true,
      studentId: true,
      tutorId: true,
      closeAt: true,
      closedAt: true,
    },
  });

  if (!ch || (ch.studentId !== me.id && ch.tutorId !== me.id)) {
    return NextResponse.json(
      { ok: false, message: "Forbidden" },
      { status: 403 }
    );
  }

  // ✅ NEW: block sending if chat is closed / expired
  const now = new Date();
  const isClosed =
    !!ch.closedAt || (ch.closeAt ? ch.closeAt.getTime() <= now.getTime() : false);

  if (isClosed) {
    return NextResponse.json(
      { ok: false, message: "Chat is closed" },
      { status: 403 }
    );
  }

  // ✅ basic server-side attachment validation (don’t trust client)
  for (const a of attachments) {
    if (!a?.bucket || !a?.objectPath || !a?.fileName || !a?.contentType) {
      return NextResponse.json(
        { ok: false, message: "Bad attachment payload" },
        { status: 400 }
      );
    }

    const allowed =
      a.contentType.startsWith("image/") ||
      a.contentType === "application/pdf";

    if (!allowed) {
      return NextResponse.json(
        { ok: false, message: "Only images/PDF allowed" },
        { status: 400 }
      );
    }

    if (typeof a.sizeBytes !== "number" || a.sizeBytes <= 0) {
      return NextResponse.json(
        { ok: false, message: "Bad attachment size" },
        { status: 400 }
      );
    }
  }

  const msg = await prisma.chatMessage.create({
    data: {
      channelId,
      senderId: me.id,
      text: text || "",
      attachments: attachments.length
        ? {
            create: attachments.map((a) => ({
              bucket: a.bucket,
              objectPath: a.objectPath,
              fileName: a.fileName,
              contentType: a.contentType,
              sizeBytes: a.sizeBytes,
            })),
          }
        : undefined,
    },
    select: {
      id: true,
      senderId: true,
      text: true,
      createdAt: true,
      isDeleted: true,
      deletedAt: true,
      attachments: {
        select: {
          id: true,
          bucket: true,
          objectPath: true,
          fileName: true,
          contentType: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
    },
  });

  // ✅ keep channel ordering correct (lastMessageAt drives channel list)
  await prisma.chatChannel.update({
    where: { id: channelId },
    data: { lastMessageAt: msg.createdAt },
  });

  // ✅ sender has read up to now (including this sent message)
  await prisma.chatRead.upsert({
    where: { channelId_userId: { channelId, userId: me.id } },
    update: { lastReadAt: new Date() },
    create: { channelId, userId: me.id, lastReadAt: new Date() },
  });

  // Return signed URLs for attachments on the newly created message
  const admin = supabaseAdmin();

  const atts = await Promise.all(
    (msg.attachments ?? []).map(async (a) => {
      const { data: signed } = await admin.storage
        .from(a.bucket)
        .createSignedUrl(a.objectPath, 60 * 60);

      return {
        id: a.id,
        fileName: a.fileName,
        contentType: a.contentType,
        sizeBytes: a.sizeBytes,
        url: signed?.signedUrl ?? null,
        createdAt: a.createdAt.toISOString(),
      };
    })
  );

  return NextResponse.json({
    ok: true,
    message: {
      id: msg.id,
      senderId: msg.senderId,
      text: msg.text,
      createdAt: msg.createdAt.toISOString(),
      isDeleted: msg.isDeleted,
      deletedAt: msg.deletedAt ? msg.deletedAt.toISOString() : null,
      attachments: atts,
    },
    chatCloseAt: ch.closeAt ? ch.closeAt.toISOString() : null,
    isChatClosed: false,
  });
}
