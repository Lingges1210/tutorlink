// src/app/api/study/materials/upload-pdf/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { pathToFileURL } from "url";

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

async function extractTextWithPdfJs(buf: Buffer) {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const workerPath = path.join(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
  );
  const workerUrl = pathToFileURL(workerPath).toString();
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buf) });
  const doc = await loadingTask.promise;

  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    const strings = (content.items ?? [])
      .map((it: any) => (typeof it.str === "string" ? it.str : ""))
      .filter(Boolean);

    out += strings.join(" ") + "\n";
  }

  return { text: out.trim(), pages: doc.numPages };
}

/**
 * Body:
 * {
 *   title?: string,
 *   objectPath: string,     // "<authUid>/<timestamp>-file.pdf"
 *   fileName?: string,
 *   studySubjectId?: string | null
 * }
 */
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

    // ✅ ensure folder is auth.uid()
    const supa = await supabaseServerComponent();
    const { data: authData, error: authErr } = await supa.auth.getUser();
    const authUid = authData?.user?.id;

    if (authErr || !authUid) {
      return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
    }

    if (!objectPath.startsWith(`${authUid}/`)) {
      return NextResponse.json({ ok: false, error: "Invalid objectPath" }, { status: 403 });
    }

    // ✅ validate subject belongs to this user (optional)
    if (studySubjectId) {
      const ok = await prisma.studySubject.findFirst({
        where: { id: studySubjectId, userId: me.id },
        select: { id: true },
      });
      if (!ok) {
        return NextResponse.json({ ok: false, error: "Invalid subject" }, { status: 400 });
      }
    }

    // Download with service role
    const admin = getAdminSupabase();
    const { data, error } = await admin.storage.from("study-materials").download(objectPath);

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Download failed" },
        { status: 500 }
      );
    }

    const buf = Buffer.from(await data.arrayBuffer());

    let extracted = "";
    let pages = 0;

    try {
      const res = await extractTextWithPdfJs(buf);
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
          error: "Extracted text too short. If scanned PDF, OCR needed.",
          details: { pages, extractedChars: extracted.length },
        },
        { status: 400 }
      );
    }

    const material = await prisma.studyMaterial.create({
      data: {
        userId: me.id,
        title: (title || fileName || "PDF Notes").slice(0, 120),
        rawText: extracted.slice(0, 500000),

        // ✅ persist PDF info so DELETE can remove from storage
        objectPath,
        fileName: fileName || null,

        // ✅ subject grouping
        studySubjectId,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      materialId: material.id,
      extractedChars: extracted.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}