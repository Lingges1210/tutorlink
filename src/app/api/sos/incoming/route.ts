import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET() {
  try {
    const user = await requireUser();

    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, isTutorApproved: true, isDeactivated: true },
    });

    if (!me || me.role !== "TUTOR" || !me.isTutorApproved || me.isDeactivated) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const links = await prisma.tutorSubject.findMany({
      where: { tutorId: user.id },
      select: { subjectId: true },
    });

    const subjectIds = links.map((l) => l.subjectId);
    if (!subjectIds.length) return NextResponse.json({ requests: [] });

    const now = new Date();

    const requests = await prisma.sOSRequest.findMany({
      where: {
        status: "SEARCHING",
        subjectId: { in: subjectIds },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        NOT: {
          tutorResponses: { some: { tutorId: user.id, decision: "DECLINE" } },
        },
      },
      include: {
        subject: { select: { id: true, code: true, title: true } },
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
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