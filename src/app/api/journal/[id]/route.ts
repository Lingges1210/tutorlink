import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/getSessionUser";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.journalEntry.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}