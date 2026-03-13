"use client";

import { useEffect, useMemo, useState } from "react";

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

/* ─── inline SVG icons ───────────────────────────────────────────────────── */
const IconShield = ({ className = "h-4 w-4" }: { className?: string }) => (
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
const IconLock = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
  </svg>
);
const IconUnlock = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M14.5 1A4.5 4.5 0 0 0 10 5.5V9H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1.5V5.5a3 3 0 1 1 6 0v2.75a.75.75 0 0 0 1.5 0V5.5A4.5 4.5 0 0 0 14.5 1Z" clipRule="evenodd" />
  </svg>
);
const IconCheck = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
  </svg>
);
const IconClock = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
  </svg>
);
const IconEye = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41Z" clipRule="evenodd" />
  </svg>
);
const IconXCircle = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
  </svg>
);
const IconCheckCircle = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
  </svg>
);
const IconFire = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M15.207 5.207a1 1 0 0 0-1.414 0 5.5 5.5 0 0 1-3.207 1.587A4.501 4.501 0 0 0 10 16a4.5 4.5 0 0 0 3.536-7.285 7.5 7.5 0 0 0 1.671-3.508Z" />
    <path d="M7.5 16a2.5 2.5 0 0 0 2.45-2.982A6.493 6.493 0 0 1 7.5 16Z" />
  </svg>
);
const IconTrending = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 0 1 .919-.53l4.78 1.281a.75.75 0 0 1 .531.919l-1.281 4.78a.75.75 0 0 1-1.449-.387l.81-3.022a19.407 19.407 0 0 0-5.594 5.203.75.75 0 0 1-1.139.093L7 10.06l-4.72 4.72a.75.75 0 0 1-1.06-1.061l5.25-5.25a.75.75 0 0 1 1.06 0l3.074 3.073a20.923 20.923 0 0 1 5.545-4.931l-3.042-.815a.75.75 0 0 1-.53-.918Z" clipRule="evenodd" />
  </svg>
);
const IconMinus = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clipRule="evenodd" />
  </svg>
);
const IconArrowDown = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
  </svg>
);
const IconArchive = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Z" />
    <path fillRule="evenodd" d="M2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5ZM7 11a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1Z" clipRule="evenodd" />
  </svg>
);
const IconExternal = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
  </svg>
);
const IconWarning = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
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
const IconChevronRight = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function niceLabel(v: string) {
  return v.toLowerCase().split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}
function isPastReport(r: ReportRow) {
  const ms7 = 7 * 24 * 60 * 60 * 1000;
  if (r.status === "RESOLVED" && r.resolvedAt) return Date.now() - new Date(r.resolvedAt).getTime() > ms7;
  if (r.status === "DISMISSED") return Date.now() - new Date(r.updatedAt || r.createdAt).getTime() > ms7;
  return false;
}
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

