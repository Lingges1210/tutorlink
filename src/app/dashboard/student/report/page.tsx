"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  ExternalLink,
  FileText,
  FileWarning,
  Loader2,
  MessageSquareText,
  Paperclip,
  Plus,
  RefreshCcw,
  Search,
  Send,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

type ViewMode = "ACTIVE" | "PAST" | "ALL";
type TabKey = "list" | "submit";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "ACCOUNT_LOCK_APPEAL", label: "Account Lock Appeal" },
  { value: "MISCONDUCT", label: "Misconduct" },
  { value: "NO_SHOW", label: "No-show" },
  { value: "INAPPROPRIATE_CHAT", label: "Inappropriate Chat" },
  { value: "SESSION_ISSUE", label: "Session Issue" },
  { value: "TECHNICAL_ISSUE", label: "Technical Issue" },
  { value: "GENERAL_COMPLAINT", label: "General Complaint" },
];

const PAGE_SIZE = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function niceLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function isPastReport(report: ReportItem) {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (report.status === "RESOLVED" && report.resolvedAt)
    return Date.now() - new Date(report.resolvedAt).getTime() > sevenDaysMs;
  if (report.status === "DISMISSED")
    return Date.now() - new Date(report.updatedAt).getTime() > sevenDaysMs;
  return false;
}

function daysAgoLabel(dateString: string) {
  const diffDays = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

function getCategoryLabel(value: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value;
}

// ─── Status / Priority badges ─────────────────────────────────────────────────

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
      return "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]";
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
      return "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
        active
          ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)]"
          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "rounded-full px-1.5 py-0.5 text-[10px]",
          active
            ? "bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))]"
            : "bg-[rgb(var(--card2))] text-[rgb(var(--muted2))]",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
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
      : "border-[rgb(var(--border))] bg-[rgb(var(--card2))]";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs text-[rgb(var(--muted2))]">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[rgb(var(--fg))]">{value}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function getDefaultCategory(source: string, explicit: string | null) {
  if (explicit) return explicit;
  if (source === "SESSION") return "SESSION_ISSUE";
  if (source === "CHAT") return "INAPPROPRIATE_CHAT";
  return "GENERAL_COMPLAINT";
}

