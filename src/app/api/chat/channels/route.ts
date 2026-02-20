import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { autoCompleteSessionsIfNeeded } from "@/lib/autoCompleteSessions";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const email = data.user.email.toLowerCase();

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, name: true },
  });

  if (!me) return NextResponse.json({ ok: false }, { status: 404 });

  //  NO-CRON automation
  try {
    await autoCompleteSessionsIfNeeded();
  } catch {
    // ignore
  }

  const now = new Date();

  const channels = await prisma.chatChannel.findMany({
    where: {
      OR: [{ studentId: me.id }, { tutorId: me.id }],
      AND: [
        {
          OR: [{ closeAt: null }, { closeAt: { gt: now } }],
        },
        {
          session: {
            status: {
              notIn: ["CANCELLED"],
            },
          },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      session: {
        select: {
          id: true,
          status: true,
          subject: { select: { code: true, title: true } },
          student: { select: { id: true, name: true } },
          tutor: { select: { id: true, name: true } },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true, text: true, createdAt: true, isDeleted: true },
      },
      reads: {
        where: { userId: me.id },
        select: { lastReadAt: true },
        take: 1,
      },
    },
  });

  const items = await Promise.all(
    channels.map(async (c) => {
      const last = c.messages[0] ?? null;
      const lastReadAt = c.reads[0]?.lastReadAt ?? new Date(0);

      const unread = await prisma.chatMessage.count({
        where: {
          channelId: c.id,
          createdAt: { gt: lastReadAt },
          senderId: { not: me.id },
        },
      });

      const isMeStudent = c.session.student.id === me.id;

      const otherName = isMeStudent
        ? c.session.tutor?.name ?? "Tutor"
        : c.session.student?.name ?? "Student";

      const subj = c.session.subject;
      const subjectName = `${subj.code} ${subj.title}`;

      const chatCloseAt = c.closeAt ?? null;
      const isChatClosed = chatCloseAt ? new Date() > chatCloseAt : false;

      return {
        id: c.id,
        sessionId: c.sessionId,
        name: otherName,
        subjectName,
        lastMessage: last
          ? last.isDeleted
            ? "This message was deleted"
            : last.text
          : "No messages yet",
        lastAt: (last?.createdAt ?? c.lastMessageAt).toISOString(),
        unread,
        viewerIsStudent: isMeStudent,
        chatCloseAt: chatCloseAt ? chatCloseAt.toISOString() : null,
        isChatClosed,
      };
    })
  );

  return NextResponse.json({ ok: true, items });
}