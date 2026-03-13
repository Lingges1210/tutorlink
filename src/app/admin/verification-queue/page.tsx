"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type QueueUser = {
  id: string;
  email: string;
  name: string | null;
  matricNo: string | null;
  matricCardUrl: string | null;
  verificationStatus: "PENDING_REVIEW" | "AUTO_VERIFIED" | "REJECTED" | string;
  createdAt: string;
};

/* ─── Shared token helpers ─── */
const surface =
  "bg-[rgb(var(--card))] border border-[rgb(var(--border))]";

const softBtn =
  "inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-medium " +
  "border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] " +
  "hover:bg-[rgb(var(--bg))] hover:border-black/[0.14] " +
  "disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

/* ─── Initials avatar ─── */
function Avatar({ name }: { name: string | null }) {
  const letters = (name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 text-[12px] font-medium select-none">
      {letters}
    </span>
  );
}

/* ─── Status pill ─── */
function StatusPill({ status }: { status: string }) {
  const s = (status ?? "").toUpperCase();
  const isVerified = s === "AUTO_VERIFIED" || s === "APPROVED";
  const isRejected = s === "REJECTED";

  const cls = isVerified
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
    : isRejected
    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25";

  const dot = isVerified
    ? "bg-emerald-500"
    : isRejected
    ? "bg-rose-500"
    : "bg-amber-500 animate-pulse";

  const label = isVerified ? "Verified" : isRejected ? "Rejected" : "Pending";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

/* ─── Notice banner ─── */
function Notice({ notice }: { notice: { type: "success" | "error"; text: string } | null }) {
  if (!notice) return null;
  return (
    <div className={`mb-4 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
      notice.type === "success"
        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        : "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400"
    }`}>
      {notice.type === "success" ? (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="m5.5 8 1.75 1.75L10.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M8 5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )}
      {notice.text}
    </div>
  );
}

/* ─── Reject modal ─── */
function RejectModal({
  open, userLabel, submitting, onClose, onConfirm,
}: {
  open: boolean;
  userLabel: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string | null) => void;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      aria-modal="true"
      role="dialog"
    >
      <button type="button" className="absolute inset-0" onClick={onClose} disabled={submitting} aria-label="Close" />

      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl ${surface} shadow-2xl`}
        style={{ animation: "slideUp 0.18s ease" }}
      >
        <style>{`@keyframes slideUp{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        <div className="border-b border-[rgb(var(--border))] px-5 py-4">
          <p className="text-[13px] font-medium text-[rgb(var(--fg))]">Reject verification</p>
          <p className="mt-0.5 text-[11px] text-[rgb(var(--muted))]">
            User: <span className="font-medium text-[rgb(var(--fg))]">{userLabel}</span>
          </p>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400">Optional rejection reason</p>
            <p className="mt-0.5 text-[11px] text-rose-700/80 dark:text-rose-400/80">
              Shown to the student so they can fix and resubmit.
            </p>
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Example: Matric card is unclear or matric number mismatch. Please re-upload a clearer image."
            disabled={submitting}
            className="w-full resize-y rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2.5 text-[12px] text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/15 disabled:opacity-50 transition-colors font-[inherit]"
          />

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button type="button" onClick={onClose} disabled={submitting} className={softBtn}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reason.trim() || null)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-rose-600 px-4 py-2 text-[12px] font-medium text-white hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                <path d="M12 4 4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {submitting ? "Rejecting…" : "Reject user"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty state ─── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
        <svg className="h-5 w-5 text-[rgb(var(--muted2))]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2ZM4 22a8 8 0 0 1 16 0" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[13px] font-medium text-[rgb(var(--muted))]">Queue is clear</p>
      <p className="text-[11px] text-[rgb(var(--muted2))]">No users pending review right now.</p>
    </div>
  );
}

/* ─── Main page ─── */
export default function AdminVerificationQueuePage() {
  const [users, setUsers] = useState<QueueUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const pendingCount = useMemo(() => users.length, [users]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/verification-queue", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load queue");
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load verification queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  async function actVerify(userId: string, action: "APPROVE" | "REJECT", reason?: string | null) {
    setNotice(null);
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/verify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Action failed");

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setNotice({
        type: "success",
        text: action === "APPROVE"
          ? "Approved — user verified and email sent."
          : "Rejected — student notified by email.",
      });
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Something went wrong" });
    } finally {
      setBusyId(null);
    }
  }

  function openReject(id: string) {
    setNotice(null);
    setRejectId(id);
    setRejectOpen(true);
  }

  function closeReject() {
    if (busyId) return;
    setRejectOpen(false);
    setRejectId(null);
  }

  const rejectTarget = rejectId ? users.find((u) => u.id === rejectId) : null;
  const rejectUserLabel = rejectTarget
    ? `${rejectTarget.name ?? "—"} · ${rejectTarget.email}`
    : "—";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <RejectModal
        open={rejectOpen}
        userLabel={rejectUserLabel}
        submitting={!!busyId && busyId === rejectId}
        onClose={closeReject}
        onConfirm={(reason) => {
          if (!rejectId) return;
          actVerify(rejectId, "REJECT", reason);
          setRejectOpen(false);
          setRejectId(null);
        }}
      />

      <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className={`${surface} rounded-2xl p-5 sm:p-7`}>

          {/* Header */}
          <header className="mb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-medium tracking-tight">Verification Queue</h1>
                <p className="mt-1 text-[13px] text-[rgb(var(--muted))]">
                  Review matric card submissions and approve or reject student access.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  {pendingCount} pending
                </span>

                <button onClick={load} type="button" className={softBtn} disabled={loading}>
                  <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                    <path d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.05-3.37l-1.9 1.9H14V2l-2.35.35Z" fill="currentColor" />
                  </svg>
                  {loading ? "Refreshing…" : "Refresh"}
                </button>

                <Link href="/admin" className={softBtn}>
                  ← Admin
                </Link>
              </div>
            </div>
          </header>

          <Notice notice={notice} />

          {err && (
            <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-400">
              {err}
            </div>
          )}

          {loading && <p className="text-xs text-[rgb(var(--muted2))]">Loading queue…</p>}

          {!loading && !err && users.length === 0 && <EmptyState />}

          {!loading && !err && users.length > 0 && (
            <div className={`overflow-x-auto rounded-xl ${surface}`}>
              {/* Column headers */}
              <div className="grid min-w-[860px] grid-cols-[1fr_120px_120px_110px_auto] border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
                {["User", "Matric No.", "Matric Card", "Status"].map((h) => (
                  <div key={h} className="px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-[rgb(var(--muted2))]">{h}</div>
                ))}
                <div className="px-4 py-2.5 text-right text-[10px] font-medium uppercase tracking-widest text-[rgb(var(--muted2))]">Actions</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[rgb(var(--border))]">
                {users.map((u) => {
                  const busy = busyId === u.id;
                  return (
                    <div
                      key={u.id}
                      className="grid min-w-[860px] grid-cols-[1fr_120px_120px_110px_auto] items-center hover:bg-indigo-500/[0.03] transition-colors"
                    >
                      {/* User */}
                      <div className="flex items-center gap-3 px-4 py-4">
                        <Avatar name={u.name} />
                        <div>
                          <p className="text-[13px] font-medium">{u.name ?? "—"}</p>
                          <p className="text-[11px] text-[rgb(var(--muted2))]">{u.email}</p>
                          <p className="mt-0.5 text-[10px] text-[rgb(var(--muted2))]">
                            {new Date(u.createdAt).toLocaleString(undefined, {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Matric no */}
                      <div className="px-4 py-4">
                        <p className="text-[12px] font-medium tabular-nums">{u.matricNo ?? "—"}</p>
                      </div>

                      {/* Card link */}
                      <div className="px-4 py-4">
                        {u.matricCardUrl ? (
                          <a
                            href={u.matricCardUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1.5 text-[11px] font-medium hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                          >
                            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                              <path d="M8 3C4 3 1.5 8 1.5 8S4 13 8 13s6.5-5 6.5-5S12 3 8 3Z" stroke="currentColor" strokeWidth="1.2" />
                              <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
                            </svg>
                            View Card
                          </a>
                        ) : (
                          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Missing</span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="px-4 py-4">
                        <StatusPill status={u.verificationStatus} />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 px-4 py-4">
                        <button
                          type="button"
                          onClick={() => actVerify(u.id, "APPROVE")}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-[9px] px-3 py-1.5 text-[11px] font-medium border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                            <path d="m3 8 3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {busy ? "Working…" : "Approve"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openReject(u.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-[9px] px-3 py-1.5 text-[11px] font-medium border border-rose-500/20 bg-rose-500/[0.08] text-rose-700 dark:text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/35 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                            <path d="M12 4 4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}