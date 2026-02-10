import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
  } catch (err) {
    console.error("Queue error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load queue" },
      { status: 500 }
    );
  }
}
