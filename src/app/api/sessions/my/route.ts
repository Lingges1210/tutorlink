import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ items: [] });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated || dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.session.findMany({
    where: { studentId: dbUser.id },
    orderBy: { scheduledAt: "desc" },
    take: 50,
    select: {
      id: true,
      scheduledAt: true,
      durationMin: true,
      status: true,
      cancelledAt: true,
      cancelReason: true,
      rescheduledAt: true,
      subject: { select: { code: true, title: true } },
      tutor: { select: { id: true, name: true, programme: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ items });
}
