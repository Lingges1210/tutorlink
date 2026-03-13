"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type QueueUser = {
  id: string;
  verificationStatus: string;
};

type TutorAppRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
};

type OverviewStats = {
  totalUsers: number;
  activeTutors: number;
  sessionsThisWeek: number;
  sosRequestsThisWeek: number;
  pendingVerifications: number;
  pendingTutorApps: number;
  lockedUsers: number;
  avgTutorRating: number;
};

type DayPoint = { day: string; value: number };
type SubjectPoint = { name: string; value: number };
type StatusPoint = { status: string; value: number };

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Shared primitives                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

const shell =
  "rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.72)] shadow-[0_24px_72px_rgb(var(--shadow)/0.09)]";

const softBtn =
  "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.65)] hover:border-[rgb(var(--primary)/0.5)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Status pill                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
function StatusPill({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  const cls =
    s === "COMPLETED"
      ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
      : s === "ACCEPTED"
      ? "border-sky-500/30 bg-sky-500/12 text-sky-700 dark:text-sky-300"
      : s === "CANCELLED"
      ? "border-rose-500/30 bg-rose-500/12 text-rose-700 dark:text-rose-300"
      : "border-amber-500/30 bg-amber-500/12 text-amber-700 dark:text-amber-300";
  return (
    <span className={`inline-flex rounded-full border px-3 py-0.5 text-[0.68rem] font-bold tracking-wide ${cls}`}>
      {s}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Stat card — with accent glow + animated counter feel                       */
/* ─────────────────────────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  subtitle,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  accent?: "primary" | "emerald" | "sky" | "amber" | "rose" | "violet";
}) {
  const accentMap = {
    primary: "bg-[rgb(var(--primary)/0.18)]",
    emerald: "bg-emerald-500/18",
    sky: "bg-sky-500/18",
    amber: "bg-amber-500/18",
    rose: "bg-rose-500/18",
    violet: "bg-violet-500/18",
  };
  const textMap = {
    primary: "text-[rgb(var(--primary))]",
    emerald: "text-emerald-600 dark:text-emerald-400",
    sky: "text-sky-600 dark:text-sky-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    violet: "text-violet-600 dark:text-violet-400",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.65)] px-5 py-5 shadow-[0_8px_32px_rgb(var(--shadow)/0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgb(var(--shadow)/0.14)] hover:border-[rgb(var(--primary)/0.3)]">
      {/* Glow orb */}
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full ${accentMap[accent]} blur-2xl transition-all duration-300 group-hover:scale-150`} />

      {/* Top rule */}
      <div className={`absolute inset-x-0 top-0 h-[2px] rounded-t-2xl opacity-60 ${
        accent === "primary" ? "bg-gradient-to-r from-transparent via-[rgb(var(--primary))] to-transparent" :
        accent === "emerald" ? "bg-gradient-to-r from-transparent via-emerald-500 to-transparent" :
        accent === "sky"     ? "bg-gradient-to-r from-transparent via-sky-500 to-transparent" :
        accent === "amber"   ? "bg-gradient-to-r from-transparent via-amber-500 to-transparent" :
        accent === "rose"    ? "bg-gradient-to-r from-transparent via-rose-500 to-transparent" :
                               "bg-gradient-to-r from-transparent via-violet-500 to-transparent"
      }`} />

      <p className="text-[0.68rem] font-bold uppercase tracking-widest text-[rgb(var(--muted))]">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-black ${textMap[accent]}`}>{value}</p>
      {subtitle && (
        <p className="mt-1.5 text-[0.7rem] text-[rgb(var(--muted))]">{subtitle}</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Section heading                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold tracking-tight text-[rgb(var(--fg))]">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-[rgb(var(--muted))]">{sub}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Bar chart (inline)                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
function BarChart({
  data,
  color,
  empty,
}: {
  data: DayPoint[];
  color: string;
  empty: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length || data.every((d) => d.value === 0))
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-xs text-[rgb(var(--muted))]">
        {empty}
      </div>
    );
  return (
    <div className="flex h-48 items-end gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 pb-4 pt-3">
      {data.map((s) => {
        const h = s.value > 0 ? Math.max((s.value / max) * 100, 10) : 2;
        return (
          <div key={s.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[0.6rem] font-bold text-[rgb(var(--muted))]">{s.value}</span>
            <div
              className={`w-full rounded-t-lg ${color} transition-all duration-500`}
              style={{ height: `${h}%` }}
            />
            <span className="text-[0.62rem] font-semibold text-[rgb(var(--fg))]">{s.day}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Horizontal bar                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
function HBar({
  label,
  value,
  max,
  pill,
  color,
}: {
  label?: string;
  value: number;
  max: number;
  pill?: React.ReactNode;
  color: string;
}) {
  const pct = Math.max((value / max) * 100, 2);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        {pill ? pill : <p className="text-xs font-semibold text-[rgb(var(--fg))]">{label}</p>}
        <span className="shrink-0 rounded-md bg-[rgb(var(--card2))] border border-[rgb(var(--border))] px-2 py-0.5 text-[0.68rem] font-bold text-[rgb(var(--fg))]">
          {value}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgb(var(--border))]">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  SVG icon set for action cards                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
const ActionIcons: Record<string, React.ReactNode> = {
  verification: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m-7 8a8 8 0 100-16 8 8 0 000 16z" />
    </svg>
  ),
  tutor: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20H7a2 2 0 01-2-2v-1a5 5 0 0110 0v1a2 2 0 01-2 2zM9 11a4 4 0 100-8 4 4 0 000 8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 20v-1a5 5 0 00-4-4.9M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  sos: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  audit: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  activity: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Quick action card                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
function ActionCard({
  href,
  title,
  sub,
  accent,
  badge,
  iconKey,
}: {
  href: string;
  title: string;
  sub: string;
  accent: string;
  badge?: number;
  iconKey: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-[rgb(var(--primary)/0.45)] hover:bg-[rgb(var(--card))] hover:shadow-[0_16px_40px_rgb(var(--shadow)/0.13)]"
    >
      <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl ${accent}`} />

      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-[rgb(var(--muted))] transition-colors duration-200 group-hover:text-[rgb(var(--fg))]">
            {ActionIcons[iconKey]}
          </span>
          <div>
            <p className="text-[0.82rem] font-bold text-[rgb(var(--fg))]">{title}</p>
            <p className="mt-0.5 text-[0.7rem] leading-4 text-[rgb(var(--muted))]">{sub}</p>
          </div>
        </div>

        {badge != null && badge > 0 && (
          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[0.62rem] font-black text-amber-700 dark:text-amber-400">
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Health metric tile                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */
function HealthTile({
  label,
  value,
  pct,
  color,
  trackColor,
}: {
  label: string;
  value: string;
  pct: number;
  color: string;
  trackColor: string;
}) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3.5">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <span className="text-[0.72rem] font-semibold text-[rgb(var(--muted))] leading-4">{label}</span>
        <span className={`text-sm font-black ${color} shrink-0`}>{value}</span>
      </div>
      <div className={`h-1.5 overflow-hidden rounded-full ${trackColor}`}>
        <div
          className={`h-full rounded-full ${color.replace("text-", "bg-").replace(" dark:text-emerald-300", "").replace(" dark:text-sky-300", "")} opacity-70 transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main page                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [queue, setQueue] = useState<QueueUser[]>([]);
  const [tutorApps, setTutorApps] = useState<TutorAppRow[]>([]);

  const [stats, setStats] = useState<OverviewStats>({
    totalUsers: 0,
    activeTutors: 0,
    sessionsThisWeek: 0,
    sosRequestsThisWeek: 0,
    pendingVerifications: 0,
    pendingTutorApps: 0,
    lockedUsers: 0,
    avgTutorRating: 0,
  });

  const [weeklySessions, setWeeklySessions] = useState<DayPoint[]>([]);
  const [weeklySos, setWeeklySos] = useState<DayPoint[]>([]);
  const [topSubjects, setTopSubjects] = useState<SubjectPoint[]>([]);
  const [sessionStatusBreakdown, setSessionStatusBreakdown] = useState<StatusPoint[]>([]);

  const pendingVerificationCount = useMemo(
    () => queue.filter((u) => u.verificationStatus === "PENDING_REVIEW").length,
    [queue]
  );
  const pendingTutorCount = useMemo(
    () => tutorApps.filter((a) => String(a.status || "").toUpperCase() === "PENDING").length,
    [tutorApps]
  );

  const maxTopSubjects = Math.max(1, ...topSubjects.map((s) => s.value));
  const maxStatusValue = Math.max(1, ...sessionStatusBreakdown.map((s) => s.value));

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [queueRes, tutorAppsRes, overviewRes, chartsRes] = await Promise.all([
        fetch("/api/admin/verification-queue", { cache: "no-store" }),
        fetch("/api/admin/tutor-applications", { cache: "no-store" }),
        fetch("/api/admin/analytics/overview", { cache: "no-store" }),
        fetch("/api/admin/analytics/charts", { cache: "no-store" }),
      ]);

      const queueData = await queueRes.json().catch(() => null);
      const tutorAppsData = await tutorAppsRes.json().catch(() => null);
      const overviewData = await overviewRes.json().catch(() => null);
      const chartsData = await chartsRes.json().catch(() => null);

      if (!queueRes.ok || !queueData?.success)
        throw new Error(queueData?.message || "Failed to load verification queue");
      if (!tutorAppsRes.ok || !tutorAppsData?.success)
        throw new Error(tutorAppsData?.message || "Failed to load tutor applications");
      if (!overviewRes.ok || !overviewData?.success)
        throw new Error(overviewData?.message || "Failed to load overview analytics");
      if (!chartsRes.ok || !chartsData?.success)
        throw new Error(chartsData?.message || "Failed to load chart analytics");

      setQueue(Array.isArray(queueData.users) ? queueData.users : []);
      setTutorApps(Array.isArray(tutorAppsData.applications) ? tutorAppsData.applications : []);
      setStats(overviewData.stats ?? {});
      setWeeklySessions(Array.isArray(chartsData.weeklySessions) ? chartsData.weeklySessions : []);
      setWeeklySos(Array.isArray(chartsData.weeklySos) ? chartsData.weeklySos : []);
      setTopSubjects(Array.isArray(chartsData.topSubjects) ? chartsData.topSubjects : []);
      setSessionStatusBreakdown(
        Array.isArray(chartsData.sessionStatusBreakdown) ? chartsData.sessionStatusBreakdown : []
      );
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const statCards = useMemo(
    () => [
      {
        label: "Total Users",
        value: stats.totalUsers,
        subtitle: "Registered TutorLink users",
        accent: "primary" as const,
      },
      {
        label: "Active Tutors",
        value: stats.activeTutors,
        subtitle: "Approved peer tutors",
        accent: "emerald" as const,
      },
      {
        label: "Sessions This Week",
        value: stats.sessionsThisWeek,
        subtitle: "Completed sessions",
        accent: "sky" as const,
      },
      {
        label: "SOS Requests",
        value: stats.sosRequestsThisWeek,
        subtitle: "Urgent help this week",
        accent: "rose" as const,
      },
      {
        label: "Pending Verifications",
        value: stats.pendingVerifications,
        subtitle: "Awaiting admin review",
        accent: "amber" as const,
      },
      {
        label: "Pending Tutor Apps",
        value: stats.pendingTutorApps,
        subtitle: "Applications in queue",
        accent: "violet" as const,
      },
      {
        label: "Locked Users",
        value: stats.lockedUsers,
        subtitle: "Accounts restricted",
        accent: "rose" as const,
      },
      {
        label: "Avg Tutor Rating",
        value: stats.avgTutorRating,
        subtitle: "Across rated tutors",
        accent: "emerald" as const,
      },
    ],
    [stats]
  );

  return (
    <div className="mx-auto mt-6 w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="space-y-7">

        {/* ── Header ── */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {/* Eyebrow */}
            <p className="mb-1.5 text-[0.65rem] font-black uppercase tracking-[0.2em] text-[rgb(var(--primary)/0.7)]">
              TutorLink &mdash; Admin
            </p>
            <h1 className="text-[1.6rem] font-black leading-tight tracking-tight text-[rgb(var(--fg))]">
              Dashboard
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-[rgb(var(--muted))]">
              Live overview of users, sessions, moderation queues, and platform health.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Live indicator */}
            <span className="flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[0.68rem] font-bold text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>

            <button onClick={load} type="button" className={softBtn} disabled={loading}>
              <svg className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        {/* ── Quick Actions ── */}
        <section className={shell}>
          <div className="px-6 py-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[rgb(var(--fg))]">Quick Actions</h2>
                <p className="mt-0.5 text-xs text-[rgb(var(--muted))]">
                  Administrative shortcuts for moderation, user management and reports.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
                Admin Tools
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ActionCard
                href="/admin/verification-queue"
                title="Verification Queue"
                sub="Review pending student verifications."
                accent="bg-amber-500"
                badge={pendingVerificationCount}
                iconKey="verification"
              />
              <ActionCard
                href="/admin/tutor-applications"
                title="Tutor Applications"
                sub="Approve or reject tutor onboarding."
                accent="bg-sky-500"
                badge={pendingTutorCount}
                iconKey="tutor"
              />
              <ActionCard
                href="/admin/users"
                title="Manage Users"
                sub="Search and manage platform users."
                accent="bg-violet-500"
                iconKey="users"
              />
              <ActionCard
                href="/admin/sos-moderation"
                title="SOS Moderation"
                sub="Review urgent help requests."
                accent="bg-rose-500"
                iconKey="sos"
              />
              <ActionCard
                href="/admin/user-reports"
                title="User Reports"
                sub="Review user-submitted reports."
                accent="bg-orange-500"
                iconKey="reports"
              />
              <ActionCard
                href="/admin/audit-logs"
                title="Audit Logs"
                sub="Inspect admin activity logs."
                accent="bg-slate-500"
                iconKey="audit"
              />
              <ActionCard
                href="/admin/reports"
                title="Activity Reports"
                sub="Generate system activity summaries."
                accent="bg-emerald-500"
                iconKey="activity"
              />
            </div>
          </div>
        </section>

        {/* ── Error ── */}
        {err && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <span className="text-lg">⚠️</span>
            {err}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Loading dashboard…
          </div>
        )}

        {!loading && !err && (
          <>
            {/* ── Overview stats ── */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-[rgb(var(--fg))]">Overview</h2>
                <span className="text-[0.65rem] text-[rgb(var(--muted))]">Live platform metrics</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map((c) => (
                  <StatCard key={c.label} label={c.label} value={c.value} subtitle={c.subtitle} accent={c.accent} />
                ))}
              </div>
            </section>

            {/* ── Charts row ── */}
            <section className="grid gap-5 lg:grid-cols-2">
              <div className={shell}>
                <div className="px-6 py-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <SectionHeading
                      title="Weekly Tutoring Sessions"
                      sub="Completed sessions over the last 7 days."
                    />
                    <span className="shrink-0 rounded-full border border-[rgb(var(--primary)/0.25)] bg-[rgb(var(--primary)/0.08)] px-2.5 py-1 text-[0.62rem] font-bold text-[rgb(var(--primary))]">
                      7-day
                    </span>
                  </div>
                  <BarChart
                    data={weeklySessions}
                    color="bg-[rgb(var(--primary)/0.75)]"
                    empty="No completed sessions in the last 7 days."
                  />
                </div>
              </div>

              <div className={shell}>
                <div className="px-6 py-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <SectionHeading
                      title="Weekly SOS Volume"
                      sub="SOS requests created over the last 7 days."
                    />
                    <span className="shrink-0 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[0.62rem] font-bold text-rose-600 dark:text-rose-300">
                      7-day
                    </span>
                  </div>
                  <BarChart
                    data={weeklySos}
                    color="bg-rose-500/70"
                    empty="No SOS activity recorded in the last 7 days."
                  />
                </div>
              </div>
            </section>

            {/* ── Subject & Status row ── */}
            <section className="grid gap-5 lg:grid-cols-2">
              <div className={shell}>
                <div className="px-6 py-5">
                  <SectionHeading
                    title="Top Subjects"
                    sub="Ranked by completed tutoring sessions."
                  />
                  {topSubjects.length === 0 ? (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-xs text-[rgb(var(--muted))]">
                      No subject data available yet.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {topSubjects.map((item) => (
                        <HBar
                          key={item.name}
                          label={item.name}
                          value={item.value}
                          max={maxTopSubjects}
                          color="bg-[rgb(var(--primary)/0.75)]"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={shell}>
                <div className="px-6 py-5">
                  <SectionHeading
                    title="Session Status Breakdown"
                    sub="Distribution of all session states in the system."
                  />
                  {sessionStatusBreakdown.length === 0 ? (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-xs text-[rgb(var(--muted))]">
                      No session status data available yet.
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {sessionStatusBreakdown.map((item) => {
                        const s = (item.status || "").toUpperCase();
                        const color =
                          s === "COMPLETED" ? "bg-emerald-500/70" :
                          s === "ACCEPTED"  ? "bg-sky-500/70" :
                          s === "CANCELLED" ? "bg-rose-500/70" :
                          "bg-amber-500/70";
                        return (
                          <HBar
                            key={item.status}
                            pill={<StatusPill status={item.status} />}
                            value={item.value}
                            max={maxStatusValue}
                            color={color}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── Bottom row: Satisfaction + Health ── */}
            <section className="grid gap-5 md:grid-cols-2">

              {/* ── Student Satisfaction ── */}
              <div className={shell}>
                <div className="px-6 py-5">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <SectionHeading
                      title="Student Satisfaction"
                      sub="Mock survey results from TutorLink students."
                    />
                    <span className="shrink-0 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-[rgb(var(--muted))]">
                      Sample data
                    </span>
                  </div>

                  {/* Score + stars */}
                  <div className="mb-5 flex items-center gap-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-4">
                    <div className="text-center">
                      <p className="text-4xl font-black leading-none text-[rgb(var(--fg))]">4.6</p>
                      <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-wider text-[rgb(var(--muted))]">out of 5</p>
                    </div>
                    <div className="h-10 w-px bg-[rgb(var(--border))]" />
                    <div>
                      {/* Star row */}
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4].map((i) => (
                          <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 fill-amber-400">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        {/* Half star */}
                        <svg viewBox="0 0 20 20" className="h-4 w-4">
                          <defs>
                            <linearGradient id="halfStar">
                              <stop offset="50%" stopColor="rgb(251 191 36)" />
                              <stop offset="50%" stopColor="rgb(var(--border))" />
                            </linearGradient>
                          </defs>
                          <path fill="url(#halfStar)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <p className="mt-1.5 text-[0.68rem] text-[rgb(var(--muted))]">Based on student surveys</p>
                    </div>
                  </div>

                  {/* Survey stats */}
                  <div className="space-y-3">
                    {[
                      { label: "Easier to find a tutor", pct: 92, color: "bg-emerald-500/65" },
                      { label: "Improved subject understanding", pct: 88, color: "bg-sky-500/65" },
                      { label: "Would recommend TutorLink", pct: 85, color: "bg-[rgb(var(--primary)/0.65)]" },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[0.72rem] text-[rgb(var(--muted))]">{item.label}</span>
                          <span className="text-[0.72rem] font-black text-[rgb(var(--fg))]">{item.pct}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--border))]">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Platform Health ── */}
              <div className={shell}>
                <div className="px-6 py-5">
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <SectionHeading
                      title="Platform Health"
                      sub="System & usage health indicators."
                    />
                    <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[0.62rem] font-bold text-emerald-700 dark:text-emerald-300">
                      Illustrative
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-4">
                      <p className="text-[0.65rem] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">System Uptime</p>
                      <p className="mt-1 text-3xl font-black text-emerald-700 dark:text-emerald-300">99.3%</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-emerald-500/15">
                        <div className="h-full w-[99.3%] rounded-full bg-emerald-500/60" />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3.5">
                      <p className="text-[0.62rem] font-bold uppercase tracking-widest text-[rgb(var(--muted))]">Avg Response</p>
                      <p className="mt-1 text-xl font-black text-[rgb(var(--primary))]">180 ms</p>
                      <p className="mt-0.5 text-[0.6rem] text-[rgb(var(--muted))]">↓ fast</p>
                    </div>

                    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3.5">
                      <p className="text-[0.62rem] font-bold uppercase tracking-widest text-[rgb(var(--muted))]">Bookings OK</p>
                      <p className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-300">95%</p>
                      <p className="mt-0.5 text-[0.6rem] text-[rgb(var(--muted))]">Successful rate</p>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-sky-500/20 bg-sky-500/8 px-4 py-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[0.62rem] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-400">Resolved Reports</p>
                          <p className="mt-0.5 text-2xl font-black text-sky-700 dark:text-sky-300">81%</p>
                        </div>
                        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 56 56">
                            <circle cx="28" cy="28" r="22" fill="none" stroke="rgb(var(--border))" strokeWidth="4" />
                            <circle cx="28" cy="28" r="22" fill="none" stroke="rgb(14 165 233 / 0.6)" strokeWidth="4" strokeLinecap="round"
                              strokeDasharray={`${0.81 * 138.2} 138.2`} />
                          </svg>
                          <span className="text-[0.6rem] font-black text-sky-700 dark:text-sky-300">81%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2.5 text-[0.66rem] leading-5 text-[rgb(var(--muted))]">
                    These values are illustrative and show how TutorLink&apos;s admin panel can surface performance, reliability and experience signals.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}