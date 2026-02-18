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

  // ✅ single query, counts unread across ALL my channels
  // - includes channels even if ChatRead row doesn't exist (COALESCE to epoch)
  // - excludes my own messages
  // - excludes deleted messages
  const rows = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COALESCE(COUNT(m."id"), 0) AS total
    FROM "ChatChannel" c
    LEFT JOIN "ChatRead" r
      ON r."channelId" = c."id"
     AND r."userId" = ${dbUser.id}
    JOIN "ChatMessage" m
      ON m."channelId" = c."id"
     AND m."isDeleted" = FALSE
     AND m."senderId" <> ${dbUser.id}
     AND m."createdAt" > COALESCE(r."lastReadAt", to_timestamp(0))
    WHERE c."studentId" = ${dbUser.id}
       OR c."tutorId" = ${dbUser.id};
  `;

  return NextResponse.json({ ok: true, total: Number(rows?.[0]?.total ?? 0) });
}
