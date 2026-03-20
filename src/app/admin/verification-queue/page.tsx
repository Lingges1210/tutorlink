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

/* ─── Initials avatar ─── */
function Avatar({ name }: { name: string | null }) {
  if (!name) return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))] text-[0.72rem] font-semibold">
      ?
    </div>
  );
  const colors = [
    "bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]",
    "bg-sky-500/10 text-sky-500",
    "bg-emerald-500/10 text-emerald-500",
    "bg-rose-500/10 text-rose-500",
    "bg-amber-500/10 text-amber-500",
  ];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-semibold ${colors[idx]}`}>
      {letters}
    </div>
  );
}

/* ─── Status pill ─── */
function StatusPill({ status }: { status: string }) {
  const s = (status ?? "").toUpperCase();
  const isVerified = s === "AUTO_VERIFIED" || s === "APPROVED";
  const isRejected = s === "REJECTED";

  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Verified
      </span>
    );
  }
  if (isRejected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[0.68rem] font-semibold text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.68rem] font-semibold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      Pending
    </span>
  );
}

/* ─── Stat card ─── */
function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "amber" | "emerald" | "rose" | "sky";
}) {
  const accents = {
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/8 dark:text-amber-400",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/8 dark:text-emerald-400",
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/8 dark:text-rose-400",
    sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/8 dark:text-sky-400",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${accents[accent]}`}>
      <div className="text-[0.65rem] font-semibold uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

/* ─── Reject modal ─── */
function RejectModal({
  open,
  userLabel,
  submitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  userLabel: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string | null) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm dark:bg-black/60"
        aria-label="Close modal"
        disabled={submitting}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-2xl dark:bg-[rgb(var(--card))]">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-rose-400 to-rose-600" />

        <div className="px-5 pt-5 pb-4">
          <div className="mb-4">
            <div className="text-base font-semibold text-[rgb(var(--fg))]">Reject verification</div>
            <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">
              {userLabel}
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 dark:border-rose-500/20 dark:bg-rose-500/8">
            <p className="text-[0.72rem] text-rose-700 dark:text-rose-400">
              An optional reason will be shown to the student so they can fix and resubmit.
            </p>
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="e.g. Matric card is unclear or matric number mismatch. Please re-upload a clearer image."
            className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 transition-all resize-none"
            disabled={submitting}
          />

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-[rgb(var(--border))] bg-transparent px-4 py-2 text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))] disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(reason.trim() ? reason.trim() : null)}
              disabled={submitting}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Rejecting…" : "Reject user"}
            </button>
          </div>
        </div>
      </div>
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

  const counts = useMemo(() => {
    const pending = users.filter((u) => {
      const s = (u.verificationStatus ?? "").toUpperCase();
      return s !== "AUTO_VERIFIED" && s !== "APPROVED" && s !== "REJECTED";
    }).length;
    const verified = users.filter((u) => {
      const s = (u.verificationStatus ?? "").toUpperCase();
      return s === "AUTO_VERIFIED" || s === "APPROVED";
    }).length;
    const rejected = users.filter((u) => (u.verificationStatus ?? "").toUpperCase() === "REJECTED").length;
    return { pending, verified, rejected, total: users.length };
  }, [users]);

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

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
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
        text:
          action === "APPROVE"
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
    ? `${rejectTarget.name ?? "Unknown"} · ${rejectTarget.email ?? ""}`
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

      <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12 pt-7 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Verification Queue</h1>
              {!loading && counts.pending > 0 && (
                <span className="inline-flex animate-pulse items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400">
                  {counts.pending} pending
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">
              Review matric card submissions · Approve to verify student access · Reject to send feedback
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              type="button"
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] disabled:opacity-50 transition-colors"
            >
              <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? "Loading…" : "Refresh"}
            </button>

            <Link
              href="/admin"
              className="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] transition-colors"
            >
              &larr; Admin
            </Link>
          </div>
        </div>

        {/* Stat row */}
        {!loading && !err && users.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={counts.total} accent="sky" />
            <StatCard label="Pending" value={counts.pending} accent="amber" />
            <StatCard label="Verified" value={counts.verified} accent="emerald" />
            <StatCard label="Rejected" value={counts.rejected} accent="rose" />
          </div>
        )}

        {/* Notice */}
        {notice && (
          <div
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-medium transition-all ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300"
            }`}
          >
            {notice.type === "success" ? (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {notice.text}
          </div>
        )}

        {/* Error */}
        {err && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
            {err}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !err && users.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border))] py-16 text-center">
            <svg className="mb-3 h-8 w-8 text-[rgb(var(--muted2))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <p className="text-sm font-medium text-[rgb(var(--muted))]">Queue is clear</p>
            <p className="mt-1 text-xs text-[rgb(var(--muted2))]">No users pending review right now</p>
          </div>
        )}

        {/* Table */}
        {!loading && !err && users.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))]">
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left">
                <thead>
                  <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
                    {["User", "Matric No.", "Matric Card", "Status", ""].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[0.65rem] font-semibold uppercase tracking-wider text-[rgb(var(--muted))]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[rgb(var(--border))] bg-[rgb(var(--card))]">
                  {users.map((u) => {
                    const busy = busyId === u.id;

                    return (
                      <tr
                        key={u.id}
                        className="group align-top transition-colors hover:bg-[rgb(var(--card2))]"
                      >
                        {/* User */}
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <Avatar name={u.name} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[rgb(var(--fg))]">
                                {u.name ?? "—"}
                              </div>
                              <div className="truncate text-xs text-[rgb(var(--muted))]">
                                {u.email}
                              </div>
                              <div className="mt-0.5 text-[0.65rem] text-[rgb(var(--muted2))]">
                                {new Date(u.createdAt).toLocaleDateString(undefined, {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Matric no */}
                        <td className="px-4 py-4">
                          <span className="text-xs font-medium tabular-nums text-[rgb(var(--fg))]">
                            {u.matricNo ?? "—"}
                          </span>
                        </td>

                        {/* Matric card */}
                        <td className="px-4 py-4">
                          {u.matricCardUrl ? (
                            <a
                              href={u.matricCardUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] transition-colors"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View Card
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[0.65rem] font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/8 dark:text-rose-400">
                              Missing
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StatusPill status={u.verificationStatus} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => actVerify(u.id, "APPROVE")}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                            >
                              {busy ? (
                                <>
                                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                  Working…
                                </>
                              ) : (
                                <>
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Approve
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => openReject(u.id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/15 transition-colors"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}