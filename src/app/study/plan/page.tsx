// src/app/study/plan/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Sparkles,
  CheckCircle2,
  Circle,
  Flame,
  Wand2,
  RefreshCcw,
  BookOpenCheck,
  Timer,
  GraduationCap,
  AlertCircle,
  HelpCircle,
  Moon,
  Sun,
  Sunset,
} from "lucide-react";

type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
const DAY_KEYS: DayKey[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABEL: Record<DayKey, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

type Style = "SHORT_BURSTS" | "DEEP_STUDY";
type PreferredTime = "MORNING" | "AFTERNOON" | "NIGHT";

type InputSubject = {
  name: string;
  level0to10: number;
  weakTopics: string[];
  weakInput: string;
};

type PlanItem = {
  id: string;
  date: string;
  subjectName: string;
  topic: string;
  task: string;
  durationMin: number;
  type: "STUDY" | "PRACTICE" | "REVIEW" | "TUTOR";
  reason?: string | null;
  status: "PENDING" | "DONE" | "SKIPPED" | string;

  // ✅ NEW
  timeBlock?: string | null;
};

type Plan = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  examDate?: string | null;
  hoursPerWeek: number;
  style: Style;
  subjects: any;
  availability: any;
  items: PlanItem[];

  // ✅ NEW
  preferredTime?: PreferredTime;
  aiExplanation?: string;
  progress?: { done: number; total: number; pct: number };
};

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function startOfDayISO(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function prettyDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function badgeForType(t: PlanItem["type"]) {
  if (t === "TUTOR") return { label: "Tutor", icon: GraduationCap };
  if (t === "REVIEW") return { label: "Review", icon: Flame };
  if (t === "PRACTICE") return { label: "Practice", icon: BookOpenCheck };
  return { label: "Study", icon: Timer };
}

function prefLabel(p: PreferredTime) {
  if (p === "MORNING") return "Morning (8–11am)";
  if (p === "AFTERNOON") return "Afternoon (1–4pm)";
  return "Night (7–10pm)";
}

export default function StudyPlanPage() {
  const [step, setStep] = useState<"FORM" | "RESULT">("FORM");

  // FORM state
  const [title, setTitle] = useState("");
  const [examDate, setExamDate] = useState<string>("");
  const [hoursPerWeek, setHoursPerWeek] = useState<number>(8);
  const [style, setStyle] = useState<Style>("SHORT_BURSTS");

  // ✅ NEW: Preferred study time
  const [preferredTime, setPreferredTime] = useState<PreferredTime>("NIGHT");

  const [days, setDays] = useState<DayKey[]>(["MON", "TUE", "WED", "THU", "FRI", "SAT"]);
  const [hoursByDay, setHoursByDay] = useState<Record<DayKey, number>>({
    MON: 1,
    TUE: 1,
    WED: 1,
    THU: 1,
    FRI: 1,
    SAT: 2,
    SUN: 2,
  });

  const [subjects, setSubjects] = useState<InputSubject[]>([
    { name: "", level0to10: 5, weakTopics: [], weakInput: "" },
  ]);

  // RESULT state
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyToggle, setBusyToggle] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  // ✅ NEW: “Why today?” modal
  const [whyOpenItemId, setWhyOpenItemId] = useState<string | null>(null);

  async function fetchCurrentPlan() {
    const res = await fetch(`/api/study/plans`, { cache: "no-store" });
    const json = await res.json();
    if (!json?.ok) throw new Error(json?.error ?? "Failed to load plan");
    setPlan(json.plan ?? null);

    // if a plan exists, keep form's preferredTime synced (nice UX)
    if (json.plan?.preferredTime) setPreferredTime(json.plan.preferredTime);

    return json.plan ?? null;
  }

  // ✅ Optimistic UI helper
  function updateItemStatusLocal(itemId: string, nextStatus: "PENDING" | "DONE" | "SKIPPED") {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (it.id === itemId ? { ...it, status: nextStatus } : it)),
      };
    });
  }

  // ✅ Auto-load existing plan on page open → show RESULT if exists
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await fetchCurrentPlan();
        if (!mounted) return;
        if (p) setStep("RESULT");
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generatePlan() {
    setError("");
    setLoading(true);
    try {
      const cleanSubjects = subjects
        .map((s) => {
          const weakTopics = s.weakInput
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
          return {
            name: s.name.trim(),
            level0to10: Number.isFinite(Number(s.level0to10)) ? Number(s.level0to10) : 5,
            weakTopics,
          };
        })
        .filter((s) => s.name.length > 0);

      if (cleanSubjects.length === 0) throw new Error("Add at least 1 subject.");

      const payload = {
        title: title.trim() || undefined,
        examDate: examDate ? new Date(examDate).toISOString() : undefined,
        hoursPerWeek,
        style,
        preferredTime, // ✅ NEW
        availability: { days, hoursByDay },
        subjects: cleanSubjects,
      };

      const res = await fetch("/api/study/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? "Failed to generate");

      await fetchCurrentPlan();
      setStep("RESULT");
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Optimistic toggle
  async function toggleItem(item: PlanItem) {
    const nextStatus: "PENDING" | "DONE" = item.status === "DONE" ? "PENDING" : "DONE";
    updateItemStatusLocal(item.id, nextStatus);

    setBusyToggle(item.id);
    try {
      const res = await fetch("/api/study/plans/item", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, nextStatus }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? "Failed to update");
    } catch (e: any) {
      updateItemStatusLocal(item.id, item.status as any); // revert
      setError(e?.message ?? "Failed to update task");
    } finally {
      setBusyToggle(null);
    }
  }

  async function rebalanceWeek() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/study/plans/rebalance", { method: "POST" });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? "Failed to rebalance");
      await fetchCurrentPlan();
    } catch (e: any) {
      setError(e?.message ?? "Failed to rebalance");
    } finally {
      setLoading(false);
    }
  }

  function addSubject() {
    setSubjects((p) => [...p, { name: "", level0to10: 5, weakTopics: [], weakInput: "" }]);
  }

  function removeSubject(idx: number) {
    setSubjects((p) => p.filter((_, i) => i !== idx));
  }

  function toggleDay(d: DayKey) {
    setDays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
  }

  const grouped = useMemo(() => {
    if (!plan?.items) return [];
    const map = new Map<string, PlanItem[]>();
    for (const it of plan.items) {
      const key = startOfDayISO(it.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }

    const order = { TUTOR: 0, STUDY: 1, PRACTICE: 2, REVIEW: 3 } as any;
    return [...map.entries()]
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => (order[a.type] ?? 99) - (order[b.type] ?? 99)),
      }));
  }, [plan]);

  const progress = useMemo(() => {
    const all = plan?.items ?? [];
    const done = all.filter((x) => x.status === "DONE").length;
    const pct = all.length ? Math.round((done / all.length) * 100) : 0;

    const pendingBySubject = new Map<string, number>();
    for (const it of all) {
      if (it.status !== "DONE") {
        pendingBySubject.set(it.subjectName, (pendingBySubject.get(it.subjectName) ?? 0) + 1);
      }
    }
    const worst = [...pendingBySubject.entries()].sort((a, b) => b[1] - a[1])[0];
    return { done, total: all.length, pct, weakSpot: worst?.[0] ?? null };
  }, [plan]);

  const whyItem = useMemo(() => {
    if (!whyOpenItemId || !plan?.items) return null;
    return plan.items.find((x) => x.id === whyOpenItemId) ?? null;
  }, [whyOpenItemId, plan]);

  return (
    <div className="pt-10 pb-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/study?tab=plan"
              className="inline-flex items-center gap-2 text-sm text-[rgb(var(--muted))] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to AI Learning Suite
            </Link>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs text-[rgb(var(--muted2))]">
              <Sparkles className="h-4 w-4" />
              AI Study Planner (MVP+)
            </div>

            <h1 className="mt-3 text-2xl font-semibold text-[rgb(var(--fg))]">Study Plan Generator</h1>
            <p className="text-sm text-[rgb(var(--muted))] max-w-2xl">
              Build a weekly Mon–Sun plan with spaced repetition, smart task blocks, and clear “why” explanations.
            </p>
          </div>

          {step === "RESULT" && (
            <button
              type="button"
              onClick={() => setStep("FORM")}
              className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:opacity-90"
            >
              <Wand2 className="h-4 w-4" />
              Adjust inputs
            </button>
          )}
        </header>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* ✅ Plan-level AI Explanation */}
        {step === "RESULT" && plan?.aiExplanation && (
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
              <Sparkles className="h-4 w-4" />
              Why this plan?
            </div>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{plan.aiExplanation}</p>
          </div>
        )}

        {/* FORM */}
        {step === "FORM" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: form */}
            <section className="lg:col-span-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)] space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
                <CalendarClock className="h-4 w-4" />
                Your Inputs
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <div className="text-xs font-semibold text-[rgb(var(--muted2))]">Plan title (optional)</div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., CALC Final Sprint"
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none"
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-xs font-semibold text-[rgb(var(--muted2))]">Exam/assignment date</div>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none"
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-xs font-semibold text-[rgb(var(--muted2))]">Hours per week</div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={hoursPerWeek}
                    onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-[rgb(var(--muted))]">{hoursPerWeek} hours/week</div>
                </label>

                <label className="space-y-1">
                  <div className="text-xs font-semibold text-[rgb(var(--muted2))]">Preferred style</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStyle("SHORT_BURSTS")}
                      className={cx(
                        "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                        style === "SHORT_BURSTS"
                          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:opacity-90"
                      )}
                    >
                      Short bursts (25m)
                    </button>
                    <button
                      type="button"
                      onClick={() => setStyle("DEEP_STUDY")}
                      className={cx(
                        "rounded-xl border px-3 py-2 text-xs font-semibold transition",
                        style === "DEEP_STUDY"
                          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:opacity-90"
                      )}
                    >
                      Deep study (50m)
                    </button>
                  </div>
                </label>
              </div>

              {/* ✅ Preferred Study Time */}
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 space-y-2">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">Preferred study time</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferredTime("MORNING")}
                    className={cx(
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition inline-flex items-center justify-center gap-2",
                      preferredTime === "MORNING"
                        ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:opacity-90"
                    )}
                  >
                    <Sun className="h-4 w-4" />
                    Morning
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredTime("AFTERNOON")}
                    className={cx(
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition inline-flex items-center justify-center gap-2",
                      preferredTime === "AFTERNOON"
                        ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:opacity-90"
                    )}
                  >
                    <Sunset className="h-4 w-4" />
                    Afternoon
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreferredTime("NIGHT")}
                    className={cx(
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition inline-flex items-center justify-center gap-2",
                      preferredTime === "NIGHT"
                        ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:opacity-90"
                    )}
                  >
                    <Moon className="h-4 w-4" />
                    Night
                  </button>
                </div>

                <div className="text-xs text-[rgb(var(--muted))]">
                  Planner will tag tasks with a time window: <span className="font-semibold">{prefLabel(preferredTime)}</span>
                </div>
              </div>

              {/* Availability */}
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 space-y-3">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">Weekly availability</div>

                <div className="flex flex-wrap gap-2">
                  {DAY_KEYS.map((d) => {
                    const on = days.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={cx(
                          "rounded-full px-3 py-1.5 text-xs font-semibold border transition",
                          on
                            ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.12] text-[rgb(var(--primary))]"
                            : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:opacity-90"
                        )}
                      >
                        {DAY_LABEL[d]}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DAY_KEYS.map((d) => (
                    <label
                      key={d}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2"
                    >
                      <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                        {DAY_LABEL[d]}
                        <span className="ml-2 text-[10px] text-[rgb(var(--muted))]">
                          {days.includes(d) ? "On" : "Off"}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={8}
                        step={0.5}
                        value={hoursByDay[d]}
                        onChange={(e) => setHoursByDay((p) => ({ ...p, [d]: Number(e.target.value) }))}
                        className="w-20 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-1 text-sm text-[rgb(var(--fg))] outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Subjects */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">Subjects + weak topics</div>
                  <button
                    type="button"
                    onClick={addSubject}
                    className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:opacity-90"
                  >
                    + Add subject
                  </button>
                </div>

                <div className="space-y-3">
                  {subjects.map((s, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-[rgb(var(--muted2))]">Subject {idx + 1}</div>
                        {subjects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSubject(idx)}
                            className="text-xs font-semibold text-[rgb(var(--muted))] hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          value={s.name}
                          onChange={(e) =>
                            setSubjects((p) => p.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                          }
                          placeholder="e.g., CAT404 Web Engineering"
                          className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none"
                        />

                        <label className="space-y-1">
                          <div className="text-xs font-semibold text-[rgb(var(--muted2))]">Current level (0–10)</div>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={s.level0to10}
                            onChange={(e) =>
                              setSubjects((p) =>
                                p.map((x, i) => (i === idx ? { ...x, level0to10: Number(e.target.value) } : x))
                              )
                            }
                            className="w-full"
                          />
                          <div className="text-xs text-[rgb(var(--muted))]">{s.level0to10}/10</div>
                        </label>

                        <div className="sm:col-span-2">
                          <div className="text-xs font-semibold text-[rgb(var(--muted2))]">Weak topics (comma separated)</div>
                          <input
                            value={s.weakInput}
                            onChange={(e) =>
                              setSubjects((p) =>
                                p.map((x, i) => (i === idx ? { ...x, weakInput: e.target.value } : x))
                              )
                            }
                            placeholder="e.g., SQL joins, React hooks, ERD normalization"
                            className="mt-1 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={generatePlan}
                disabled={loading}
                className={cx(
                  "w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition",
                  loading ? "opacity-60" : "hover:-translate-y-0.5",
                  "bg-[rgb(var(--primary))]"
                )}
              >
                {loading ? "Generating..." : plan ? "Regenerate weekly plan" : "Generate weekly plan"}
                <Sparkles className="h-4 w-4" />
              </button>
            </section>

            {/* Right */}
            <aside className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)] space-y-4">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">What you’ll get</div>

              <div className="space-y-3 text-sm text-[rgb(var(--muted))]">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  <div>Mon–Sun schedule with 25–60 min blocks</div>
                </div>
                <div className="flex gap-2">
                  <Flame className="h-4 w-4 mt-0.5" />
                  <div>Spaced repetition reviews (+2 days)</div>
                </div>
                <div className="flex gap-2">
                  <HelpCircle className="h-4 w-4 mt-0.5" />
                  <div>“Why today?” explanation per task</div>
                </div>
              </div>

              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 text-xs text-[rgb(var(--muted2))]">
                Tip: Keep weak topics specific (e.g., “Normalization 2NF/3NF”, “SQL GROUP BY”, “JWT auth flow”).
              </div>
            </aside>
          </div>
        )}

        {/* RESULT */}
        {step === "RESULT" && plan && (
          <div className="space-y-6">
            {/* Top stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
                <div className="text-xs text-[rgb(var(--muted2))]">Plan</div>
                <div className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">{plan.title}</div>
                <div className="mt-2 text-xs text-[rgb(var(--muted))]">
                  {prettyDate(plan.startDate)} → {prettyDate(plan.endDate)}
                </div>
                <div className="mt-2 text-xs text-[rgb(var(--muted))]">
                  Study time: <span className="font-semibold">{prefLabel(plan.preferredTime ?? preferredTime)}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
                <div className="text-xs text-[rgb(var(--muted2))]">Progress</div>
                <div className="mt-1 text-2xl font-semibold text-[rgb(var(--fg))]">{progress.pct}%</div>
                <div className="mt-2 text-xs text-[rgb(var(--muted))]">
                  {progress.done}/{progress.total} tasks done
                </div>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
                <div className="text-xs text-[rgb(var(--muted2))]">Weak spot (proxy)</div>
                <div className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">{progress.weakSpot ?? "—"}</div>
                <div className="mt-2 text-xs text-[rgb(var(--muted))]">
                  Most remaining tasks are here → prioritize consistency.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fetchCurrentPlan()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:opacity-90"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>

              <button
                type="button"
                onClick={rebalanceWeek}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:opacity-90"
              >
                <Wand2 className="h-4 w-4" />
                Rebalance week (missed days)
              </button>

              <button
                type="button"
                onClick={() => setStep("FORM")}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90"
              >
                Regenerate
                <Sparkles className="h-4 w-4" />
              </button>
            </div>

            {/* Calendar */}
            <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">Your week</div>
                <div className="text-xs text-[rgb(var(--muted))]">Tap a task to mark done.</div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped.map((day) => (
                  <div key={day.date} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="text-sm font-semibold text-[rgb(var(--fg))]">{prettyDate(day.date)}</div>

                    <div className="mt-3 space-y-2">
                      {day.items.map((it) => {
                        const done = it.status === "DONE";
                        const { label, icon: Icon } = badgeForType(it.type);

                        return (
                          <div key={it.id} className="space-y-2">
                            <button
                              type="button"
                              onClick={() => toggleItem(it)}
                              disabled={busyToggle === it.id}
                              className={cx(
                                "w-full text-left rounded-xl border px-3 py-2 transition",
                                done
                                  ? "border-emerald-500/30 bg-emerald-500/10"
                                  : "border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:opacity-90"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                {done ? (
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" />
                                ) : (
                                  <Circle className="h-4 w-4 mt-0.5 text-[rgb(var(--muted))]" />
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-xs font-semibold text-[rgb(var(--fg))] truncate">{it.task}</div>
                                    <div className="text-[10px] text-[rgb(var(--muted))]">{it.durationMin}m</div>
                                  </div>

                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-0.5 text-[10px] text-[rgb(var(--muted))]">
                                      <Icon className="h-3 w-3" />
                                      {label}
                                    </span>

                                    {/* ✅ time window tag */}
                                    {it.timeBlock && (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-0.5 text-[10px] text-[rgb(var(--muted))]">
                                        {it.timeBlock}
                                      </span>
                                    )}

                                    <span className="text-[10px] text-[rgb(var(--muted2))]">
                                      {it.subjectName} • {it.topic}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </button>

                            {/* ✅ “Why today?” */}
                            <button
                              type="button"
                              onClick={() => setWhyOpenItemId(it.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[rgb(var(--muted))] hover:underline"
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                              Why am I studying this today?
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ✅ “Why today?” Modal */}
        {whyItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setWhyOpenItemId(null)}
            />
            <div className="relative w-full max-w-lg rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">Why this task today</div>
                  <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                    {whyItem.subjectName} • {whyItem.topic} • {prettyDate(whyItem.date)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhyOpenItemId(null)}
                  className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] hover:opacity-90"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                <div className="text-xs font-semibold text-[rgb(var(--fg))]">{whyItem.task}</div>
                {whyItem.timeBlock && (
                  <div className="mt-1 text-xs text-[rgb(var(--muted))]">Scheduled: {whyItem.timeBlock}</div>
                )}
                <div className="mt-3 text-sm text-[rgb(var(--muted))]">
                  {whyItem.reason || "This task was scheduled to maintain weekly balance and improve retention."}
                </div>
              </div>

              {plan?.aiExplanation && (
                <div className="mt-4 text-xs text-[rgb(var(--muted))]">
                  <span className="font-semibold">Plan context:</span> {plan.aiExplanation}
                </div>
              )}
            </div>
          </div>
        )}

        {/* No plan yet */}
        {step === "RESULT" && !plan && (
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">No plan yet</div>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">Create your first plan to see your weekly schedule here.</p>
            <button
              type="button"
              onClick={() => setStep("FORM")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90"
            >
              Generate plan
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}