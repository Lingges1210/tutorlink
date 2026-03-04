"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Sparkles, RefreshCcw, Wand2, FileText, AlertCircle } from "lucide-react";

function pill(active: boolean) {
  return `inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition
    ${
      active
        ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
        : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--card))]"
    }`;
}

export default function MaterialPage({ params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = use(params);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState<string>("Material");
  const [err, setErr] = useState<string | null>(null);

  // ✅ Option A: user picks how many questions to generate (server generates exact count)
  const [quizCount, setQuizCount] = useState<number>(20);
  const quizChoices = useMemo(() => [20, 30, 40, 50], []);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/study/materials", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Failed to load");
      const m = (d?.materials ?? []).find((x: any) => x.id === materialId);
      setTitle(m?.title ?? "Material");
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    setErr(null);
    setGenerating(true);
    try {
      const r = await fetch(`/api/study/materials/${materialId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizCount }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "Generate failed");
      window.location.href = `/study/hub/quiz/${d.packId}`;
    } catch (e: any) {
      setErr(e?.message || "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    load();
  }, [materialId]);

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
              AI Study Pack Generator
            </div>

            <h1 className="mt-3 text-2xl font-semibold text-[rgb(var(--fg))]">
              {loading ? "Loading…" : title}
            </h1>

            <p className="text-sm text-[rgb(var(--muted))] max-w-2xl">
              Generate summary, flashcards, and a <span className="font-semibold text-[rgb(var(--fg))]">{quizCount}-question</span>{" "}
              quiz from your notes.
            </p>

            {/* ✅ Quiz count picker */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="text-xs text-[rgb(var(--muted2))] mr-1">Quiz questions</div>

              {quizChoices.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuizCount(n)}
                  disabled={loading || generating}
                  className={pill(quizCount === n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.35]"
              disabled={loading || generating}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={generate}
              disabled={loading || generating}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] disabled:opacity-50 hover:opacity-95"
            >
              <Wand2 className="h-4 w-4" />
              {generating ? "Generating…" : `Generate (${quizCount} Qs)`}
            </button>
          </div>
        </header>

        {/* Body card */}
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4">
            <div className="text-sm font-semibold text-[rgb(var(--fg))] flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Material Actions
            </div>
          </div>

          <div className="mt-4">
            {err && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {err}
              </div>
            )}

            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-5">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                Ready to test yourself?
              </div>
              <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                This will create a study pack and send you straight into a{" "}
                <span className="font-semibold text-[rgb(var(--fg))]">{quizCount}-question</span> quiz.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={generate}
                  disabled={loading || generating}
                  className="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 inline-flex items-center gap-2 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] disabled:opacity-50 hover:opacity-95"
                >
                  <Wand2 className="h-4 w-4" />
                  {generating ? "Generating…" : `Generate & Start (${quizCount} Qs)`}
                </button>

                <Link
                  href="/study/hub/upload"
                  className="h-10 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 inline-flex items-center text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.20]"
                >
                  Add Another Material
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}