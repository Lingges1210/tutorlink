"use client";

import { useEffect, useMemo, useState } from "react";
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

const cardShell =
  "rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.72)] shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]";

const softBtn =
  "rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.65)] disabled:opacity-60 disabled:cursor-not-allowed";

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[rgb(var(--muted))]">{label}</span>
      <span className="font-bold text-[rgb(var(--fg))]">{value}</span>
    </div>
  );
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

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
      const qs = new URLSearchParams({
        from,
        to,
      });

      const res = await fetch(`/api/admin/reports/activity-summary?${qs.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load report");
      }

      setReport(data.report ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const csvHref = useMemo(() => {
    const qs = new URLSearchParams({
      from,
      to,
      format: "csv",
    });
    return `/api/admin/reports/activity-summary?${qs.toString()}`;
  }, [from, to]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className={`${cardShell} p-4 sm:p-6`}>
          <header className="mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
                  Activity Summary Report
                </h1>
                <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                  Generate an administrative summary across users, tutors, sessions, SOS activity,
                  and moderation trends.
                </p>
              </div>

              <div className="flex items-center gap-2">
  <a href={csvHref} className={softBtn}>
    Download CSV
  </a>

  <a
    href={`/api/admin/reports/activity-summary?from=${from}&to=${to}&format=pdf`}
    className={softBtn}
  >
    Download PDF
  </a>

  <Link href="/admin" className={softBtn}>
    Back to Admin
  </Link>
</div>
            </div>
          </header>

          <div className="mb-6 grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[rgb(var(--muted))]">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[rgb(var(--muted))]">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={load}
                className="rounded-md bg-[rgb(var(--primary))] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Report"}
              </button>
            </div>
          </div>

          {err && (
            <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-100 px-3 py-3 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {err}
            </div>
          )}

          {loading && <div className="text-xs text-[rgb(var(--muted2))]">Loading report…</div>}

          {!loading && !err && report && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-xs text-[rgb(var(--muted))]">
                Period:{" "}
                <span className="font-semibold text-[rgb(var(--fg))]">
                  {new Date(report.from).toLocaleString()} → {new Date(report.to).toLocaleString()}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <section className={cardShell}>
                  <div className="px-5 py-4">
                    <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">User & Tutor Summary</h2>
                    <div className="mt-4 grid gap-3 text-xs">
                      <MetricRow label="New Users" value={report.summary.newUsers} />
                      <MetricRow label="Verified Users" value={report.summary.verifiedUsers} />
                      <MetricRow
                        label="Rejected Verifications"
                        value={report.summary.rejectedVerifications}
                      />
                      <MetricRow
                        label="Approved Tutor Applications"
                        value={report.summary.approvedTutorApps}
                      />
                      <MetricRow
                        label="Rejected Tutor Applications"
                        value={report.summary.rejectedTutorApps}
                      />
                      <MetricRow
                        label="Pending Tutor Applications"
                        value={report.summary.pendingTutorApps}
                      />
                      <MetricRow label="Locked Users" value={report.summary.lockedUsers} />
                    </div>
                  </div>
                </section>

                <section className={cardShell}>
                  <div className="px-5 py-4">
                    <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
                      Session & SOS Summary
                    </h2>
                    <div className="mt-4 grid gap-3 text-xs">
                      <MetricRow
                        label="Completed Sessions"
                        value={report.summary.completedSessions}
                      />
                      <MetricRow
                        label="Accepted Sessions"
                        value={report.summary.acceptedSessions}
                      />
                      <MetricRow
                        label="Cancelled Sessions"
                        value={report.summary.cancelledSessions}
                      />
                      <MetricRow
                        label="Total SOS Requests"
                        value={report.summary.totalSosRequests}
                      />
                      <MetricRow
                        label="Resolved SOS Requests"
                        value={report.summary.resolvedSosRequests}
                      />
                      <MetricRow
                        label="Average Tutor Rating"
                        value={report.summary.avgTutorRating}
                      />
                    </div>
                  </div>
                </section>
              </div>

              <section className={cardShell}>
                <div className="px-5 py-4">
                  <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Top Subjects</h2>

                  {report.topSubjects.length === 0 ? (
                    <div className="mt-4 text-xs text-[rgb(var(--muted2))]">
                      No subject activity in this period.
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-[rgb(var(--border))]">
                      <table className="min-w-full text-left">
                        <thead className="bg-[rgb(var(--card2))]">
                          <tr className="text-[0.7rem] uppercase tracking-wide text-[rgb(var(--muted2))]">
                            <th className="px-4 py-3">Subject</th>
                            <th className="px-4 py-3 text-right">Completed Sessions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgb(var(--border))]">
                          {report.topSubjects.map((item) => (
                            <tr key={item.name}>
                              <td className="px-4 py-3 text-sm text-[rgb(var(--fg))]">
                                {item.name}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-[rgb(var(--fg))]">
                                {item.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}