// src/app/api/study/plans/item/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

async function getMe() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true },
  });
  if (!me || me.isDeactivated) return null;
  return me;
}

export async function PATCH(req: Request) {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    const { itemId, nextStatus } = (await req.json()) as {
      itemId: string;
      nextStatus: "PENDING" | "DONE" | "SKIPPED";
    };

    const item = await prisma.studyPlanItem.findFirst({
      where: { id: itemId },
      select: { id: true, planId: true, plan: { select: { userId: true } } },
    });

    if (!item || item.plan.userId !== me.id) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.studyPlanItem.update({
      where: { id: itemId },
      data: { status: nextStatus },
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}