import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

function toInt(v: string | null, fallback: number) {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ message: "Not verified" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(
    50,
    Math.max(1, toInt(url.searchParams.get("limit"), 20))
  );
  const cursor = url.searchParams.get("cursor"); // notification id
  const unreadOnly = url.searchParams.get("unread") === "1";

  const where: any = { userId: dbUser.id };
  if (unreadOnly) where.readAt = null;

  // Cursor pagination by createdAt/id (stable)
  const cursorRow = cursor
    ? await prisma.notification.findFirst({
        where: { id: cursor, userId: dbUser.id },
        select: { createdAt: true, id: true },
      })
    : null;

  const items = await prisma.notification.findMany({
    where: cursorRow
      ? {
          ...where,
          OR: [
            { createdAt: { lt: cursorRow.createdAt } },
            { createdAt: cursorRow.createdAt, id: { lt: cursorRow.id } },
          ],
        }
      : where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      data: true,
      status: true,
      createdAt: true,
      sentAt: true,
      readAt: true,
    },
  });

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.id ?? null : null;

  //  normalize data so viewer routing never breaks
  const normalized = pageItems.map((n) => {
    let data: any = n.data;

    // if Prisma returns JSON as string, parse it
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        data = null;
      }
    }

    // make sure data is object
    if (!data || typeof data !== "object") data = {};

    return { ...n, data };
  });

  //  you were missing this
  const unreadCount = await prisma.notification.count({
    where: { userId: dbUser.id, readAt: null },
  });

  return NextResponse.json({
    items: normalized,
    nextCursor,
    unreadCount,
  });
}
