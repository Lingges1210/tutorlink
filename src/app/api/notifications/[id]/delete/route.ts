import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, verificationStatus: true, isDeactivated: true },
  });

  if (!dbUser || dbUser.isDeactivated) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (dbUser.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ message: "Not verified" }, { status: 403 });
  }

  // ensure user can only delete own noti
  const exists = await prisma.notification.findFirst({
    where: { id, userId: dbUser.id },
    select: { id: true },
  });

  if (!exists) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  await prisma.notification.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
