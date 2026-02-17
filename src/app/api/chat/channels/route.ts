// src/app/api/chat/channels/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

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

  const channels = await prisma.chatChannel.findMany({
    where: {
      OR: [{ studentId: me.id }, { tutorId: me.id }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      session: {
        select: {
          id: true,
          subject: { select: { code: true, title: true } },
          student: { select: { id: true, name: true } },
          tutor: { select: { id: true, name: true } },
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { id: true, text: true, createdAt: true },
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

      const isMeStudent = c.session?.student?.id === me.id;

      const otherName = isMeStudent
        ? c.session?.tutor?.name ?? "Tutor"
        : c.session?.student?.name ?? "Student";

      const subj = c.session?.subject;
      const subjectName = subj ? `${subj.code} ${subj.title}` : "Subject";

      return {
        id: c.id,
        sessionId: c.sessionId,
        name: otherName,
        subjectName,
        lastMessage: last?.text ?? "No messages yet",
        lastAt: (last?.createdAt ?? c.createdAt).toISOString(),
        unread,
        viewerIsStudent: isMeStudent,
      };
    })
  );

  return NextResponse.json({ ok: true, items });
}
