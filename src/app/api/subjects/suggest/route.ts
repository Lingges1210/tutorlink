import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET(req: Request) {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();

  // Suggestions are only for logged-in users (since search is locked until login anyway)
  if (!user?.email) {
    return NextResponse.json({ items: [] });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated || dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ items: [] });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (!q) return NextResponse.json({ items: [] });

  const items = await prisma.subject.findMany({
    where: {
      OR: [
        { code: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { aliases: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 8,
    orderBy: { code: "asc" },
    select: { id: true, code: true, title: true },
  });

  return NextResponse.json({ items });
}
