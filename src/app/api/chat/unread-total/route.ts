// src/app/api/chat/unread-total/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: data.user.email.toLowerCase() },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ ok: false }, { status: 404 });

  const now = new Date();

  // Run chat unread + notification unread in parallel — 2 queries not 3
  const [chatRows, notifUnread] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint }>>`
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
        AND s."status" NOT IN ('CANCELLED')
    `,
    prisma.notification.count({
      where: { userId: dbUser.id, readAt: null },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    total: Number(chatRows?.[0]?.total ?? 0),
    // Bonus: also return notif count so the client can skip /api/notifications/unread
    notifUnread,
  });
}