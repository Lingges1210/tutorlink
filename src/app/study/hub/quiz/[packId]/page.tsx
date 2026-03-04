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

function tabBtn(active: boolean) {
  return `inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition
    ${
      active
        ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
        : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--card))]"
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

  // ✅ UX: toggle mistake panel + jump
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

    // ✅ UX: After submit, auto-open review and jump to top (review panel)
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

  // ✅ Mistake review: compute wrong answers after result exists
  const mistakes = useMemo(() => {
    if (!result?.ok) return [];
    return quiz
      .map((q, i) => {
        const picked = answers[i];
        const correct = q.answerIndex;
        const isAnswered = picked !== -1;
        const isCorrect = isAnswered && picked === correct;

        return {
          i,
          q,
          picked,
          correct,
          isAnswered,
          isCorrect,
          pickedText: isAnswered ? q.options[picked] : null,
          correctText: q.options[correct],
        };
      })
      .filter((x) => !x.isCorrect);
  }, [result?.ok, quiz, answers]);

  const answeredCount = useMemo(() => answers.filter((x) => x !== -1).length, [answers]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-[rgb(var(--muted))]">
        Loading…
      </div>
    );
  }

  if (err || !pack) {
    return (
      <div className="pt-10 pb-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {err || "Pack not found"}
          </div>
          <div className="mt-4">
            <Link href="/study/hub" className="text-sm text-[rgb(var(--muted))] hover:underline">
              ← Back to Study Hub
            </Link>
          </div>
        </div>
      </div>
    );
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
              Active Recall Session
            </div>

            <h1 className="mt-3 text-2xl font-semibold text-[rgb(var(--fg))]">Study Pack</h1>
            <p className="text-sm text-[rgb(var(--muted))] max-w-2xl">
              Quiz yourself, drill flashcards, and skim the summary.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isSubmitted ? (
              <>
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3">
                  <div className="text-xs text-[rgb(var(--muted2))]">Your score</div>
                  <div className="text-lg font-semibold text-[rgb(var(--fg))]">
                    {result.score} / {result.total}
                  </div>
                  <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                    Wrong: {mistakes.length}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={retake}
                  className="h-11 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 inline-flex items-center gap-2 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.20]"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Retake
                </button>
              </>
            ) : (
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3">
                <div className="text-xs text-[rgb(var(--muted2))]">Progress</div>
                <div className="text-lg font-semibold text-[rgb(var(--fg))]">
                  {answeredCount} / {quiz.length}
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
          {/* Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setTab("QUIZ")} className={tabBtn(tab === "QUIZ")}>
                <HelpCircle className="h-4 w-4" /> Quiz
              </button>
              <button
                type="button"
                onClick={() => setTab("FLASHCARDS")}
                className={tabBtn(tab === "FLASHCARDS")}
              >
                <BookOpenCheck className="h-4 w-4" /> Flashcards
              </button>
              <button
                type="button"
                onClick={() => setTab("SUMMARY")}
                className={tabBtn(tab === "SUMMARY")}
              >
                <Layers className="h-4 w-4" /> Summary
              </button>
            </div>

            {/* ✅ UX: quick action when submitted */}
            {tab === "QUIZ" && isSubmitted && mistakes.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReview((v) => !v)}
                  className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.20]"
                >
                  {showReview ? "Hide Review" : "Show Review"}
                </button>
                <button
                  type="button"
                  onClick={() => jumpToQuestion(mistakes[0].i)}
                  className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.20]"
                >
                  Jump to 1st mistake
                </button>
              </div>
            )}
          </div>

          <div className="mt-4">
            {/* QUIZ */}
            {tab === "QUIZ" && (
              <div className="space-y-3">
                {/* ✅ Mistake Review panel */}
                {isSubmitted && showReview && (
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                          Mistake Review
                        </div>
                        <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                          Only the questions you missed — correct answer + explanation.
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-[rgb(var(--muted))]">
                        Wrong: {mistakes.length} / {quiz.length}
                      </div>
                    </div>

                    {mistakes.length === 0 ? (
                      <div className="mt-3 text-sm text-[rgb(var(--fg))]">
                        Perfect score — nothing to review 🎉
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {mistakes.map((m) => (
                          <button
                            key={m.i}
                            type="button"
                            onClick={() => jumpToQuestion(m.i)}
                            className="w-full text-left rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 hover:ring-1 hover:ring-[rgb(var(--primary))/0.20] transition"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="font-semibold text-[rgb(var(--fg))]">
                                Q{m.i + 1}. {m.q.q}
                              </div>
                              <CornerDownRight className="h-4 w-4 text-[rgb(var(--muted2))]" />
                            </div>

                            <div className="mt-2 grid gap-2 text-sm">
                              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                                <div className="text-xs font-semibold text-red-700">Your answer</div>
                                <div className="mt-1 text-red-800">{m.pickedText ?? "Not answered"}</div>
                              </div>

                              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2">
                                <div className="text-xs font-semibold text-green-700">Correct answer</div>
                                <div className="mt-1 text-green-800">{m.correctText}</div>
                              </div>

                              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2">
                                <div className="text-xs font-semibold text-[rgb(var(--muted2))]">
                                  Explanation
                                </div>
                                <div className="mt-1 text-[rgb(var(--fg))]">{m.q.explanation}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Questions list */}
                {quiz.map((q, i) => {
                  const picked = answers[i];
                  const correct = q.answerIndex;

                  return (
                    <div
                      key={i}
                      ref={(el) => {
                        questionRefs.current[i] = el;
                      }}
                      className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 scroll-mt-24"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-[rgb(var(--fg))]">
                            {i + 1}. {q.q}
                          </div>
                          <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                            {q.difficulty}
                            {q.topic ? ` • ${q.topic}` : ""}
                          </div>
                        </div>

                        {isSubmitted && (
                          <div className="text-xs font-semibold">
                            {picked === correct ? (
                              <span className="inline-flex items-center gap-1 text-green-700">
                                <CheckCircle className="h-4 w-4" /> Correct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-700">
                                <XCircle className="h-4 w-4" /> Wrong
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 grid gap-2">
                        {q.options.map((opt, idx) => {
                          // ✅ UX: option styles after submit
                          const isPicked = picked === idx;
                          const isCorrectOpt = correct === idx;

                          const base =
                            "text-left rounded-xl border px-3 py-2 text-sm transition";

                          // before submit
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
                                    ? "border-[rgb(var(--primary))] bg-[rgb(var(--card))]"
                                    : "border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.20]"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          }

                          // after submit (locked)
                          let cls = `${base} border-[rgb(var(--border))] bg-[rgb(var(--card))] opacity-95 cursor-not-allowed`;

                          if (isCorrectOpt) {
                            cls =
                              `${base} border-green-300 bg-green-50 text-green-900 cursor-not-allowed`;
                          } else if (isPicked && !isCorrectOpt) {
                            cls =
                              `${base} border-red-300 bg-red-50 text-red-900 cursor-not-allowed`;
                          }

                          return (
                            <button key={idx} type="button" disabled className={cls}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {isSubmitted && (
                        <div className="mt-3 text-xs text-[rgb(var(--muted))]">
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
              <div className="grid gap-3 sm:grid-cols-2">
                {flashcards.map((c, i) => (
                  <details
                    key={i}
                    className="group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4"
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="font-semibold text-[rgb(var(--fg))]">
                        Q{i + 1}: {c.q}
                      </div>
                      <div className="text-xs text-[rgb(var(--muted2))] mt-1">
                        Click to reveal answer
                      </div>
                    </summary>

                    <div className="mt-3 text-sm text-[rgb(var(--fg))]">{c.a}</div>
                  </details>
                ))}
              </div>
            )}

            {/* SUMMARY */}
            {tab === "SUMMARY" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">Summary</div>
                  <div className="mt-2 text-sm text-[rgb(var(--muted))] whitespace-pre-wrap">
                    {pack.summary}
                  </div>
                </div>

                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">Key Concepts</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {concepts.map((c, i) => (
                      <span
                        key={i}
                        className="text-xs border border-[rgb(var(--border))] px-2 py-1 rounded-full bg-[rgb(var(--card))] text-[rgb(var(--muted2))]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky bottom submit (QUIZ tab only) */}
          {tab === "QUIZ" && !isSubmitted && (
            <div className="sticky bottom-0 mt-6">
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 shadow-[0_-10px_25px_rgba(0,0,0,0.12)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-[rgb(var(--muted))]">
                    Answered {answeredCount} / {quiz.length}
                  </div>

                  <button
                    type="button"
                    onClick={submit}
                    className="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 inline-flex items-center gap-2 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] hover:opacity-95 disabled:opacity-50"
                    disabled={answeredCount === 0}
                  >
                    Submit Quiz
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