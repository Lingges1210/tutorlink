"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  FileWarning,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  User,
  CalendarDays,
  MessageSquareText,
  Paperclip,
  Search,
  Archive,
  Plus,
} from "lucide-react";

type ReportItem = {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  adminNotes: string | null;
  evidenceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  reportedUser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
  reviewedByAdmin: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

type ApiRes = {
  ok: boolean;
  reports?: ReportItem[];
  error?: string;
};

type ViewMode = "ACTIVE" | "PAST" | "ALL";

function niceLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClasses(status: string) {
  switch (status) {
    case "OPEN":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "IN_REVIEW":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "RESOLVED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "DISMISSED":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    default:
      return "border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] text-[rgb(var(--fg))]";
  }
}

function priorityClasses(priority: string) {
  switch (priority) {
    case "URGENT":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "HIGH":
      return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300";
    case "MEDIUM":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
    case "LOW":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";
    default:
      return "border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] text-[rgb(var(--fg))]";
  }
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "sky" | "emerald" | "rose";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/20 bg-amber-500/5"
      : tone === "sky"
      ? "border-sky-500/20 bg-sky-500/5"
      : tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/5"
      : tone === "rose"
      ? "border-rose-500/20 bg-rose-500/5"
      : "border-[rgb(var(--border))] bg-[rgb(var(--card))]";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs text-[rgb(var(--muted-foreground))]">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function isPastReport(report: ReportItem) {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (report.status === "RESOLVED" && report.resolvedAt) {
    return now - new Date(report.resolvedAt).getTime() > sevenDaysMs;
  }

  if (report.status === "DISMISSED") {
    return now - new Date(report.updatedAt).getTime() > sevenDaysMs;
  }

  return false;
}

