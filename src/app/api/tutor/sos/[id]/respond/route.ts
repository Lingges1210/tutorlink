import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const sosId = ctx.params.id;

    const body = await req.json();
    const decision = String(body.decision || "").toUpperCase(); // ACCEPT | DECLINE
    const reason = body.reason ? String(body.reason).trim() : null;

    if (decision !== "ACCEPT" && decision !== "DECLINE") {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, isTutorApproved: true, isDeactivated: true, name: true },
    });

    if (!me || me.role !== "TUTOR" || !me.isTutorApproved || me.isDeactivated) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.sOSTutorResponse.upsert({
        where: { sosId_tutorId: { sosId, tutorId: user.id } },
        create: { sosId, tutorId: user.id, decision: decision as any, reason },
        update: { decision: decision as any, reason },
      });

      if (decision === "DECLINE") return { status: "DECLINED" as const };

      const lock = await tx.sOSRequest.updateMany({
        where: { id: sosId, status: "SEARCHING", acceptedTutorId: null },
        data: {
          status: "ACCEPTED",
          acceptedTutorId: user.id,
          lockedAt: new Date(),
          acceptedAt: new Date(),
        },
      });

      if (lock.count === 0) return { status: "TAKEN" as const };

      const sos = await tx.sOSRequest.findUnique({
        where: { id: sosId },
        include: { subject: true },
      });

      if (!sos) return { status: "NOT_FOUND" as const };

      const scheduledAt = new Date();
      const durationMin = 60;
      const endsAt = new Date(scheduledAt.getTime() + durationMin * 60 * 1000);

      const session = await tx.session.create({
        data: {
          studentId: sos.studentId,
          tutorId: user.id,
          subjectId: sos.subjectId,
          scheduledAt,
          durationMin,
          endsAt,
          status: "ACCEPTED",
          notes: `SOS: ${sos.description}`,
        },
      });

      const channel = await tx.chatChannel.create({
        data: {
          sessionId: session.id,
          studentId: sos.studentId,
          tutorId: user.id,
          lastMessageAt: new Date(),
        },
      });

      await tx.notification.create({
        data: {
          userId: sos.studentId,
          type: "SOS_ACCEPTED",
          title: "Tutor found ",
          body: `${me.name ?? "A tutor"} accepted your SOS request.`,
          data: { sosId: sos.id, sessionId: session.id, channelId: channel.id },
          dedupeKey: `sos:${sos.id}:accepted`,
          status: "QUEUED",
        },
      });

      return {
        status: "ACCEPTED" as const,
        sosId: sos.id,
        sessionId: session.id,
        channelId: channel.id,
      };
    });

    if (result.status === "TAKEN") {
      return NextResponse.json(
        { error: "Another tutor already accepted this SOS." },
        { status: 409 }
      );
    }
    if (result.status === "NOT_FOUND") {
      return NextResponse.json({ error: "SOS not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}