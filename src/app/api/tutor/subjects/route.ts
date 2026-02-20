import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

function isTutorUser(u: {
  isTutorApproved: boolean;
  role: any;
  roleAssignments: { role: any }[];
}) {
  return (
    u.isTutorApproved ||
    u.role === "TUTOR" ||
    u.roleAssignments.some((r) => r.role === "TUTOR")
  );
}

export async function POST(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const tutor = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      isDeactivated: true,
      verificationStatus: true,
      isTutorApproved: true,
      role: true,
      roleAssignments: { select: { role: true } },
    },
  });

  if (!tutor || tutor.isDeactivated) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isTutorUser(tutor) || tutor.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const subjectId = typeof body?.subjectId === "string" ? body.subjectId : null;
  if (!subjectId) {
    return NextResponse.json({ message: "subjectId required" }, { status: 400 });
  }

  const exists = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ message: "Subject not found" }, { status: 404 });
  }

  try {
    await prisma.tutorSubject.create({
      data: { tutorId: tutor.id, subjectId },
    });
  } catch (e: any) {
    // unique constraint (already added)
    if (e?.code === "P2002") {
      return NextResponse.json({ message: "Already added" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const tutor = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      isDeactivated: true,
      verificationStatus: true,
      isTutorApproved: true,
      role: true,
      roleAssignments: { select: { role: true } },
    },
  });

  if (!tutor || tutor.isDeactivated) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isTutorUser(tutor) || tutor.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const subjectId = typeof body?.subjectId === "string" ? body.subjectId : null;
  if (!subjectId) {
    return NextResponse.json({ message: "subjectId required" }, { status: 400 });
  }

  await prisma.tutorSubject.deleteMany({
    where: { tutorId: tutor.id, subjectId },
  });

  return NextResponse.json({ ok: true });
}