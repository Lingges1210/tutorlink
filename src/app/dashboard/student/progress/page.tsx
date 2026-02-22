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
    mostImprovedSubject:
      | null
      | {
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-[11px] font-semibold border transition-all duration-150",
        active
          ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)]"
          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function GhostButtonLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]"
    >
      {children}
    </Link>
  );
}

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

  const streakLabel = useMemo(() => {
    if (!overview) return "";
    const s = overview.streak;
    if (s.current === 0) return "No streak yet — complete a session to start!";
    return `Current: ${s.current} day(s) · Longest: ${s.longest} day(s)`;
  }, [overview]);

  const exportHref =
    `/api/progress/export` +
    (subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        layout="position"
        className="rounded-3xl border p-6 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
              Progress
            </h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Track progress by subject, topics covered, and session summaries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
  type="button"
  disabled={exporting}
  onClick={() => {
    if (exporting) return;

    setExporting(true);

    const url = subjectId
      ? `/api/progress/export?subjectId=${encodeURIComponent(subjectId)}`
      : "/api/progress/export";

    // trigger download
    window.location.href = url;

    // re-enable after small delay
    setTimeout(() => {
      setExporting(false);
    }, 2000);
  }}
  className={[
    "relative inline-flex items-center justify-center gap-2",
    "rounded-md px-3 py-2 text-xs font-semibold border",
    "border-[rgb(var(--border))]",
    exporting
      ? "bg-[rgb(var(--card)/0.4)] text-[rgb(var(--muted2))] cursor-not-allowed"
      : "bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
  ].join(" ")}
>
  {exporting && (
    <span className="h-3 w-3 animate-spin rounded-full border-2 border-[rgb(var(--primary))] border-t-transparent" />
  )}

  {exporting ? "Generating..." : "Export PDF"}
</button>

            <TabButton
              active={tab === "overview"}
              onClick={() => setTab("overview")}
            >
              Overview
            </TabButton>
            <TabButton active={tab === "topics"} onClick={() => setTab("topics")}>
              Topics
            </TabButton>
            <TabButton
              active={tab === "history"}
              onClick={() => setTab("history")}
            >
              History
            </TabButton>
          </div>
        </div>
      </motion.div>

      {subjectId ? (
        <div className="rounded-2xl border p-3 border-[rgb(var(--border))] bg-[rgb(var(--card2))] flex items-center justify-between gap-3">
          <div className="text-xs text-[rgb(var(--muted2))]">
            Filtered by selected subject
          </div>
          <button
            type="button"
            onClick={() => setSubject(null)}
            className="rounded-full px-3 py-1 text-[11px] font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]"
          >
            Clear
          </button>
        </div>
      ) : null}

      {msg && (
        <div className="rounded-2xl border p-4 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] text-sm text-[rgb(var(--fg))]">
          {msg}
        </div>
      )}

      <div className="rounded-3xl border p-5 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]">
        {loading ? (
          <div className="text-sm text-[rgb(var(--muted2))]">Loading…</div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {tab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-5"
              >
                {/* Totals + streak */}
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="text-xs text-[rgb(var(--muted2))]">
                      Total Sessions
                    </div>
                    <div className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">
                      {overview?.totals.totalSessions ?? 0}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="text-xs text-[rgb(var(--muted2))]">
                      Total Minutes
                    </div>
                    <div className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">
                      {overview?.totals.totalMinutes ?? 0}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="text-xs text-[rgb(var(--muted2))]">
                      Study Streak
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                      {streakLabel}
                    </div>
                    <div className="mt-1 text-[0.7rem] text-[rgb(var(--muted2))]">
                      Last activity: {overview?.streak.lastStudyKey ?? "—"}
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                      Analytics Summary
                    </div>

                    {analytics?.mostImprovedSubject ? (
                      <div className="mt-2">
                        <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                          Most improved subject
                        </div>
                        <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                          {analytics.mostImprovedSubject.code} —{" "}
                          {analytics.mostImprovedSubject.title}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]">
                            avg gain{" "}
                            {analytics.mostImprovedSubject.avgConfGain.toFixed(2)}
                          </span>
                          <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]">
                            {analytics.mostImprovedSubject.totalSessions} sessions
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSubject(analytics.mostImprovedSubject!.subjectId, "topics")
                          }
                          className="mt-3 rounded-md px-3 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90"
                        >
                          View this subject
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-[rgb(var(--muted2))]">
                        Not enough data yet.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                      Confidence Gain Trend (recent)
                    </div>

                    {(analytics?.confidenceTrend?.length ?? 0) === 0 ? (
                      <div className="mt-2 text-sm text-[rgb(var(--muted2))]">
                        No trend data yet.
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {analytics!.confidenceTrend.map((x, idx) => (
                          <div
                            key={`${x.at}-${idx}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-xs text-[rgb(var(--muted2))]">
                                {new Date(x.at).toLocaleDateString()} · {x.subjectCode}
                              </div>
                            </div>

                            <span
                              className={[
                                "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold border",
                                x.gain >= 0
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                  : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
                              ].join(" ")}
                            >
                              {x.gain >= 0 ? `+${x.gain}` : x.gain}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subject progress */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                    Progress by Subject
                  </div>

                  {(overview?.subjects?.length ?? 0) === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-8 text-center text-sm text-[rgb(var(--muted2))]">
                      No progress yet. Complete a session to start tracking.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {overview!.subjects.map((s) => (
                        <button
                          key={s.subjectId}
                          type="button"
                          onClick={() => setSubject(s.subjectId, "topics")}
                          className="w-full text-left"
                          title="Click to drill down"
                        >
                          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                                  {s.code} — {s.title}
                                </div>
                                <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                                  Last session: {pretty(s.lastSessionAt)}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]">
                                  {s.totalSessions} sessions
                                </span>
                                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]">
                                  {s.totalMinutes} min
                                </span>
                                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]">
                                  avg conf gain {s.avgConfGain.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {tab === "topics" && (
              <motion.div
                key="topics"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                    Top Topics Covered
                  </div>

                  {subjectId ? (
                    <button
                      type="button"
                      onClick={() => setTab("history")}
                      className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]"
                    >
                      View history
                    </button>
                  ) : null}
                </div>

                {(topics?.topTopics?.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-8 text-center text-sm text-[rgb(var(--muted2))]">
                    No topics yet. Topics appear after you complete sessions.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topics!.topTopics.map((t) => (
                      <div
                        key={t.topicId}
                        className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                              {t.topicName}
                            </div>
                            <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                              {t.subjectCode} — {t.subjectTitle}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]">
                              {t.timesCovered} time(s)
                            </span>
                            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]">
                              last:{" "}
                              {t.lastCoveredAt
                                ? new Date(t.lastCoveredAt).toLocaleDateString()
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                  Session History
                </div>

                {(history?.sessions?.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-8 text-center text-sm text-[rgb(var(--muted2))]">
                    No completed sessions yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history!.sessions.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                              {s.subject.code} — {s.subject.title}
                            </div>
                            <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                              {pretty(s.scheduledAt)} · {s.durationMin} min ·
                              Tutor: {s.tutorName}
                            </div>
                          </div>

                          {s.completion && (
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]">
                                conf {s.completion.confidenceBefore} →{" "}
                                {s.completion.confidenceAfter}
                              </span>
                              <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]">
                                {s.completion.topics.length} topic(s)
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="text-xs text-[rgb(var(--muted2))]">
                            Summary
                          </div>
                          <div className="text-sm text-[rgb(var(--fg))] whitespace-pre-wrap">
                            {s.completion?.summary ?? "No summary recorded."}
                          </div>

                          {s.completion?.topics?.length ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {s.completion.topics.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {s.completion?.nextSteps ? (
                            <div className="pt-2">
                              <div className="text-xs text-[rgb(var(--muted2))]">
                                Next steps
                              </div>
                              <div className="text-sm text-[rgb(var(--fg))] whitespace-pre-wrap">
                                {s.completion.nextSteps}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
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