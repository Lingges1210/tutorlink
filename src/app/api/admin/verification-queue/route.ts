import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";

export async function GET() {
  try {
    await requireAdminUser();

    const users = await prisma.user.findMany({
      where: { verificationStatus: "PENDING_REVIEW" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        matricNo: true,
        matricCardUrl: true,
        verificationStatus: true,
        createdAt: true,
        ocrMatchedMatric: true,
        ocrMatchedName: true,
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("Queue error:", error);

    const message = error?.message || "Failed to load queue";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}