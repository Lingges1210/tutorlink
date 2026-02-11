import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });

  if (!dbUser) {
    return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
  }

  const application = await prisma.tutorApplication.findFirst({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, application });
}
