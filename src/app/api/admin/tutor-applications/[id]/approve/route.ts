// src/app/api/admin/tutor-applications/[id]/approve/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

function splitSubjects(raw: string): string[] {
  return raw
    .split(/[\n,;]/g) // newline, comma, semicolon
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
  _: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const admin = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { role: true, roleAssignments: { select: { role: true } } },
  });

  const isAdmin =
    admin?.role === "ADMIN" ||
    admin?.roleAssignments?.some((r) => r.role === "ADMIN");

  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 }
    );
  }

  // ✅ include subjects so we can create Subject + TutorSubject
  const app = await prisma.tutorApplication.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, userId: true, subjects: true },
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

  // ✅ do everything in ONE transaction (safe + consistent)
  await prisma.$transaction(async (tx) => {
    // approve application
    await tx.tutorApplication.update({
      where: { id: params.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    // ensure tutor role assignment
    await tx.userRoleAssignment.upsert({
      where: { userId_role: { userId: app.userId, role: "TUTOR" } },
      update: {},
      create: { userId: app.userId, role: "TUTOR" },
    });

    // mark approved
    await tx.user.update({
      where: { id: app.userId },
      data: { isTutorApproved: true },
    });

    // ✅ create Subject + TutorSubject links
    const lines = splitSubjects(app.subjects);

    for (const line of lines) {
      const code = extractCode(line) ?? line.toUpperCase();
      const title = extractTitle(line, extractCode(line));

      const subject = await tx.subject.upsert({
        where: { code },
        update: {
          // If seeded subject exists, we don't overwrite title.
          // If you want to fill missing title later, change logic.
        },
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

  return NextResponse.json({ success: true, status: "APPROVED" });
}
