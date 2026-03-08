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

type DayPoint = {
  day: string;
  value: number;
};

type SubjectPoint = {
  name: string;
  value: number;
};

type StatusPoint = {
  status: string;
  value: number;
};

const cardShell =
  "rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.72)] shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]";

const softBtn =
  "rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.65)] disabled:opacity-60 disabled:cursor-not-allowed";

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.72)] px-5 py-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
      <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[rgb(var(--primary)/0.18)] blur-2xl" />
      <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[rgb(var(--fg))]">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-[rgb(var(--muted))]">{subtitle}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status || "").toUpperCase();

  const cls =
    s === "COMPLETED"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : s === "ACCEPTED"
      ? "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-400"
      : s === "CANCELLED"
      ? "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400"
      : "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[0.7rem] font-semibold ${cls}`}>
      {s}
    </span>
  );
}

function ActionLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--primary))]"
    >
      {children}
    </Link>
  );
}

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

  const maxWeeklySessions = Math.max(1, ...weeklySessions.map((s) => s.value));
  const maxWeeklySos = Math.max(1, ...weeklySos.map((s) => s.value));
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

      if (!queueRes.ok || !queueData?.success) {
        throw new Error(queueData?.message || "Failed to load verification queue");
      }

      if (!tutorAppsRes.ok || !tutorAppsData?.success) {
        throw new Error(tutorAppsData?.message || "Failed to load tutor applications");
      }

      if (!overviewRes.ok || !overviewData?.success) {
        throw new Error(overviewData?.message || "Failed to load overview analytics");
      }

      if (!chartsRes.ok || !chartsData?.success) {
        throw new Error(chartsData?.message || "Failed to load chart analytics");
      }

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

  useEffect(() => {
    load();
  }, []);

  const statCards = useMemo(
    () => [
      { label: "Total Users", value: stats.totalUsers, subtitle: "Registered TutorLink users" },
      { label: "Active Tutors", value: stats.activeTutors, subtitle: "Approved peer tutors" },
      {
        label: "Sessions This Week",
        value: stats.sessionsThisWeek,
        subtitle: "Completed peer tutoring sessions",
      },
      {
        label: "SOS Requests This Week",
        value: stats.sosRequestsThisWeek,
        subtitle: "Urgent academic help requests",
      },
      {
        label: "Pending Verifications",
        value: stats.pendingVerifications,
        subtitle: "Users awaiting admin review",
      },
      {
        label: "Pending Tutor Apps",
        value: stats.pendingTutorApps,
        subtitle: "Tutor applications awaiting review",
      },
      {
        label: "Locked Users",
        value: stats.lockedUsers,
        subtitle: "Accounts restricted by admin",
      },
      {
        label: "Avg Tutor Rating",
        value: stats.avgTutorRating,
        subtitle: "Average from rated tutors",
      },
    ],
    [stats]
  );

  return (
    <div className="mx-auto mt-6 w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">Admin Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">
              Overview of TutorLink users, activity, moderation workflows, and live platform trends.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ActionLink href="/admin/verification-queue">
              Verification Queue
              {pendingVerificationCount > 0 && (
                <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700 dark:text-amber-400">
                  {pendingVerificationCount}
                </span>
              )}
            </ActionLink>

            <ActionLink href="/admin/tutor-applications">
              Tutor Applications
              {pendingTutorCount > 0 && (
                <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700 dark:text-amber-400">
                  {pendingTutorCount}
                </span>
              )}
            </ActionLink>

            <ActionLink href="/admin/users">Manage Users</ActionLink>
            <ActionLink href="/admin/audit-logs">Audit Logs</ActionLink>
            <ActionLink href="/admin/reports">Activity Reports</ActionLink>
            <ActionLink href="/admin/user-reports">User Reports</ActionLink>

            <button onClick={load} type="button" className={softBtn} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {err && (
          <div className="rounded-2xl border border-rose-300 bg-rose-100 px-4 py-3 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {err}
          </div>
        )}

        {loading && <div className="text-xs text-[rgb(var(--muted2))]">Loading dashboard…</div>}

        {!loading && !err && (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Overview</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => (
                  <StatCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    subtitle={card.subtitle}
                  />
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <section className={cardShell}>
                <div className="px-5 py-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
                        Weekly Tutoring Sessions
                      </h2>
                      <p className="text-xs text-[rgb(var(--muted))]">
                        Completed tutoring sessions over the last 7 days.
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[0.65rem] font-semibold text-emerald-700 dark:text-emerald-300">
                      Live weekly data
                    </span>
                  </div>

                  {weeklySessions.length === 0 || weeklySessions.every((s) => s.value === 0) ? (
                    <div className="mt-4 flex h-52 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-sm text-[rgb(var(--muted))]">
                      No completed sessions recorded in the last 7 days.
                    </div>
                  ) : (
                    <div className="mt-4 flex h-52 items-end gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 pb-4 pt-3">
                      {weeklySessions.map((s) => {
                        const height =
                          s.value > 0 ? Math.max((s.value / maxWeeklySessions) * 100, 12) : 0;

                        return (
                          <div
                            key={s.day}
                            className="flex h-full flex-1 flex-col items-center justify-end"
                          >
                            <div
                              className="mb-1 w-full rounded-t-lg bg-[rgb(var(--primary))] opacity-80"
                              style={{ height: `${height}%` }}
                            />
                            <span className="mt-1 text-[0.65rem] font-semibold text-[rgb(var(--fg))]">
                              {s.day}
                            </span>
                            <span className="text-[0.6rem] text-[rgb(var(--muted))]">
                              {s.value} sessions
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section className={cardShell}>
                <div className="px-5 py-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
                        Weekly SOS Volume
                      </h2>
                      <p className="text-xs text-[rgb(var(--muted))]">
                        SOS requests created over the last 7 days.
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-[0.65rem] font-semibold text-sky-700 dark:text-sky-300">
                      Live weekly data
                    </span>
                  </div>

                  {weeklySos.length === 0 || weeklySos.every((s) => s.value === 0) ? (
                    <div className="mt-4 flex h-52 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-sm text-[rgb(var(--muted))]">
                      No SOS activity recorded in the last 7 days.
                    </div>
                  ) : (
                    <div className="mt-4 flex h-52 items-end gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 pb-4 pt-3">
                      {weeklySos.map((s) => {
                        const height =
                          s.value > 0 ? Math.max((s.value / maxWeeklySos) * 100, 12) : 0;

                        return (
                          <div
                            key={s.day}
                            className="flex h-full flex-1 flex-col items-center justify-end"
                          >
                            <div
                              className="mb-1 w-full rounded-t-lg bg-sky-500/80"
                              style={{ height: `${height}%` }}
                            />
                            <span className="mt-1 text-[0.65rem] font-semibold text-[rgb(var(--fg))]">
                              {s.day}
                            </span>
                            <span className="text-[0.6rem] text-[rgb(var(--muted))]">
                              {s.value} SOS
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <section className={cardShell}>
                <div className="px-5 py-4">
                  <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Top Subjects</h2>
                  <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                    Subjects ranked by completed tutoring sessions.
                  </p>

                  {topSubjects.length === 0 ? (
                    <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-sm text-[rgb(var(--muted))]">
                      No subject data available yet.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {topSubjects.map((item) => (
                        <div key={item.name} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-[rgb(var(--fg))]">
                              {item.name}
                            </p>
                            <p className="text-[0.7rem] text-[rgb(var(--muted))]">{item.value}</p>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--border))]">
                            <div
                              className="h-full rounded-full bg-[rgb(var(--primary))] opacity-80"
                              style={{ width: `${(item.value / maxTopSubjects) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className={cardShell}>
                <div className="px-5 py-4">
                  <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
                    Session Status Breakdown
                  </h2>
                  <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                    Distribution of all session states in the system.
                  </p>

                  {sessionStatusBreakdown.length === 0 ? (
                    <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-sm text-[rgb(var(--muted))]">
                      No session status data available yet.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {sessionStatusBreakdown.map((item) => (
                        <div key={item.status} className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <StatusPill status={item.status} />
                            <p className="text-[0.7rem] text-[rgb(var(--muted))]">{item.value}</p>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--border))]">
                            <div
                              className="h-full rounded-full bg-[rgb(var(--primary))] opacity-80"
                              style={{ width: `${(item.value / maxStatusValue) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <section className={cardShell}>
                <div className="px-5 py-4">
                  <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
                    Student Satisfaction (Mock Survey)
                  </h2>
                  <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                    Sample survey results from students who used TutorLink.
                  </p>

                  <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgb(var(--primary)/0.15)]">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-[rgb(var(--card2))] text-center text-sm font-bold text-emerald-700 dark:text-emerald-200">
                        4.6
                        <span className="ml-0.5 text-[0.6rem] font-semibold text-[rgb(var(--muted))]">
                          /5
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-[rgb(var(--muted))]">
                      <p className="font-semibold text-[rgb(var(--fg))]">Key highlights (sample data):</p>
                      <ul className="list-disc space-y-1 pl-4">
                        <li>92% found it easier to connect with a suitable tutor.</li>
                        <li>88% agreed sessions improved subject understanding.</li>
                        <li>85% would recommend TutorLink to a friend.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              <section className={cardShell}>
                <div className="px-5 py-4">
                  <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
                    Platform Health Snapshot
                  </h2>
                  <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                    High-level mock indicators for system & usage health.
                  </p>

                  <div className="mt-4 grid gap-3 text-xs text-[rgb(var(--fg))]">
                    <div className="flex items-center justify-between">
                      <span className="text-[rgb(var(--muted))]">System Uptime</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-200">99.3%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[rgb(var(--muted))]">Average Response Time</span>
                      <span className="font-bold text-[rgb(var(--primary))]">180 ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[rgb(var(--muted))]">Successful Bookings</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-200">95%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[rgb(var(--muted))]">Resolved Reports</span>
                      <span className="font-bold text-[rgb(var(--primary))]">81%</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-[0.7rem] leading-5 text-[rgb(var(--muted))]">
                    This section is intentionally based on fake but realistic values to demonstrate
                    how TutorLink&apos;s admin panel can support monitoring of performance,
                    reliability and student experience.
                  </div>
                </div>
              </section>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
