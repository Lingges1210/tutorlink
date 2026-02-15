import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ success: false }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ success: false }, { status: 401 });

  const unread = await prisma.notification.count({
    where: { userId: dbUser.id, readAt: null },
  });

  return NextResponse.json({ success: true, unread });
}
