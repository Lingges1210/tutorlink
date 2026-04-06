//src/app/study/hub/[materialId]/page.tsx
"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Sparkles, RefreshCcw, Wand2,
  AlertCircle, BookMarked, Zap, Hash,
  FileText, Download, ExternalLink, AlignLeft,
} from "lucide-react";
import { StudyBackground } from "@/components/FloatingParticles";

/* ─── Types ─────────────────────────────────────────────── */
type Material = {
  id: string;
  title: string;
  content?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ─── Generating overlay ─────────────────────────────────── */
const STEPS = [
  { label: "Reading your material",   title: "Reading your material…",   sub: "Analysing structure and key topics",        pct: 15 },
  { label: "Generating summary",      title: "Generating summary…",      sub: "Distilling the most important ideas",       pct: 40 },
  { label: "Building flashcards",     title: "Building flashcards…",     sub: "Creating Q&A pairs for active recall",      pct: 68 },
  { label: "Creating quiz questions", title: "Creating quiz questions…", sub: "Writing multiple choice with explanations", pct: 90 },
];
const STEP_TIMINGS = [0, 8000, 18000, 32000];

function GeneratingOverlay() {
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    const timers = STEP_TIMINGS.map((ms, i) => setTimeout(() => setStepIdx(i), ms));
    return () => timers.forEach(clearTimeout);
  }, []);
  const step = STEPS[stepIdx];
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}>
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-7 w-80 text-center shadow-xl">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(139,92,246,0.08)", border: "1.5px solid rgba(139,92,246,0.3)" }}>
          <div className="h-5 w-5 rounded-full border-2 border-t-violet-400 border-violet-400/20 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-[rgb(var(--fg))] mb-1">{step.title}</p>
        <p className="text-xs text-[rgb(var(--muted))] mb-5">{step.sub}</p>
        <ul className="space-y-2.5 text-left mb-5">
          {STEPS.map((s, i) => {
            const done = i < stepIdx; const active = i === stepIdx;
            return (
              <li key={i} className="flex items-center gap-2.5 text-xs">
                <span className={`h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold border transition-all duration-300
                  ${done   ? "border-violet-400/60 bg-violet-500/10 text-violet-400"
                  : active ? "border-violet-400 bg-violet-500/12 text-violet-400 animate-pulse"
                           : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted2))]"}`}>
                  {done ? "✓" : i + 1}
                </span>
                <span className={`transition-colors duration-300 ${active ? "text-[rgb(var(--fg))] font-medium" : "text-[rgb(var(--muted))]"}`}>{s.label}</span>
              </li>
            );
          })}
        </ul>
        <div className="h-1 w-full rounded-full overflow-hidden bg-[rgb(var(--card2))]">
          <div className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${step.pct}%`, background: "linear-gradient(90deg, rgb(139,92,246), rgb(217,70,239))" }} />
        </div>
      </div>
    </div>
  );
}

/* ─── PDF blob viewer ────────────────────────────────────── */
function PdfViewer({ url, title }: { url: string; title: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    setLoading(true); setFetchErr(false); setBlobUrl(null);
    fetch(url)
      .then(r => { if (!r.ok) throw new Error("fetch failed"); return r.blob(); })
      .then(blob => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setBlobUrl(objectUrl);
      })
      .catch(() => setFetchErr(true))
      .finally(() => setLoading(false));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="h-10 w-10 rounded-full border-2 border-violet-400/20 border-t-violet-400 animate-spin" />
        <p className="text-sm text-[rgb(var(--muted))]">Loading PDF…</p>
      </div>
    );
  }

  if (fetchErr || !blobUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-6">
        <div className="h-14 w-14 rounded-2xl flex flex-col items-center justify-center gap-1"
          style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)" }}>
          <FileText className="h-6 w-6 text-red-500" />
          <span className="text-[7px] font-black text-red-500 tracking-widest">PDF</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--fg))] mb-1">Can&apos;t load PDF inline</p>
          <p className="text-xs text-[rgb(var(--muted))] max-w-xs leading-relaxed">
            The file couldn&apos;t be fetched. Open it directly instead.
          </p>
        </div>
        <div className="flex gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg,rgb(139,92,246),rgb(217,70,239))" }}>
            <ExternalLink className="h-3 w-3" /> Open PDF
          </a>
          <a href={url} download={title}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))]">
            <Download className="h-3 w-3" /> Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
      title={title}
      className="w-full rounded-xl border border-[rgb(var(--border))]"
      style={{ height: "70vh", display: "block" }}
    />
  );
}

/* ─── Text content viewer ────────────────────────────────── */
function TextViewer({ content }: { content: string }) {
  const words = content.trim().split(/\s+/).length;
  const readMins = Math.max(1, Math.round(words / 200));
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-sm">
      <div className="flex items-center gap-6 px-5 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
        <div className="flex items-center gap-1.5 text-[rgb(var(--muted2))]">
          <AlignLeft className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold font-mono">{words.toLocaleString()} words</span>
        </div>
        <span className="text-xs text-[rgb(var(--muted2))]">~{readMins} min read</span>
        <span className="text-xs text-[rgb(var(--muted2))]">{content.length.toLocaleString()} chars</span>
      </div>
      <div className="p-6 max-h-[60vh] overflow-y-auto">
        <pre className="text-sm text-[rgb(var(--fg))] leading-relaxed whitespace-pre-wrap font-mono">
          {content}
        </pre>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function MaterialPage({ params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = use(params);

  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [material, setMaterial]     = useState<Material | null>(null);
  const [err, setErr]               = useState<string | null>(null);
  const [quizCount, setQuizCount]   = useState<number>(20);
  const [tab, setTab]               = useState<"content" | "generate">("content");
  const quizChoices = useMemo(() => [20, 30, 40, 50], []);

  /* detect PDF */
  const isPdf = useMemo(() => {
    if (!material) return false;
    const ext = (material.fileUrl?.split("?")[0] ?? "").split(".").pop()?.toLowerCase() ?? "";
    return (
      ext === "pdf" ||
      material.fileType === "application/pdf" ||
      (material.fileUrl?.split("?")[0].toLowerCase().endsWith(".pdf") ?? false)
    );
  }, [material]);

  async function load() {
    setErr(null); setLoading(true);
    try {
      // Try single-material endpoint first, fall back to list
      const r = await fetch(`/api/study/materials/${materialId}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json().catch(() => null);
        // API may return { material: {...} } or the object directly
        setMaterial(d?.material ?? d ?? null);
      } else {
        const r2 = await fetch("/api/study/materials", { cache: "no-store" });
        const d2 = await r2.json().catch(() => null);
        const m = (d2?.materials ?? []).find((x: Material) => x.id === materialId);
        if (!m) throw new Error("Material not found");
        setMaterial(m);
      }
    } catch (e: any) { setErr(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  async function generate() {
    setErr(null); setGenerating(true);
    try {
      const r = await fetch(`/api/study/materials/${materialId}/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizCount }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "Generate failed");
      window.location.href = `/study/hub/quiz/${d.packId}`;
    } catch (e: any) { setErr(e?.message || "Generate failed"); }
    finally { setGenerating(false); }
  }

  useEffect(() => { load(); }, [materialId]); // eslint-disable-line

  const title = material?.title ?? "Material";

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--fg))]">
      <StudyBackground />

      <div className="relative z-10 pt-6 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-4">

          {/* Back + title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/study/hub"
              className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors group shrink-0">
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Study Hub
            </Link>
            <span className="text-[rgb(var(--border))]">·</span>
            {loading
              ? <span className="inline-block h-4 w-40 animate-pulse rounded-md bg-[rgb(var(--card2))]" />
              : <span className="text-sm font-semibold text-[rgb(var(--fg))] truncate">{title}</span>
            }
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-1 w-fit">
            {([
              { key: "content",  label: isPdf ? "📄 PDF Viewer" : "📝 Content" },
              { key: "generate", label: "✨ Generate Pack" },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.key
                    ? "bg-[rgb(var(--card))] text-[rgb(var(--fg))] shadow-sm border border-[rgb(var(--border))]"
                    : "text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── CONTENT TAB ── */}
          {tab === "content" && (
            <div className="space-y-4">
              {loading ? (
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-12 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full border-2 border-violet-400/20 border-t-violet-400 animate-spin" />
                </div>
              ) : isPdf && material?.fileUrl ? (
                /* PDF viewer */
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
                    <div className="flex items-center gap-2 text-[rgb(var(--muted2))]">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold truncate max-w-xs">{title}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <a href={material.fileUrl} download={title}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors">
                        <Download className="h-3 w-3" /> Download
                      </a>
                      <a href={material.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors">
                        <ExternalLink className="h-3 w-3" /> Open in tab
                      </a>
                    </div>
                  </div>
                  <div className="p-4">
                    <PdfViewer url={material.fileUrl} title={title} />
                  </div>
                </div>
              ) : material?.content ? (
                /* Text viewer */
                <TextViewer content={material.content} />
              ) : (
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-12 text-center">
                  <p className="text-sm text-[rgb(var(--muted))]">No content available for this material.</p>
                </div>
              )}

              {/* Shortcut to generate */}
              <button onClick={() => setTab("generate")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--primary))] hover:opacity-70 transition-opacity">
                <Sparkles className="h-3 w-3" />
                Generate study pack from this material →
              </button>
            </div>
          )}

          {/* ── GENERATE TAB ── */}
          {tab === "generate" && (
            <div className="space-y-4">

              {/* Main generate card */}
              <div className="relative rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden shadow-sm">
                {generating && <GeneratingOverlay />}
                <div className="p-6 sm:p-8">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--primary))/0.25] bg-[rgb(var(--primary))/0.08] px-3 py-1 text-xs text-[rgb(var(--primary))] mb-4 font-medium">
                    <Sparkles className="h-3 w-3" />
                    AI Study Pack Generator
                  </div>

                  <h2 className="text-xl font-bold text-[rgb(var(--fg))] leading-tight mb-2">
                    {loading
                      ? <span className="inline-block h-6 w-56 animate-pulse rounded-lg bg-[rgb(var(--card2))]" />
                      : title
                    }
                  </h2>
                  <p className="text-sm text-[rgb(var(--muted))] max-w-lg">
                    AI will generate a summary, flashcards, and a timed quiz — all from your uploaded notes.
                  </p>

                  <div className="mt-6 pt-5 border-t border-[rgb(var(--border))]">
                    <div className="flex flex-wrap items-end gap-5">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))] font-mono mb-2">
                          Quiz questions
                        </p>
                        <div className="flex items-center gap-2">
                          {quizChoices.map(n => {
                            const active = quizCount === n;
                            return (
                              <button key={n} type="button" onClick={() => setQuizCount(n)}
                                disabled={loading || generating}
                                className={`h-9 w-12 rounded-xl border text-sm font-semibold font-mono transition-all disabled:opacity-40
                                  ${active
                                    ? "border-[rgb(var(--primary))/0.5] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
                                    : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:border-[rgb(var(--primary))/0.3] hover:text-[rgb(var(--fg))]"
                                  }`}>
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <button type="button" onClick={load} disabled={loading || generating}
                          className="h-9 w-9 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] inline-flex items-center justify-center text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] transition-colors disabled:opacity-40">
                          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <button type="button" onClick={generate} disabled={loading || generating}
                          className="h-10 px-5 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90"
                          style={{ background: "linear-gradient(135deg,rgb(139,92,246),rgb(217,70,239))", boxShadow: "0 4px 14px rgba(139,92,246,0.35)" }}>
                          <Wand2 className={`h-4 w-4 ${generating ? "animate-pulse" : ""}`} />
                          {generating ? "Generating…" : `Generate · ${quizCount} Qs`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {err && (
                    <div className="mt-4 rounded-xl border border-red-400/25 bg-red-50 dark:bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />{err}
                    </div>
                  )}
                </div>
              </div>

              {/* What you get */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: <Zap className="h-4 w-4" />,      label: "Summary",             desc: "Concise overview of key ideas" },
                  { icon: <BookMarked className="h-4 w-4" />, label: "Flashcards",          desc: "Q&A cards for spaced repetition" },
                  { icon: <Hash className="h-4 w-4" />,      label: `${quizCount} Questions`, desc: "Multiple choice with explanations" },
                ].map(item => (
                  <div key={item.label}
                    className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-[rgb(var(--primary))] mb-1.5">
                      {item.icon}
                      <span className="text-xs font-semibold font-mono">{item.label}</span>
                    </div>
                    <p className="text-xs text-[rgb(var(--muted))]">{item.desc}</p>
                  </div>
                ))}
              </div>

              <Link href="/study/hub/upload"
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-xs font-medium text-[rgb(var(--fg))] hover:border-[rgb(var(--primary))/0.3] transition-colors shadow-sm">
                <BookMarked className="h-3.5 w-3.5" />
                Add another material
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}