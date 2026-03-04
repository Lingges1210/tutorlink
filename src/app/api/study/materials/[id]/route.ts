// src/app/api/study/materials/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { createClient } from "@supabase/supabase-js";

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

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const title = String(body?.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ ok: false, error: "Title required" }, { status: 400 });
    }

    const updated = await prisma.studyMaterial.updateMany({
      where: { id, userId: me.id },
      data: { title: title.slice(0, 120) },
    });

    if (updated.count === 0) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await getMe();
    if (!me) return NextResponse.json({ ok: false }, { status: 401 });

    const { id } = await ctx.params;

    // Get info before delete
    const material = await prisma.studyMaterial.findFirst({
      where: { id, userId: me.id },
      select: { id: true, objectPath: true, studySubjectId: true },
    });

    if (!material) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // ✅ delete material row first
    await prisma.studyMaterial.delete({ where: { id: material.id } });

    // ✅ remove storage file if PDF
    if (material.objectPath) {
      const admin = getAdminSupabase();
      if (admin) {
        await admin.storage.from("study-materials").remove([material.objectPath]);
      }
    }

    // ✅ auto-delete empty subject
    let subjectDeleted = false;

    if (material.studySubjectId) {
      const remaining = await prisma.studyMaterial.count({
        where: {
          userId: me.id,
          studySubjectId: material.studySubjectId,
        },
      });

      if (remaining === 0) {
        await prisma.studySubject.deleteMany({
          where: { id: material.studySubjectId, userId: me.id },
        });
        subjectDeleted = true;
      } else {
        // optional: keep subject "fresh" ordering
        await prisma.studySubject.updateMany({
          where: { id: material.studySubjectId, userId: me.id },
          data: { updatedAt: new Date() },
        });
      }
    }

    return NextResponse.json({ ok: true, subjectDeleted });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}