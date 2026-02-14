import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ items: [] });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated || dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ items: [] });
  }

  const sessions = await prisma.session.findMany({
    where: { studentId: dbUser.id },
    orderBy: { scheduledAt: "desc" },
    take: 50,
    select: {
      id: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
      status: true,
      cancelReason: true,
      tutorId: true,

      // ✅ NEW: proposal fields
      proposedAt: true,
      proposedNote: true,
      proposalStatus: true,

      subject: { select: { code: true, title: true } },
      tutor: { select: { id: true, name: true, programme: true, avatarUrl: true, email: true } },
    },
  });

  const items = sessions.map((s) => ({
    id: s.id,
    scheduledAt: s.scheduledAt,
    endsAt: s.endsAt,
    durationMin: s.durationMin,
    status: s.status,
    cancelReason: s.cancelReason,

    assigned: !!s.tutorId,
    subject: s.subject,
    tutor: s.tutor ?? null,

    // ✅ pass through proposal fields
    proposedAt: s.proposedAt ?? null,
    proposedNote: s.proposedNote ?? null,
    proposalStatus: s.proposalStatus ?? null,
  }));

  return NextResponse.json({ items });
}
