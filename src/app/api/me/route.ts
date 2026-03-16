// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerAnon } from "@/lib/supabaseServerAnon";

export async function GET() {
  const supabase = await supabaseServerAnon();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!dbUser) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: dbUser.id });
}