"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

type ApiResp = {
  ok: boolean;
  message?: string;
  subjectId?: string | null;
  overview: {
    totals: { totalSessions: number; totalMinutes: number };
    streak: {
      todayKey: string;
      current: number;
      longest: number;
      hasToday: boolean;
      lastStudyKey: string | null;
    };
    subjects: Array<{
      subjectId: string;
      code: string;
      title: string;
      totalSessions: number;
      totalMinutes: number;
      lastSessionAt: string | null;
      avgConfGain: number;
    }>;
  };
  topics: {
    topTopics: Array<{
      subjectId?: string;
      subjectCode: string;
      subjectTitle: string;
      topicId: string;
      topicName: string;
      timesCovered: number;
      lastCoveredAt: string | null;
    }>;
  };
  history: {
    sessions: Array<{
      id: string;
      scheduledAt: string;
      durationMin: number;
      subject: { id?: string; code: string; title: string };
      tutorName: string;
      completion: null | {
        summary: string;
        confidenceBefore: number;
        confidenceAfter: number;
        nextSteps: string | null;
        createdAt: string;
        topics: string[];
      };
    }>;
  };
  analytics?: {
    mostImprovedSubject: null | {
      subjectId: string;
      code: string;
      title: string;
      avgConfGain: number;
      totalSessions: number;
    };
    confidenceTrend: Array<{
      at: string;
      subjectCode: string;
      gain: number;
    }>;
  };
};

type TabKey = "overview" | "topics" | "history";

function pretty(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-5 flex flex-col gap-1"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      {/* coloured top strip */}
      <div
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
        style={{ background: accent ?? "rgb(var(--primary))" }}
      />
      <div className="text-[11px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))] mt-1">
        {label}
      </div>
      <div className="text-2xl font-bold text-[rgb(var(--fg))] leading-tight">
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-[rgb(var(--muted2))] leading-snug">
          {sub}
        </div>
      )}
    </div>
  );
}

/* ─── Tab Button ─────────────────────────────────────────────── */
function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-semibold border transition-all duration-200",
        active
          ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.10)] shadow-sm"
          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
      ].join(" ")}
    >
      {icon}
      {children}
      {active && (
        <motion.span
          layoutId="tab-dot"
          className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[rgb(var(--primary))]"
        />
      )}
    </button>
  );
}

/* ─── Confidence Bar ─────────────────────────────────────────── */
function ConfBar({ before, after }: { before: number; after: number }) {
  const gain = after - before;
  const pct = Math.min(100, Math.max(0, (after / 10) * 100));
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center justify-between text-[10px] text-[rgb(var(--muted2))]">
        <span>Confidence</span>
        <span
          className={gain >= 0 ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}
        >
          {before} → {after} ({gain >= 0 ? "+" : ""}{gain})
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[rgb(var(--border))] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={[
            "h-full rounded-full",
            gain >= 0 ? "bg-emerald-500" : "bg-rose-400",
          ].join(" ")}
        />
      </div>
    </div>
  );
}

