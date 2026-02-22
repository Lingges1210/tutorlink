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

  const now = new Date();

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
    JOIN "Session" s
      ON s."id" = c."sessionId"
    WHERE (c."studentId" = ${dbUser.id} OR c."tutorId" = ${dbUser.id})
      AND (c."closeAt" IS NULL OR c."closeAt" > ${now})
      AND s."status" NOT IN ('CANCELLED');
  `;

  return NextResponse.json({ ok: true, total: Number(rows?.[0]?.total ?? 0) });
}