/* ─── status / priority configs ──────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; pill: string; dot: string; glow: string }> = {
  OPEN:      { label: "Open",      pill: "border-amber-400/40 bg-amber-400/12 text-amber-600 dark:text-amber-300",         dot: "bg-amber-400",   glow: "shadow-amber-400/40" },
  IN_REVIEW: { label: "In Review", pill: "border-sky-400/40 bg-sky-400/12 text-sky-600 dark:text-sky-300",                 dot: "bg-sky-400",     glow: "shadow-sky-400/40"   },
  RESOLVED:  { label: "Resolved",  pill: "border-emerald-400/40 bg-emerald-400/12 text-emerald-600 dark:text-emerald-300", dot: "bg-emerald-400", glow: "shadow-emerald-400/40"},
  DISMISSED: { label: "Dismissed", pill: "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))]",    dot: "bg-[rgb(var(--muted2))]", glow: "" },
};

const PRIORITY_CONFIG: Record<string, { label: string; icon: React.ReactNode; pill: string; dot: string; pulse?: boolean; bar: string }> = {
  URGENT: { label: "Urgent", icon: <IconFire className="h-3 w-3" />,     pill: "border-rose-400/40 bg-rose-400/12 text-rose-600 dark:text-rose-300",       dot: "bg-rose-500",   pulse: true,  bar: "bg-gradient-to-r from-rose-500 to-pink-500" },
  HIGH:   { label: "High",   icon: <IconTrending className="h-3 w-3" />, pill: "border-orange-400/40 bg-orange-400/12 text-orange-600 dark:text-orange-300", dot: "bg-orange-400", bar: "bg-gradient-to-r from-orange-500 to-amber-500" },
  MEDIUM: { label: "Medium", icon: <IconMinus className="h-3 w-3" />,    pill: "border-indigo-400/40 bg-indigo-400/12 text-indigo-600 dark:text-indigo-300", dot: "bg-indigo-400", bar: "bg-gradient-to-r from-indigo-500 to-violet-500" },
  LOW:    { label: "Low",    icon: <IconArrowDown className="h-3 w-3" />, pill: "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))]", dot: "bg-[rgb(var(--muted2))]", bar: "bg-[rgb(var(--border))]" },
};

/* ─── stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, accent, icon, trend }: {
  label: string; value: number;
  accent: "slate" | "rose" | "emerald" | "sky" | "amber";
  icon: React.ReactNode; trend?: string;
}) {
  const styles: Record<string, { wrap: string; iconWrap: string; val: string }> = {
    slate:   { wrap: "border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.6)]", iconWrap: "bg-[rgb(var(--card2))] text-[rgb(var(--muted))]",           val: "text-[rgb(var(--fg))]" },
    rose:    { wrap: "border-rose-500/20 bg-rose-500/6 dark:bg-rose-500/10",   iconWrap: "bg-rose-500/15 text-rose-500 dark:text-rose-400",      val: "text-rose-700 dark:text-rose-300" },
    emerald: { wrap: "border-emerald-500/20 bg-emerald-500/6 dark:bg-emerald-500/10", iconWrap: "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400", val: "text-emerald-700 dark:text-emerald-300" },
    sky:     { wrap: "border-sky-500/20 bg-sky-500/6 dark:bg-sky-500/10",     iconWrap: "bg-sky-500/15 text-sky-500 dark:text-sky-400",          val: "text-sky-700 dark:text-sky-300" },
    amber:   { wrap: "border-amber-500/20 bg-amber-500/6 dark:bg-amber-500/10", iconWrap: "bg-amber-500/15 text-amber-500 dark:text-amber-400",  val: "text-amber-700 dark:text-amber-300" },
  };
  const s = styles[accent];
  return (
    <div className={`group relative overflow-hidden rounded-2xl border px-4 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${s.wrap}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.64rem] font-bold uppercase tracking-widest text-[rgb(var(--muted2))]">{label}</p>
          <p className={`mt-1.5 text-3xl font-black tabular-nums leading-none ${s.val}`}>{value}</p>
          {trend && <p className="mt-1 text-[0.65rem] text-[rgb(var(--muted2))]">{trend}</p>}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.iconWrap}`}>{icon}</div>
      </div>
    </div>
  );
}

/* ─── badges ─────────────────────────────────────────────────────────────── */
function StatusBadge({ value }: { value: string }) {
  const c = STATUS_CONFIG[value] ?? STATUS_CONFIG.DISMISSED;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.67rem] font-semibold tracking-wide ${c.pill}`}>
      <span className={`relative flex h-1.5 w-1.5 rounded-full ${c.dot}`}>
        {value === "OPEN" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />}
      </span>
      {c.label}
    </span>
  );
}
function PriorityBadge({ value }: { value: string }) {
  const c = PRIORITY_CONFIG[value] ?? PRIORITY_CONFIG.LOW;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.67rem] font-semibold tracking-wide ${c.pill}`}>
      {c.icon}{c.label}
    </span>
  );
}
function PriorityAccent({ value }: { value: string }) {
  const c = PRIORITY_CONFIG[value];
  if (!c) return <div className="w-0.5 self-stretch bg-[rgb(var(--border))] rounded-full" />;
  return (
    <div className={`w-0.5 self-stretch rounded-full ${c.bar} ${c.pulse ? "animate-pulse" : ""}`} />
  );
}

