"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  RefreshCcw,
  Search,
  ShieldAlert,
  Unlock,
  X,
} from "lucide-react";

type ReportRow = {
  id: string;
  category: string;
  status: string;
  priority: string;
  subject: string;
  description: string;
  evidenceUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  reporterUser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  reportedUser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    accountLockStatus: "ACTIVE" | "LOCKED";
    lockedAt?: string | null;
    lockReason?: string | null;
  } | null;
  adminNotes?: string | null;
};

type ViewMode = "ACTIVE" | "PAST" | "ALL";

function badgeClasses(value: string, kind: "status" | "priority") {
  if (kind === "status") {
    switch (value) {
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

  switch (value) {
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

function niceLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPastReport(report: ReportRow) {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (report.status === "RESOLVED" && report.resolvedAt) {
    return now - new Date(report.resolvedAt).getTime() > sevenDaysMs;
  }

  if (report.status === "DISMISSED") {
    const fallbackDate = report.updatedAt || report.createdAt;
    return now - new Date(fallbackDate).getTime() > sevenDaysMs;
  }

  return false;
}

function ViewTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-sm transition",
        active
          ? "border-[rgb(var(--fg))] bg-[rgb(var(--fg))] text-[rgb(var(--bg))]"
          : "border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--card))]",
      ].join(" ")}
    >
      <span>{label}</span>
      <span
        className={[
          "rounded-full px-2 py-0.5 text-xs",
          active
            ? "bg-[rgb(var(--bg))/0.15] text-[rgb(var(--bg))]"
            : "bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))]",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const styles =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
      : tone === "danger"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"
      : tone === "warning"
      ? "border-orange-500/30 bg-orange-500/10 text-orange-700 hover:bg-orange-500/15 dark:text-orange-300"
      : "border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--card))]";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50",
        styles,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function AdminUserReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("ACTIVE");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const PAGE_SIZE = 5;

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/user-reports", { cache: "no-store" });
      const data = await res.json();

      const nextRows = data?.reports || [];
      setRows(nextRows);

      if (selectedReport) {
        const fresh = nextRows.find((r: ReportRow) => r.id === selectedReport.id);
        if (fresh) {
          setSelectedReport(fresh);
          setAdminNotes(fresh.adminNotes || "");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function openEvidence(reportId: string) {
    try {
      setOpeningEvidenceId(reportId);

      const res = await fetch(`/api/admin/user-reports/${reportId}/evidence`, {
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

  async function updateStatus(id: string, status: string) {
    setSavingId(id);
    try {
      await fetch(`/api/admin/user-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } finally {
      setSavingId(null);
    }
  }

  function openDetails(report: ReportRow) {
    setSelectedReport(report);
    setAdminNotes(report.adminNotes || "");
  }

  async function saveAdminUpdate(id: string, payload: Record<string, any>) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/user-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update report");
      }

      await load();
      setSelectedReport(data.report);
      setAdminNotes(data.report.adminNotes || "");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleUserLock() {
    if (!selectedReport?.reportedUser?.id) return;

    const isLocked = selectedReport.reportedUser.accountLockStatus === "LOCKED";
    const url = isLocked
      ? `/api/admin/users/${selectedReport.reportedUser.id}/unlock`
      : `/api/admin/users/${selectedReport.reportedUser.id}/lock`;

    setActionLoading(true);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: `Action taken from report: ${selectedReport.subject}`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update user lock status");
      }

      await load();

      if (selectedReport.reportedUser) {
        setSelectedReport({
          ...selectedReport,
          reportedUser: {
            ...selectedReport.reportedUser,
            accountLockStatus: isLocked ? "ACTIVE" : "LOCKED",
          },
        });
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to update lock status");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [q, viewMode]);

  const counts = useMemo(() => {
    return {
      all: rows.length,
      active: rows.filter((r) => !isPastReport(r)).length,
      past: rows.filter((r) => isPastReport(r)).length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase();

    return rows.filter((row) => {
      const past = isPastReport(row);

      if (viewMode === "ACTIVE" && past) return false;
      if (viewMode === "PAST" && !past) return false;

      if (!query) return true;

      const haystack = [
        row.subject,
        row.description,
        row.category,
        row.status,
        row.priority,
        row.reporterUser?.name ?? "",
        row.reporterUser?.email ?? "",
        row.reportedUser?.name ?? "",
        row.reportedUser?.email ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rows, q, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredRows.slice(start, end);
  }, [filteredRows, currentPage]);

  const pageNumbers = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [totalPages]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-red-500/10 p-3">
            <ShieldAlert className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Reports</h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
              Review complaints, appeals, and reported incidents from students and tutors.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[rgb(var(--card))] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="mb-5 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
        <div className="grid gap-4 xl:grid-cols-[auto_1fr] xl:items-center xl:gap-5">
          <div className="flex flex-wrap gap-3">
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

          <div className="flex h-12 w-full min-w-0 items-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-4 transition focus-within:border-[rgb(var(--fg))] focus-within:bg-[rgb(var(--card))]">
            <Search className="h-4 w-4 shrink-0 text-[rgb(var(--muted-foreground))]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subject, description, reporter..."
              className="w-full min-w-0 bg-transparent pl-3 text-sm outline-none placeholder:text-[rgb(var(--muted-foreground))]"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex min-h-[230px] items-center justify-center px-6 py-10">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] shadow-sm">
                {viewMode === "ACTIVE" ? (
                  <AlertCircle className="h-6 w-6 text-[rgb(var(--muted-foreground))]" />
                ) : viewMode === "PAST" ? (
                  <Archive className="h-6 w-6 text-[rgb(var(--muted-foreground))]" />
                ) : (
                  <FileText className="h-6 w-6 text-[rgb(var(--muted-foreground))]" />
                )}
              </div>

              <h3 className="text-lg font-semibold text-[rgb(var(--fg))]">
                {viewMode === "ACTIVE"
                  ? "No active reports"
                  : viewMode === "PAST"
                  ? "No past reports"
                  : "No reports found"}
              </h3>

              <p className="mt-2 max-w-lg text-sm leading-6 text-[rgb(var(--muted-foreground))]">
                {viewMode === "ACTIVE"
                  ? "There are currently no active user reports that need moderation."
                  : viewMode === "PAST"
                  ? "Archived and older resolved reports will appear here once reports have been reviewed over time."
                  : "No reports matched the current search or selected filters."}
              </p>

              {(q || viewMode !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setViewMode("ALL");
                  }}
                  className="mt-5 inline-flex items-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-4 py-2 text-sm font-medium transition hover:bg-[rgb(var(--card))]"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-4 py-3 text-sm text-[rgb(var(--muted-foreground))]">
              Showing {paginatedRows.length} of {filteredRows.length} reports
            </div>

            <table className="min-w-full text-sm">
              <thead className="border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))]">
                <tr>
                  <th className="px-4 py-3 text-left">Subject</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Reporter</th>
                  <th className="px-4 py-3 text-left">Reported User</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Evidence</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => {
                  const archived = isPastReport(row);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => openDetails(row)}
                      className="cursor-pointer border-b border-[rgb(var(--border))] align-top transition hover:bg-[rgb(var(--bg-secondary))]"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[rgb(var(--fg))]">{row.subject}</div>
                        <div className="mt-1 max-w-md text-xs text-[rgb(var(--muted-foreground))]">
                          {row.description}
                        </div>
                        {archived ? (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-2.5 py-1 text-[11px] text-[rgb(var(--muted-foreground))]">
                            <Archive className="h-3.5 w-3.5" />
                            Archived
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-4">{niceLabel(row.category)}</td>

                      <td className="px-4 py-4">
                        <div>{row.reporterUser.name || "Unnamed"}</div>
                        <div className="text-xs text-[rgb(var(--muted-foreground))]">
                          {row.reporterUser.email}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {row.reportedUser ? (
                          <>
                            <div>{row.reportedUser.name || "Unnamed"}</div>
                            <div className="text-xs text-[rgb(var(--muted-foreground))]">
                              {row.reportedUser.email}
                            </div>
                          </>
                        ) : (
                          <span className="text-[rgb(var(--muted-foreground))]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(
                            row.priority,
                            "priority"
                          )}`}
                        >
                          {niceLabel(row.priority)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(
                            row.status,
                            "status"
                          )}`}
                        >
                          {niceLabel(row.status)}
                        </span>
                      </td>

                      <td
                        className="px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.evidenceUrl ? (
                          <button
                            onClick={() => openEvidence(row.id)}
                            disabled={openingEvidenceId === row.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-3 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[rgb(var(--card))] hover:shadow-md disabled:opacity-60"
                          >
                            {openingEvidenceId === row.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ExternalLink className="h-3.5 w-3.5" />
                            )}
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-[rgb(var(--muted-foreground))]">
                            None
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">{new Date(row.createdAt).toLocaleString()}</td>

                      <td
                        className="px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            onClick={() => updateStatus(row.id, "IN_REVIEW")}
                            disabled={savingId === row.id}
                          >
                            In Review
                          </ActionButton>

                          <ActionButton
                            onClick={() => updateStatus(row.id, "RESOLVED")}
                            disabled={savingId === row.id}
                            tone="success"
                          >
                            Resolve
                          </ActionButton>

                          <ActionButton
                            onClick={() => updateStatus(row.id, "DISMISSED")}
                            disabled={savingId === row.id}
                            tone="danger"
                          >
                            Dismiss
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-[rgb(var(--border))] px-4 py-4">
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
                      "rounded-2xl border px-4 py-2 text-sm font-medium",
                      currentPage === page
                        ? "border-[rgb(var(--fg))] bg-[rgb(var(--fg))] text-[rgb(var(--bg))]"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] hover:bg-[rgb(var(--card))]",
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
          </div>
        )}
      </div>

      {selectedReport ? (
        <div className="mt-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Report Details</h2>
              <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                Review the report and take moderation action.
              </p>
            </div>

            <button
              onClick={() => setSelectedReport(null)}
              className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] px-4 py-2 text-sm hover:bg-[rgb(var(--bg-secondary))]"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(
                      selectedReport.status,
                      "status"
                    )}`}
                  >
                    {niceLabel(selectedReport.status)}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClasses(
                      selectedReport.priority,
                      "priority"
                    )}`}
                  >
                    {niceLabel(selectedReport.priority)} Priority
                  </span>
                  <span className="inline-flex rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-3 py-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
                    {niceLabel(selectedReport.category)}
                  </span>
                  {isPastReport(selectedReport) ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-3 py-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
                      <Archive className="h-3.5 w-3.5" />
                      Archived
                    </span>
                  ) : null}
                </div>

                <div className="text-xs text-[rgb(var(--muted-foreground))]">Subject</div>
                <div className="mt-1 font-semibold">{selectedReport.subject}</div>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                <div className="text-xs text-[rgb(var(--muted-foreground))]">Description</div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {selectedReport.description}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                <div className="text-xs text-[rgb(var(--muted-foreground))]">Reporter</div>
                <div className="mt-2 font-medium">
                  {selectedReport.reporterUser.name || "Unnamed"} (
                  {selectedReport.reporterUser.email})
                </div>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                <div className="mb-2 flex items-center gap-2 text-xs text-[rgb(var(--muted-foreground))]">
                  <FileText className="h-4 w-4" />
                  Evidence
                </div>

                {selectedReport.evidenceUrl ? (
                  <button
                    type="button"
                    onClick={() => openEvidence(selectedReport.id)}
                    disabled={openingEvidenceId === selectedReport.id}
                    className="inline-flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] px-4 py-2 text-sm hover:bg-[rgb(var(--bg-secondary))] disabled:opacity-60"
                  >
                    {openingEvidenceId === selectedReport.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    View Uploaded Evidence
                  </button>
                ) : (
                  <div className="text-sm text-[rgb(var(--muted-foreground))]">
                    No evidence uploaded.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                <div className="mb-2 text-xs text-[rgb(var(--muted-foreground))]">
                  Reported User
                </div>

                {selectedReport.reportedUser ? (
                  <>
                    <div className="font-medium">
                      {selectedReport.reportedUser.name || "Unnamed"} (
                      {selectedReport.reportedUser.email})
                    </div>

                    <div className="mt-3 inline-flex rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-3 py-1 text-xs font-medium">
                      {selectedReport.reportedUser.accountLockStatus === "LOCKED"
                        ? "Locked"
                        : "Active"}
                    </div>

                    {selectedReport.reportedUser.lockedAt ? (
                      <div className="mt-3 text-xs text-[rgb(var(--muted-foreground))]">
                        Locked at:{" "}
                        {new Date(selectedReport.reportedUser.lockedAt).toLocaleString()}
                      </div>
                    ) : null}

                    {selectedReport.reportedUser.lockReason ? (
                      <div className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">
                        Lock reason: {selectedReport.reportedUser.lockReason}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-sm text-[rgb(var(--muted-foreground))]">
                    No reported user linked.
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                <label className="mb-2 block text-xs text-[rgb(var(--muted-foreground))]">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-[rgb(var(--border))] bg-transparent px-4 py-3 text-sm outline-none"
                  placeholder="Add notes for this report..."
                />
                <button
                  onClick={() =>
                    saveAdminUpdate(selectedReport.id, {
                      adminNotes,
                    })
                  }
                  disabled={actionLoading}
                  className="mt-3 rounded-2xl border border-[rgb(var(--border))] px-4 py-2 text-sm hover:bg-[rgb(var(--bg-secondary))]"
                >
                  Save Notes
                </button>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                <div className="mb-3 text-xs text-[rgb(var(--muted-foreground))]">
                  Actions
                </div>

                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    onClick={() =>
                      saveAdminUpdate(selectedReport.id, {
                        status: "IN_REVIEW",
                        adminNotes,
                      })
                    }
                    disabled={actionLoading}
                  >
                    Mark In Review
                  </ActionButton>

                  <ActionButton
                    onClick={() =>
                      saveAdminUpdate(selectedReport.id, {
                        status: "RESOLVED",
                        adminNotes,
                      })
                    }
                    disabled={actionLoading}
                    tone="success"
                  >
                    Resolve
                  </ActionButton>

                  <ActionButton
                    onClick={() =>
                      saveAdminUpdate(selectedReport.id, {
                        status: "DISMISSED",
                        adminNotes,
                      })
                    }
                    disabled={actionLoading}
                    tone="danger"
                  >
                    Dismiss
                  </ActionButton>

                  {selectedReport.reportedUser ? (
                    <button
                      onClick={toggleUserLock}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium transition hover:scale-[1.01] hover:bg-orange-500/15 disabled:opacity-60"
                    >
                      {selectedReport.reportedUser.accountLockStatus === "LOCKED" ? (
                        <>
                          <Unlock className="h-4 w-4" />
                          Unlock User
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Lock User
                        </>
                      )}
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-secondary))] px-4 py-3 text-xs text-[rgb(var(--muted-foreground))]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Actions here affect the selected report and, if applicable, the reported
                  user account.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}