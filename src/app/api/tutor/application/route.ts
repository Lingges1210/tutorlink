import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true },
  });

  if (!dbUser) {
    return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
  }

  const application = await prisma.tutorApplication.findFirst({
  where: { userId: dbUser.id },
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    status: true,
    subjects: true,
    cgpa: true,
    availability: true,
    createdAt: true,
    reviewedAt: true,
    rejectionReason: true, // ✅ ADD
  },
});

return NextResponse.json({ success: true, application });
}
