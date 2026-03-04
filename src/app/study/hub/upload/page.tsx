// src/app/study/hub/upload/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, Wand2, AlertCircle, FileUp, Plus } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type StudySubj = { id: string; name: string; materialCount?: number };

export default function StudyUpload() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");

  const [loading, setLoading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ Subject-wise materials (StudySubject)
  const [subjects, setSubjects] = useState<StudySubj[]>([]);
  const [studySubjectId, setStudySubjectId] = useState<string>("");
  const [newSubject, setNewSubject] = useState("");
  const [subjectBusy, setSubjectBusy] = useState(false);

  async function loadSubjects() {
    try {
      const r = await fetch("/api/study/study-subjects", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.ok) setSubjects(d.subjects ?? []);
    } catch {
      // optional UX
    }
  }

  async function createSubject() {
    const name = newSubject.trim();
    if (!name) return;

    setErr(null);
    setSubjectBusy(true);
    try {
      const r = await fetch("/api/study/study-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "Failed to create subject");

      setNewSubject("");
      await loadSubjects();

      const newId = d?.subject?.id;
      if (newId) setStudySubjectId(newId);
    } catch (e: any) {
      setErr(e?.message || "Failed to create subject");
    } finally {
      setSubjectBusy(false);
    }
  }

  useEffect(() => {
    loadSubjects();
  }, []);

  async function uploadPdf(file: File) {
    setErr(null);
    setPdfUploading(true);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (authErr || !uid) throw new Error("Not logged in");

      const safeName = file.name.replace(/[^\w.\-() ]+/g, "_");
      const objectPath = `${uid}/${Date.now()}-${safeName}`;

      const up = await supabase.storage
        .from("study-materials")
        .upload(objectPath, file, { contentType: "application/pdf", upsert: false });

      if (up.error) throw new Error(up.error.message);

      const r = await fetch("/api/study/materials/upload-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || file.name,
          objectPath,
          fileName: file.name,
          studySubjectId: studySubjectId || null,
        }),
      });

      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "PDF extract failed");

      router.push(`/study/hub/${d.materialId}`);
    } catch (e: any) {
      setErr(e?.message || "PDF upload failed");
    } finally {
      setPdfUploading(false);
    }
  }

  async function create() {
    setErr(null);
    setLoading(true);

    const r = await fetch("/api/study/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        rawText,
        studySubjectId: studySubjectId || null,
      }),
    });

    const d = await r.json().catch(() => null);
    setLoading(false);

    if (!d?.ok) {
      setErr(d?.error ?? "Failed to save");
      return;
    }

    router.push(`/study/hub/${d.materialId}`);
  }

  return (
    <div className="pt-10 pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/study/hub"
              className="inline-flex items-center gap-2 text-sm text-[rgb(var(--muted))] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Study Hub
            </Link>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs text-[rgb(var(--muted2))]">
              <Sparkles className="h-4 w-4" />
              Notes → Study Pack → Quiz
            </div>

            <h1 className="mt-3 text-2xl font-semibold text-[rgb(var(--fg))]">
              Add Study Material
            </h1>
            <p className="text-sm text-[rgb(var(--muted))] max-w-2xl">
              Paste notes OR upload a text-based PDF. (Scanned PDFs need OCR later.)
            </p>
          </div>
        </header>

        {/* Form Card */}
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
          <div className="border-b border-[rgb(var(--border))] pb-4">
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              Material Details
            </div>
            <div className="text-xs text-[rgb(var(--muted2))] mt-1">
              Tip: include topic name + week number in title.
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* Title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g., Week 4 Immunology — Inflammation)"
              className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))/0.35]"
            />

            {/* Subject Selector */}
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                    Study Subject
                  </div>
                  <p className="mt-1 text-xs text-[rgb(var(--muted2))]">
                    Optional, but recommended (keeps materials organized).
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={studySubjectId}
                  onChange={(e) => setStudySubjectId(e.target.value)}
                  className="h-10 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm text-[rgb(var(--fg))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))/0.35]"
                  disabled={loading || pdfUploading}
                >
                  <option value="">No subject / All</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="New subject (e.g., CPT112)"
                    className="h-10 w-64 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))/0.35]"
                    disabled={subjectBusy || loading || pdfUploading}
                  />
                  <button
                    type="button"
                    onClick={createSubject}
                    disabled={subjectBusy || !newSubject.trim() || loading || pdfUploading}
                    className="h-10 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 inline-flex items-center gap-2 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.20] disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {subjectBusy ? "Creating…" : "Add"}
                  </button>
                </div>
              </div>
            </div>

            {/* PDF Upload */}
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                    Upload PDF
                  </div>
                  <p className="mt-1 text-xs text-[rgb(var(--muted2))]">
                    Best for text PDFs (exported slides). Scanned PDFs will fail (OCR later).
                  </p>
                </div>

                <div className="text-xs text-[rgb(var(--muted2))]">
                  {pdfUploading ? "Working…" : ""}
                </div>
              </div>

              <label className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.20] cursor-pointer">
                <FileUp className="h-4 w-4" />
                {pdfUploading ? "Uploading & extracting…" : "Choose PDF"}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={pdfUploading || loading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadPdf(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            {/* Notes textarea */}
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your lecture notes here (min ~50 chars)..."
              className="w-full h-80 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))/0.35]"
            />

            {err && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {err}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Link
                href="/study/hub"
                className="h-10 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 inline-flex items-center text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.20]"
              >
                Cancel
              </Link>

              <button
                onClick={create}
                disabled={loading || pdfUploading}
                className="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 inline-flex items-center gap-2 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] disabled:opacity-50 hover:opacity-95"
              >
                <Wand2 className="h-4 w-4" />
                {loading ? "Saving..." : "Save Material"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}