/* ─── avatar ─────────────────────────────────────────────────────────────── */
function Avatar({ name, email, size = "sm" }: { name: string | null; email?: string; size?: "sm" | "md" | "lg" }) {
  const label = name ?? email ?? "?";
  const initials = label.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || (email?.[0]?.toUpperCase() ?? "?");
  const gradients = [
    "from-violet-500 to-purple-600",
    "from-sky-500 to-blue-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-fuchsia-500 to-violet-600",
    "from-cyan-500 to-sky-600",
    "from-lime-500 to-green-600",
  ];
  const idx = label.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length;
  const sz = size === "lg" ? "h-11 w-11 text-sm" : size === "md" ? "h-8 w-8 text-xs" : "h-7 w-7 text-[0.6rem]";
  return (
    <div className={`${sz} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradients[idx]} font-bold text-white ring-2 ring-[rgb(var(--bg))] shadow-sm`}>
      {initials}
    </div>
  );
}

/* ─── view tab ───────────────────────────────────────────────────────────── */
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

/* ─── action button ──────────────────────────────────────────────────────── */
function ActionBtn({ children, onClick, disabled, variant = "ghost" }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean;
  variant?: "ghost" | "success" | "danger" | "warning" | "info";
}) {
  const variants: Record<string, string> = {
    ghost:   "border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:border-[rgb(var(--fg)/0.3)] hover:bg-[rgb(var(--card2))]",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50",
    danger:  "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50",
    info:    "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300 hover:bg-sky-500/20 hover:border-sky-500/50",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-150 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]}`}>
      {children}
    </button>
  );
}

/* ─── section label ──────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-widest text-[rgb(var(--muted2))]">
      <span className="h-px flex-1 bg-[rgb(var(--border))]" />
      {children}
      <span className="h-px flex-1 bg-[rgb(var(--border))]" />
    </p>
  );
}

/* ─── notice toast ───────────────────────────────────────────────────────── */
function Notice({ notice, onDismiss }: { notice: { type: "success" | "error"; text: string }; onDismiss: () => void }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-300 ${notice.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}
      style={{ animation: "slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)" }}>
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

/* ─── main page ──────────────────────────────────────────────────────────── */
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
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const PAGE_SIZE = 8;

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/user-reports", { cache: "no-store" });
      const data = await res.json();
      const nextRows = data?.reports || [];
      setRows(nextRows);
      if (selectedReport) {
        const fresh = nextRows.find((r: ReportRow) => r.id === selectedReport.id);
        if (fresh) { setSelectedReport(fresh); setAdminNotes(fresh.adminNotes || ""); }
      }
    } finally { setLoading(false); }
  }

  async function openEvidence(reportId: string) {
    try {
      setOpeningEvidenceId(reportId);
      const res = await fetch(`/api/admin/user-reports/${reportId}/evidence`, { method: "GET", cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.signedUrl) throw new Error(data?.error || "Failed to open evidence");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) { setNotice({ type: "error", text: e?.message || "Failed to open evidence" }); }
    finally { setOpeningEvidenceId(null); }
  }

  async function updateStatus(id: string, status: string) {
    setSavingId(id);
    try {
      await fetch(`/api/admin/user-reports/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      await load();
    } finally { setSavingId(null); }
  }

  async function saveAdminUpdate(id: string, payload: Record<string, any>) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/user-reports/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to update report");
      await load();
      setSelectedReport(data.report);
      setAdminNotes(data.report.adminNotes || "");
      setNotice({ type: "success", text: "Report updated successfully." });
    } catch (e) { setNotice({ type: "error", text: e instanceof Error ? e.message : "Failed to update" }); }
    finally { setActionLoading(false); }
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: `Action taken from report: ${selectedReport.subject}` }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to update lock status");
      await load();
      if (selectedReport.reportedUser) {
        setSelectedReport({ ...selectedReport, reportedUser: { ...selectedReport.reportedUser, accountLockStatus: isLocked ? "ACTIVE" : "LOCKED" } });
      }
      setNotice({ type: "success", text: `User ${isLocked ? "unlocked" : "locked"} successfully.` });
    } catch (e) { setNotice({ type: "error", text: e instanceof Error ? e.message : "Failed to update lock status" }); }
    finally { setActionLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setCurrentPage(1); }, [q, viewMode]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => ({
    all: rows.length,
    active: rows.filter((r) => !isPastReport(r)).length,
    past: rows.filter((r) => isPastReport(r)).length,
    resolved: rows.filter((r) => r.status === "RESOLVED").length,
    urgent: rows.filter((r) => r.priority === "URGENT" && !isPastReport(r)).length,
    inReview: rows.filter((r) => r.status === "IN_REVIEW").length,
  }), [rows]);

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((row) => {
      const past = isPastReport(row);
      if (viewMode === "ACTIVE" && past) return false;
      if (viewMode === "PAST" && !past) return false;
      if (!query) return true;
      return [row.subject, row.description, row.category, row.status, row.priority,
        row.reporterUser?.name ?? "", row.reporterUser?.email ?? "",
        row.reportedUser?.name ?? "", row.reportedUser?.email ?? "",
      ].join(" ").toLowerCase().includes(query);
    });
  }, [rows, q, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredRows, currentPage]
  );

  const softBtn = "rounded-xl px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .report-row { animation: rowIn 0.2s ease forwards; }
        .detail-panel { animation: fadeSlideUp 0.22s cubic-bezier(0.16,1,0.3,1) forwards; }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-5 px-4 pb-16 pt-7 sm:px-6 lg:px-8">

        {/* ── back link ── */}
        <div>
          <a href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors duration-150 group">
            <IconChevronLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
            Admin
          </a>
        </div>

        {/* ── header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-lg shadow-rose-500/30">
              <IconShield className="h-5 w-5" />
              {counts.urgent > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[0.55rem] font-black text-white ring-2 ring-[rgb(var(--bg))]">
                  {counts.urgent}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[rgb(var(--fg))]">User Reports</h1>
              <p className="text-xs text-[rgb(var(--muted))]">Review complaints, appeals &amp; incidents</p>
            </div>
          </div>
          <button onClick={load} type="button" disabled={loading}
            className={`${softBtn} inline-flex items-center gap-2`}>
            <IconRefresh className="h-3.5 w-3.5" spinning={loading} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* ── stats grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<IconShield className="h-4.5 w-4.5" />}      label="Total"       value={counts.all}       accent="slate"   />
          <StatCard icon={<IconClock className="h-4.5 w-4.5" />}       label="Active"      value={counts.active}    accent="amber"   />
          <StatCard icon={<IconCheckCircle className="h-4.5 w-4.5" />} label="Resolved"    value={counts.resolved}  accent="emerald" />
          <StatCard icon={<IconFire className="h-4.5 w-4.5" />}        label="Urgent"      value={counts.urgent}    accent="rose"    />
        </div>

        {/* ── notice ── */}
        {notice && <Notice notice={notice} onDismiss={() => setNotice(null)} />}

        {/* ── main table card ── */}
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.6)] shadow-xl shadow-[rgb(var(--shadow)/0.06)] overflow-hidden">

          {/* card header */}
          <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            {/* tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-1">
              <ViewTab active={viewMode === "ACTIVE"} label="Active" count={counts.active} onClick={() => setViewMode("ACTIVE")} />
              <ViewTab active={viewMode === "PAST"}   label="Past"   count={counts.past}   onClick={() => setViewMode("PAST")} />
              <ViewTab active={viewMode === "ALL"}    label="All"    count={counts.all}    onClick={() => setViewMode("ALL")} />
            </div>
            {/* search */}
            <div className="relative w-full max-w-xs">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted2))]">
                <IconSearch className="h-3.5 w-3.5" />
              </span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reports…"
                className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] pl-9 pr-8 py-2.5 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.15)] transition-all duration-150" />
              {q && (
                <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] transition-colors">
                  <IconX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-2 w-2 rounded-full bg-[rgb(var(--primary))] opacity-70"
                    style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
              <p className="text-sm text-[rgb(var(--muted2))]">Loading reports…</p>
              <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6)}40%{transform:scale(1)} }`}</style>
            </div>
          )}

          {/* empty state */}
          {!loading && filteredRows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted2))]">
                <IconSearch className="h-6 w-6" />
              </div>
              <p className="font-bold text-[rgb(var(--fg))]">
                {viewMode === "ACTIVE" ? "No active reports" : viewMode === "PAST" ? "No past reports" : "No reports found"}
              </p>
              <p className="text-sm text-[rgb(var(--muted2))]">{q ? `No results for "${q}"` : "Nothing here yet."}</p>
              {(q || viewMode !== "ALL") && (
                <button onClick={() => { setQ(""); setViewMode("ALL"); }}
                  className={`${softBtn} mt-1`}>Clear filters</button>
              )}
            </div>
          )}

          {/* table */}
          {!loading && filteredRows.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1060px] w-full text-left">
                  <thead>
                    <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.5)]">
                      {["Report", "Category", "Reporter", "Reported user", "Priority", "Status", "Evidence", "When", "Actions"].map((h) => (
                        <th key={h} className="px-5 py-3 text-[0.6rem] font-black uppercase tracking-widest text-[rgb(var(--muted2))]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgb(var(--border)/0.6)]">
                    {paginatedRows.map((row, idx) => {
                      const archived = isPastReport(row);
                      const isSelected = selectedReport?.id === row.id;
                      return (
                        <tr key={row.id}
                          onClick={() => { setSelectedReport(row); setAdminNotes(row.adminNotes || ""); }}
                          className={`report-row group cursor-pointer align-top transition-all duration-150 ${isSelected ? "bg-[rgb(var(--primary)/0.05)]" : "hover:bg-[rgb(var(--card2)/0.5)]"}`}
                          style={{ animationDelay: `${idx * 30}ms` }}>

                          {/* subject */}
                          <td className="px-5 py-4 max-w-[210px]">
                            <div className="flex items-start gap-2.5">
                              <PriorityAccent value={row.priority} />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[rgb(var(--fg))]">{row.subject}</p>
                                <p className="mt-0.5 line-clamp-2 text-[0.71rem] leading-relaxed text-[rgb(var(--muted))]">{row.description}</p>
                                {archived && (
                                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-0.5 text-[0.6rem] font-semibold text-[rgb(var(--muted2))]">
                                    <IconArchive className="h-2.5 w-2.5" /> Archived
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* category */}
                          <td className="px-5 py-4">
                            <span className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[0.68rem] font-semibold text-[rgb(var(--muted))]">
                              {niceLabel(row.category)}
                            </span>
                          </td>

                          {/* reporter */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Avatar name={row.reporterUser.name} email={row.reporterUser.email} />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-[rgb(var(--fg))]">{row.reporterUser.name || "Unnamed"}</p>
                                <p className="truncate text-[0.68rem] text-[rgb(var(--muted))]">{row.reporterUser.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* reported user */}
                          <td className="px-5 py-4">
                            {row.reportedUser ? (
                              <div className="flex items-center gap-2">
                                <Avatar name={row.reportedUser.name} email={row.reportedUser.email} />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-[rgb(var(--fg))]">{row.reportedUser.name || "Unnamed"}</p>
                                  <p className="truncate text-[0.68rem] text-[rgb(var(--muted))]">{row.reportedUser.email}</p>
                                  {row.reportedUser.accountLockStatus === "LOCKED" && (
                                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[0.6rem] font-bold text-rose-600 dark:text-rose-300">
                                      <IconLock className="h-2.5 w-2.5" /> Locked
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : <span className="text-[0.7rem] text-[rgb(var(--muted2))]">—</span>}
                          </td>

                          <td className="px-5 py-4"><PriorityBadge value={row.priority} /></td>
                          <td className="px-5 py-4"><StatusBadge value={row.status} /></td>

                          {/* evidence */}
                          <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                            {row.evidenceUrl ? (
                              <button onClick={() => openEvidence(row.id)} disabled={openingEvidenceId === row.id}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[0.68rem] font-semibold text-sky-600 dark:text-sky-300 transition-all duration-150 hover:-translate-y-px hover:bg-sky-500/20 disabled:opacity-50">
                                {openingEvidenceId === row.id
                                  ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400/40 border-t-sky-500" />
                                  : <IconExternal className="h-3 w-3" />}
                                View
                              </button>
                            ) : <span className="text-[0.7rem] text-[rgb(var(--muted2))]">—</span>}
                          </td>

                          {/* date */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="text-xs font-semibold text-[rgb(var(--fg))]">{timeAgo(row.createdAt)}</div>
                            <div className="text-[0.66rem] text-[rgb(var(--muted2))]">
                              {new Date(row.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          </td>

                          {/* actions */}
                          <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-1.5">
                              <ActionBtn onClick={() => updateStatus(row.id, "IN_REVIEW")} disabled={savingId === row.id}>
                                <IconEye className="h-3 w-3" /> Review
                              </ActionBtn>
                              <ActionBtn onClick={() => updateStatus(row.id, "RESOLVED")} disabled={savingId === row.id} variant="success">
                                <IconCheck className="h-3 w-3" /> Resolve
                              </ActionBtn>
                              <ActionBtn onClick={() => updateStatus(row.id, "DISMISSED")} disabled={savingId === row.id} variant="danger">
                                <IconXCircle className="h-3 w-3" /> Dismiss
                              </ActionBtn>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* pagination footer */}
              <div className="flex items-center justify-between border-t border-[rgb(var(--border))] px-5 py-3.5">
                <span className="text-[0.68rem] text-[rgb(var(--muted2))]">
                  Showing{" "}
                  <span className="font-bold text-[rgb(var(--fg))]">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredRows.length)}</span>
                  {" "}of{" "}
                  <span className="font-bold text-[rgb(var(--fg))]">{filteredRows.length}</span> reports
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className={`${softBtn} flex h-7 w-7 items-center justify-center p-0`}>
                      <IconChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button key={page} onClick={() => setCurrentPage(page)}
                        className={`flex h-7 w-7 items-center justify-center rounded-xl border text-xs font-bold transition-all duration-150 ${
                          currentPage === page
                            ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary))] text-white shadow-md shadow-[rgb(var(--primary)/0.3)]"
                            : softBtn
                        }`}>
                        {page}
                      </button>
                    ))}
                    <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className={`${softBtn} flex h-7 w-7 items-center justify-center p-0`}>
                      <IconChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── detail panel ── */}
        {selectedReport && (
          <div className="detail-panel rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.6)] shadow-2xl shadow-[rgb(var(--shadow)/0.1)] overflow-hidden">

            {/* priority accent bar */}
            <div className={`h-1 w-full ${PRIORITY_CONFIG[selectedReport.priority]?.bar ?? "bg-[rgb(var(--border))]"}`} />

            {/* panel header */}
            <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/12 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <IconShield className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-black text-[rgb(var(--fg))]">Report details</p>
                  <p className="text-[0.7rem] text-[rgb(var(--muted))]">Review and take moderation action</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={selectedReport.status} />
                <PriorityBadge value={selectedReport.priority} />
                <button onClick={() => setSelectedReport(null)}
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors">
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-6 lg:grid-cols-2">
              {/* ── LEFT column ── */}
              <div className="space-y-4">

                {/* subject + meta */}
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.4)] p-4">
                  <SectionLabel>Report info</SectionLabel>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[0.68rem] font-semibold text-[rgb(var(--muted))]">
                      {niceLabel(selectedReport.category)}
                    </span>
                    {isPastReport(selectedReport) && (
                      <span className="inline-flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[0.68rem] font-semibold text-[rgb(var(--muted2))]">
                        <IconArchive className="h-3 w-3" /> Archived
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-black leading-snug text-[rgb(var(--fg))]">{selectedReport.subject}</p>
                  <p className="mt-1 text-[0.7rem] text-[rgb(var(--muted2))]">
                    Submitted {timeAgo(selectedReport.createdAt)} · {new Date(selectedReport.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* description */}
                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <SectionLabel>Description</SectionLabel>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[rgb(var(--fg))]">{selectedReport.description}</p>
                </div>

                {/* reporter */}
                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <SectionLabel>Reporter</SectionLabel>
                  <div className="flex items-center gap-3">
                    <Avatar name={selectedReport.reporterUser.name} email={selectedReport.reporterUser.email} size="md" />
                    <div>
                      <p className="font-bold text-[rgb(var(--fg))]">{selectedReport.reporterUser.name || "Unnamed"}</p>
                      <p className="text-[0.71rem] text-[rgb(var(--muted))]">{selectedReport.reporterUser.email}</p>
                      <span className="mt-1 inline-block rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-0.5 text-[0.62rem] font-semibold text-[rgb(var(--muted))]">
                        {niceLabel(selectedReport.reporterUser.role)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* evidence */}
                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <SectionLabel>Evidence</SectionLabel>
                  {selectedReport.evidenceUrl ? (
                    <button onClick={() => openEvidence(selectedReport.id)} disabled={openingEvidenceId === selectedReport.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-bold text-sky-600 dark:text-sky-300 shadow-sm transition-all duration-150 hover:-translate-y-px hover:bg-sky-500/20 hover:shadow-md disabled:opacity-50">
                      {openingEvidenceId === selectedReport.id
                        ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300/40 border-t-sky-500" />
                        : <IconExternal className="h-4 w-4" />}
                      Open evidence
                    </button>
                  ) : (
                    <p className="text-sm text-[rgb(var(--muted2))]">No evidence uploaded.</p>
                  )}
                </div>
              </div>

              {/* ── RIGHT column ── */}
              <div className="space-y-4">

                {/* reported user */}
                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <SectionLabel>Reported user</SectionLabel>
                  {selectedReport.reportedUser ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar name={selectedReport.reportedUser.name} email={selectedReport.reportedUser.email} size="md" />
                        <div>
                          <p className="font-bold text-[rgb(var(--fg))]">{selectedReport.reportedUser.name || "Unnamed"}</p>
                          <p className="text-[0.71rem] text-[rgb(var(--muted))]">{selectedReport.reportedUser.email}</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${
                          selectedReport.reportedUser.accountLockStatus === "LOCKED"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        }`}>
                          {selectedReport.reportedUser.accountLockStatus === "LOCKED"
                            ? <><IconLock className="h-3.5 w-3.5" /> Account locked</>
                            : <><IconCheck className="h-3.5 w-3.5" /> Account active</>}
                        </span>
                      </div>
                      {selectedReport.reportedUser.lockedAt && (
                        <p className="mt-2.5 text-[0.7rem] text-[rgb(var(--muted2))]">
                          Locked: {new Date(selectedReport.reportedUser.lockedAt).toLocaleString()}
                        </p>
                      )}
                      {selectedReport.reportedUser.lockReason && (
                        <div className="mt-2 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-[0.71rem] text-rose-700 dark:text-rose-300">
                          <span className="font-bold">Reason:</span> {selectedReport.reportedUser.lockReason}
                        </div>
                      )}
                    </>
                  ) : <p className="text-sm text-[rgb(var(--muted2))]">No reported user linked.</p>}
                </div>

                {/* admin notes */}
                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <SectionLabel>Admin notes</SectionLabel>
                  <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={4}
                    placeholder="Add internal notes for this report…"
                    className="w-full resize-none rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.15)] transition-all duration-150" />
                  <button onClick={() => saveAdminUpdate(selectedReport.id, { adminNotes })} disabled={actionLoading}
                    className={`${softBtn} mt-2.5 inline-flex items-center gap-2`}>
                    {actionLoading && <span className="h-3 w-3 animate-spin rounded-full border-2 border-[rgb(var(--muted2))] border-t-[rgb(var(--fg))]" />}
                    Save notes
                  </button>
                </div>

                {/* actions */}
                <div className="rounded-2xl border border-[rgb(var(--border))] p-4">
                  <SectionLabel>Actions</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    <ActionBtn onClick={() => saveAdminUpdate(selectedReport.id, { status: "IN_REVIEW", adminNotes })} disabled={actionLoading}>
                      <IconEye className="h-3.5 w-3.5" /> Mark in review
                    </ActionBtn>
                    <ActionBtn onClick={() => saveAdminUpdate(selectedReport.id, { status: "RESOLVED", adminNotes })} disabled={actionLoading} variant="success">
                      <IconCheckCircle className="h-3.5 w-3.5" /> Resolve
                    </ActionBtn>
                    <ActionBtn onClick={() => saveAdminUpdate(selectedReport.id, { status: "DISMISSED", adminNotes })} disabled={actionLoading} variant="danger">
                      <IconXCircle className="h-3.5 w-3.5" /> Dismiss
                    </ActionBtn>
                    {selectedReport.reportedUser && (
                      <ActionBtn onClick={toggleUserLock} disabled={actionLoading} variant="warning">
                        {selectedReport.reportedUser.accountLockStatus === "LOCKED"
                          ? <><IconUnlock className="h-3.5 w-3.5" /> Unlock user</>
                          : <><IconLock className="h-3.5 w-3.5" /> Lock user</>}
                      </ActionBtn>
                    )}
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.5)] px-4 py-3 text-[0.71rem] text-[rgb(var(--muted))]">
                    <IconWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    Actions here affect the selected report and, if applicable, the reported user's account.
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