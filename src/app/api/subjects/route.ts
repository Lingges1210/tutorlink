import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const subjects = await prisma.subject.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, title: true },
  });

  return NextResponse.json({ ok: true, subjects });
}