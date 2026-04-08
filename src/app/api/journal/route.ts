// src/app/api/journal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.journalEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, mood, tags } = await req.json();

  if (!body || typeof body !== "string" || body.trim().length < 3) {
    return NextResponse.json({ error: "Entry body is required" }, { status: 400 });
  }

  const trimmedBody = body.trim();

  const entry = await prisma.journalEntry.create({
    data: {
      userId: user.id,
      content: trimmedBody,
      body: trimmedBody,
      mood: mood || null,
      tags: Array.isArray(tags) ? tags : [],
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}