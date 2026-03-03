import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/auth/requireDbUser";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireDbUser(); //  Prisma DB user
    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const cancelReason = body?.cancelReason
      ? String(body.cancelReason).trim()
      : null;

    // Make sure it exists + belongs to student
    const existing = await prisma.sOSRequest.findUnique({
      where: { id },
      select: { id: true, studentId: true, status: true, acceptedTutorId: true, subjectId: true },
    });

    if (!existing || existing.studentId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // only allow cancel when SEARCHING or ACCEPTED
    if (!["SEARCHING", "ACCEPTED"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Cannot cancel (already in progress or resolved)." },
        { status: 400 }
      );
    }

    await prisma.sOSRequest.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason,
      },
    });

    // Notify accepted tutor (if any)
    if (existing.acceptedTutorId) {
      await prisma.notification.create({
        data: {
          userId: existing.acceptedTutorId,
          type: "SOS_CANCELLED",
          title: "SOS request cancelled",
          body: "Student cancelled the SOS request.",
          data: { sosId: id, subjectId: existing.subjectId },
          dedupeKey: `sos:${id}:cancelled`,
          status: "QUEUED",
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}