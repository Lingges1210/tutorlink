import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export const runtime = "nodejs";

async function getMe() {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;

  return prisma.user.findUnique({
    where: { email },
    select: { id: true, isDeactivated: true },
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me || me.isDeactivated) return NextResponse.json({ ok: false }, { status: 401 });

  const { id } = await ctx.params;

  const pack = await prisma.studyPack.findFirst({
    where: { id, material: { userId: me.id } },
    select: { id: true, summary: true, concepts: true, flashcards: true, quiz: true, createdAt: true },
  });

  if (!pack) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, pack });
}