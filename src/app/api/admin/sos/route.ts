import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/auth/requireDbUser";

export async function GET(req: Request) {
  try {
    const user = await requireDbUser();

    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, isDeactivated: true, accountLockStatus: true },
    });

    if (!me || me.role !== "ADMIN" || me.isDeactivated || me.accountLockStatus === "LOCKED") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const view = (searchParams.get("view") || "ACTIVE").toUpperCase();
    const q = (searchParams.get("q") || "").trim();

    const where: any = {};

    if (view === "ACTIVE") {
  where.moderationStatus = { not: "REMOVED_BY_ADMIN" };
} else if (view === "REMOVED") {
  where.moderationStatus = "REMOVED_BY_ADMIN";
}

    if (q) {
      where.OR = [
        { description: { contains: q, mode: "insensitive" } },
        { subject: { code: { contains: q, mode: "insensitive" } } },
        { subject: { title: { contains: q, mode: "insensitive" } } },
        { student: { name: { contains: q, mode: "insensitive" } } },
        { student: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const requests = await prisma.sOSRequest.findMany({
      where,
      include: {
        subject: { select: { id: true, code: true, title: true } },
        student: {
          select: { id: true, name: true, email: true, role: true, accountLockStatus: true },
        },
        acceptedTutor: {
          select: { id: true, name: true, email: true },
        },
        moderatedByAdmin: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ requests });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}