import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  if (!data?.user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true },
  });

  if (!me) return NextResponse.json({ ok: false }, { status: 404 });

  const msg = await prisma.chatMessage.findUnique({
    where: { id: params.id },
    select: { id: true, senderId: true, isDeleted: true },
  });

  if (!msg) return NextResponse.json({ ok: false }, { status: 404 });

  // ✅ WhatsApp-style: only sender can delete for everyone
  if (msg.senderId !== me.id) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  if (msg.isDeleted) return NextResponse.json({ ok: true });

  const updated = await prisma.chatMessage.update({
    where: { id: msg.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      text: "", // optional: wipe text
    },
    select: { id: true, isDeleted: true, deletedAt: true },
  });

  return NextResponse.json({
    ok: true,
    message: {
      id: updated.id,
      isDeleted: updated.isDeleted,
      deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
    },
  });
}
