import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const sessionId = body?.sessionId;

  if (!sessionId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true },
  });

  if (!dbUser) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true, studentId: true, tutorId: true },
  });

  if (!session || session.status !== "ACCEPTED") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  if (dbUser.id !== session.studentId && dbUser.id !== session.tutorId) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let channel = await prisma.chatChannel.findUnique({
    where: { sessionId },
  });

  if (!channel) {
    channel = await prisma.chatChannel.create({
      data: {
        sessionId: session.id,
        studentId: session.studentId,
        tutorId: session.tutorId!,
      },
    });

    await prisma.chatRead.createMany({
      data: [
        { channelId: channel.id, userId: session.studentId },
        { channelId: channel.id, userId: session.tutorId! },
      ],
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, channelId: channel.id });
}
