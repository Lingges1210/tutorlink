// src/app/api/tutor/sessions/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { autoCompleteSessionsIfNeeded } from "@/lib/autoCompleteSessions";

export async function GET() {
  //  no-cron automation: run auto-complete opportunistically
  // (silent, never blocks the tutor sessions page)
  try {
    await autoCompleteSessionsIfNeeded();
  } catch {
    // ignore
  }

  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ items: [] });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      isDeactivated: true,
      verificationStatus: true,
      isTutorApproved: true,
      role: true,
      roleAssignments: { select: { role: true } },
    },
  });

  if (!dbUser || dbUser.isDeactivated) return NextResponse.json({ items: [] });

  const isTutor =
    dbUser.isTutorApproved ||
    dbUser.role === "TUTOR" ||
    dbUser.roleAssignments.some((r) => r.role === "TUTOR");

  if (!isTutor || dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.session.findMany({
    where: { tutorId: dbUser.id },
    orderBy: { scheduledAt: "asc" },
    take: 50,
    select: {
      id: true,
      scheduledAt: true,
      endsAt: true,
      durationMin: true,
      status: true,
      cancelReason: true,
      cancelledAt: true,
      rescheduledAt: true,

      //  proposal fields
      proposedAt: true,
      proposedNote: true,
      proposalStatus: true,

      subject: { select: { code: true, title: true } },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          programme: true,
          avatarUrl: true,
        },
      },
    },
  });

  return NextResponse.json({ items });
}