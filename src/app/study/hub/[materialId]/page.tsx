//src/app/study/hub/[materialId]/page.tsx
"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Sparkles, RefreshCcw, Wand2,
  AlertCircle, BookMarked, Zap, Hash,
} from "lucide-react";
import { StudyBackground } from "@/components/FloatingParticles";

export default function MaterialPage({ params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = use(params);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState<string>("Material");
  const [err, setErr] = useState<string | null>(null);
  const [quizCount, setQuizCount] = useState<number>(20);
  const quizChoices = useMemo(() => [20, 30, 40, 50], []);

  async function load() {
    setErr(null); setLoading(true);
    try {
      const r = await fetch("/api/study/materials", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to load");
      const m = (d?.materials ?? []).find((x: any) => x.id === materialId);
      setTitle(m?.title ?? "Material");
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

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <StudyBackground />

      <div className="relative z-10 pt-6 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-4">

          {/* Back */}
          <Link href="/study/hub"
            className="inline-flex items-center gap-1.5 text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors group">
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Study Hub
          </Link>

          {/* Main card */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] dark:bg-[rgb(var(--card)/0.5)] backdrop-blur-sm overflow-hidden shadow-sm">
            <div className="p-6 sm:p-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--primary))/0.25] bg-[rgb(var(--primary))/0.08] px-3 py-1 text-xs text-[rgb(var(--primary))] mb-4 font-medium">
                <Sparkles className="h-3 w-3" />
                AI Study Pack Generator
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-[rgb(var(--fg))] leading-tight">
                {loading
                  ? <span className="inline-block h-7 w-64 animate-pulse rounded-lg bg-[rgb(var(--card2))]" />
                  : title
                }
              </h1>

              <p className="mt-2 text-sm text-[rgb(var(--muted))] max-w-lg">
                AI will generate a summary, flashcards, and a timed quiz — all from your uploaded notes.
              </p>

              <div className="mt-6 pt-5 border-t border-[rgb(var(--border))]">
                <div className="flex flex-wrap items-end gap-5">
                  {/* Quiz count */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))] font-mono mb-2">
                      Quiz questions
                    </p>
                    <div className="flex items-center gap-2">
                      {quizChoices.map((n) => {
                        const active = quizCount === n;
                        return (
                          <button key={n} type="button" onClick={() => setQuizCount(n)}
                            disabled={loading || generating}
                            className={`h-9 w-12 rounded-xl border text-sm font-semibold font-mono transition-all disabled:opacity-40
                              ${active
                                ? "border-[rgb(var(--primary))/0.5] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
                                : "border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.8)] text-[rgb(var(--muted))] hover:border-[rgb(var(--primary))/0.3] hover:text-[rgb(var(--fg))]"
                              }`}>
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-auto">
                    <button type="button" onClick={load} disabled={loading || generating}
                      className="h-9 w-9 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.8)] inline-flex items-center justify-center text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] transition-colors disabled:opacity-40">
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

          {/* What you get row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Zap className="h-4 w-4" />, label: "Summary", desc: "Concise overview of key ideas" },
              { icon: <BookMarked className="h-4 w-4" />, label: "Flashcards", desc: "Q&A cards for spaced repetition" },
              { icon: <Hash className="h-4 w-4" />, label: `${quizCount} Questions`, desc: "Multiple choice with explanations" },
            ].map((item) => (
              <div key={item.label}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] dark:bg-[rgb(var(--card)/0.5)] backdrop-blur-sm p-4 shadow-sm">
                <div className="flex items-center gap-2 text-[rgb(var(--primary))] mb-1.5">
                  {item.icon}
                  <span className="text-xs font-semibold font-mono">{item.label}</span>
                </div>
                <p className="text-xs text-[rgb(var(--muted))]">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Add another */}
          <div>
            <Link href="/study/hub/upload"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] dark:bg-[rgb(var(--card)/0.5)] backdrop-blur-sm text-xs font-medium text-[rgb(var(--fg))] hover:border-[rgb(var(--primary))/0.3] transition-colors shadow-sm">
              <BookMarked className="h-3.5 w-3.5" />
              Add another material
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}