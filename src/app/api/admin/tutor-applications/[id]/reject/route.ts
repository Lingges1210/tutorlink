import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { role: true, roleAssignments: { select: { role: true } } },
  });

  const isAdmin =
    admin?.role === "ADMIN" || admin?.roleAssignments?.some((r) => r.role === "ADMIN");

  if (!isAdmin) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reason =
    typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

  await prisma.tutorApplication.update({
    where: { id: params.id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      rejectionReason: reason, // ✅ SAVE IT
    },
  });

  return NextResponse.json({ success: true });
}
