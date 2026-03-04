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

export async function GET() {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    const subjects = await prisma.studySubject.findMany({
      where: { userId: me.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { materials: true } } },
    });

    return NextResponse.json({
      ok: true,
      subjects: subjects.map((s) => ({
        id: s.id,
        name: s.name,
        materialCount: s._count.materials,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json().catch(() => null);
    const nameRaw = String(body?.name ?? "");
    const name = nameRaw.trim();
    if (!name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });

    // ✅ optional: prevent duplicates (simple, user-friendly)
    const existing = await prisma.studySubject.findFirst({
      where: {
        userId: me.id,
        name: { equals: name, mode: "insensitive" },
      },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    if (existing) {
      return NextResponse.json({
        ok: true,
        subject: {
          id: existing.id,
          name: existing.name,
          materialCount: 0,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        },
        alreadyExists: true,
      });
    }

    const subject = await prisma.studySubject.create({
      data: { userId: me.id, name },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({
      ok: true,
      subject: {
        ...subject,
        materialCount: 0,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to create" },
      { status: 500 }
    );
  }
}