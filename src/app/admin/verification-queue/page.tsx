// src/app/admin/verification-queue/page.tsx
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

const cardShell =
  "rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card))] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]";

const softBtn =
  "rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.65)] disabled:opacity-60 disabled:cursor-not-allowed";

function StatusPill({ status }: { status: string }) {
  const s = (status || "").toUpperCase();

  const cls =
  s === "AUTO_VERIFIED" || s === "APPROVED"
    ? `
      border-emerald-500/30 bg-emerald-500/15 text-emerald-700
      dark:text-emerald-400
    `
    : s === "REJECTED"
    ? `
      border-rose-500/30 bg-rose-500/15 text-rose-700
      dark:text-rose-400
    `
    : `
      border-amber-500/30 bg-amber-500/15 text-amber-700
      dark:text-amber-400
    `;


  const label =
    s === "AUTO_VERIFIED" || s === "APPROVED"
      ? "VERIFIED"
      : s === "REJECTED"
      ? "REJECTED"
      : "PENDING";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[0.7rem] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" aria-modal="true" role="dialog">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/20 dark:bg-black/70"
        aria-label="Close modal"
        disabled={submitting}
      />

      <div
        className="
          relative w-full max-w-lg overflow-hidden rounded-3xl
          border border-[rgb(var(--border))]
          bg-[rgb(var(--card))] dark:bg-[rgb(var(--card))]
          shadow-[0_30px_90px_rgb(var(--shadow)/0.45)]
        "
      >
        <div className="border-b border-[rgb(var(--border))] px-5 py-4">
          <div className="text-sm font-semibold text-[rgb(var(--fg))]">Reject verification</div>
          <div className="mt-1 text-xs text-[rgb(var(--muted))]">
            User: <span className="font-medium text-[rgb(var(--fg))]">{userLabel}</span>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
<div className="rounded-2xl border border-rose-500/30 bg-rose-500/15 px-4 py-3">
            <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              Optional rejection reason
            </div>
            <div className="mt-1 text-[0.72rem] text-rose-700/90 dark:text-rose-400">
              This reason will be shown to the student so they can fix and resubmit.
            </div>
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Example: Matric card unclear / matric number mismatch. Please re-upload a clearer card."
            className="
              w-full rounded-2xl border border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
              px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none
              placeholder:text-[rgb(var(--muted2))]
              focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30
            "
            disabled={submitting}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={submitting} className={softBtn}>
              Cancel
            </button>

            <button
              type="button"
              onClick={() => onConfirm(reason.trim() ? reason.trim() : null)}
              disabled={submitting}
              className="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Rejecting..." : "Reject user"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load verification queue");
      }

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

      // remove from queue because GET is pending only
      setUsers((prev) => prev.filter((u) => u.id !== userId));

      setNotice({
        type: "success",
        text: action === "APPROVE" ? "Approved. User verified + email sent" : "Rejected. Email sent",
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
  const rejectUserLabel = rejectTarget ? `${rejectTarget.name ?? "—"} (${rejectTarget.email})` : "—";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
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

        <div className={`${cardShell} p-4 sm:p-6`}>
          <header className="mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">Verification Queue</h1>
                <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                  Verify users using matric card. Approve to unlock access.
                </p>
              </div>

              <div className="flex items-center gap-2">
<span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-[0.65rem] font-semibold text-amber-700 dark:text-amber-400">
                  {pendingCount} pending
                </span>

                <button onClick={load} type="button" className={softBtn} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh"}
                </button>

                <Link href="/admin" className={softBtn}>
                  Back to Admin
                </Link>
              </div>
            </div>
          </header>

          {notice && (
  <div
    className={`mb-4 rounded-2xl border px-3 py-3 text-xs ${
      notice.type === "success"
        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        : "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400"
    }`}
  >
    {notice.text}
  </div>
)}


          {err && (
            <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-100 px-3 py-3 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {err}
            </div>
          )}

          {loading && <div className="text-xs text-[rgb(var(--muted2))]">Loading queue…</div>}

          {!loading && !err && users.length === 0 && (
            <div className="text-xs text-[rgb(var(--muted2))]">No users pending review.</div>
          )}

          {!loading && !err && users.length > 0 && (
            <div className="overflow-x-auto rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card))]">
              <table className="min-w-[950px] w-full text-left">

                <thead>
                  <tr className="text-[0.7rem] uppercase tracking-wide text-[rgb(var(--muted2))] bg-[rgb(var(--card2))] dark:bg-transparent">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Matric</th>
                    <th className="px-4 py-3">Matric Card</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {users.map((u) => {
                    const busy = busyId === u.id;

                    return (
                      <tr key={u.id} className="align-top hover:bg-slate-50 dark:hover:bg-white/5">
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold">{u.name ?? "—"}</div>
                          <div className="text-xs text-[rgb(var(--muted2))]">{u.email}</div>
                          <div className="mt-1 text-[0.7rem] text-[rgb(var(--muted2))]">
                            Submitted: {new Date(u.createdAt).toLocaleString()}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-xs">{u.matricNo ?? "—"}</div>
                        </td>

                
                        <td className="px-4 py-4">
                          {u.matricCardUrl ? (
                            <a
                              href={u.matricCardUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={softBtn}
                            >
                              View Card
                            </a>
                          ) : (
                            <span className="text-[0.7rem] text-rose-800 dark:text-rose-200">
                              Missing
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <StatusPill status={u.verificationStatus} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => actVerify(u.id, "APPROVE")}
                              disabled={busy}
                              className="
                                inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-semibold
                                bg-emerald-600 text-white hover:bg-emerald-500
                                disabled:cursor-not-allowed disabled:opacity-40
                              "
                            >
                              {busy ? "Working..." : "Approve"}
                            </button>

                            <button
                              type="button"
                              onClick={() => openReject(u.id)}
                              disabled={busy}
                              className="
  inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-semibold
  bg-rose-600 text-white hover:bg-rose-500
  disabled:cursor-not-allowed disabled:opacity-40
"


                            >
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
          )}
        </div>
      </div>
    </div>
  );
}
