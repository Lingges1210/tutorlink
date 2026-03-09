// src/app/study/hub/upload/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Wand2, AlertCircle, FileUp,
  Plus, ChevronDown, FileText, Type, GraduationCap,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

type StudySubj = { id: string; name: string; materialCount?: number };

export default function StudyUpload() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<StudySubj[]>([]);
  const [studySubjectId, setStudySubjectId] = useState<string>("");
  const [newSubject, setNewSubject] = useState("");
  const [subjectBusy, setSubjectBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function loadSubjects() {
    try {
      const r = await fetch("/api/study/study-subjects", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.ok) setSubjects(d.subjects ?? []);
    } catch {}
  }

  async function createSubject() {
    const name = newSubject.trim();
    if (!name) return;
    setErr(null); setSubjectBusy(true);
    try {
      const r = await fetch("/api/study/study-subjects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "Failed to create subject");
      setNewSubject(""); await loadSubjects();
      const newId = d?.subject?.id;
      if (newId) setStudySubjectId(newId);
    } catch (e: any) { setErr(e?.message || "Failed to create subject"); }
    finally { setSubjectBusy(false); }
  }

  useEffect(() => { loadSubjects(); }, []);

  async function uploadPdf(file: File) {
    setErr(null); setPdfUploading(true);
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
      const up = await supabase.storage.from("study-materials").upload(objectPath, file, { contentType: "application/pdf", upsert: false });
      if (up.error) throw new Error(up.error.message);
      const r = await fetch("/api/study/materials/upload-pdf", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || file.name, objectPath, fileName: file.name, studySubjectId: studySubjectId || null }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "PDF extract failed");
      router.push(`/study/hub/${d.materialId}`);
    } catch (e: any) { setErr(e?.message || "PDF upload failed"); }
    finally { setPdfUploading(false); }
  }

  async function create() {
    setErr(null); setLoading(true);
    const r = await fetch("/api/study/materials", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, rawText, studySubjectId: studySubjectId || null }),
    });
    const d = await r.json().catch(() => null);
    setLoading(false);
    if (!d?.ok) { setErr(d?.error ?? "Failed to save"); return; }
    router.push(`/study/hub/${d.materialId}`);
  }

  const isBusy = loading || pdfUploading;

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") uploadPdf(file);
    else setErr("Only PDF files are supported.");
  }

  const inputCls = "w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3.5 py-2.5 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))/0.20] focus:border-[rgb(var(--primary))/0.4] transition-all disabled:opacity-50";

  return (
    <div className="min-h-screen pt-6 pb-16 bg-[rgb(var(--background))]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <Link href="/study/hub"
            className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors group">
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Study Hub
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-[rgb(var(--fg))]">Add Study Material</h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">Paste notes or upload a text-based PDF to generate a full AI study pack.</p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">

          {/* LEFT: main form */}
          <div className="space-y-4">

            {/* Title card */}
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-sm">
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))]/60">
                <Type className="h-3.5 w-3.5 text-[rgb(var(--muted2))]" />
                <span className="text-xs font-semibold text-[rgb(var(--muted2))]">Title</span>
              </div>
              <div className="p-4 space-y-2">
                <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isBusy}
                  placeholder="e.g., Week 4 — Immunology: Inflammation Pathways"
                  className={inputCls} />
                <p className="text-xs text-[rgb(var(--muted2))]">Include topic + week number for best results.</p>
              </div>
            </div>

            {/* Notes card */}
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))]/60">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-3.5 w-3.5 text-[rgb(var(--muted2))]" />
                  <span className="text-xs font-semibold text-[rgb(var(--muted2))]">Paste notes</span>
                </div>
                {rawText.length > 0 && (
                  <span className="font-mono text-[10px] text-[rgb(var(--muted2))]">{rawText.length.toLocaleString()} chars</span>
                )}
              </div>
              <div className="p-4">
                <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} disabled={isBusy}
                  placeholder="Paste your lecture notes here (minimum ~50 characters)…"
                  className={`${inputCls} h-64 resize-none`} />
              </div>
            </div>

            {/* PDF drop zone */}
            <div
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200
                ${dragOver
                  ? "border-[rgb(var(--primary))/0.5] bg-[rgb(var(--primary))/0.04]"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:border-[rgb(var(--primary))/0.3] hover:bg-[rgb(var(--primary))/0.02]"
                } ${isBusy ? "pointer-events-none opacity-60" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => { if (!isBusy) document.getElementById("pdf-input")?.click(); }}>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] mb-3">
                {pdfUploading
                  ? <div className="h-4 w-4 rounded-full border-2 border-[rgb(var(--primary))] border-t-transparent animate-spin" />
                  : <FileUp className="h-4.5 w-4.5 text-[rgb(var(--muted2))]" style={{ width: 18, height: 18 }} />
                }
              </div>
              <p className="text-sm font-medium text-[rgb(var(--fg))]">
                {pdfUploading ? "Uploading & extracting…" : "Drop PDF here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-[rgb(var(--muted2))]">Text-based PDFs only · Scanned PDFs require OCR first</p>
              <input id="pdf-input" type="file" accept="application/pdf" className="hidden" disabled={isBusy}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(f); e.currentTarget.value = ""; }} />
            </div>

            {err && (
              <div className="rounded-xl border border-red-400/25 bg-red-50 dark:bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />{err}
              </div>
            )}
          </div>

          {/* RIGHT: sidebar */}
          <div className="space-y-4">

            {/* Subject picker */}
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))]/60">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="h-3.5 w-3.5 text-[rgb(var(--muted2))]" />
                  <span className="text-xs font-semibold text-[rgb(var(--muted2))]">Subject</span>
                </div>
                <span className="text-[10px] border border-[rgb(var(--border))] rounded-full px-2 py-0.5 text-[rgb(var(--muted2))]">optional</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="relative">
                  <select value={studySubjectId} onChange={(e) => setStudySubjectId(e.target.value)}
                    disabled={isBusy}
                    className="w-full h-9 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] pl-3 pr-8 text-sm text-[rgb(var(--fg))] appearance-none focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))/0.20] focus:border-[rgb(var(--primary))/0.4] transition-all disabled:opacity-50">
                    <option value="">No subject</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgb(var(--muted2))] pointer-events-none" />
                </div>

                <div className="pt-1 border-t border-[rgb(var(--border))]">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))] font-mono mb-2">New subject</p>
                  <div className="flex gap-2">
                    <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") createSubject(); }}
                      placeholder="e.g., CPT112" disabled={subjectBusy || isBusy}
                      className="flex-1 min-w-0 h-9 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))/0.20] focus:border-[rgb(var(--primary))/0.4] transition-all disabled:opacity-50" />
                    <button type="button" onClick={createSubject}
                      disabled={subjectBusy || !newSubject.trim() || isBusy}
                      className="h-9 w-9 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] inline-flex items-center justify-center text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] hover:border-[rgb(var(--primary))/0.3] transition-all disabled:opacity-40">
                      {subjectBusy
                        ? <div className="h-3 w-3 rounded-full border border-[rgb(var(--primary))] border-t-transparent animate-spin" />
                        : <Plus className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))] font-mono mb-3">Tips</p>
              <ul className="space-y-2.5">
                {[
                  "Include headings and structure for better flashcards",
                  "Longer notes → richer quiz questions",
                  "PDFs work best when exported from Word or Slides",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[rgb(var(--muted))]">
                    <span className="font-mono shrink-0 text-[rgb(var(--primary))] mt-0.5 opacity-70">0{i + 1}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button onClick={create} disabled={isBusy}
                className="w-full h-10 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,rgb(139,92,246),rgb(217,70,239))", boxShadow: "0 4px 14px rgba(139,92,246,0.30)" }}>
                <Wand2 className={`h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
                {loading ? "Saving…" : "Save Material"}
              </button>
              <Link href="/study/hub"
                className="w-full h-9 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-sm font-medium text-[rgb(var(--muted))] inline-flex items-center justify-center hover:text-[rgb(var(--fg))] transition-colors">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}