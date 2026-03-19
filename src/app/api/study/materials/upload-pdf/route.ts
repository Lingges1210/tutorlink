// src/app/api/study/materials/upload-pdf/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { createClient } from "@supabase/supabase-js";

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

async function extractTextWithPdfJs(buf: Buffer): Promise<{ text: string; pages: number }> {
  // ✅ Dynamically import the legacy build
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // ✅ Disable the worker entirely for Node.js — setting a file URL causes hangs
  pdfjsLib.GlobalWorkerOptions.workerSrc = false;

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buf),
    // ✅ Disable font loading — not needed for text extraction
    disableFontFace: true,
    // ✅ Suppress noisy console warnings from pdfjs
    verbosity: 0,
    // ✅ Prevent any external fetch attempts inside Node.js
    isEvalSupported: false,
    useSystemFonts: false,
  });

  const pdfDocument = await loadingTask.promise;
  const numPages: number = pdfDocument.numPages;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText: string = (textContent.items ?? [])
      .filter((item: any) => typeof item.str === "string" && item.str.length > 0)
      .map((item: any) => item.str)
      .join(" ");

    pageTexts.push(pageText);

    // ✅ Release page resources to avoid memory leaks on large PDFs
    page.cleanup();
  }

  // ✅ Fully destroy the document after extraction
  await pdfDocument.destroy();

  return {
    text: pageTexts.join("\n").trim(),
    pages: numPages,
  };
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

    // ✅ Verify the user is authenticated
    const supa = await supabaseServerComponent();
    const { data: authData, error: authErr } = await supa.auth.getUser();
    const authUid = authData?.user?.id;

    if (authErr || !authUid) {
      return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
    }

    // ✅ Ensure the objectPath folder matches the authenticated user's UID
    if (!objectPath.startsWith(`${authUid}/`)) {
      return NextResponse.json({ ok: false, error: "Invalid objectPath" }, { status: 403 });
    }

    // ✅ Validate that the subject belongs to this user (if provided)
    if (studySubjectId) {
      const ok = await prisma.studySubject.findFirst({
        where: { id: studySubjectId, userId: me.id },
        select: { id: true },
      });
      if (!ok) {
        return NextResponse.json({ ok: false, error: "Invalid subject" }, { status: 400 });
      }
    }

    // ✅ Download the PDF from Supabase Storage using the service role
    const admin = getAdminSupabase();
    const { data, error } = await admin.storage.from("study-materials").download(objectPath);

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Download failed" },
        { status: 500 }
      );
    }

    const buf = Buffer.from(await data.arrayBuffer());

    // ✅ Guard: make sure something was actually downloaded
    if (!buf || buf.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Downloaded file is empty. Check the storage path." },
        { status: 500 }
      );
    }

    let extracted = "";
    let pages = 0;

    try {
      const res = await extractTextWithPdfJs(buf);
      extracted = res.text;
      pages = res.pages;
    } catch (e: any) {
      return NextResponse.json(
        {
          ok: false,
          error: "PDF parse failed",
          details: e?.message ?? String(e),
        },
        { status: 500 }
      );
    }

    if (extracted.length < 50) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Extracted text too short. The PDF may be scanned (image-based) and requires OCR.",
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

        // ✅ Persist PDF storage info so DELETE can clean up the file
        objectPath,
        fileName: fileName || null,

        // ✅ Subject grouping
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