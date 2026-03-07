import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

export async function GET() {
  try {
    await requireAdminUser();

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
  } catch (error: any) {
    const message = error?.message || "Failed to load tutor applications";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}