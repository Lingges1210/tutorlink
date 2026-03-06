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

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });

  if (!me) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const isOnline = !!body?.isOnline;
  const now = new Date();

  await prisma.userPresence.upsert({
    where: { userId: me.id },
    update: {
      isOnline,
      lastSeenAt: now,
    },
    create: {
      userId: me.id,
      isOnline,
      lastSeenAt: now,
    },
  });

  return NextResponse.json({
    ok: true,
    presence: {
      userId: me.id,
      isOnline,
      lastSeenAt: now.toISOString(),
    },
  });
}