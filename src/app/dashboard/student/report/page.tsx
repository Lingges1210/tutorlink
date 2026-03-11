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
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Ban,
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

// ─── Status / Priority config ─────────────────────────────────────────────────

function statusConfig(status: string) {
  switch (status) {
    case "OPEN":
      return {
        cls: "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300",
        dot: "bg-amber-400",
        icon: <Clock className="h-3 w-3" />,
        glow: "shadow-amber-500/20",
      };
    case "IN_REVIEW":
      return {
        cls: "border-sky-400/40 bg-sky-400/10 text-sky-600 dark:text-sky-300",
        dot: "bg-sky-400",
        icon: <AlertCircle className="h-3 w-3" />,
        glow: "shadow-sky-500/20",
      };
    case "RESOLVED":
      return {
        cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
        dot: "bg-emerald-400",
        icon: <CheckCircle2 className="h-3 w-3" />,
        glow: "shadow-emerald-500/20",
      };
    case "DISMISSED":
      return {
        cls: "border-rose-400/40 bg-rose-400/10 text-rose-600 dark:text-rose-300",
        dot: "bg-rose-400",
        icon: <Ban className="h-3 w-3" />,
        glow: "shadow-rose-500/20",
      };
    default:
      return {
        cls: "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]",
        dot: "bg-[rgb(var(--muted2))]",
        icon: null,
        glow: "",
      };
  }
}

function priorityClasses(priority: string) {
  switch (priority) {
    case "URGENT":
      return "border-rose-400/40 bg-rose-400/10 text-rose-600 dark:text-rose-300";
    case "HIGH":
      return "border-orange-400/40 bg-orange-400/10 text-orange-600 dark:text-orange-300";
    case "MEDIUM":
      return "border-indigo-400/40 bg-indigo-400/10 text-indigo-600 dark:text-indigo-300";
    case "LOW":
      return "border-zinc-400/40 bg-zinc-400/10 text-zinc-600 dark:text-zinc-300";
    default:
      return "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold border transition-all duration-200",
        active
          ? "border-[rgb(var(--primary)/0.5)] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)] shadow-sm"
          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))] hover:border-[rgb(var(--border))]",
      ].join(" ")}
    >
      {icon}
      {children}
      {active && (
        <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 translate-y-px rounded-full bg-[rgb(var(--primary))]" />
      )}
    </button>
  );
}