function daysAgoLabel(dateString: string) {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffDays = Math.floor((now - then) / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function ViewTab({
  active,
  label,
  onClick,
  count,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition shadow-sm",
        active
          ? "border-[rgb(var(--fg))] bg-[rgb(var(--fg))] text-[rgb(var(--bg))]"
          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:bg-[rgb(var(--bg))]",
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "rounded-full px-2 py-0.5 text-xs",
          active
            ? "bg-[rgb(var(--bg))/0.15] text-[rgb(var(--bg))]"
            : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--muted-foreground))]",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

export default function MyReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("ACTIVE");
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 5;

  async function loadReports() {
    try {
      setLoading(true);
      setErr(null);

      const res = await fetch("/api/reports/my", {
        method: "GET",
        cache: "no-store",
      });

      const data: ApiRes = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to load reports");
      }

      setReports(data.reports || []);
    } catch (error: any) {
      setErr(error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function openEvidence(reportId: string) {
    try {
      setOpeningEvidenceId(reportId);

      const res = await fetch(`/api/reports/${reportId}/evidence`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.signedUrl) {
        throw new Error(data?.error || "Failed to open evidence");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      alert(error?.message || "Failed to open evidence");
    } finally {
      setOpeningEvidenceId(null);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, viewMode]);

  const counts = useMemo(() => {
    return {
      all: reports.length,
      open: reports.filter((r) => r.status === "OPEN").length,
      review: reports.filter((r) => r.status === "IN_REVIEW").length,
      resolved: reports.filter((r) => r.status === "RESOLVED").length,
      dismissed: reports.filter((r) => r.status === "DISMISSED").length,
      active: reports.filter((r) => !isPastReport(r)).length,
      past: reports.filter((r) => isPastReport(r)).length,
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();

    return reports.filter((report) => {
      const past = isPastReport(report);

      if (viewMode === "ACTIVE" && past) return false;
      if (viewMode === "PAST" && !past) return false;

      if (!q) return true;

      const haystack = [
        report.subject,
        report.description,
        report.category,
        report.status,
        report.priority,
        report.reportedUser?.name ?? "",
        report.reportedUser?.email ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [reports, query, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredReports.slice(start, end);
  }, [filteredReports, currentPage]);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 min-w-0 space-y-3">
  <Link
    href="/dashboard/student"
    className="inline-flex items-center gap-2 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--primary))]"
  >
    <ArrowLeft size={14} />
    Back
  </Link>
</div>

      <section className="mb-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-500/10 p-3">
              <FileWarning className="h-6 w-6 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Reports</h1>
              <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                Track your submitted complaints, appeals, and issue reports in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
            href="/report"
            className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[rgb(var(--bg))]"
          >
            <Plus className="h-4 w-4" />
            Submit New Report
          </Link>

                      <button
            type="button"
            onClick={loadReports}
            disabled={loading}
            className={[
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              "bg-[rgb(var(--fg))] text-[rgb(var(--bg))]",
              "shadow-[0_10px_30px_rgb(var(--shadow)/0.12)]",
              "hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgb(var(--shadow)/0.18)]",
              "active:translate-y-0 active:scale-[0.98]",
              "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_10px_30px_rgb(var(--shadow)/0.12)]",
            ].join(" ")}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total" value={counts.all} />
        <MetricCard label="Open" value={counts.open} tone="amber" />
        <MetricCard label="In Review" value={counts.review} tone="sky" />
        <MetricCard label="Resolved" value={counts.resolved} tone="emerald" />
        <MetricCard label="Dismissed" value={counts.dismissed} tone="rose" />
      </section>

      {!loading && !err && reports.length > 0 ? (
        <section className="mb-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <ViewTab
                active={viewMode === "ACTIVE"}
                label="Active"
                count={counts.active}
                onClick={() => setViewMode("ACTIVE")}
              />
              <ViewTab
                active={viewMode === "PAST"}
                label="Past"
                count={counts.past}
                onClick={() => setViewMode("PAST")}
              />
              <ViewTab
                active={viewMode === "ALL"}
                label="All"
                count={counts.all}
                onClick={() => setViewMode("ALL")}
              />
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--muted-foreground))]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search subject, description, category..."
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-transparent py-3 pl-10 pr-4 text-sm outline-none"
              />
            </div>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-16">
          <div className="flex items-center justify-center gap-2 text-sm text-[rgb(var(--muted-foreground))]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your reports...
          </div>
        </div>
      ) : err ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-700 dark:text-rose-300">
          {err}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgb(var(--bg-secondary))]">
            <ShieldAlert className="h-6 w-6 text-[rgb(var(--muted-foreground))]" />
          </div>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            You haven’t submitted any reports yet.
          </p>
          <Link
            href="/report"
            className="mt-4 inline-flex rounded-2xl border border-[rgb(var(--border))] px-4 py-2.5 text-sm font-medium hover:bg-[rgb(var(--bg))]"
          >
            Submit your first report
          </Link>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgb(var(--bg-secondary))]">
            <Archive className="h-6 w-6 text-[rgb(var(--muted-foreground))]" />
          </div>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            {viewMode === "ACTIVE"
              ? "No active reports match your search."
              : viewMode === "PAST"
              ? "No past reports match your search."
              : "No reports match your search."}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-[rgb(var(--muted-foreground))]">
            Showing {paginatedReports.length} of {filteredReports.length} reports
          </div>

          <div className="space-y-5">
            {paginatedReports.map((report) => {
              const archived = isPastReport(report);

              return (
                <article
                  key={report.id}
                  className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(
                            report.status
                          )}`}
                        >
                          {niceLabel(report.status)}
                        </span>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${priorityClasses(
                            report.priority
                          )}`}
                        >
                          {niceLabel(report.priority)} Priority
                        </span>

                        <span className="inline-flex rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-3 py-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
                          {niceLabel(report.category)}
                        </span>

                        {archived ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-3 py-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
                            <Archive className="h-3.5 w-3.5" />
                            Archived
                          </span>
                        ) : null}
                      </div>

                      <h2 className="text-lg font-semibold">{report.subject}</h2>

                      <div className="mt-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] p-4 text-sm leading-6 text-[rgb(var(--muted-foreground))]">
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted-foreground))]">
                          <MessageSquareText className="h-4 w-4" />
                          Your Description
                        </div>
                        {report.description}
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] p-4">
                          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted-foreground))]">
                            <CalendarDays className="h-4 w-4" />
                            Submitted
                          </div>
                          <div className="text-sm font-medium">
                            {new Date(report.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] p-4">
                          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted-foreground))]">
                            <User className="h-4 w-4" />
                            Reported User
                          </div>
                          <div className="text-sm">
                            {report.reportedUser ? (
                              <>
                                <div className="font-medium">
                                  {report.reportedUser.name || "Unnamed User"}
                                </div>
                                <div className="text-[rgb(var(--muted-foreground))]">
                                  {report.reportedUser.email}
                                </div>
                              </>
                            ) : (
                              <span className="text-[rgb(var(--muted-foreground))]">
                                Not specified
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] p-4">
                          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted-foreground))]">
                            <Paperclip className="h-4 w-4" />
                            Evidence
                          </div>

                          {report.evidenceUrl ? (
                            <button
                              type="button"
                              onClick={() => openEvidence(report.id)}
                              disabled={openingEvidenceId === report.id}
                              className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-sm font-medium hover:bg-[rgb(var(--bg))] disabled:opacity-60"
                            >
                              {openingEvidenceId === report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ExternalLink className="h-4 w-4" />
                              )}
                              View Evidence
                            </button>
                          ) : (
                            <span className="text-sm text-[rgb(var(--muted-foreground))]">
                              No evidence attached
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <aside className="w-full xl:w-[330px]">
                      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted-foreground))]">
                          <ShieldAlert className="h-4 w-4" />
                          Admin Response
                        </div>

                        {report.adminNotes ? (
                          <div className="rounded-2xl bg-[rgb(var(--card))] p-4 text-sm leading-6">
                            {report.adminNotes}
                          </div>
                        ) : (
                          <div className="rounded-2xl bg-[rgb(var(--card))] p-4 text-sm text-[rgb(var(--muted-foreground))]">
                            No admin notes yet.
                          </div>
                        )}

                        <div className="mt-4 space-y-2 text-xs text-[rgb(var(--muted-foreground))]">
                          {report.reviewedByAdmin ? (
                            <div>
                              Reviewed by:{" "}
                              <span className="font-medium text-[rgb(var(--fg))]">
                                {report.reviewedByAdmin.name || report.reviewedByAdmin.email}
                              </span>
                            </div>
                          ) : null}

                          {report.resolvedAt ? (
                            <div>
                              Resolved at:{" "}
                              <span className="font-medium text-[rgb(var(--fg))]">
                                {new Date(report.resolvedAt).toLocaleString()} (
                                {daysAgoLabel(report.resolvedAt)})
                              </span>
                            </div>
                          ) : null}

                          <div>
                            Last updated:{" "}
                            <span className="font-medium text-[rgb(var(--fg))]">
                              {new Date(report.updatedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {report.evidenceUrl ? (
                        <div className="mt-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
                          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[rgb(var(--muted-foreground))]">
                            Attachment
                          </div>
                          <button
                            type="button"
                            onClick={() => openEvidence(report.id)}
                            disabled={openingEvidenceId === report.id}
                            className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--fg))] hover:underline disabled:opacity-60"
                          >
                            {openingEvidenceId === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ExternalLink className="h-4 w-4" />
                            )}
                            Open uploaded evidence
                          </button>
                        </div>
                      ) : null}
                    </aside>
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-2xl border border-[rgb(var(--border))] px-4 py-2 text-sm disabled:opacity-50"
              >
                Prev
              </button>

              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={[
                    "rounded-2xl px-4 py-2 text-sm font-medium border",
                    currentPage === page
                      ? "border-[rgb(var(--fg))] bg-[rgb(var(--fg))] text-[rgb(var(--bg))]"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:bg-[rgb(var(--bg))]",
                  ].join(" ")}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-2xl border border-[rgb(var(--border))] px-4 py-2 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}