import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // ── Auth ───────────────────────────────────────────────────────────────
    const supabase = await supabaseServerComponent();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true, isDeactivated: true, role: true },
    });

    if (!dbUser || dbUser.isDeactivated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Authorise: must be participant or admin ────────────────────────────
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        OR: [
          { studentId: dbUser.id },
          { tutorId: dbUser.id },
          // admins can also view
          ...(dbUser.role === "ADMIN" ? [{}] : []),
        ],
      },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const transcript = await prisma.sessionTranscript.findUnique({
      where: { sessionId },
    });

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("[GET /api/sessions/[id]/transcript] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
