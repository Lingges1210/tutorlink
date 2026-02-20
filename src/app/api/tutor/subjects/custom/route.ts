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

function normalizeCode(input: string) {
  // Uppercase, remove spaces, keep alphanumeric only
  return input.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9]/g, "");
}

function normalizeTitle(input: string) {
  const trimmed = input.trim();
  const cleaned = trimmed.replace(/^[:\-–—]+\s*/, "");
  const collapsed = cleaned.replace(/\s+/g, " ").trim();

  if (!collapsed) return ""; // ✅ prevent ": " only

  return `: ${collapsed}`;
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
  const rawCode = typeof body?.code === "string" ? body.code.trim() : "";
  const rawTitle = typeof body?.title === "string" ? body.title : "";

  const code = normalizeCode(rawCode);
  const title = normalizeTitle(rawTitle);

  if (!code || code.length < 3 || code.length > 20) {
    return NextResponse.json(
      { message: "Subject code must be 3–20 characters." },
      { status: 400 }
    );
  }

  if (!title || title.length < 3 || title.length > 80) {
    return NextResponse.json(
      { message: "Subject title must be 3–80 characters." },
      { status: 400 }
    );
  }

  // ✅ 1) Upsert by unique code (dedupe)
  const subject = await prisma.subject.upsert({
    where: { code },
    update: {
      // optional: keep title updated (or comment this out if you don’t want tutors to overwrite)
      title,
    },
    create: {
      code,
      title,
    },
    select: { id: true, code: true, title: true },
  });

  // ✅ 2) Link tutor -> subject (dedupe via @@unique([tutorId, subjectId]))
  try {
    await prisma.tutorSubject.create({
      data: {
        tutorId: tutor.id,
        subjectId: subject.id,
      },
    });
  } catch (e: any) {
    // already linked
    if (e?.code === "P2002") {
      return NextResponse.json(
        { message: "You already added this subject." },
        { status: 409 }
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true, subject });
}