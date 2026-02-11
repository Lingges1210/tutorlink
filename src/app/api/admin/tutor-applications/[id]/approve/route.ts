import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = await supabaseServerComponent();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { role: true, roleAssignments: { select: { role: true } } },
  });
  const isAdmin = admin?.role === "ADMIN" || admin?.roleAssignments?.some(r => r.role === "ADMIN");
  if (!isAdmin) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const app = await prisma.tutorApplication.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.tutorApplication.update({
      where: { id: params.id },
      data: { status: "APPROVED", reviewedAt: new Date() },
    }),
    prisma.userRoleAssignment.upsert({
      where: { userId_role: { userId: app.userId, role: "TUTOR" } },
      update: {},
      create: { userId: app.userId, role: "TUTOR" },
    }),
    prisma.user.update({
      where: { id: app.userId },
      data: { isTutorApproved: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}
