"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SosRow = {
  id: string;
  description: string;
  mode: string;
  status: string;
  moderationStatus: "VISIBLE" | "FLAGGED" | "REMOVED_BY_ADMIN";
  moderationReason: string | null;
  adminNotes: string | null;
  isFlagged: boolean;
  createdAt: string;
  updatedAt: string;
  moderatedAt: string | null;
  student: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    accountLockStatus: "ACTIVE" | "LOCKED";
  };
  subject: {
    id: string;
    code: string;
    title: string;
  };
  acceptedTutor?: { id: string; name: string | null; email: string } | null;
  moderatedByAdmin?: { id: string; name: string | null; email: string } | null;
};

type ViewMode = "ACTIVE" | "REMOVED" | "ALL";

/* ─── inline SVG icons ──────────────────────────────────────────────────── */
const IconShieldAlert = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.563 2 12.162 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.749Z" clipRule="evenodd" />
  </svg>
);
const IconRefresh = ({ className = "h-4 w-4", spinning = false }: { className?: string; spinning?: boolean }) => (
  <svg className={`${className} ${spinning ? "animate-spin" : ""}`} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
  </svg>
);
const IconSearch = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
  </svg>
);
const IconX = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
  </svg>
);
const IconChevronLeft = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
  </svg>
);
const IconShieldX = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425A11.196 11.196 0 0 1 18 7c0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.563 2 12.162 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.749ZM7.22 8.22a.75.75 0 0 1 1.06 0L10 9.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L11.06 11l1.72 1.72a.75.75 0 1 1-1.06 1.06L10 12.06l-1.72 1.72a.75.75 0 0 1-1.06-1.06L8.94 11 7.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);
const IconShieldCheck = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425A11.196 11.196 0 0 1 18 7c0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.563 2 12.162 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.749Zm4.196 5.954a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
  </svg>
);
const IconLayers = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" />
  </svg>
);
const IconEye = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41Z" clipRule="evenodd" />
  </svg>
);
const IconWarning = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
  </svg>
);
const IconCheckCircle = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
  </svg>
);
const IconXCircle = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
  </svg>
);
const IconLock = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
  </svg>
);

/* ─── helpers ───────────────────────────────────────────────────────────── */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ─── avatar ────────────────────────────────────────────────────────────── */
function Avatar({ name, email, size = "sm" }: { name: string | null; email?: string; size?: "sm" | "md" }) {
  const label = name ?? email ?? "?";
  const raw = label.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || (email?.[0]?.toUpperCase() ?? "?");
  const gradients = [
    "from-violet-500 to-purple-600", "from-sky-500 to-blue-600",
    "from-emerald-500 to-teal-600",  "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",     "from-fuchsia-500 to-violet-600",
    "from-cyan-500 to-sky-600",      "from-lime-500 to-green-600",
  ];
  const idx = label.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length;
  const sz = size === "md" ? "h-8 w-8 text-xs" : "h-7 w-7 text-[0.6rem]";
  return (
    <div className={`${sz} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradients[idx]} font-bold text-white ring-2 ring-[rgb(var(--bg))] shadow-sm`}>
      {raw}
    </div>
  );
}

/* ─── animated counter ──────────────────────────────────────────────────── */
function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current; const end = value;
    if (start === end) return;
    const dur = 600; const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * e));
      if (p < 1) requestAnimationFrame(tick); else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display}</>;
}

