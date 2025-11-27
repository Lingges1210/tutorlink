// src/app/api/admin/tutor-applications/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: list tutor applications (optionally filter by status)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "PENDING";

  try {
    const applications = await prisma.tutorApplication.findMany({
      where: { status },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, applications });
  } catch (err) {
    console.error("GET tutor applications error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch tutor applications" },
      { status: 500 }
    );
  }
}

// PATCH: approve or reject an application
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, action } = body as {
      applicationId?: string;
      action?: "APPROVE" | "REJECT";
    };

    if (!applicationId || !action) {
      return NextResponse.json(
        { success: false, message: "applicationId and action are required" },
        { status: 400 }
      );
    }

    const application = await prisma.tutorApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, message: "Application not found" },
        { status: 404 }
      );
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    // Update application
    await prisma.tutorApplication.update({
      where: { id: applicationId },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
      },
    });

    // If approved → upgrade user
    if (action === "APPROVE") {
      await prisma.user.update({
        where: { id: application.userId },
        data: {
          role: "TUTOR",
          isTutorApproved: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Application ${newStatus.toLowerCase()}`,
    });
  } catch (err) {
    console.error("PATCH tutor application error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update application" },
      { status: 500 }
    );
  }
}
