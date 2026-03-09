//src/app/study/hub/quiz/[packId]/page.tsx

"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  HelpCircle,
  Layers,
  BookOpenCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCcw,
  CornerDownRight,
  Trophy,
  Target,
} from "lucide-react";

type Q = {
  q: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic?: string;
};

type Flashcard = { q: string; a: string };
type Tab = "QUIZ" | "FLASHCARDS" | "SUMMARY";

const difficultyColor: Record<string, string> = {
  easy: "text-emerald-400 border-emerald-400/30 bg-emerald-500/10",
  medium: "text-amber-400 border-amber-400/30 bg-amber-500/10",
  hard: "text-red-400 border-red-400/30 bg-red-500/10",
};

function tabBtn(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-200
    ${
      active
        ? "border-violet-400/60 bg-violet-500/15 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.20)]"
        : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--card))] hover:border-violet-400/25"
    }`;
}

export default function QuizPage({ params }: { params: Promise<{ packId: string }> }) {
  const { packId } = use(params);

  const [tab, setTab] = useState<Tab>("QUIZ");
  const [pack, setPack] = useState<any>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showReview, setShowReview] = useState(true);
  const questionRefs = useRef<Array<HTMLDivElement | null>>([]);

  async function loadPack() {
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`/api/study/packs/${packId}`, { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Pack not found");
      setPack(d.pack ?? null);
      setAnswers(new Array((d.pack?.quiz ?? []).length).fill(-1));
      setResult(null);
      setShowReview(true);
    } catch (e: any) {
      setErr(e?.message || "Failed to load pack");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    const r = await fetch(`/api/study/packs/${packId}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const d = await r.json().catch(() => null);
    setResult(d);
    setTab("QUIZ");
    setShowReview(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function retake() {
    setResult(null);
    setAnswers(new Array(quiz.length).fill(-1));
    setShowReview(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpToQuestion(i: number) {
    const el = questionRefs.current[i];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    loadPack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packId]);

  const quiz: Q[] = useMemo(() => pack?.quiz ?? [], [pack]);
  const flashcards: Flashcard[] = useMemo(() => pack?.flashcards ?? [], [pack]);
  const concepts: string[] = useMemo(() => pack?.concepts ?? [], [pack]);

  const isSubmitted = !!result?.ok;

  const mistakes = useMemo(() => {
    if (!result?.ok) return [];
    return quiz
      .map((q, i) => {
        const picked = answers[i];
        const correct = q.answerIndex;
        const isAnswered = picked !== -1;
        const isCorrect = isAnswered && picked === correct;
        return {
          i, q, picked, correct, isAnswered, isCorrect,
          pickedText: isAnswered ? q.options[picked] : null,
          correctText: q.options[correct],
        };
      })
      .filter((x) => !x.isCorrect);
  }, [result?.ok, quiz, answers]);

  const answeredCount = useMemo(() => answers.filter((x) => x !== -1).length, [answers]);
  const scorePercent = isSubmitted ? Math.round((result.score / result.total) * 100) : 0;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 flex flex-col items-center gap-3">
        <div className="h-7 w-7 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
        <div className="text-xs text-[rgb(var(--muted))]">Loading study pack…</div>
      </div>
    );
  }

  if (err || !pack) {
    return (
      <div className="pt-8 pb-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-3">
          <div className="rounded-xl border border-red-400/30 bg-red-500/8 p-4 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {err || "Pack not found"}
          </div>
          <Link href="/study/hub" className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors group">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to Study Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-16 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-5">

        {/* Header — compact single row */}
        <header>
          <Link
            href="/study/hub"
            className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to Study Hub
          </Link>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--fg))]">Study Pack</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/8 px-2.5 py-1 text-[10px] font-semibold text-violet-400">
                  <Sparkles className="h-3 w-3" />
                  Active Recall
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[rgb(var(--muted))]">
                Quiz yourself, drill flashcards, and skim the summary.
              </p>
            </div>

            {/* Score / Progress badge — inline with header */}
            <div
              className="shrink-0 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2.5 text-center min-w-[90px]"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                {isSubmitted
                  ? <Trophy className="h-3 w-3 text-amber-400" />
                  : <Target className="h-3 w-3 text-violet-400" />
                }
                <span className="text-[10px] text-[rgb(var(--muted2))] font-medium">
                  {isSubmitted ? "Score" : "Progress"}
                </span>
              </div>
              <div className="text-lg font-bold leading-none text-[rgb(var(--fg))]">
                {isSubmitted ? result.score : answeredCount}
                <span className="text-[rgb(var(--muted2))] font-normal text-xs">
                  /{isSubmitted ? result.total : quiz.length}
                </span>
              </div>
              {isSubmitted && (
                <div className={`mt-1 text-[10px] font-semibold ${scorePercent >= 80 ? "text-emerald-400" : scorePercent >= 60 ? "text-amber-400" : "text-red-400"}`}>
                  {scorePercent}%
                </div>
              )}
              {!isSubmitted && quiz.length > 0 && (
                <div className="mt-1.5 h-1 w-full rounded-full bg-[rgb(var(--border))] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(answeredCount / quiz.length) * 100}%`,
                      background: "linear-gradient(90deg, rgb(139,92,246), rgb(217,70,239))",
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Retake button when submitted */}
          {isSubmitted && (
            <div className="mt-3">
              <button
                type="button"
                onClick={retake}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 text-xs font-semibold text-[rgb(var(--fg))] hover:border-violet-400/30 transition-all duration-200"
              >
                <RefreshCcw className="h-3 w-3" />
                Retake Quiz
              </button>
            </div>
          )}
        </header>

        {/* Main card */}
        <section
          className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden"
          style={{ boxShadow: "0 16px 40px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.04) inset" }}
        >
          {/* Tabs + actions row */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--border))] px-4 py-3 bg-[rgb(var(--card2))]/40">
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setTab("QUIZ")} className={tabBtn(tab === "QUIZ")}>
                <HelpCircle className="h-3.5 w-3.5" /> Quiz
              </button>
              <button type="button" onClick={() => setTab("FLASHCARDS")} className={tabBtn(tab === "FLASHCARDS")}>
                <BookOpenCheck className="h-3.5 w-3.5" /> Flashcards
              </button>
              <button type="button" onClick={() => setTab("SUMMARY")} className={tabBtn(tab === "SUMMARY")}>
                <Layers className="h-3.5 w-3.5" /> Summary
              </button>
            </div>

            {tab === "QUIZ" && isSubmitted && mistakes.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowReview((v) => !v)}
                  className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[10px] font-semibold text-[rgb(var(--fg))] hover:border-violet-400/30 transition-all duration-200"
                >
                  {showReview ? "Hide Review" : "Show Review"}
                </button>
                <button
                  type="button"
                  onClick={() => jumpToQuestion(mistakes[0].i)}
                  className="rounded-full border border-violet-400/40 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-400 hover:bg-violet-500/15 transition-all duration-200"
                >
                  Jump to 1st mistake
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {/* QUIZ */}
            {tab === "QUIZ" && (
              <div className="space-y-3">
                {/* Mistake Review panel */}
                {isSubmitted && showReview && (
                  <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full w-1 rounded-l-xl"
                      style={{ background: "linear-gradient(180deg, rgb(139,92,246), rgb(217,70,239))" }}
                    />
                    <div className="pl-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-[rgb(var(--fg))]">Mistake Review</div>
                        <div className="mt-0.5 text-xs text-[rgb(var(--muted2))]">
                          Questions you missed — correct answer + explanation.
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/8 px-2.5 py-1 text-xs font-semibold text-red-400">
                        <XCircle className="h-3 w-3" />
                        {mistakes.length} / {quiz.length} wrong
                      </div>
                    </div>

                    {mistakes.length === 0 ? (
                      <div className="mt-3 pl-3 flex items-center gap-2 text-sm text-emerald-400">
                        <CheckCircle className="h-4 w-4" />
                        Perfect score — nothing to review 🎉
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {mistakes.map((m) => (
                          <button
                            key={m.i}
                            type="button"
                            onClick={() => jumpToQuestion(m.i)}
                            className="w-full text-left rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 hover:border-violet-400/30 hover:shadow-[0_2px_12px_rgba(139,92,246,0.10)] transition-all duration-200 group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="font-medium text-xs text-[rgb(var(--fg))] leading-snug">
                                <span className="text-[rgb(var(--muted2))] mr-1">Q{m.i + 1}.</span>
                                {m.q.q}
                              </div>
                              <CornerDownRight className="h-3 w-3 text-[rgb(var(--muted2))] shrink-0 mt-0.5 group-hover:text-violet-400 transition-colors" />
                            </div>

                            <div className="mt-2 grid gap-1 text-xs">
                              <div className="rounded-lg border border-red-400/20 bg-red-500/8 px-2.5 py-1.5">
                                <span className="font-semibold text-red-400">Your answer: </span>
                                <span className="text-red-300">{m.pickedText ?? "Not answered"}</span>
                              </div>
                              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/8 px-2.5 py-1.5">
                                <span className="font-semibold text-emerald-400">Correct: </span>
                                <span className="text-emerald-300">{m.correctText}</span>
                              </div>
                              <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1.5 text-[rgb(var(--muted))]">
                                {m.q.explanation}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Questions */}
                {quiz.map((q, i) => {
                  const picked = answers[i];
                  const correct = q.answerIndex;

                  return (
                    <div
                      key={i}
                      ref={(el) => { questionRefs.current[i] = el; }}
                      className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 scroll-mt-24 transition-all duration-200"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted2))]">
                              {i + 1}
                            </span>
                            <div className="font-medium text-sm text-[rgb(var(--fg))] leading-snug">{q.q}</div>
                          </div>
                          <div className="mt-1.5 ml-7 flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficultyColor[q.difficulty] ?? "text-[rgb(var(--muted2))]"}`}>
                              {q.difficulty}
                            </span>
                            {q.topic && (
                              <span className="text-[10px] text-[rgb(var(--muted2))]">{q.topic}</span>
                            )}
                          </div>
                        </div>

                        {isSubmitted && (
                          <div className="text-xs font-semibold shrink-0">
                            {picked === correct ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/8 px-2 py-0.5 text-emerald-400 text-[10px]">
                                <CheckCircle className="h-3 w-3" /> Correct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-500/8 px-2 py-0.5 text-red-400 text-[10px]">
                                <XCircle className="h-3 w-3" /> Wrong
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 grid gap-1.5 ml-7">
                        {q.options.map((opt, idx) => {
                          const isPicked = picked === idx;
                          const isCorrectOpt = correct === idx;
                          const base = "text-left rounded-lg border px-3 py-2 text-sm transition-all duration-150 w-full";

                          if (!isSubmitted) {
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  const next = [...answers];
                                  next[i] = idx;
                                  setAnswers(next);
                                }}
                                className={`${base} ${
                                  isPicked
                                    ? "border-violet-400/60 bg-violet-500/10 text-[rgb(var(--fg))] shadow-[0_0_0_1px_rgba(139,92,246,0.20)]"
                                    : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:border-violet-400/30 hover:text-[rgb(var(--fg))]"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className={`shrink-0 h-4 w-4 rounded-full border text-[9px] font-bold inline-flex items-center justify-center transition-all ${isPicked ? "border-violet-400 bg-violet-400 text-white" : "border-[rgb(var(--border))]"}`}>
                                    {isPicked ? "✓" : String.fromCharCode(65 + idx)}
                                  </span>
                                  {opt}
                                </span>
                              </button>
                            );
                          }

                          let cls = `${base} border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] cursor-not-allowed`;
                          if (isCorrectOpt) {
                            cls = `${base} border-emerald-400/40 bg-emerald-500/8 text-emerald-300 cursor-not-allowed`;
                          } else if (isPicked && !isCorrectOpt) {
                            cls = `${base} border-red-400/40 bg-red-500/8 text-red-300 cursor-not-allowed`;
                          }

                          return (
                            <button key={idx} type="button" disabled className={cls}>
                              <span className="flex items-center gap-2">
                                <span className={`shrink-0 h-4 w-4 rounded-full border text-[9px] font-bold inline-flex items-center justify-center ${isCorrectOpt ? "border-emerald-400 bg-emerald-400 text-white" : isPicked ? "border-red-400 bg-red-400 text-white" : "border-[rgb(var(--border))]"}`}>
                                  {isCorrectOpt ? "✓" : isPicked ? "✗" : String.fromCharCode(65 + idx)}
                                </span>
                                {opt}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {isSubmitted && (
                        <div className="mt-2.5 ml-7 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))]/60 px-3 py-2 text-xs text-[rgb(var(--muted))] leading-relaxed">
                          <span className="font-semibold text-[rgb(var(--muted2))]">Explanation: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* FLASHCARDS */}
            {tab === "FLASHCARDS" && (
              <FlashcardGrid flashcards={flashcards} />
            )}

            {/* SUMMARY */}
            {tab === "SUMMARY" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full w-1 rounded-l-xl"
                    style={{ background: "linear-gradient(180deg, rgb(139,92,246), rgb(217,70,239))" }}
                  />
                  <div className="pl-3">
                    <div className="text-sm font-semibold text-[rgb(var(--fg))] mb-3">Summary</div>
                    {/* Render summary with paragraph breaks */}
                    <div className="text-sm text-[rgb(var(--muted))] leading-relaxed space-y-2">
                      {(pack.summary as string)
                        .split(/\n+/)
                        .filter(Boolean)
                        .map((para, idx) => (
                          <p key={idx}>{para}</p>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                  <div className="text-sm font-semibold text-[rgb(var(--fg))] mb-2.5">Key Concepts</div>
                  <div className="flex flex-wrap gap-1.5">
                    {concepts.map((c, i) => (
                      <span
                        key={i}
                        className="text-xs border border-[rgb(var(--border))] px-2.5 py-1 rounded-full bg-[rgb(var(--card))] text-[rgb(var(--muted2))] hover:border-violet-400/30 hover:text-[rgb(var(--fg))] transition-all duration-150 cursor-default"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky bottom submit */}
          {tab === "QUIZ" && !isSubmitted && (
            <div className="sticky bottom-0">
              <div
                className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card))]/95 backdrop-blur-sm px-4 py-3"
                style={{ boxShadow: "0 -6px 20px rgba(0,0,0,0.12)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="text-xs text-[rgb(var(--muted))]">
                      {answeredCount} / {quiz.length} answered
                    </div>
                    <div className="h-1.5 w-24 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: quiz.length ? `${(answeredCount / quiz.length) * 100}%` : "0%",
                          background: "linear-gradient(90deg, rgb(139,92,246), rgb(217,70,239))",
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={submit}
                    disabled={answeredCount === 0}
                    className="relative h-9 rounded-xl px-5 inline-flex items-center gap-2 text-xs font-semibold text-white disabled:opacity-40 overflow-hidden group"
                    style={{
                      background: "linear-gradient(135deg, rgb(139,92,246), rgb(217,70,239))",
                      boxShadow: "0 6px 16px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                    }}
                  >
                    <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200 rounded-xl" />
                    <span className="relative z-10">Submit Quiz</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FlashcardGrid({ flashcards }: { flashcards: Flashcard[] }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const progress = flashcards.length > 0 ? Math.round((revealed.size / flashcards.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[rgb(var(--muted))]">
            {revealed.size === flashcards.length && flashcards.length > 0
              ? "🎉 All cards reviewed!"
              : `${revealed.size} of ${flashcards.length} revealed`}
          </span>
          {revealed.size > 0 && (
            <button
              type="button"
              onClick={() => setRevealed(new Set())}
              className="text-[10px] font-medium text-[rgb(var(--muted2))] hover:text-violet-500 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        <div className="h-1.5 w-full rounded-full bg-[rgb(var(--border))] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, rgb(139,92,246), rgb(217,70,239))",
            }}
          />
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {flashcards.map((c, i) => {
          const isOpen = revealed.has(i);
          return (
            <div
              key={i}
              onClick={() => toggle(i)}
              className={`rounded-xl border transition-all duration-200 cursor-pointer select-none overflow-hidden
                ${isOpen
                  ? "border-violet-400/40 bg-[rgb(var(--card))] shadow-sm"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] hover:border-violet-400/25 hover:bg-[rgb(var(--card))]"
                }`}
            >
              {/* Question row */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="shrink-0 h-5 w-5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] inline-flex items-center justify-center text-[10px] font-semibold text-[rgb(var(--muted2))]">
                  {i + 1}
                </span>
                <p className="flex-1 text-sm font-medium text-[rgb(var(--fg))] leading-snug">
                  {c.q}
                </p>
                <span className={`shrink-0 text-[10px] font-semibold rounded-full px-2.5 py-1 transition-all duration-200
                  ${isOpen
                    ? "bg-violet-500/10 text-violet-500 border border-violet-400/25"
                    : "bg-[rgb(var(--card2))] text-[rgb(var(--muted2))] border border-[rgb(var(--border))]"
                  }`}>
                  {isOpen ? "Hide" : "Show"}
                </span>
              </div>

              {/* Answer */}
              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="rounded-lg border border-violet-400/25 bg-violet-500/8 px-4 py-3">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-violet-400 mb-1.5">Answer</div>
                    <p className="text-sm text-[rgb(var(--fg))] leading-relaxed">{c.a}</p>
                  </div>
                </div>
              )}

              {/* Hint when closed */}
              {!isOpen && (
                <div className="px-4 pb-3.5 -mt-0.5">
                  <p className="text-xs text-[rgb(var(--muted2))]">Tap to reveal</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}