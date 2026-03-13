"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  matricNo: string | null;
  role: "STUDENT" | "TUTOR" | "ADMIN" | string;
  verificationStatus: string;
  accountLockStatus: "ACTIVE" | "LOCKED" | string;
  isDeactivated: boolean;
  createdAt: string;
  lockedAt: string | null;
  lockReason: string | null;
};

/* ─── style tokens ────────────────────────────────────────── */
const cardShell =
  "rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]";

const softBtn =
  "rounded-xl px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.65)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

const inputCls =
  "w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3.5 py-2.5 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.15)] transition-all duration-150";

/* ─── inline SVG icons ────────────────────────────────────── */
const IconUsers = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M9 6a3 3 0 1 1 6 0A3 3 0 0 1 9 6ZM17 16a4 4 0 0 0-8 0h8ZM3 8a2 2 0 1 1 4 0A2 2 0 0 1 3 8Zm2 9a3 3 0 0 0-3-3v-1h6v1a3 3 0 0 0-3 3Z" />
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

const IconSearch = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
  </svg>
);

const IconRefresh = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
  </svg>
);

const IconArrowLeft = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
  </svg>
);

const IconWarning = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
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

const IconBolt = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z" />
  </svg>
);

const IconAcademicCap = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.394 2.08a1 1 0 0 0-.788 0l-7 3a1 1 0 0 0 0 1.84L5.25 8.051a.999.999 0 0 1 .356-.257l4-1.714a1 1 0 1 1 .788 1.838L7.667 9.088l1.94.831a1 1 0 0 0 .787 0l7-3a1 1 0 0 0 0-1.838l-7-3ZM3.31 9.397 5 10.12v4.102a8.969 8.969 0 0 0-1.05-.174 1 1 0 0 1-.89-.89 11.115 11.115 0 0 1 .25-3.762ZM9.3 16.573A9.026 9.026 0 0 0 10 17a9.026 9.026 0 0 0 .7-.427l.193-3.088-1.088-.465a2 2 0 0 1-1.61 0L7.1 13.52l.2 3.053Z" />
    <path d="M6.5 11.848v2.55l.636.273A9.01 9.01 0 0 0 10 15a9 9 0 0 0 2.864-.329l.636-.273v-2.55l-2.793 1.194a2 2 0 0 1-1.414 0L6.5 11.848Z" />
  </svg>
);

const IconUser = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
  </svg>
);

const Spinner = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <span className={`inline-block animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />
);

/* ─── stat card ───────────────────────────────────────────── */
function StatCard({
  label, value, accent, icon,
}: {
  label: string; value: number | string;
  accent: "default" | "rose" | "emerald" | "sky";
  icon: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    default: "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))]",
    rose:    "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    sky:     "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  };
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${styles[accent]}`}>
      <span className="shrink-0">{icon}</span>
      <div>
        <div className="text-[0.65rem] font-semibold uppercase tracking-widest opacity-60">{label}</div>
        <div className="text-lg font-bold leading-none">{value}</div>
      </div>
    </div>
  );
}

/* ─── pills ───────────────────────────────────────────────── */
function RolePill({ role }: { role: string }) {
  const r = (role || "").toUpperCase();
  const map: Record<string, string> = {
    ADMIN:   "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
    TUTOR:   "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-400",
    STUDENT: "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))]",
  };
  const icon =
    r === "ADMIN"   ? <IconBolt className="h-3 w-3" /> :
    r === "TUTOR"   ? <IconAcademicCap className="h-3 w-3" /> :
                      <IconUser className="h-3 w-3" />;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${map[r] ?? map.STUDENT}`}>
      {icon}
      {r || "UNKNOWN"}
    </span>
  );
}

function VerificationPill({ status }: { status: string }) {
  const s    = (status || "").toUpperCase();
  const isOk = s === "AUTO_VERIFIED" || s === "APPROVED";
  const isRj = s === "REJECTED";
  const cls  = isOk ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
             : isRj ? "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400"
             :        "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400";
  const dot  = isOk ? "bg-emerald-500" : isRj ? "bg-rose-500" : "bg-amber-500";
  const lbl  = isOk ? "Verified" : isRj ? "Rejected" : "Pending";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${cls}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {lbl}
    </span>
  );
}

function LockPill({ lockStatus, isDeactivated }: { lockStatus: string; isDeactivated: boolean }) {
  if (isDeactivated)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/30 bg-slate-500/15 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-700 dark:text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
        Deactivated
      </span>
    );
  const locked = (lockStatus || "").toUpperCase() === "LOCKED";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${locked ? "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400" : "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${locked ? "bg-rose-500" : "bg-emerald-500"}`} />
      {locked ? "Locked" : "Active"}
    </span>
  );
}

