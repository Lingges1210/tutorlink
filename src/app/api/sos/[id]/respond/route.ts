// src/app/api/sos/[id]/respond/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Next 15
) {
  try {
    // ✅ Supabase auth (cookie-based)
    const supabase = await supabaseServer();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Map Supabase -> Prisma User (FK needs Prisma user.id)
    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email },
      select: { id: true, email: true, name: true },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      decision?: "ACCEPT" | "DECLINE";
    };

    if (body.decision !== "ACCEPT" && body.decision !== "DECLINE") {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }

    const { id: sosId } = await params;

    // ✅ DECLINE: record tutor response so it disappears from incoming
    if (body.decision === "DECLINE") {
      await prisma.sOSTutorResponse.upsert({
        where: { sosId_tutorId: { sosId, tutorId: dbUser.id } },
        create: {
          sosId,
          tutorId: dbUser.id,
          decision: "DECLINE",
          reason: null,
        },
        update: {
          decision: "DECLINE",
          reason: null,
        },
        select: { id: true },
      });

      return NextResponse.json({ ok: true, decision: "DECLINE" });
    }

    // ✅ ACCEPT FLOW (atomic)
    const result = await prisma.$transaction(async (tx) => {
      const sos = await tx.sOSRequest.findUnique({
        where: { id: sosId },
        select: {
          id: true,
          status: true,
          studentId: true,
          subjectId: true,
        },
      });

      if (!sos) {
        return { error: "Not found", statusCode: 404 as const };
      }

      if (sos.status !== "SEARCHING") {
        // already accepted/cancelled/etc.
        return { status: sos.status, channelId: null as string | null };
      }

      // ✅ mark accepted
      const updated = await tx.sOSRequest.update({
        where: { id: sosId },
        data: {
          status: "ACCEPTED",
          acceptedTutorId: dbUser.id,
          acceptedAt: new Date(),
        },
        select: { id: true, status: true },
      });

      // ✅ create a Session for this SOS (so ChatChannel can exist)
      const session = await tx.session.create({
        data: {
          studentId: sos.studentId,
          tutorId: dbUser.id,
          subjectId: sos.subjectId,
          scheduledAt: new Date(),
          durationMin: 60,
          status: "ACCEPTED",
        },
        select: { id: true },
      });

      // ✅ create ChatChannel tied to that session
      const channel = await tx.chatChannel.create({
        data: {
          sessionId: session.id,
          studentId: sos.studentId,
          tutorId: dbUser.id,
        },
        select: { id: true },
      });

      // ✅ NEW: create notification for student (so SOS noti shows up)
      await tx.notification.create({
        data: {
          userId: sos.studentId,
          type: "SOS_ACCEPTED",
          title: "Tutor found",
          body: `${dbUser.name ?? "A tutor"} accepted your SOS request.`,
          data: { sosId: sos.id, sessionId: session.id, channelId: channel.id },
          dedupeKey: `sos:${sos.id}:accepted`,
          status: "QUEUED",
        },
      });

      return { status: updated.status, channelId: channel.id };
    });

    if ((result as any).statusCode === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}