function ViewTab({
  active,
  label,
  onClick,
  count,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[11px] font-semibold transition-all duration-200",
        active
          ? "border-[rgb(var(--primary)/0.4)] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)] shadow-sm"
          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))]",
      ].join(" ")}
    >
      {icon}
      {label}
      <span
        className={[
          "rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
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
  icon,
}: {
  label: string;
  value: number;
  tone?: "default" | "amber" | "sky" | "emerald" | "rose";
  icon?: React.ReactNode;
}) {
  const config = {
    default: {
      card: "border-[rgb(var(--border))] bg-[rgb(var(--card2))]",
      value: "text-[rgb(var(--fg))]",
      label: "text-[rgb(var(--muted2))]",
      icon: "text-[rgb(var(--muted2))] bg-[rgb(var(--card))]",
      bar: "bg-[rgb(var(--muted2)/0.3)]",
    },
    amber: {
      card: "border-amber-400/25 bg-amber-400/5 dark:bg-amber-400/[0.07]",
      value: "text-amber-600 dark:text-amber-300",
      label: "text-amber-600/70 dark:text-amber-400/70",
      icon: "text-amber-500 bg-amber-400/15",
      bar: "bg-amber-400/50",
    },
    sky: {
      card: "border-sky-400/25 bg-sky-400/5 dark:bg-sky-400/[0.07]",
      value: "text-sky-600 dark:text-sky-300",
      label: "text-sky-600/70 dark:text-sky-400/70",
      icon: "text-sky-500 bg-sky-400/15",
      bar: "bg-sky-400/50",
    },
    emerald: {
      card: "border-emerald-400/25 bg-emerald-400/5 dark:bg-emerald-400/[0.07]",
      value: "text-emerald-600 dark:text-emerald-300",
      label: "text-emerald-600/70 dark:text-emerald-400/70",
      icon: "text-emerald-500 bg-emerald-400/15",
      bar: "bg-emerald-400/50",
    },
    rose: {
      card: "border-rose-400/25 bg-rose-400/5 dark:bg-rose-400/[0.07]",
      value: "text-rose-600 dark:text-rose-300",
      label: "text-rose-600/70 dark:text-rose-400/70",
      icon: "text-rose-500 bg-rose-400/15",
      bar: "bg-rose-400/50",
    },
  }[tone];

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className={`rounded-2xl border p-4 transition-shadow hover:shadow-md ${config.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className={`text-[11px] font-medium ${config.label}`}>{label}</div>
          <div className={`mt-1.5 text-3xl font-bold tabular-nums tracking-tight ${config.value}`}>
            {value}
          </div>
        </div>
        {icon && (
          <div className={`rounded-xl p-2 ${config.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
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

  const [tab, setTab] = useState<TabKey>(hasPreset ? "submit" : "list");

  // ── Submit state ──
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

  useEffect(() => { loadReports(); }, []);
  useEffect(() => { setCurrentPage(1); }, [query, viewMode]);

  const counts = useMemo(() => ({
    all: reports.length,
    open: reports.filter((r) => r.status === "OPEN").length,
    review: reports.filter((r) => r.status === "IN_REVIEW").length,
    resolved: reports.filter((r) => r.status === "RESOLVED").length,
    dismissed: reports.filter((r) => r.status === "DISMISSED").length,
    active: reports.filter((r) => !isPastReport(r)).length,
    past: reports.filter((r) => isPastReport(r)).length,
  }), [reports]);

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

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm"
      >
        {/* Subtle gradient orb */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[rgb(var(--primary)/0.08)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-[rgb(var(--primary)/0.05)] blur-2xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--primary)/0.12)] ring-1 ring-[rgb(var(--primary)/0.2)]">
              <ShieldAlert className="h-5 w-5 text-[rgb(var(--primary))]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[rgb(var(--fg))]">Reports</h1>
              <p className="text-xs text-[rgb(var(--muted2))]">
                Submit, track, and manage your complaints &amp; appeals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-1.5">
            <TabButton
              active={tab === "list"}
              onClick={() => setTab("list")}
              icon={<FileText className="h-3.5 w-3.5" />}
            >
              My Reports
              {counts.all > 0 && (
                <span className="ml-0.5 rounded-md bg-[rgb(var(--primary)/0.12)] px-1.5 py-0.5 text-[10px] font-bold text-[rgb(var(--primary))]">
                  {counts.all}
                </span>
              )}
            </TabButton>
            <TabButton
              active={tab === "submit"}
              onClick={() => setTab("submit")}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              New Report
            </TabButton>
          </div>
        </div>
      </motion.div>

      {/* ── Content ── */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-sm overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>

          {/* ════════════ LIST TAB ════════════ */}
          {tab === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="p-5 space-y-5"
            >
              {/* Metrics */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <MetricCard label="Total" value={counts.all} icon={<FileText className="h-4 w-4" />} />
                <MetricCard label="Open" value={counts.open} tone="amber" icon={<Clock className="h-4 w-4" />} />
                <MetricCard label="In Review" value={counts.review} tone="sky" icon={<AlertCircle className="h-4 w-4" />} />
                <MetricCard label="Resolved" value={counts.resolved} tone="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
                <MetricCard label="Dismissed" value={counts.dismissed} tone="rose" icon={<Ban className="h-4 w-4" />} />
              </div>

              {/* Filter bar */}
              {!loading && !listErr && reports.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-wrap gap-2">
                    <ViewTab
                      active={viewMode === "ACTIVE"}
                      label="Active"
                      count={counts.active}
                      onClick={() => setViewMode("ACTIVE")}
                      icon={<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                    />
                    <ViewTab
                      active={viewMode === "PAST"}
                      label="Past"
                      count={counts.past}
                      onClick={() => setViewMode("PAST")}
                      icon={<Archive className="h-3 w-3" />}
                    />
                    <ViewTab
                      active={viewMode === "ALL"}
                      label="All"
                      count={counts.all}
                      onClick={() => setViewMode("ALL")}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--muted2))]" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search reports…"
                        className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] py-2 pl-9 pr-8 text-xs text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary)/0.5)] focus:ring-1 focus:ring-[rgb(var(--primary)/0.2)] transition-all"
                      />
                      {query && (
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={loadReports}
                      disabled={loading}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-[11px] font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))] disabled:opacity-50 transition-all"
                    >
                      {loading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCcw className="h-3.5 w-3.5" />}
                      Refresh
                    </button>
                  </div>
                </motion.div>
              )}

              {/* States */}
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-[rgb(var(--muted2))]">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full border-2 border-[rgb(var(--border))] border-t-[rgb(var(--primary))] animate-spin" />
                  </div>
                  <span className="text-xs">Loading your reports…</span>
                </div>
              ) : listErr ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/8 px-4 py-3.5 text-sm text-rose-600 dark:text-rose-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {listErr}
                </div>
              ) : reports.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-14 text-center"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] shadow-sm">
                    <ShieldAlert className="h-6 w-6 text-[rgb(var(--muted2))]" />
                  </div>
                  <p className="font-medium text-sm text-[rgb(var(--fg))]">No reports yet</p>
                  <p className="mt-1 text-xs text-[rgb(var(--muted2))]">You haven't submitted any reports.</p>
                  <button
                    type="button"
                    onClick={() => setTab("submit")}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.08)] px-4 py-2 text-xs font-semibold text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary)/0.13)] transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Submit your first report
                  </button>
                </motion.div>
              ) : filteredReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-14 text-center">
                  <Archive className="mx-auto mb-3 h-6 w-6 text-[rgb(var(--muted2))]" />
                  <p className="text-sm font-medium text-[rgb(var(--fg))]">No results</p>
                  <p className="mt-1 text-xs text-[rgb(var(--muted2))]">No reports match your current filters.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-[rgb(var(--muted2))]">
                      Showing <span className="font-semibold text-[rgb(var(--fg))]">{paginatedReports.length}</span> of <span className="font-semibold text-[rgb(var(--fg))]">{filteredReports.length}</span> reports
                    </p>
                  </div>

                  <div className="space-y-3">
                    {paginatedReports.map((report, i) => {
                      const archived = isPastReport(report);
                      const sc = statusConfig(report.status);
                      return (
                        <motion.div
                          key={report.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: i * 0.04 }}
                          className={`group rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 transition-all duration-200 hover:border-[rgb(var(--border))] hover:shadow-md ${archived ? "opacity-70" : ""}`}
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1 space-y-3">

                              {/* Header row */}
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Status with animated dot */}
                                <span className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold shadow-sm ${sc.cls}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} animate-pulse`} />
                                  {niceLabel(report.status)}
                                </span>
                                <span className={`inline-flex rounded-xl border px-2.5 py-1 text-[11px] font-semibold ${priorityClasses(report.priority)}`}>
                                  {niceLabel(report.priority)} Priority
                                </span>
                                <span className="inline-flex rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--muted))]">
                                  {niceLabel(report.category)}
                                </span>
                                {archived && (
                                  <span className="inline-flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1 text-[11px] font-semibold text-[rgb(var(--muted2))]">
                                    <Archive className="h-3 w-3" /> Archived
                                  </span>
                                )}
                              </div>

                              <div className="text-sm font-semibold text-[rgb(var(--fg))] leading-snug">{report.subject}</div>

                              {/* Description */}
                              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3.5">
                                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
                                  <MessageSquareText className="h-3 w-3" /> Description
                                </div>
                                <p className="text-xs text-[rgb(var(--muted))] leading-[1.7]">{report.description}</p>
                              </div>

                              {/* Meta grid */}
                              <div className="grid gap-2 md:grid-cols-3">
                                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
                                    <CalendarDays className="h-3 w-3" /> Submitted
                                  </div>
                                  <div className="text-xs font-medium text-[rgb(var(--fg))]">
                                    {new Date(report.createdAt).toLocaleString()}
                                  </div>
                                </div>

                                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
                                    <User className="h-3 w-3" /> Reported User
                                  </div>
                                  {report.reportedUser ? (
                                    <div className="text-xs">
                                      <div className="font-semibold text-[rgb(var(--fg))]">{report.reportedUser.name || "Unnamed"}</div>
                                      <div className="text-[rgb(var(--muted2))] truncate">{report.reportedUser.email}</div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-[rgb(var(--muted2))]">Not specified</span>
                                  )}
                                </div>

                                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
                                    <Paperclip className="h-3 w-3" /> Evidence
                                  </div>
                                  {report.evidenceUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => openEvidence(report.id)}
                                      disabled={openingEvidenceId === report.id}
                                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--primary))] hover:underline disabled:opacity-50 transition-opacity"
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
                            <div className="w-full xl:w-[270px] shrink-0">
                              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3.5 h-full">
                                <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))]">
                                  <ShieldAlert className="h-3 w-3" /> Admin Response
                                </div>
                                {report.adminNotes ? (
                                  <p className="text-xs leading-[1.7] text-[rgb(var(--muted))]">{report.adminNotes}</p>
                                ) : (
                                  <div className="flex items-center gap-2 rounded-lg bg-[rgb(var(--card2))] border border-[rgb(var(--border))] px-2.5 py-2">
                                    <Clock className="h-3 w-3 text-[rgb(var(--muted2))] shrink-0" />
                                    <span className="text-[11px] text-[rgb(var(--muted2))]">Awaiting admin review</span>
                                  </div>
                                )}
                                <div className="mt-3 space-y-1.5 text-[11px] text-[rgb(var(--muted2))]">
                                  {report.reviewedByAdmin && (
                                    <div className="flex items-center gap-1.5">
                                      <User className="h-3 w-3 shrink-0" />
                                      <span>Reviewed by </span>
                                      <span className="font-semibold text-[rgb(var(--fg))]">{report.reviewedByAdmin.name || report.reviewedByAdmin.email}</span>
                                    </div>
                                  )}
                                  {report.resolvedAt && (
                                    <div className="flex items-center gap-1.5">
                                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                                      <span className="font-semibold text-[rgb(var(--fg))]">
                                        {new Date(report.resolvedAt).toLocaleDateString()} · {daysAgoLabel(report.resolvedAt)}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5 pt-0.5 border-t border-[rgb(var(--border))]">
                                    <RefreshCcw className="h-3 w-3 shrink-0" />
                                    Updated {new Date(report.updatedAt).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-[11px] font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))] disabled:opacity-40 transition-all"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={[
                            "rounded-xl px-3.5 py-2 text-[11px] font-semibold border transition-all",
                            currentPage === page
                              ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] shadow-sm"
                              : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))]",
                          ].join(" ")}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-[11px] font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))] disabled:opacity-40 transition-all"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5" />
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
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="p-5 space-y-5"
            >
              <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">

                {/* Form */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-0.5 rounded-full bg-[rgb(var(--primary))]" />
                    <span className="text-sm font-bold text-[rgb(var(--fg))]">Submit a Report</span>
                  </div>

                  {/* Context banner */}
                  {hasPreset && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-rose-500/30 bg-rose-500/8 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Report Context
                      </div>
                      <div className="grid gap-2.5 text-xs sm:grid-cols-2">
                        {presetSource && (
                          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-rose-500/70 dark:text-rose-400/70 mb-1">Source</div>
                            <div className="font-semibold text-rose-700 dark:text-rose-300">{presetSource}</div>
                          </div>
                        )}
                        {presetReportedRole && (
                          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-rose-500/70 dark:text-rose-400/70 mb-1">Reported Role</div>
                            <div className="font-semibold text-rose-700 dark:text-rose-300">{presetReportedRole}</div>
                          </div>
                        )}
                        {presetSubject && (
                          <div className="sm:col-span-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-rose-500/70 dark:text-rose-400/70 mb-1">Subject</div>
                            <div className="font-semibold text-rose-700 dark:text-rose-300">{presetSubject}</div>
                          </div>
                        )}
                        {presetSessionId && (
                          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-rose-500/70 dark:text-rose-400/70 mb-1">Session ID</div>
                            <div className="font-mono text-[11px] text-rose-700 dark:text-rose-300 break-all">{presetSessionId}</div>
                          </div>
                        )}
                        {presetChatChannelId && (
                          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-rose-500/70 dark:text-rose-400/70 mb-1">Chat Channel ID</div>
                            <div className="font-mono text-[11px] text-rose-700 dark:text-rose-300 break-all">{presetChatChannelId}</div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <form onSubmit={onSubmit} className="space-y-4">

                    {/* Category */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))]">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary)/0.5)] focus:ring-1 focus:ring-[rgb(var(--primary)/0.2)] transition-all appearance-none cursor-pointer"
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))]">Subject</label>
                      <input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Brief title of your issue"
                        required
                        className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary)/0.5)] focus:ring-1 focus:ring-[rgb(var(--primary)/0.2)] transition-all"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))]">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Explain clearly what happened and include any important details."
                        rows={6}
                        required
                        className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm text-[rgb(var(--fg))] outline-none resize-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary)/0.5)] focus:ring-1 focus:ring-[rgb(var(--primary)/0.2)] transition-all leading-relaxed"
                      />
                    </div>

                    {/* Evidence upload */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))]">
                        Evidence <span className="normal-case font-normal text-[rgb(var(--muted2))]">(optional)</span>
                      </label>
                      <div className="rounded-xl border-2 border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 transition-colors hover:border-[rgb(var(--primary)/0.3)]">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                          onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                          className="block w-full text-xs text-[rgb(var(--muted))] file:mr-3 file:rounded-lg file:border file:border-[rgb(var(--border))] file:bg-[rgb(var(--card))] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[rgb(var(--fg))] file:cursor-pointer hover:file:bg-[rgb(var(--card2))] transition-all"
                        />
                        <p className="mt-2 text-[11px] text-[rgb(var(--muted2))]">PNG, JPG, WEBP, PDF — max 5 MB</p>

                        <AnimatePresence>
                          {evidenceFile && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 overflow-hidden"
                            >
                              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2.5">
                                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                  {evidenceFile.name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70">{(evidenceFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                  <button
                                    type="button"
                                    onClick={() => setEvidenceFile(null)}
                                    className="text-emerald-600/60 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Feedback */}
                    <AnimatePresence>
                      {submitMsg && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                          {submitMsg}
                        </motion.div>
                      )}
                      {submitErr && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/8 px-4 py-3 text-sm text-rose-600 dark:text-rose-300"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          {submitErr}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="group inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--primary))] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 active:scale-[0.98] disabled:opacity-60 transition-all duration-150"
                    >
                      {submitLoading
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                      {submitLoading ? "Submitting…" : "Submit Report"}
                    </button>
                  </form>
                </div>

                {/* Sidebar */}
                <div className="space-y-3">

                  {/* Selected category */}
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="mb-2.5 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/15">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <span className="text-xs font-bold text-[rgb(var(--fg))]">Selected Category</span>
                    </div>
                    <div className="rounded-xl border border-[rgb(var(--primary)/0.2)] bg-[rgb(var(--primary)/0.06)] px-3 py-2.5 text-sm font-semibold text-[rgb(var(--primary))]">
                      {getCategoryLabel(category)}
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                    <div className="mb-3 text-xs font-bold text-[rgb(var(--fg))]">Tips for a good report</div>
                    <ul className="space-y-2.5">
                      {[
                        "Be specific about what happened and when.",
                        "Include names or session IDs if relevant.",
                        "Upload screenshots or PDFs as evidence.",
                        "Use the subject as a short, clear summary.",
                      ].map((tip, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-[rgb(var(--muted))] leading-[1.6]">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-[rgb(var(--primary)/0.1)] text-[9px] font-bold text-[rgb(var(--primary))]">
                            {i + 1}
                          </span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quick link */}
                  <button
                    type="button"
                    onClick={() => setTab("list")}
                    className="group w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-xs font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] transition-all flex items-center justify-between"
                  >
                    <span>View existing reports</span>
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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