/* ─── avatar ──────────────────────────────────────────────── */
function Avatar({ name, email }: { name: string | null; email: string }) {
  const label = name ?? email;
  const initials =
    label.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") ||
    email[0].toUpperCase();
  const palettes = [
    "from-violet-500 to-indigo-500",
    "from-sky-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-pink-500",
    "from-fuchsia-500 to-purple-500",
  ];
  const idx = label.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length;
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${palettes[idx]} text-[0.65rem] font-bold text-white shadow-sm`}>
      {initials}
    </div>
  );
}

/* ─── lock modal ──────────────────────────────────────────── */
function LockModal({
  open, userLabel, submitting, onClose, onConfirm,
}: {
  open: boolean; userLabel: string; submitting: boolean;
  onClose: () => void; onConfirm: (reason: string | null) => void;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" aria-modal="true" role="dialog">
      <button type="button" onClick={onClose} disabled={submitting}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close modal" />

      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.97)] shadow-[0_40px_120px_rgb(var(--shadow)/0.55)]"
        style={{ animation: "fadeSlideUp 0.18s cubic-bezier(0.16,1,0.3,1) forwards" }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-rose-400 to-orange-400" />

        <div className="border-b border-[rgb(var(--border))] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <IconLock className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-bold text-[rgb(var(--fg))]">Lock user account</div>
              <div className="text-[0.72rem] text-[rgb(var(--muted))]">{userLabel}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3">
            <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="text-[0.72rem] font-medium text-rose-700 dark:text-rose-400">
              This user will be immediately prevented from logging in. You can unlock them at any time.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[0.72rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              Reason <span className="font-normal normal-case opacity-70">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="E.g. Spam, abusive behavior, fake profile, suspicious activity…"
              className="w-full resize-none rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 transition-all duration-150"
              disabled={submitting}
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={submitting} className={softBtn}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reason.trim() ? reason.trim() : null)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-[0_4px_12px_rgb(239,68,68,0.3)] hover:shadow-[0_6px_18px_rgb(239,68,68,0.4)] hover:from-rose-400 hover:to-rose-500 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? <><Spinner /> Locking…</>
                : <><IconLock className="h-3.5 w-3.5" /> Lock user</>}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────── */
export default function AdminUsersPage() {
  const [users, setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [verificationFilter, setVerificationFilter] = useState("ALL");
  const [lockFilter, setLockFilter] = useState("ALL");
  const [lockOpen, setLockOpen]     = useState(false);
  const [lockUserId, setLockUserId] = useState<string | null>(null);

  const totalCount   = users.length;
  const lockedCount  = useMemo(() => users.filter((u) => (u.accountLockStatus || "").toUpperCase() === "LOCKED").length, [users]);
  const activeCount  = useMemo(() => users.filter((u) => (u.accountLockStatus || "").toUpperCase() === "ACTIVE" && !u.isDeactivated).length, [users]);
  const pendingCount = useMemo(() => users.filter((u) => (u.verificationStatus || "").toUpperCase() === "PENDING_REVIEW").length, [users]);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (roleFilter !== "ALL") qs.set("role", roleFilter);
      if (verificationFilter !== "ALL") qs.set("verificationStatus", verificationFilter);
      if (lockFilter !== "ALL") qs.set("accountLockStatus", lockFilter);
      const res  = await fetch(`/api/admin/users?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load users");
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load users");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  function openLock(id: string) { setNotice(null); setLockUserId(id); setLockOpen(true); }
  function closeLock() { if (busyId) return; setLockOpen(false); setLockUserId(null); }

  async function actLock(id: string, reason: string | null) {
    setNotice(null); setBusyId(id);
    try {
      const res  = await fetch(`/api/admin/users/${id}/lock`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to lock user");
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, accountLockStatus: "LOCKED", lockedAt: new Date().toISOString(), lockReason: reason } : u));
      setNotice({ type: "success", text: "User locked successfully." });
      setLockOpen(false); setLockUserId(null);
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Something went wrong" });
    } finally { setBusyId(null); }
  }

  async function actUnlock(id: string) {
    setNotice(null); setBusyId(id);
    try {
      const res  = await fetch(`/api/admin/users/${id}/unlock`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to unlock user");
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, accountLockStatus: "ACTIVE", lockedAt: null, lockReason: null } : u));
      setNotice({ type: "success", text: "User unlocked successfully." });
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Something went wrong" });
    } finally { setBusyId(null); }
  }

  const lockTarget    = lockUserId ? users.find((u) => u.id === lockUserId) : null;
  const lockUserLabel = lockTarget ? `${lockTarget.name ?? "—"} (${lockTarget.email})` : "—";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <div className="mx-auto max-w-7xl space-y-5 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <LockModal
          open={lockOpen} userLabel={lockUserLabel}
          submitting={!!busyId && busyId === lockUserId}
          onClose={closeLock}
          onConfirm={(reason) => { if (!lockUserId) return; actLock(lockUserId, reason); }}
        />

        {/* ── page header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--primary)/0.7)] text-white shadow-md shadow-[rgb(var(--primary)/0.3)]">
                <IconUsers className="h-4 w-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--fg))]">Manage Users</h1>
            </div>
            <p className="mt-1.5 text-sm text-[rgb(var(--muted))]">Search, filter, and manage TutorLink user accounts.</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={load} type="button" disabled={loading}
              className={`${softBtn} inline-flex items-center gap-1.5`}>
              {loading
                ? <><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[rgb(var(--muted2))] border-t-[rgb(var(--fg))]" /> Refreshing…</>
                : <><IconRefresh className="h-3.5 w-3.5" /> Refresh</>}
            </button>
            <Link href="/admin" className={`${softBtn} inline-flex items-center gap-1.5`}>
              <IconArrowLeft className="h-3.5 w-3.5" /> Admin
            </Link>
          </div>
        </div>

        {/* ── stat row ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<IconUsers className="h-5 w-5" />} label="Total Users"    value={totalCount}   accent="default"  />
          <StatCard icon={<IconCheck className="h-5 w-5" />} label="Active"         value={activeCount}  accent="emerald"  />
          <StatCard icon={<IconLock  className="h-5 w-5" />} label="Locked"         value={lockedCount}  accent="rose"     />
          <StatCard icon={<IconClock className="h-5 w-5" />} label="Pending Verify" value={pendingCount} accent="sky"      />
        </div>

        {/* ── filter card ── */}
        <div className={`${cardShell} p-4 sm:p-5`}>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[0.7rem] font-bold uppercase tracking-widest text-[rgb(var(--muted))]">Filters</span>
            <div className="h-px flex-1 bg-[rgb(var(--border))]" />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted2))]">
                <IconSearch />
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Search name, email, matric no…"
                className={`${inputCls} pl-9`}
              />
            </div>

            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputCls}>
              <option value="ALL">All roles</option>
              <option value="STUDENT">Student</option>
              <option value="TUTOR">Tutor</option>
              <option value="ADMIN">Admin</option>
            </select>

            <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className={inputCls}>
              <option value="ALL">All verification</option>
              <option value="PENDING_REVIEW">Pending</option>
              <option value="AUTO_VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select value={lockFilter} onChange={(e) => setLockFilter(e.target.value)} className={inputCls}>
              <option value="ALL">All account states</option>
              <option value="ACTIVE">Active</option>
              <option value="LOCKED">Locked</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={load} disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--primary)/0.8)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity duration-150 disabled:opacity-50">
              {loading ? "Applying…" : "Apply filters"}
            </button>
            <button type="button" disabled={loading} className={softBtn}
              onClick={() => { setSearch(""); setRoleFilter("ALL"); setVerificationFilter("ALL"); setLockFilter("ALL"); setTimeout(() => load(), 0); }}>
              Reset
            </button>
          </div>
        </div>

        {/* ── notices ── */}
        {notice && (
          <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-medium ${notice.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"}`}>
            {notice.type === "success"
              ? <IconCheckCircle className="h-4 w-4 shrink-0" />
              : <IconXCircle className="h-4 w-4 shrink-0" />}
            {notice.text}
          </div>
        )}

        {err && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-100/80 px-4 py-3 text-xs font-medium text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <IconWarning className="h-4 w-4 shrink-0" /> {err}
          </div>
        )}

        {/* ── table card ── */}
        <div className={cardShell}>
          {loading && (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-[rgb(var(--muted2))]">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[rgb(var(--border))] border-t-[rgb(var(--primary))]" />
              Loading users…
            </div>
          )}

          {!loading && !err && users.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))]">
                <IconSearch className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-[rgb(var(--muted))]">No users found</p>
              <p className="text-xs text-[rgb(var(--muted2))]">Try adjusting your filters or search term.</p>
            </div>
          )}

          {!loading && !err && users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left">
                <thead>
                  <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.6)] text-[0.65rem] uppercase tracking-widest text-[rgb(var(--muted2))]">
                    <th className="px-5 py-3.5 font-semibold">User</th>
                    <th className="px-4 py-3.5 font-semibold">Role</th>
                    <th className="px-4 py-3.5 font-semibold">Verification</th>
                    <th className="px-4 py-3.5 font-semibold">Account</th>
                    <th className="px-4 py-3.5 font-semibold">Joined</th>
                    <th className="px-4 py-3.5 font-semibold">Lock Details</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {users.map((u) => {
                    const busy    = busyId === u.id;
                    const locked  = (u.accountLockStatus || "").toUpperCase() === "LOCKED";
                    const isAdmin = (u.role || "").toUpperCase() === "ADMIN";

                    return (
                      <tr key={u.id} className="group align-top transition-colors duration-100 hover:bg-[rgb(var(--primary)/0.04)] dark:hover:bg-white/[0.03]">

                        {/* user */}
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <Avatar name={u.name} email={u.email} />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold leading-snug text-[rgb(var(--fg))]">
                                {u.name ?? <span className="text-[rgb(var(--muted2))]">—</span>}
                              </div>
                              <div className="truncate text-[0.72rem] text-[rgb(var(--muted))]">{u.email}</div>
                              {u.matricNo && (
                                <div className="mt-0.5 font-mono text-[0.65rem] text-[rgb(var(--muted2))]">{u.matricNo}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4"><RolePill role={u.role} /></td>
                        <td className="px-4 py-4"><VerificationPill status={u.verificationStatus} /></td>
                        <td className="px-4 py-4"><LockPill lockStatus={u.accountLockStatus} isDeactivated={u.isDeactivated} /></td>

                        <td className="px-4 py-4">
                          <div className="text-xs text-[rgb(var(--fg))]">
                            {new Date(u.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                          </div>
                          <div className="text-[0.68rem] text-[rgb(var(--muted2))]">
                            {new Date(u.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {locked ? (
                            <div className="space-y-1">
                              <div className="text-[0.72rem] text-[rgb(var(--fg))]">
                                {u.lockedAt ? new Date(u.lockedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}
                              </div>
                              {u.lockReason?.trim() && (
                                <div className="max-w-[200px] rounded-lg border border-rose-500/20 bg-rose-500/[0.08] px-2 py-1 text-[0.68rem] text-rose-800 dark:text-rose-300 whitespace-pre-wrap">
                                  {u.lockReason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[0.72rem] text-[rgb(var(--muted2))]">—</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            {locked ? (
                              <button type="button" onClick={() => actUnlock(u.id)} disabled={busy || isAdmin}
                                title={isAdmin ? "Admin accounts cannot be changed here" : ""}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-500 hover:shadow-emerald-500/30 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40">
                                {busy
                                  ? <><Spinner /> Working…</>
                                  : <><IconUnlock className="h-3.5 w-3.5" /> Unlock</>}
                              </button>
                            ) : (
                              <button type="button" onClick={() => openLock(u.id)} disabled={busy || isAdmin || u.isDeactivated}
                                title={isAdmin ? "Admin accounts cannot be changed here" : u.isDeactivated ? "Deactivated accounts cannot be locked" : ""}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-rose-600/20 hover:bg-rose-500 hover:shadow-rose-500/30 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40">
                                {busy
                                  ? <><Spinner /> Working…</>
                                  : <><IconLock className="h-3.5 w-3.5" /> Lock</>}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* table footer */}
          {!loading && users.length > 0 && (
            <div className="flex items-center justify-between border-t border-[rgb(var(--border))] px-5 py-3">
              <span className="text-[0.7rem] text-[rgb(var(--muted2))]">
                Showing <span className="font-semibold text-[rgb(var(--fg))]">{users.length}</span>{" "}
                {users.length === 1 ? "user" : "users"}
              </span>
              <div className="flex gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-rose-700 dark:text-rose-400">
                  <IconLock className="h-3 w-3" /> {lockedCount} locked
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700 dark:text-emerald-400">
                  <IconCheck className="h-3 w-3" /> {activeCount} active
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}