export default function ReportsPage() {
  const sp = useSearchParams();

  const presetSource         = sp.get("source") ?? "";
  const presetCategory       = getDefaultCategory(presetSource, sp.get("category"));
  const presetSubject        = sp.get("subject") ?? "";
  const presetReportedUserId = sp.get("reportedUserId") ?? "";
  const presetReportedRole   = sp.get("reportedRole") ?? "";
  const presetSessionId      = sp.get("sessionId") ?? "";
  const presetChatChannelId  = sp.get("chatChannelId") ?? "";
  const hasPreset = !!(presetSource || presetSubject || presetReportedUserId || presetSessionId || presetChatChannelId);

  // ── List state ──
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listErr, setListErr] = useState<string | null>(null);
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("ACTIVE");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Tab — auto-open submit if URL params present ──
  const [tab, setTab] = useState<TabKey>(hasPreset ? "submit" : "list");

  // ── Submit state — seeded from URL params ──
  const [category, setCategory] = useState(presetCategory);
  const [subject, setSubject] = useState(presetSubject);
  const [description, setDescription] = useState("");
  const [reportedUserId, setReportedUserId] = useState(presetReportedUserId);
  const [sessionId] = useState(presetSessionId);
  const [chatChannelId] = useState(presetChatChannelId);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  // ── Load reports ──
  async function loadReports() {
    try {
      setLoading(true);
      setListErr(null);
      const res = await fetch("/api/reports/my", { method: "GET", cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load reports");
      setReports(data.reports || []);
    } catch (e: any) {
      setListErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // ── Open evidence ──
  async function openEvidence(reportId: string) {
    try {
      setOpeningEvidenceId(reportId);
      const res = await fetch(`/api/reports/${reportId}/evidence`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.signedUrl)
        throw new Error(data?.error || "Failed to open evidence");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      alert(e?.message || "Failed to open evidence");
    } finally {
      setOpeningEvidenceId(null);
    }
  }

  // ── Submit report ──
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitErr(null);
    setSubmitMsg(null);
    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("subject", subject.trim());
      formData.append("description", description.trim());
      if (reportedUserId) formData.append("reportedUserId", reportedUserId);
      if (sessionId) formData.append("sessionId", sessionId);
      if (chatChannelId) formData.append("chatChannelId", chatChannelId);
      if (evidenceFile) formData.append("evidence", evidenceFile);

      const res = await fetch("/api/reports", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to submit report");

      setSubmitMsg("Your report has been submitted successfully.");
      setSubject("");
      setDescription("");
      setEvidenceFile(null);
      setCategory("GENERAL_COMPLAINT");
      setReportedUserId("");
      // Refresh list and switch to it after a beat
      await loadReports();
      setTimeout(() => {
        setTab("list");
        setSubmitMsg(null);
      }, 1800);
    } catch (e: any) {
      setSubmitErr(e?.message || "Something went wrong");
    } finally {
      setSubmitLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, viewMode]);

  // ── Derived counts ──
  const counts = useMemo(() => ({
    all: reports.length,
    open: reports.filter((r) => r.status === "OPEN").length,
    review: reports.filter((r) => r.status === "IN_REVIEW").length,
    resolved: reports.filter((r) => r.status === "RESOLVED").length,
    dismissed: reports.filter((r) => r.status === "DISMISSED").length,
    active: reports.filter((r) => !isPastReport(r)).length,
    past: reports.filter((r) => isPastReport(r)).length,
  }), [reports]);

  // ── Filtered + paginated ──
  const filteredReports = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      const past = isPastReport(r);
      if (viewMode === "ACTIVE" && past) return false;
      if (viewMode === "PAST" && !past) return false;
      if (!q) return true;
      return [r.subject, r.description, r.category, r.status, r.priority,
        r.reportedUser?.name ?? "", r.reportedUser?.email ?? ""]
        .join(" ").toLowerCase().includes(q);
    });
  }, [reports, query, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredReports.slice(start, start + PAGE_SIZE);
  }, [filteredReports, currentPage]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div
        layout="position"
        className="rounded-3xl border p-6 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">Reports</h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Submit complaints, appeals, and issues or track existing ones.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <TabButton active={tab === "list"} onClick={() => setTab("list")}>
              My Reports
            </TabButton>
            <TabButton active={tab === "submit"} onClick={() => setTab("submit")}>
              <span className="flex items-center gap-1">
                <Plus className="h-3 w-3" />
                New Report
              </span>
            </TabButton>
          </div>
        </div>
      </motion.div>

      {/* ── Content ── */}
      <div className="rounded-3xl border p-5 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]">
        <AnimatePresence mode="wait" initial={false}>

          {/* ════════════ LIST TAB ════════════ */}
          {tab === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-5"
            >
              {/* Metrics */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <MetricCard label="Total" value={counts.all} />
                <MetricCard label="Open" value={counts.open} tone="amber" />
                <MetricCard label="In Review" value={counts.review} tone="sky" />
                <MetricCard label="Resolved" value={counts.resolved} tone="emerald" />
                <MetricCard label="Dismissed" value={counts.dismissed} tone="rose" />
              </div>

              {/* Filter bar */}
              {!loading && !listErr && reports.length > 0 && (
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <ViewTab active={viewMode === "ACTIVE"} label="Active" count={counts.active} onClick={() => setViewMode("ACTIVE")} />
                    <ViewTab active={viewMode === "PAST"} label="Past" count={counts.past} onClick={() => setViewMode("PAST")} />
                    <ViewTab active={viewMode === "ALL"} label="All" count={counts.all} onClick={() => setViewMode("ALL")} />
                  </div>

                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--muted2))]" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search reports..."
                      className="w-full rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] py-2 pl-9 pr-4 text-xs outline-none placeholder:text-[rgb(var(--muted2))]"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={loadReports}
                    disabled={loading}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-[11px] font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                    Refresh
                  </button>
                </div>
              )}

              {/* States */}
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-14 text-sm text-[rgb(var(--muted2))]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading reports…
                </div>
              ) : listErr ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                  {listErr}
                </div>
              ) : reports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--card))]">
                    <ShieldAlert className="h-5 w-5 text-[rgb(var(--muted2))]" />
                  </div>
                  <p className="text-sm text-[rgb(var(--muted2))]">You haven't submitted any reports yet.</p>
                  <button
                    type="button"
                    onClick={() => setTab("submit")}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]"
                  >
                    <Plus className="h-3 w-3" />
                    Submit your first report
                  </button>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-12 text-center">
                  <Archive className="mx-auto mb-3 h-6 w-6 text-[rgb(var(--muted2))]" />
                  <p className="text-sm text-[rgb(var(--muted2))]">No reports match your search.</p>
                </div>
              ) : (
                <>
                  <div className="text-xs text-[rgb(var(--muted2))]">
                    Showing {paginatedReports.length} of {filteredReports.length} reports
                  </div>

                  <div className="space-y-3">
                    {paginatedReports.map((report) => {
                      const archived = isPastReport(report);
                      return (
                        <div
                          key={report.id}
                          className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1 space-y-3">
                              {/* Badges */}
                              <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${statusClasses(report.status)}`}>
                                  {niceLabel(report.status)}
                                </span>
                                <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${priorityClasses(report.priority)}`}>
                                  {niceLabel(report.priority)} Priority
                                </span>
                                <span className="inline-flex rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--fg))]">
                                  {niceLabel(report.category)}
                                </span>
                                {archived && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--muted2))]">
                                    <Archive className="h-3 w-3" /> Archived
                                  </span>
                                )}
                              </div>

                              <div className="text-sm font-semibold text-[rgb(var(--fg))]">{report.subject}</div>

                              {/* Description */}
                              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted2))]">
                                  <MessageSquareText className="h-3 w-3" /> Description
                                </div>
                                <p className="text-xs text-[rgb(var(--muted))] leading-5">{report.description}</p>
                              </div>

                              {/* Meta grid */}
                              <div className="grid gap-2 md:grid-cols-3">
                                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted2))]">
                                    <CalendarDays className="h-3 w-3" /> Submitted
                                  </div>
                                  <div className="text-xs font-medium text-[rgb(var(--fg))]">
                                    {new Date(report.createdAt).toLocaleString()}
                                  </div>
                                </div>

                                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted2))]">
                                    <User className="h-3 w-3" /> Reported User
                                  </div>
                                  {report.reportedUser ? (
                                    <div className="text-xs">
                                      <div className="font-medium text-[rgb(var(--fg))]">{report.reportedUser.name || "Unnamed"}</div>
                                      <div className="text-[rgb(var(--muted2))]">{report.reportedUser.email}</div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-[rgb(var(--muted2))]">Not specified</span>
                                  )}
                                </div>

                                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted2))]">
                                    <Paperclip className="h-3 w-3" /> Evidence
                                  </div>
                                  {report.evidenceUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => openEvidence(report.id)}
                                      disabled={openingEvidenceId === report.id}
                                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--primary))] hover:underline disabled:opacity-50"
                                    >
                                      {openingEvidenceId === report.id
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <ExternalLink className="h-3 w-3" />}
                                      View file
                                    </button>
                                  ) : (
                                    <span className="text-xs text-[rgb(var(--muted2))]">None attached</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Admin panel */}
                            <div className="w-full xl:w-72 shrink-0">
                              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--muted2))]">
                                  <ShieldAlert className="h-3 w-3" /> Admin Response
                                </div>
                                <p className="text-xs leading-5 text-[rgb(var(--muted))]">
                                  {report.adminNotes || "No admin notes yet."}
                                </p>

                                <div className="mt-3 space-y-1 text-[11px] text-[rgb(var(--muted2))]">
                                  {report.reviewedByAdmin && (
                                    <div>Reviewed by: <span className="font-medium text-[rgb(var(--fg))]">{report.reviewedByAdmin.name || report.reviewedByAdmin.email}</span></div>
                                  )}
                                  {report.resolvedAt && (
                                    <div>Resolved: <span className="font-medium text-[rgb(var(--fg))]">{new Date(report.resolvedAt).toLocaleDateString()} ({daysAgoLabel(report.resolvedAt)})</span></div>
                                  )}
                                  <div>Updated: <span className="font-medium text-[rgb(var(--fg))]">{new Date(report.updatedAt).toLocaleString()}</span></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                      >
                        Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={[
                            "rounded-full px-3 py-1.5 text-[11px] font-semibold border",
                            currentPage === page
                              ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)] text-[rgb(var(--primary))]"
                              : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
                          ].join(" ")}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ════════════ SUBMIT TAB ════════════ */}
          {tab === "submit" && (
            <motion.div
              key="submit"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-5"
            >
              <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
                {/* Form */}
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-[rgb(var(--fg))]">Submit a Report</div>

                  {/* Context banner — shown when arriving from session/chat deep link */}
                  {hasPreset && (
                    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 space-y-3">
                      <div className="text-xs font-semibold text-red-950 dark:text-red-300">Report Context</div>
                      <div className="grid gap-2 text-xs sm:grid-cols-2">
                        {presetSource && (
                          <div>
                            <div className="text-red-800 dark:text-red-400/70">Source</div>
                            <div className="font-medium text-red-950 dark:text-red-300">{presetSource}</div>
                          </div>
                        )}
                        {presetReportedRole && (
                          <div>
                            <div className="text-red-800 dark:text-red-400/70">Reported Role</div>
                            <div className="font-medium text-red-950 dark:text-red-300">{presetReportedRole}</div>
                          </div>
                        )}
                        {presetSubject && (
                          <div className="sm:col-span-2">
                            <div className="text-red-800 dark:text-red-400/70">Subject</div>
                            <div className="font-medium text-red-950 dark:text-red-300">{presetSubject}</div>
                          </div>
                        )}
                        {presetSessionId && (
                          <div>
                            <div className="text-red-800 dark:text-red-400/70">Session ID</div>
                            <div className="font-mono text-[10px] text-red-950 dark:text-red-300">{presetSessionId}</div>
                          </div>
                        )}
                        {presetChatChannelId && (
                          <div>
                            <div className="text-red-800 dark:text-red-400/70">Chat Channel ID</div>
                            <div className="font-mono text-[10px] text-red-950 dark:text-red-300">{presetChatChannelId}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <form onSubmit={onSubmit} className="space-y-4">
                    {/* Category */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-[rgb(var(--muted))]">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm outline-none text-[rgb(var(--fg))]"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-[rgb(var(--muted))]">Subject</label>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief title of your issue"
                        required
                        className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm outline-none text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))]"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-[rgb(var(--muted))]">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Explain clearly what happened and include any important details."
                        rows={6}
                        required
                        className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm outline-none resize-none text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))]"
                      />
                    </div>

                    {/* Evidence */}
                    <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                      <label className="mb-2 flex items-center gap-2 text-xs font-semibold text-[rgb(var(--muted))]">
                        <Paperclip className="h-3.5 w-3.5" /> Evidence (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                        onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                        className="block w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2.5 text-xs outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[rgb(var(--card2))] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[rgb(var(--fg))]"
                      />
                      <p className="mt-2 text-[11px] text-[rgb(var(--muted2))]">PNG, JPG, WEBP, PDF — max 5 MB</p>

                      {evidenceFile && (
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[rgb(var(--fg))]">
                            <FileText className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
                            {evidenceFile.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[rgb(var(--muted2))]">{(evidenceFile.size / 1024 / 1024).toFixed(2)} MB</span>
                            <button
                              type="button"
                              onClick={() => setEvidenceFile(null)}
                              className="text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))]"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Feedback */}
                    {submitMsg && (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        {submitMsg}
                      </div>
                    )}
                    {submitErr && (
                      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                        {submitErr}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--primary))] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {submitLoading ? "Submitting…" : "Submit Report"}
                    </button>
                  </form>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Current category */}
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[rgb(var(--fg))]">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                      Selected Category
                    </div>
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2.5 text-sm font-medium text-[rgb(var(--fg))]">
                      {getCategoryLabel(category)}
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="mb-3 text-xs font-semibold text-[rgb(var(--fg))]">Tips for a good report</div>
                    <ul className="space-y-2 text-xs text-[rgb(var(--muted))] leading-5">
                      <li className="flex gap-2"><span className="text-[rgb(var(--primary))]">·</span> Be specific about what happened and when.</li>
                      <li className="flex gap-2"><span className="text-[rgb(var(--primary))]">·</span> Include names or session IDs if relevant.</li>
                      <li className="flex gap-2"><span className="text-[rgb(var(--primary))]">·</span> Upload screenshots or PDFs as evidence.</li>
                      <li className="flex gap-2"><span className="text-[rgb(var(--primary))]">·</span> Use the subject as a short, clear summary.</li>
                    </ul>
                  </div>

                  {/* Quick link to list */}
                  <button
                    type="button"
                    onClick={() => setTab("list")}
                    className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] transition-all"
                  >
                    View existing reports →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}