/* ─── stat card ─────────────────────────────────────────────────────────── */
function StatCard({ label, value, accent, icon }: {
  label: string; value: number;
  accent: "slate" | "rose" | "emerald" | "amber";
  icon: React.ReactNode;
}) {
  const styles: Record<string, { wrap: string; iconWrap: string; val: string }> = {
    slate:   { wrap: "border-[rgb(var(--border))] bg-[rgb(var(--card))]",             iconWrap: "bg-[rgb(var(--card2))] text-[rgb(var(--muted))]",           val: "text-[rgb(var(--fg))]"                    },
    rose:    { wrap: "border-rose-500/20 bg-rose-500/6 dark:bg-rose-500/10",          iconWrap: "bg-rose-500/15 text-rose-500 dark:text-rose-400",           val: "text-rose-700 dark:text-rose-300"         },
    emerald: { wrap: "border-emerald-500/20 bg-emerald-500/6 dark:bg-emerald-500/10", iconWrap: "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400",  val: "text-emerald-700 dark:text-emerald-300"   },
    amber:   { wrap: "border-amber-500/20 bg-amber-500/6 dark:bg-amber-500/10",       iconWrap: "bg-amber-500/15 text-amber-500 dark:text-amber-400",        val: "text-amber-700 dark:text-amber-300"       },
  };
  const s = styles[accent];
  return (
    <div className={`relative overflow-hidden rounded-2xl border px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${s.wrap}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.64rem] font-bold uppercase tracking-widest text-[rgb(var(--muted2))]">{label}</p>
          <p className={`mt-1.5 text-3xl font-black tabular-nums leading-none ${s.val}`}>
            <AnimatedCount value={value} />
          </p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconWrap}`}>{icon}</div>
      </div>
    </div>
  );
}

/* ─── badges ────────────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; pill: string; dot: string; pulse?: boolean }> = {
  PENDING:     { label: "Pending",     pill: "border-amber-400/40 bg-amber-400/12 text-amber-600 dark:text-amber-300",         dot: "bg-amber-400",   pulse: true },
  OPEN:        { label: "Open",        pill: "border-amber-400/40 bg-amber-400/12 text-amber-600 dark:text-amber-300",         dot: "bg-amber-400",   pulse: true },
  ACCEPTED:    { label: "Accepted",    pill: "border-sky-400/40 bg-sky-400/12 text-sky-600 dark:text-sky-300",                 dot: "bg-sky-400",     pulse: true },
  IN_PROGRESS: { label: "In Progress", pill: "border-sky-400/40 bg-sky-400/12 text-sky-600 dark:text-sky-300",                 dot: "bg-sky-400",     pulse: true },
  RESOLVED:    { label: "Resolved",    pill: "border-emerald-400/40 bg-emerald-400/12 text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-400"              },
  COMPLETED:   { label: "Completed",   pill: "border-emerald-400/40 bg-emerald-400/12 text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-400"              },
  CANCELLED:   { label: "Cancelled",   pill: "border-rose-400/40 bg-rose-400/12 text-rose-600 dark:text-rose-300",             dot: "bg-rose-400"                 },
  EXPIRED:     { label: "Expired",     pill: "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))]",    dot: "bg-[rgb(var(--muted2))]"     },
};

function StatusBadge({ value }: { value: string }) {
  const c = STATUS_CONFIG[value.toUpperCase()] ?? {
    label: value, pill: "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))]", dot: "bg-[rgb(var(--muted2))]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.67rem] font-semibold tracking-wide ${c.pill}`}>
      <span className="relative flex h-1.5 w-1.5 rounded-full">
        {c.pulse && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${c.dot}`} />
      </span>
      {c.label}
    </span>
  );
}

function ModerationBadge({ value }: { value: string }) {
  if (value === "REMOVED_BY_ADMIN") return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[0.67rem] font-semibold text-rose-600 dark:text-rose-300">
      <IconShieldX className="h-3 w-3" /> Removed
    </span>
  );
  if (value === "FLAGGED") return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[0.67rem] font-semibold text-amber-600 dark:text-amber-300">
      <IconWarning className="h-3 w-3" /> Flagged
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[0.67rem] font-semibold text-emerald-600 dark:text-emerald-300">
      <IconShieldCheck className="h-3 w-3" /> Visible
    </span>
  );
}

/* ─── view tab ──────────────────────────────────────────────────────────── */
function ViewTab({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold tracking-wide transition-all duration-200",
        active
          ? "bg-[rgb(var(--fg))] text-[rgb(var(--bg))] shadow-md"
          : "text-[rgb(var(--muted))] hover:bg-[rgb(var(--card2))] hover:text-[rgb(var(--fg))]",
      ].join(" ")}>
      {label}
      <span className={`min-w-[1.25rem] rounded-md px-1 py-0.5 text-center text-[0.6rem] font-black tabular-nums ${active ? "bg-white/25 dark:bg-black/25" : "bg-[rgb(var(--card2))] text-[rgb(var(--muted2))]"}`}>
        {count}
      </span>
    </button>
  );
}

