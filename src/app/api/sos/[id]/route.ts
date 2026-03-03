import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/auth/requireDbUser";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser(); //  Prisma DB user
    const { id } = await ctx.params;

    const sos = await prisma.sOSRequest.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, code: true, title: true } },
        acceptedTutor: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    if (!sos || sos.studentId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Find latest session + channel created for this SOS
    let sessionId: string | null = null;
    let channelId: string | null = null;

    if (sos.acceptedTutorId && sos.acceptedAt) {
      const session = await prisma.session.findFirst({
        where: {
          studentId: sos.studentId,
          tutorId: sos.acceptedTutorId,
          subjectId: sos.subjectId,
          notes: { startsWith: "SOS:" },
          createdAt: { gte: new Date(sos.acceptedAt.getTime() - 5 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        include: { chatChannel: true },
      });

      sessionId = session?.id ?? null;
      channelId = session?.chatChannel?.id ?? null;
    }

    return NextResponse.json({ sos, sessionId, channelId });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}