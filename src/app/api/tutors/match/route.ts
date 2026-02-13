import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ items: [] });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated || dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ items: [] });
  }

  const { searchParams } = new URL(req.url);
  const subjectId = searchParams.get("subjectId");
  if (!subjectId) return NextResponse.json({ items: [] });

  const links = await prisma.tutorSubject.findMany({
    where: {
      subjectId,
      tutor: {
        isTutorApproved: true,
        isDeactivated: false,
        verificationStatus: "AUTO_VERIFIED",
      },
    },
    select: {
      tutor: {
        select: {
          id: true,
          name: true,
          programme: true,
          avatarUrl: true,
        },
      },
    },
    take: 30,
  });

  type Link = { tutor: { id: string; name: string | null; programme: string | null; avatarUrl: string | null } };
  const items = Array.from(new Map((links as Link[]).map((x) => [x.tutor.id, x.tutor])).values());

  return NextResponse.json({ items });
}
