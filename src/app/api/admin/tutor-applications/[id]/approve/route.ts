import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/requireAdminUser";
import { logAdminAction } from "@/lib/admin-audit";

function splitSubjects(raw: string): string[] {
  return raw
    .split(/[\n,;]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractCode(line: string): string | null {
  const m = line.toUpperCase().match(/\b[A-Z]{2,4}\d{3,5}\b/);
  return m ? m[0] : null;
}

function extractTitle(line: string, code: string | null): string {
  if (!code) return line.trim();
  const idx = line.toUpperCase().indexOf(code);
  const rest = line.slice(idx + code.length).trim();
  return rest || line.trim();
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdminUser();
    const { id } = await params;

    const app = await prisma.tutorApplication.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        userId: true,
        subjects: true,
      },
    });

    if (!app) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }

    if (app.status === "APPROVED") {
      return NextResponse.json(
        { success: false, message: "Already approved" },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.tutorApplication.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });

      await tx.userRoleAssignment.upsert({
        where: { userId_role: { userId: app.userId, role: "TUTOR" } },
        update: {},
        create: { userId: app.userId, role: "TUTOR" },
      });

      await tx.user.update({
        where: { id: app.userId },
        data: { isTutorApproved: true },
      });

      const lines = splitSubjects(app.subjects);

      for (const line of lines) {
        const foundCode = extractCode(line);
        const code = foundCode ?? line.toUpperCase();
        const title = extractTitle(line, foundCode);

        const subject = await tx.subject.upsert({
          where: { code },
          update: {},
          create: {
            code,
            title,
            aliases: null,
          },
          select: { id: true },
        });

        await tx.tutorSubject.upsert({
          where: {
            tutorId_subjectId: {
              tutorId: app.userId,
              subjectId: subject.id,
            },
          },
          update: {},
          create: {
            tutorId: app.userId,
            subjectId: subject.id,
          },
        });
      }
    });

    await logAdminAction({
      adminId: admin.id,
      targetUserId: app.userId,
      actionType: "TUTOR_APP_APPROVE",
      entityType: "TUTOR_APPLICATION",
      entityId: app.id,
      metadata: {
        previousStatus: app.status,
        newStatus: "APPROVED",
      },
    });

    return NextResponse.json({ success: true, status: "APPROVED" });
  } catch (error: any) {
    const message = error?.message || "Failed to approve tutor application";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json(
      { success: false, message },
      { status }
    );
  }
}