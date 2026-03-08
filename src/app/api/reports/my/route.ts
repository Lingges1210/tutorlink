import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export async function GET() {
  try {
    const supabase = await supabaseServerComponent();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const reports = await prisma.userReport.findMany({
      where: { reporterUserId: dbUser.id },
      orderBy: { createdAt: "desc" },
      include: {
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        reviewedByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, reports });
  } catch (error) {
    console.error("GET /api/reports/my error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load reports" },
      { status: 500 }
    );
  }
}