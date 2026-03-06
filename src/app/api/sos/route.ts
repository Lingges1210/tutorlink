import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/auth/requireDbUser";

const SOS_EXPIRE_MINUTES = 10;

export async function GET() {
  try {
    const user = await requireDbUser();

    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, isDeactivated: true },
    });

    if (!me || me.isDeactivated) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await prisma.sOSRequest.findMany({
      where: { studentId: user.id },
      include: {
        subject: { select: { id: true, code: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
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

export async function POST(req: Request) {
  try {
    const user = await requireDbUser();
    const body = await req.json().catch(() => ({}));

    const subjectId = String(body.subjectId || "");
    const description = String(body.description || "").trim();
    const mode = String(body.mode || "CHAT");

    if (!subjectId || !description) {
      return NextResponse.json(
        { error: "Missing required fields: subjectId, description" },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SOS_EXPIRE_MINUTES * 60 * 1000);

    const sos = await prisma.sOSRequest.create({
      data: {
        studentId: user.id,
        subjectId,
        description,
        mode: mode as any,
        status: "SEARCHING",
        expiresAt,
      },
      include: { subject: true },
    });

    // Route to tutors by subject
    const links = await prisma.tutorSubject.findMany({
      where: { subjectId },
      select: { tutorId: true },
    });

    const tutorIds = links.map((l) => l.tutorId);

    if (tutorIds.length) {
      const tutors = await prisma.user.findMany({
  where: {
    id: { in: tutorIds },
    isDeactivated: false,
    OR: [
      { role: "TUTOR" },
      { isTutorApproved: true },
      { roleAssignments: { some: { role: "TUTOR" } } },
    ],
  },
  select: { id: true },
});

      await prisma.notification.createMany({
        data: tutors.map((t) => ({
          userId: t.id,
          type: "SOS_REQUEST",
          title: `SOS Help Needed: ${sos.subject.code}`,
          body: description.length > 80 ? `${description.slice(0, 77)}...` : description,
          data: { sosId: sos.id, subjectId: sos.subjectId, mode: sos.mode },
          dedupeKey: `sos:${sos.id}:tutor:${t.id}`,
          status: "QUEUED",
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ sos }, { status: 201 });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}