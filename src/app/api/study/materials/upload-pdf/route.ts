import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { createClient } from "@supabase/supabase-js";
import { extractText as extractPdfText } from "unpdf";

export const runtime = "nodejs";

function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !service) throw new Error("Missing Supabase admin credentials");
  return createClient(url, service, { auth: { persistSession: false } });
}

async function getMe() {
  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, isDeactivated: true },
  });
}

async function extractText(buf: Buffer): Promise<{ text: string; pages: number }> {
  const uint8 = new Uint8Array(buf);
  const { text, totalPages } = await extractPdfText(uint8, { mergePages: true });
  return {
    text: text?.trim() ?? "",
    pages: totalPages ?? 0,
  };
}

export async function POST(req: Request) {
  try {
    const me = await getMe();
    if (!me || me.isDeactivated) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const title = (body?.title ?? "PDF Notes").toString().trim();
    const objectPath = (body?.objectPath ?? "").toString();
    const fileName = (body?.fileName ?? "").toString();

    const studySubjectIdRaw = body?.studySubjectId ?? null;
    const studySubjectId =
      typeof studySubjectIdRaw === "string" && studySubjectIdRaw.trim()
        ? studySubjectIdRaw.trim()
        : null;

    if (!objectPath) {
      return NextResponse.json({ ok: false, error: "Missing objectPath" }, { status: 400 });
    }

    const supa = await supabaseServerComponent();
    const { data: authData, error: authErr } = await supa.auth.getUser();
    const authUid = authData?.user?.id;

    if (authErr || !authUid) {
      return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
    }

    if (!objectPath.startsWith(`${authUid}/`)) {
      return NextResponse.json({ ok: false, error: "Invalid objectPath" }, { status: 403 });
    }

    if (studySubjectId) {
      const ok = await prisma.studySubject.findFirst({
        where: { id: studySubjectId, userId: me.id },
        select: { id: true },
      });
      if (!ok) {
        return NextResponse.json({ ok: false, error: "Invalid subject" }, { status: 400 });
      }
    }

    const admin = getAdminSupabase();
    const { data, error } = await admin.storage.from("study-materials").download(objectPath);

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Download failed" },
        { status: 500 }
      );
    }

    const buf = Buffer.from(await data.arrayBuffer());

    if (!buf || buf.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Downloaded file is empty. Check the storage path." },
        { status: 500 }
      );
    }

    let extracted = "";
    let pages = 0;

    try {
      const res = await extractText(buf);
      extracted = res.text;
      pages = res.pages;
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: "PDF parse failed", details: e?.message ?? String(e) },
        { status: 500 }
      );
    }

    if (extracted.length < 50) {
      return NextResponse.json(
        {
          ok: false,
          error: "Extracted text too short. The PDF may be scanned (image-based) and requires OCR.",
          details: { pages, extractedChars: extracted.length },
        },
        { status: 400 }
      );
    }

    const material = await prisma.studyMaterial.create({
      data: {
        userId: me.id,
        title: (title || fileName || "PDF Notes").slice(0, 120),
        rawText: extracted.slice(0, 500_000),
        objectPath,
        fileName: fileName || null,
        studySubjectId,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      materialId: material.id,
      pages,
      extractedChars: extracted.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}