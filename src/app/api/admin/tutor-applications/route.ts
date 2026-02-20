// src/app/api/admin/tutor-applications/route.ts
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
    select: { role: true, roleAssignments: { select: { role: true } } },
  });

  const roles = new Set<string>();
  if (dbUser?.role) roles.add(dbUser.role);
  for (const r of dbUser?.roleAssignments ?? []) roles.add(r.role);

  if (!roles.has("ADMIN")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const applications = await prisma.tutorApplication.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      subjects: true,
      cgpa: true,
      transcriptPath: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      rejectionReason: true,
      user: {
        select: { id: true, name: true, email: true, matricNo: true },
      },
    },
  });

  return NextResponse.json({ success: true, applications });
}