"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type ReportSummary = {
  newUsers: number;
  verifiedUsers: number;
  rejectedVerifications: number;
  approvedTutorApps: number;
  rejectedTutorApps: number;
  pendingTutorApps: number;
  completedSessions: number;
  acceptedSessions: number;
  cancelledSessions: number;
  totalSosRequests: number;
  resolvedSosRequests: number;
  lockedUsers: number;
  avgTutorRating: number;
};

type SubjectPoint = {
  name: string;
  value: number;
};

type ReportRes = {
  from: string;
  to: string;
  summary: ReportSummary;
  topSubjects: SubjectPoint[];
};

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(ease * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return value;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "green" | "rose" | "amber" | "sky" | "violet" | "default";
}) {
  const numericValue = typeof value === "number" ? value : parseFloat(String(value));
  const animated = useCountUp(isNaN(numericValue) ? 0 : numericValue);
  const display = typeof value === "string" && isNaN(numericValue) ? value : animated;

  const accentStyles: Record<string, string> = {
    green:
      "before:bg-emerald-500 dark:before:bg-emerald-400",
    rose: "before:bg-rose-500 dark:before:bg-rose-400",
    amber: "before:bg-amber-500 dark:before:bg-amber-400",
    sky: "before:bg-sky-500 dark:before:bg-sky-400",
    violet: "before:bg-violet-500 dark:before:bg-violet-400",
    default: "before:bg-[rgb(var(--primary))]",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-4 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-r-full ${
        accentStyles[accent ?? "default"]
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-[rgb(var(--fg))]">{display}</p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-[rgb(var(--muted2))]">{sub}</p>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
      <span className="h-px flex-1 bg-[rgb(var(--border))]" />
      {children}
      <span className="h-px flex-1 bg-[rgb(var(--border))]" />
    </h2>
  );
}

function BarChart({ items }: { items: SubjectPoint[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => (
        <div key={item.name} className="group flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-right text-xs text-[rgb(var(--muted))] group-hover:text-[rgb(var(--fg))] transition-colors">
            {item.name}
          </span>
          <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-[rgb(var(--card2))]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[rgb(var(--primary))] opacity-80 transition-all duration-700"
              style={{
                width: `${(item.value / max) * 100}%`,
                animationDelay: `${idx * 60}ms`,
              }}
            />
            <span className="absolute inset-0 flex items-center pl-3 text-[11px] font-semibold text-[rgb(var(--fg))] mix-blend-normal">
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RatingStars({ value }: { value: number }) {
  const stars = 5;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: stars }).map((_, i) => {
        const filled = i < Math.floor(value);
        const partial = !filled && i < value;
        return (
          <svg
            key={i}
            viewBox="0 0 16 16"
            className={`h-4 w-4 ${filled || partial ? "text-amber-400" : "text-[rgb(var(--border))]"}`}
            fill="currentColor"
          >
            <path d="M8 1.25l1.83 3.71 4.1.6-2.97 2.89.7 4.08L8 10.41l-3.66 1.92.7-4.08L2.07 5.56l4.1-.6z" />
          </svg>
        );
      })}
      <span className="ml-1 text-sm font-bold text-[rgb(var(--fg))]">{value}</span>
    </div>
  );
}

const softBtn =
  "rounded-xl px-3.5 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.65)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export default function AdminReportsPage() {
  const today = useMemo(() => new Date(), []);
  const last7 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d;
  }, []);

  const [from, setFrom] = useState(formatDateInput(last7));
  const [to, setTo] = useState(formatDateInput(today));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<ReportRes | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ from, to });
      const res = await fetch(`/api/admin/reports/activity-summary?${qs}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load report");
      setReport(data.report ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const csvHref = useMemo(() => {
    const qs = new URLSearchParams({ from, to, format: "csv" });
    return `/api/admin/reports/activity-summary?${qs}`;
  }, [from, to]);

  const pdfHref = useMemo(() => {
    const qs = new URLSearchParams({ from, to, format: "pdf" });
    return `/api/admin/reports/activity-summary?${qs}`;
  }, [from, to]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <div className="mx-auto max-w-6xl space-y-8 px-4 pb-14 pt-8 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
                Admin · Reports
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[rgb(var(--fg))]">
              Activity Summary
            </h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Users, tutors, sessions &amp; SOS across the selected period
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a href={csvHref} className={softBtn}>
              ↓ CSV
            </a>
            <a href={pdfHref} className={softBtn}>
              ↓ PDF
            </a>
            <Link
              href="/admin"
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3.5 py-2 text-xs font-semibold text-[rgb(var(--muted))] transition-colors hover:text-[rgb(var(--fg))]"
            >
              ← Admin
            </Link>
          </div>
        </div>

        {/* ── Date Range Controls ── */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3.5 py-2.5 text-sm text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))] transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3.5 py-2.5 text-sm text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))] transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating…
                </>
              ) : (
                "Generate Report"
              )}
            </button>
          </div>
        </div>

        {/* ── Error ── */}
        {err && (
          <div className="rounded-2xl border border-rose-300/60 bg-rose-50 px-4 py-3.5 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            {err}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && !report && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]"
              />
            ))}
          </div>
        )}

        {/* ── Report ── */}
        {!loading && !err && report && (
          <div className="space-y-8">
            {/* Period pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-1.5 text-xs text-[rgb(var(--muted))]">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]" />
              {new Date(report.from).toLocaleDateString(undefined, {
                month: "short", day: "numeric", year: "numeric",
              })}
              {" → "}
              {new Date(report.to).toLocaleDateString(undefined, {
                month: "short", day: "numeric", year: "numeric",
              })}
            </div>

            {/* ── User stats ── */}
            <div>
              <SectionHeading>Users &amp; Tutors</SectionHeading>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="New Users" value={report.summary.newUsers} accent="sky" />
                <StatCard label="Verified" value={report.summary.verifiedUsers} accent="green" sub="identity confirmed" />
                <StatCard label="Rejected Verifications" value={report.summary.rejectedVerifications} accent="rose" />
                <StatCard label="Locked Accounts" value={report.summary.lockedUsers} accent="amber" />
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <StatCard label="Tutor Apps Approved" value={report.summary.approvedTutorApps} accent="green" />
                <StatCard label="Tutor Apps Rejected" value={report.summary.rejectedTutorApps} accent="rose" />
                <StatCard label="Tutor Apps Pending" value={report.summary.pendingTutorApps} accent="amber" />
              </div>
            </div>

            {/* ── Sessions + SOS ── */}
            <div>
              <SectionHeading>Sessions &amp; SOS</SectionHeading>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Completed" value={report.summary.completedSessions} accent="green" sub="sessions" />
                <StatCard label="Accepted" value={report.summary.acceptedSessions} accent="sky" sub="sessions" />
                <StatCard label="Cancelled" value={report.summary.cancelledSessions} accent="rose" sub="sessions" />
                <StatCard label="SOS Requests" value={report.summary.totalSosRequests} accent="amber" />
                <StatCard label="SOS Resolved" value={report.summary.resolvedSosRequests} accent="green" />

                {/* Rating card – special */}
                <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-4 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-r-full before:bg-amber-400">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
                    Avg Tutor Rating
                  </p>
                  <div className="mt-2">
                    <RatingStars value={report.summary.avgTutorRating} />
                  </div>
                  <p className="mt-1 text-[11px] text-[rgb(var(--muted2))]">out of 5.0</p>
                </div>
              </div>
            </div>

            {/* ── Top Subjects ── */}
            <div>
              <SectionHeading>Top Subjects</SectionHeading>
              {report.topSubjects.length === 0 ? (
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-5 py-8 text-center text-sm text-[rgb(var(--muted2))]">
                  No subject activity in this period.
                </div>
              ) : (
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-5">
                  <BarChart items={report.topSubjects} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}