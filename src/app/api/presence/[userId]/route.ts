import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const row = await prisma.userPresence.findUnique({
    where: { userId },
    select: {
      userId: true,
      isOnline: true,
      lastSeenAt: true,
    },
  });

  if (!row) {
    return NextResponse.json({
      ok: true,
      presence: {
        userId,
        isOnline: false,
        lastSeenAt: null,
      },
    });
  }

  const freshMs = 70 * 1000;
  const effectiveOnline =
    row.isOnline && Date.now() - new Date(row.lastSeenAt).getTime() <= freshMs;

  return NextResponse.json({
    ok: true,
    presence: {
      userId: row.userId,
      isOnline: effectiveOnline,
      lastSeenAt: row.lastSeenAt.toISOString(),
    },
  });
}