/* ─── Pill ───────────────────────────────────────────────────── */
function Pill({ children, green, red }: { children: React.ReactNode; green?: boolean; red?: boolean }) {
  return (
    <span
      className={[
        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold border",
        green
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          : red
          ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300"
          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/* ─── Section heading ────────────────────────────────────────── */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[rgb(var(--muted2))]">
      <span className="h-px flex-1 bg-[rgb(var(--border))]" />
      {children}
      <span className="h-px flex-1 bg-[rgb(var(--border))]" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════════════ */
export default function StudentProgressPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [exporting, setExporting] = useState(false);

  const rawTab = (sp.get("tab") ?? "overview").toLowerCase();
  const tab: TabKey =
    rawTab === "topics" ? "topics" : rawTab === "history" ? "history" : "overview";
  const subjectId: string | null = sp.get("subjectId");

  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const setTab = (next: TabKey) => {
    const nextSp = new URLSearchParams(sp.toString());
    nextSp.set("tab", next);
    router.replace(`${pathname}?${nextSp.toString()}`, { scroll: false });
  };

  const setSubject = (id: string | null, nextTab?: TabKey) => {
    const nextSp = new URLSearchParams(sp.toString());
    if (id) nextSp.set("subjectId", id);
    else nextSp.delete("subjectId");
    if (nextTab) nextSp.set("tab", nextTab);
    router.replace(`${pathname}?${nextSp.toString()}`, { scroll: false });
  };

  async function refresh() {
    setLoading(true);
    setMsg(null);
    const qs =
      `/api/progress/dashboard?tab=${encodeURIComponent(tab)}` +
      (subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : "");
    try {
      const res = await fetch(qs, { cache: "no-store" });
      const j = (await res.json().catch(() => null)) as ApiResp | null;
      if (!res.ok || !j?.ok) {
        setData(null);
        setMsg(j?.message ?? "Unable to load progress.");
      } else {
        setData(j);
      }
    } catch {
      setMsg("Unable to load progress.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, subjectId]);

  const overview = data?.overview;
  const topics = data?.topics;
  const history = data?.history;
  const analytics = data?.analytics;

  const streakEmoji = useMemo(() => {
    if (!overview) return "";
    const c = overview.streak.current;
    if (c === 0) return "💤";
    if (c < 3) return "🔥";
    if (c < 7) return "⚡";
    return "🏆";
  }, [overview]);

  const streakLabel = useMemo(() => {
    if (!overview) return "";
    const s = overview.streak;
    if (s.current === 0) return "No streak yet";
    return `${s.current} day${s.current !== 1 ? "s" : ""} running`;
  }, [overview]);

  return (
    <div className="space-y-5">
      {/* ── Header card ────────────────────────────────────────── */}
      <motion.div
        layout="position"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.8)] shadow-[0_24px_64px_rgb(var(--shadow)/0.12)] backdrop-blur-sm overflow-hidden"
      >
        {/* gradient bar at the very top */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[rgb(var(--primary))] via-violet-500 to-sky-400" />

        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          {/* Title */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--fg))]">
              Progress
            </h1>
            <p className="mt-0.5 text-[12px] text-[rgb(var(--muted2))]">
              Sessions · Topics · Confidence trends
            </p>
          </div>

          {/* Right controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Export */}
            <button
              type="button"
              disabled={exporting}
              onClick={() => {
                if (exporting) return;
                setExporting(true);
                const url = subjectId
                  ? `/api/progress/export?subjectId=${encodeURIComponent(subjectId)}`
                  : "/api/progress/export";
                window.location.href = url;
                setTimeout(() => setExporting(false), 2000);
              }}
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold border transition-all duration-200",
                exporting
                  ? "border-[rgb(var(--border))] bg-[rgb(var(--card)/0.4)] text-[rgb(var(--muted2))] cursor-not-allowed"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary)/0.06)]",
              ].join(" ")}
            >
              {exporting ? (
                <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-[rgb(var(--primary))] border-t-transparent" />
              ) : (
                /* download icon */
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 1v8M4 6l3 3 3-3M2 11h10" />
                </svg>
              )}
              {exporting ? "Generating…" : "Export PDF"}
            </button>

            {/* Tabs */}
            <div className="flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-1">
              <TabButton
                active={tab === "overview"}
                onClick={() => setTab("overview")}
                icon={
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="1" y="1" width="5" height="5" rx="1" /><rect x="8" y="1" width="5" height="5" rx="1" /><rect x="1" y="8" width="5" height="5" rx="1" /><rect x="8" y="8" width="5" height="5" rx="1" />
                  </svg>
                }
              >
                Overview
              </TabButton>
              <TabButton
                active={tab === "topics"}
                onClick={() => setTab("topics")}
                icon={
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M1 4h12M1 8h8M1 12h5" />
                  </svg>
                }
              >
                Topics
              </TabButton>
              <TabButton
                active={tab === "history"}
                onClick={() => setTab("history")}
                icon={
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="7" cy="7" r="6" /><path d="M7 4v3l2 2" />
                  </svg>
                }
              >
                History
              </TabButton>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Subject filter banner ───────────────────────────────── */}
      <AnimatePresence>
        {subjectId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.06)] px-4 py-2.5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-xs text-[rgb(var(--primary))] font-semibold">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 3h12l-4.5 5.5V12l-3-1.5V8.5L1 3z" />
              </svg>
              Filtered by subject
            </div>
            <button
              type="button"
              onClick={() => setSubject(null)}
              className="rounded-full px-3 py-1 text-[10px] font-semibold border border-[rgb(var(--primary)/0.3)] text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.1)] transition-colors"
            >
              Clear filter
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error message ───────────────────────────────────────── */}
      {msg && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/05 p-4 text-sm text-rose-500">
          {msg}
        </div>
      )}

      {/* ── Content panel ───────────────────────────────────────── */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)] overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-3 p-8 text-sm text-[rgb(var(--muted2))]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgb(var(--primary))] border-t-transparent" />
            Loading your progress…
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>

            {/* ══════════ OVERVIEW ══════════ */}
            {tab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="p-5 space-y-6"
              >
                {/* Stat cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard
                    label="Total Sessions"
                    value={overview?.totals.totalSessions ?? 0}
                    accent="rgb(99,102,241)"
                  />
                  <StatCard
                    label="Total Minutes"
                    value={`${overview?.totals.totalMinutes ?? 0}`}
                    sub="minutes of focused study"
                    accent="rgb(14,165,233)"
                  />
                  <StatCard
                    label="Study Streak"
                    value={
                      <span className="flex items-center gap-1.5">
                        {streakEmoji} {streakLabel}
                      </span>
                    }
                    sub={`Last activity: ${overview?.streak.lastStudyKey ?? "—"} · Longest: ${overview?.streak.longest ?? 0} day(s)`}
                    accent="rgb(245,158,11)"
                  />
                </div>

                {/* Analytics row */}
                <div className="grid gap-3 md:grid-cols-2">
                  {/* Most improved */}
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-5 space-y-3">
                    <SectionHeading>Most Improved</SectionHeading>

                    {analytics?.mostImprovedSubject ? (
                      <>
                        <div>
                          <div className="text-sm font-bold text-[rgb(var(--fg))]">
                            {analytics.mostImprovedSubject.code}
                          </div>
                          <div className="text-xs text-[rgb(var(--muted2))]">
                            {analytics.mostImprovedSubject.title}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Pill green>
                            +{analytics.mostImprovedSubject.avgConfGain.toFixed(2)} avg gain
                          </Pill>
                          <Pill>{analytics.mostImprovedSubject.totalSessions} sessions</Pill>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSubject(analytics.mostImprovedSubject!.subjectId, "topics")
                          }
                          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-85 transition-opacity"
                        >
                          View topics
                          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 5h6M5 2l3 3-3 3" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="text-sm text-[rgb(var(--muted2))]">Not enough data yet.</div>
                    )}
                  </div>

                  {/* Confidence trend */}
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-5 space-y-3">
                    <SectionHeading>Confidence Trend</SectionHeading>

                    {(analytics?.confidenceTrend?.length ?? 0) === 0 ? (
                      <div className="text-sm text-[rgb(var(--muted2))]">No trend data yet.</div>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {analytics!.confidenceTrend.map((x, idx) => (
                          <motion.div
                            key={`${x.at}-${idx}`}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.04, duration: 0.2 }}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2"
                          >
                            <div className="text-[11px] text-[rgb(var(--muted2))]">
                              <span className="font-semibold text-[rgb(var(--fg))]">
                                {x.subjectCode}
                              </span>{" "}
                              · {new Date(x.at).toLocaleDateString()}
                            </div>
                            <Pill green={x.gain >= 0} red={x.gain < 0}>
                              {x.gain >= 0 ? `+${x.gain}` : x.gain}
                            </Pill>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subject progress */}
                <div className="space-y-3">
                  <SectionHeading>Progress by Subject</SectionHeading>

                  {(overview?.subjects?.length ?? 0) === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-10 text-center text-sm text-[rgb(var(--muted2))]">
                      No progress yet — complete a session to start tracking.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {overview!.subjects.map((s, i) => (
                        <motion.button
                          key={s.subjectId}
                          type="button"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06, duration: 0.2 }}
                          onClick={() => setSubject(s.subjectId, "topics")}
                          className="w-full text-left group"
                        >
                          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-hover:border-[rgb(var(--primary)/0.35)]">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[rgb(var(--primary)/0.12)] text-[10px] font-bold text-[rgb(var(--primary))]">
                                    {s.code.slice(0, 2)}
                                  </span>
                                  <span className="text-sm font-bold text-[rgb(var(--fg))]">
                                    {s.code}
                                  </span>
                                  <span className="text-xs text-[rgb(var(--muted2))] truncate">
                                    — {s.title}
                                  </span>
                                </div>
                                <div className="mt-1 text-[11px] text-[rgb(var(--muted2))] pl-8">
                                  Last session: {pretty(s.lastSessionAt)}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-1.5 items-center">
                                <Pill>{s.totalSessions} sessions</Pill>
                                <Pill>{s.totalMinutes} min</Pill>
                                <Pill green={s.avgConfGain > 0} red={s.avgConfGain < 0}>
                                  {s.avgConfGain >= 0 ? "+" : ""}{s.avgConfGain.toFixed(2)} conf
                                </Pill>
                                <svg
                                  className="text-[rgb(var(--muted2))] group-hover:text-[rgb(var(--primary))] transition-colors"
                                  width="12" height="12" viewBox="0 0 14 14" fill="none"
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                >
                                  <path d="M3 7h8M7 3l4 4-4 4" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══════════ TOPICS ══════════ */}
            {tab === "topics" && (
              <motion.div
                key="topics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <SectionHeading>Top Topics Covered</SectionHeading>
                  {subjectId && (
                    <button
                      type="button"
                      onClick={() => setTab("history")}
                      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--primary)/0.06)] hover:border-[rgb(var(--primary)/0.4)] transition-all"
                    >
                      View history
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5h6M5 2l3 3-3 3" />
                      </svg>
                    </button>
                  )}
                </div>

                {(topics?.topTopics?.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-10 text-center text-sm text-[rgb(var(--muted2))]">
                    No topics yet — topics appear after you complete sessions.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topics!.topTopics.map((t, i) => (
                      <motion.div
                        key={t.topicId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.2 }}
                        className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex items-start gap-3">
                            {/* rank badge */}
                            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--primary)/0.10)] text-[10px] font-bold text-[rgb(var(--primary))]">
                              {i + 1}
                            </span>
                            <div>
                              <div className="text-sm font-bold text-[rgb(var(--fg))]">
                                {t.topicName}
                              </div>
                              <div className="mt-0.5 text-[11px] text-[rgb(var(--muted2))]">
                                {t.subjectCode} — {t.subjectTitle}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <Pill>{t.timesCovered} time{t.timesCovered !== 1 ? "s" : ""}</Pill>
                            <Pill>
                              last:{" "}
                              {t.lastCoveredAt
                                ? new Date(t.lastCoveredAt).toLocaleDateString()
                                : "—"}
                            </Pill>
                          </div>
                        </div>

                        {/* mini frequency bar */}
                        <div className="mt-3 h-1 rounded-full bg-[rgb(var(--border))] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(100, (t.timesCovered / (topics!.topTopics[0]?.timesCovered || 1)) * 100)}%`,
                            }}
                            transition={{ duration: 0.5, ease: "easeOut", delay: i * 0.05 }}
                            className="h-full rounded-full bg-[rgb(var(--primary)/0.6)]"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ══════════ HISTORY ══════════ */}
            {tab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="p-5 space-y-4"
              >
                <SectionHeading>Session History</SectionHeading>

                {(history?.sessions?.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-10 text-center text-sm text-[rgb(var(--muted2))]">
                    No completed sessions yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history!.sessions.map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.2 }}
                        className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] overflow-hidden"
                      >
                        {/* coloured left edge */}
                        <div className="flex">
                          <div className="w-1 shrink-0 bg-gradient-to-b from-[rgb(var(--primary))] to-sky-400" />

                          <div className="flex-1 p-4 space-y-3">
                            {/* top row */}
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[rgb(var(--primary)/0.12)] text-[10px] font-bold text-[rgb(var(--primary))]">
                                    {s.subject.code.slice(0, 2)}
                                  </span>
                                  <span className="text-sm font-bold text-[rgb(var(--fg))]">
                                    {s.subject.code}
                                  </span>
                                  <span className="text-xs text-[rgb(var(--muted2))] truncate">
                                    — {s.subject.title}
                                  </span>
                                </div>
                                <div className="mt-1 text-[11px] text-[rgb(var(--muted2))] pl-8">
                                  {pretty(s.scheduledAt)} · {s.durationMin} min · Tutor: {s.tutorName}
                                </div>
                              </div>

                              {s.completion && (
                                <div className="flex flex-wrap gap-1.5">
                                  <Pill>{s.completion.topics.length} topic(s)</Pill>
                                </div>
                              )}
                            </div>

                            {/* confidence bar */}
                            {s.completion && (
                              <ConfBar
                                before={s.completion.confidenceBefore}
                                after={s.completion.confidenceAfter}
                              />
                            )}

                            {/* summary */}
                            <div className="space-y-1">
                              <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
                                Summary
                              </div>
                              <div className="text-sm text-[rgb(var(--fg))] whitespace-pre-wrap leading-relaxed">
                                {s.completion?.summary ?? "No summary recorded."}
                              </div>
                            </div>

                            {/* topic tags */}
                            {s.completion?.topics?.length ? (
                              <div className="flex flex-wrap gap-1.5">
                                {s.completion.topics.map((t) => (
                                  <Pill key={t}>{t}</Pill>
                                ))}
                              </div>
                            ) : null}

                            {/* next steps */}
                            {s.completion?.nextSteps ? (
                              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2.5 space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--primary))]">
                                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M7 1v12M1 7l6-6 6 6" />
                                  </svg>
                                  Next Steps
                                </div>
                                <div className="text-sm text-[rgb(var(--fg))] whitespace-pre-wrap leading-relaxed">
                                  {s.completion.nextSteps}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}