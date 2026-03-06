import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export const runtime = "nodejs";

type Body = {
  sessionId?: string;
};

function getRoomName(sessionId: string) {
  return `session-${sessionId}`;
}

function getParticipantName(
  name: string | null | undefined,
  email: string | null | undefined
) {
  if (name && name.trim()) return name.trim();
  if (email && email.trim()) return email.trim();
  return "TutorLink User";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const sessionId = body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitApiKey || !livekitApiSecret) {
      return NextResponse.json(
        { error: "LiveKit env vars are missing" },
        { status: 500 }
      );
    }

    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isDeactivated: true,
        verificationStatus: true,
      },
    });

    if (
      !dbUser ||
      dbUser.isDeactivated ||
      dbUser.verificationStatus !== "AUTO_VERIFIED"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        studentId: true,
        tutorId: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const isOwner =
      session.studentId === dbUser.id || session.tutorId === dbUser.id;

    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Call room is only available for accepted sessions" },
        { status: 400 }
      );
    }

    const roomName = getRoomName(session.id);

    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: dbUser.id,
      name: getParticipantName(dbUser.name, dbUser.email),
      metadata: JSON.stringify({
        userId: dbUser.id,
        role: dbUser.role,
        sessionId: session.id,
      }),
      ttl: "2h",
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({
      token: await token.toJwt(),
      roomName,
    });
  } catch (error) {
    console.error("LiveKit token route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}