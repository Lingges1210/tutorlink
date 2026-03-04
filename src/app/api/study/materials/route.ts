// src/app/api/study/materials/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

async function getMe() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const me = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { id: true, isDeactivated: true },
  });

  if (!me || me.isDeactivated) return null;
  return me;
}

// GET /api/study/materials?studySubjectId=...
export async function GET(req: Request) {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    const url = new URL(req.url);
    const studySubjectId = (url.searchParams.get("studySubjectId") ?? "").trim();

    // ✅ If subjectId provided, verify it belongs to the user
    if (studySubjectId) {
      const ok = await prisma.studySubject.findFirst({
        where: { id: studySubjectId, userId: me.id },
        select: { id: true },
      });
      if (!ok) {
        return NextResponse.json({ ok: false, error: "Invalid subject" }, { status: 400 });
      }
    }

    const materials = await prisma.studyMaterial.findMany({
      where: {
        userId: me.id,
        ...(studySubjectId ? { studySubjectId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        studySubjectId: true,
      },
    });

    return NextResponse.json({
      ok: true,
      materials: materials.map((m) => ({
        id: m.id,
        title: m.title,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        studySubjectId: m.studySubjectId,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}

// POST /api/study/materials
// Body: { title: string, rawText: string, studySubjectId?: string | null }
export async function POST(req: Request) {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json().catch(() => null);

    const title = String(body?.title ?? "").trim();
    const rawText = String(body?.rawText ?? "").trim();

    const studySubjectIdRaw = body?.studySubjectId ?? null;
    const studySubjectId =
      typeof studySubjectIdRaw === "string" && studySubjectIdRaw.trim()
        ? studySubjectIdRaw.trim()
        : null;

    if (!title) {
      return NextResponse.json({ ok: false, error: "Title required" }, { status: 400 });
    }
    if (rawText.length < 50) {
      return NextResponse.json({ ok: false, error: "Notes too short" }, { status: 400 });
    }

    // ✅ Validate subject belongs to user (optional)
    if (studySubjectId) {
      const ok = await prisma.studySubject.findFirst({
        where: { id: studySubjectId, userId: me.id },
        select: { id: true },
      });
      if (!ok) {
        return NextResponse.json({ ok: false, error: "Invalid subject" }, { status: 400 });
      }
    }

    const material = await prisma.studyMaterial.create({
      data: {
        userId: me.id,
        title: title.slice(0, 120),
        rawText: rawText.slice(0, 500000),
        studySubjectId,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, materialId: material.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}