/* ─── action button ─────────────────────────────────────────────────────── */
function ActionBtn({ children, onClick, disabled, variant = "ghost" }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean;
  variant?: "ghost" | "danger";
}) {
  const variants: Record<string, string> = {
    ghost:  "border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:border-[rgb(var(--fg)/0.3)] hover:bg-[rgb(var(--card2))]",
    danger: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-150 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}>
      {children}
    </button>
  );
}

/* ─── section label ─────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-widest text-[rgb(var(--muted2))]">
      <span className="h-px flex-1 bg-[rgb(var(--border))]" />
      {children}
      <span className="h-px flex-1 bg-[rgb(var(--border))]" />
    </p>
  );
}

/* ─── notice ────────────────────────────────────────────────────────────── */
function Notice({ notice, onDismiss }: { notice: { type: "success" | "error"; text: string }; onDismiss: () => void }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 ${notice.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>
      <span className="shrink-0">
        {notice.type === "success" ? <IconCheckCircle className="h-4 w-4" /> : <IconXCircle className="h-4 w-4" />}
      </span>
      <span className="flex-1">{notice.text}</span>
      <button onClick={onDismiss} className="ml-1 shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <IconX className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────────────────── */
export default function AdminSosModerationPage() {
  const [rows, setRows]             = useState<SosRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode]     = useState<ViewMode>("ACTIVE");
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<SosRow | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [notice, setNotice]         = useState<{ type: "success" | "error"; text: string } | null>(null);

  const softBtn = "rounded-xl px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("view", viewMode);
      if (search.trim()) params.set("q", search.trim());
      const res  = await fetch(`/api/admin/sos?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load");
      setRows(Array.isArray(data?.requests) ? data.requests : []);
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message || "Failed to load SOS posts" });
    } finally {
      setLoading(false);
    }
  }, [viewMode, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => ({
    active:  rows.filter((r) => r.moderationStatus !== "REMOVED_BY_ADMIN").length,
    removed: rows.filter((r) => r.moderationStatus === "REMOVED_BY_ADMIN").length,
    all:     rows.length,
    flagged: rows.filter((r) => r.moderationStatus === "FLAGGED").length,
  }), [rows]);

  async function removeSos() {
    if (!selected) return;
    const reason = moderationReason.trim();
    if (!reason) { setNotice({ type: "error", text: "Please provide a moderation reason." }); return; }
    setSubmitting(true);
    try {
      const res  = await fetch(`/api/admin/sos/${selected.id}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderationReason: reason, adminNotes: adminNotes.trim() || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to remove");
      setNotice({ type: "success", text: "SOS post removed successfully." });
      setSelected(null); setModerationReason(""); setAdminNotes("");
      await load();
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message || "Failed to remove SOS post" });
    } finally { setSubmitting(false); }
  }

  const tabs: { label: string; value: ViewMode; count: number }[] = [
    { label: "Active",  value: "ACTIVE",  count: counts.active  },
    { label: "Removed", value: "REMOVED", count: counts.removed },
    { label: "All",     value: "ALL",     count: counts.all     },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <style>{`
        @keyframes rowIn { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .sos-row { animation: rowIn 0.2s ease forwards; }
        .detail-panel { animation: fadeSlideUp 0.22s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes bounce { 0%,80%,100%{transform:scale(0.6)}40%{transform:scale(1)} }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-5 px-4 pb-16 pt-7 sm:px-6 lg:px-8">

        {/* ── header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-500/30">
              <IconShieldAlert className="h-5 w-5" />
              {counts.flagged > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[0.55rem] font-black text-white ring-2 ring-[rgb(var(--bg))]">
                  {counts.flagged}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[rgb(var(--fg))]">SOS Moderation</h1>
              <p className="text-xs text-[rgb(var(--muted))]">Review urgent help requests and keep the feed safe</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} type="button" disabled={loading} className={`${softBtn} inline-flex items-center gap-2`}>
              <IconRefresh className="h-3.5 w-3.5" spinning={loading} />
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <a
              href="/admin"
              className="group inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3.5 py-2 text-xs font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:border-[rgb(var(--primary)/0.4)] transition-all duration-200"
            >
              <ArrowLeft className="h-3 w-3 transition-transform duration-200 group-hover:-translate-x-0.5" />
              Admin
            </a>
          </div>
        </div>

        {/* ── stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<IconShieldCheck className="h-4 w-4" />} label="Active"   value={counts.active}  accent="emerald" />
          <StatCard icon={<IconShieldX className="h-4 w-4" />}     label="Removed"  value={counts.removed} accent="rose"    />
          <StatCard icon={<IconWarning className="h-4 w-4" />}     label="Flagged"  value={counts.flagged} accent="amber"   />
          <StatCard icon={<IconLayers className="h-4 w-4" />}      label="Total"    value={counts.all}     accent="slate"   />
        </div>

        {/* ── notice ── */}
        {notice && <Notice notice={notice} onDismiss={() => setNotice(null)} />}

        {/* ── table card ── */}
        <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.6)] shadow-xl shadow-[rgb(var(--shadow)/0.06)]">

          {/* card toolbar */}
          <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-1">
              {tabs.map((t) => (
                <ViewTab key={t.value} active={viewMode === t.value} label={t.label} count={t.count} onClick={() => setViewMode(t.value)} />
              ))}
            </div>
            <div className="relative w-full max-w-xs">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted2))]">
                <IconSearch className="h-3.5 w-3.5" />
              </span>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Search student, subject…"
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] pl-9 pr-8 py-2.5 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.15)] transition-all duration-150" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] transition-colors">
                  <IconX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-2 w-2 rounded-full bg-[rgb(var(--primary))] opacity-70"
                    style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
              <p className="text-sm text-[rgb(var(--muted2))]">Loading SOS posts…</p>
            </div>
          )}

          {/* empty */}
          {!loading && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted2))]">
                <IconShieldCheck className="h-6 w-6" />
              </div>
              <p className="font-bold text-[rgb(var(--fg))]">No SOS posts found</p>
              <p className="text-sm text-[rgb(var(--muted2))]">Nothing here for this view.</p>
            </div>
          )}

          {/* table */}
          {!loading && rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left">
                <thead>
                  <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.5)]">
                    {["SOS Request", "Student", "Subject", "Status", "Moderation", "Posted", ""].map((h) => (
                      <th key={h} className="px-5 py-3 text-[0.6rem] font-black uppercase tracking-widest text-[rgb(var(--muted2))]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgb(var(--border)/0.6)]">
                  {rows.map((row, idx) => {
                    const isSelected = selected?.id === row.id;
                    const isRemoved  = row.moderationStatus === "REMOVED_BY_ADMIN";
                    const isFlagged  = row.moderationStatus === "FLAGGED";
                    return (
                      <tr key={row.id}
                        onClick={() => { setSelected(row); setModerationReason(row.moderationReason || ""); setAdminNotes(row.adminNotes || ""); }}
                        className={`sos-row group cursor-pointer align-middle transition-all duration-150 ${
                          isSelected ? "bg-[rgb(var(--primary)/0.05)]"
                          : isFlagged ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
                          : isRemoved ? "opacity-60 bg-rose-500/[0.04] hover:bg-rose-500/[0.08]"
                          : "hover:bg-[rgb(var(--card2)/0.5)]"
                        }`}
                        style={{ animationDelay: `${idx * 30}ms` }}>

                        {/* SOS */}
                        <td className="px-5 py-3 max-w-[220px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[0.62rem] text-[rgb(var(--muted))] border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-1.5 py-0.5 rounded-md">
                                #{row.id.slice(0, 8)}
                              </span>
                              {isFlagged && (
                                <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[0.58rem] font-bold text-amber-600 dark:text-amber-400">
                                  <IconWarning className="h-2.5 w-2.5" /> Flagged
                                </span>
                              )}
                            </div>
                            <p className="line-clamp-1 text-sm font-semibold text-[rgb(var(--fg))]">{row.description}</p>
                            <span className="inline-block rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-0.5 text-[0.62rem] font-semibold text-[rgb(var(--muted))] uppercase tracking-wide">
                              {row.mode}
                            </span>
                          </div>
                        </td>

                        {/* Student */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={row.student.name} email={row.student.email} />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-[rgb(var(--fg))]">{row.student.name || "Unnamed"}</p>
                              <p className="truncate text-[0.68rem] text-[rgb(var(--muted))]">{row.student.email}</p>
                              {row.student.accountLockStatus === "LOCKED" && (
                                <span className="mt-0.5 inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[0.6rem] font-bold text-rose-600 dark:text-rose-300">
                                  <IconLock className="h-2.5 w-2.5" /> Locked
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="px-5 py-3">
                          <p className="text-xs font-bold text-[rgb(var(--fg))]">{row.subject.code}</p>
                          <p className="mt-0.5 max-w-[130px] truncate text-[0.68rem] text-[rgb(var(--muted))]">{row.subject.title}</p>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3"><StatusBadge value={row.status} /></td>

                        {/* Moderation */}
                        <td className="px-5 py-3">
                          <div className="space-y-1">
                            <ModerationBadge value={row.moderationStatus} />
                            {row.moderationReason && (
                              <p className="max-w-[150px] truncate text-[0.65rem] text-[rgb(var(--muted))]" title={row.moderationReason}>
                                {row.moderationReason}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Posted */}
                        <td className="px-5 py-3 whitespace-nowrap">
                          <p className="text-xs font-semibold text-[rgb(var(--fg))]">{timeAgo(row.createdAt)}</p>
                          <p className="text-[0.66rem] text-[rgb(var(--muted2))]">
                            {new Date(row.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </td>

                        {/* Review */}
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          <button type="button"
                            onClick={() => { setSelected(row); setModerationReason(row.moderationReason || ""); setAdminNotes(row.adminNotes || ""); }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] opacity-0 group-hover:opacity-100 transition-all duration-150 hover:-translate-y-px hover:border-[rgb(var(--fg)/0.3)]">
                            <IconEye className="h-3 w-3" /> Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* footer */}
              <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.4)] px-5 py-3">
                <p className="text-[0.68rem] text-[rgb(var(--muted2))]">
                  Showing <span className="font-bold text-[rgb(var(--fg))]">{rows.length}</span> result{rows.length !== 1 ? "s" : ""}
                  {search.trim() && <> for <span className="font-bold text-[rgb(var(--fg))]">"{search}"</span></>}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── detail panel ── */}
        {selected && (
          <div className="detail-panel overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.6)] shadow-2xl shadow-[rgb(var(--shadow)/0.1)]">

            {/* accent bar */}
            <div className={`h-1 w-full ${
              selected.moderationStatus === "REMOVED_BY_ADMIN" ? "bg-gradient-to-r from-rose-500 to-pink-500"
              : selected.moderationStatus === "FLAGGED"        ? "bg-gradient-to-r from-amber-400 to-orange-500"
              : "bg-gradient-to-r from-emerald-400 to-teal-500"
            }`} />

            {/* panel header */}
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/12 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <IconShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-black text-[rgb(var(--fg))]">SOS Review</p>
                  <p className="font-mono text-[0.7rem] text-[rgb(var(--muted))]">#{selected.id.slice(0, 16)}…</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={selected.status} />
                <ModerationBadge value={selected.moderationStatus} />
                <button onClick={() => { setSelected(null); setModerationReason(""); setAdminNotes(""); }}
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors">
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-2">

              {/* LEFT */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.4)] p-4">
                  <SectionLabel>Request info</SectionLabel>
                  <p className="text-lg font-black leading-snug text-[rgb(var(--fg))]">{selected.description}</p>
                  <p className="mt-1 text-[0.7rem] text-[rgb(var(--muted2))]">
                    {timeAgo(selected.createdAt)} · {new Date(selected.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-block rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[0.68rem] font-semibold text-[rgb(var(--muted))] uppercase tracking-wide">
                      {selected.mode}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <SectionLabel>Subject</SectionLabel>
                  <p className="font-black text-[rgb(var(--fg))]">{selected.subject.code}</p>
                  <p className="text-[0.71rem] text-[rgb(var(--muted))]">{selected.subject.title}</p>
                </div>

                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <SectionLabel>Student</SectionLabel>
                  <div className="flex items-center gap-3">
                    <Avatar name={selected.student.name} email={selected.student.email} size="md" />
                    <div>
                      <p className="font-bold text-[rgb(var(--fg))]">{selected.student.name || "Unnamed"}</p>
                      <p className="text-[0.71rem] text-[rgb(var(--muted))]">{selected.student.email}</p>
                      {selected.student.accountLockStatus === "LOCKED" && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-300">
                          <IconLock className="h-3 w-3" /> Account locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selected.acceptedTutor && (
                  <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                    <SectionLabel>Accepted tutor</SectionLabel>
                    <div className="flex items-center gap-3">
                      <Avatar name={selected.acceptedTutor.name} email={selected.acceptedTutor.email} size="md" />
                      <div>
                        <p className="font-bold text-[rgb(var(--fg))]">{selected.acceptedTutor.name || "Unnamed"}</p>
                        <p className="text-[0.71rem] text-[rgb(var(--muted))]">{selected.acceptedTutor.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT */}
              <div className="space-y-4">

                {selected.moderatedAt && (
                  <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                    <SectionLabel>Moderation history</SectionLabel>
                    <div className="space-y-2 text-[0.71rem] text-[rgb(var(--muted))]">
                      <p>Actioned: {new Date(selected.moderatedAt).toLocaleString()}</p>
                      {selected.moderatedByAdmin && (
                        <p>By: {selected.moderatedByAdmin.name || selected.moderatedByAdmin.email}</p>
                      )}
                      {selected.moderationReason && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-amber-700 dark:text-amber-300">
                          <span className="font-bold">Reason:</span> {selected.moderationReason}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <SectionLabel>Moderation action</SectionLabel>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[rgb(var(--fg))]">
                        Reason <span className="text-rose-500">*</span>
                      </label>
                      <input value={moderationReason} onChange={(e) => setModerationReason(e.target.value)}
                        placeholder="Spam, offensive content, irrelevant…"
                        className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2.5 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.15)] transition-all duration-150" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[rgb(var(--fg))]">
                        Admin notes <span className="text-[0.7rem] font-normal text-[rgb(var(--muted))]">(internal)</span>
                      </label>
                      <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3}
                        placeholder="Notes for other admins…"
                        className="w-full resize-none rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.15)] transition-all duration-150" />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <SectionLabel>Actions</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {selected.moderationStatus !== "REMOVED_BY_ADMIN" ? (
                      <ActionBtn onClick={removeSos} disabled={submitting} variant="danger">
                        {submitting
                          ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-rose-300/40 border-t-rose-500" />
                          : <IconShieldX className="h-3.5 w-3.5" />}
                        {submitting ? "Removing…" : "Remove SOS Post"}
                      </ActionBtn>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
                        <IconShieldX className="h-3.5 w-3.5" /> Already removed
                      </span>
                    )}
                    <ActionBtn onClick={() => { setSelected(null); setModerationReason(""); setAdminNotes(""); }}>
                      Cancel
                    </ActionBtn>
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.5)] px-4 py-3 text-[0.71rem] text-[rgb(var(--muted))]">
                    <IconWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    Removing a post hides it from students. This action is logged and can be reviewed.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}