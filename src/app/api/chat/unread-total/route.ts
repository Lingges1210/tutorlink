import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const email = data.user.email.toLowerCase();

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!dbUser) return NextResponse.json({ ok: false }, { status: 404 });

  // single query, no loops
  const rows = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COALESCE(COUNT(m."id"), 0) AS total
    FROM "ChatRead" r
    JOIN "ChatMessage" m
      ON m."channelId" = r."channelId"
     AND m."createdAt" > r."lastReadAt"
     AND m."senderId" <> r."userId"
    WHERE r."userId" = ${dbUser.id};
  `;

  return NextResponse.json({ ok: true, total: Number(rows?.[0]?.total ?? 0) });
}
