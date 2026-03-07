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

const cardShell =
  "rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]";

const softBtn =
  "rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.65)] disabled:opacity-60 disabled:cursor-not-allowed";

function RolePill({ role }: { role: string }) {
  const r = (role || "").toUpperCase();

  const cls =
    r === "ADMIN"
      ? "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400"
      : r === "TUTOR"
      ? "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-400"
      : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))]";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[0.7rem] font-semibold ${cls}`}>
      {r || "UNKNOWN"}
    </span>
  );
}

function VerificationPill({ status }: { status: string }) {
  const s = (status || "").toUpperCase();

  const cls =
    s === "AUTO_VERIFIED" || s === "APPROVED"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : s === "REJECTED"
      ? "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400"
      : "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400";

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

function LockPill({
  lockStatus,
  isDeactivated,
}: {
  lockStatus: string;
  isDeactivated: boolean;
}) {
  if (isDeactivated) {
    return (
      <span className="inline-flex rounded-full border border-slate-500/30 bg-slate-500/15 px-3 py-1 text-[0.7rem] font-semibold text-slate-700 dark:text-slate-400">
        DEACTIVATED
      </span>
    );
  }

  const s = (lockStatus || "").toUpperCase();

  const cls =
    s === "LOCKED"
      ? "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400"
      : "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[0.7rem] font-semibold ${cls}`}>
      {s === "LOCKED" ? "LOCKED" : "ACTIVE"}
    </span>
  );
}

function LockModal({
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
          bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.95)]
          shadow-[0_30px_90px_rgb(var(--shadow)/0.45)]
        "
      >
        <div className="border-b border-[rgb(var(--border))] px-5 py-4">
          <div className="text-sm font-semibold text-[rgb(var(--fg))]">Lock user account</div>
          <div className="mt-1 text-xs text-[rgb(var(--muted))]">
            User: <span className="font-medium text-[rgb(var(--fg))]">{userLabel}</span>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/15 px-4 py-3">
            <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              Optional lock reason
            </div>
            <div className="mt-1 text-[0.72rem] text-rose-700/90 dark:text-rose-400">
              This reason is stored for audit and future admin review.
            </div>
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Example: Spam, abusive behavior, fake profile, suspicious misuse."
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
              {submitting ? "Locking..." : "Lock user"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [verificationFilter, setVerificationFilter] = useState("ALL");
  const [lockFilter, setLockFilter] = useState("ALL");

  const [lockOpen, setLockOpen] = useState(false);
  const [lockUserId, setLockUserId] = useState<string | null>(null);

  const totalCount = users.length;
  const lockedCount = useMemo(
    () => users.filter((u) => (u.accountLockStatus || "").toUpperCase() === "LOCKED").length,
    [users]
  );

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams();

      if (search.trim()) qs.set("search", search.trim());
      if (roleFilter !== "ALL") qs.set("role", roleFilter);
      if (verificationFilter !== "ALL") qs.set("verificationStatus", verificationFilter);
      if (lockFilter !== "ALL") qs.set("accountLockStatus", lockFilter);

      const res = await fetch(`/api/admin/users?${qs.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load users");
      }

      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  function openLock(id: string) {
    setNotice(null);
    setLockUserId(id);
    setLockOpen(true);
  }

  function closeLock() {
    if (busyId) return;
    setLockOpen(false);
    setLockUserId(null);
  }

  async function actLock(id: string, reason: string | null) {
    setNotice(null);
    setBusyId(id);

    try {
      const res = await fetch(`/api/admin/users/${id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to lock user");
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                accountLockStatus: "LOCKED",
                lockedAt: new Date().toISOString(),
                lockReason: reason,
              }
            : u
        )
      );

      setNotice({ type: "success", text: "User locked successfully" });
      setLockOpen(false);
      setLockUserId(null);
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Something went wrong" });
    } finally {
      setBusyId(null);
    }
  }

  async function actUnlock(id: string) {
    setNotice(null);
    setBusyId(id);

    try {
      const res = await fetch(`/api/admin/users/${id}/unlock`, {
        method: "POST",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to unlock user");
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                accountLockStatus: "ACTIVE",
                lockedAt: null,
                lockReason: null,
              }
            : u
        )
      );

      setNotice({ type: "success", text: "User unlocked successfully" });
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Something went wrong" });
    } finally {
      setBusyId(null);
    }
  }

  const lockTarget = lockUserId ? users.find((u) => u.id === lockUserId) : null;
  const lockUserLabel = lockTarget ? `${lockTarget.name ?? "—"} (${lockTarget.email})` : "—";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <LockModal
          open={lockOpen}
          userLabel={lockUserLabel}
          submitting={!!busyId && busyId === lockUserId}
          onClose={closeLock}
          onConfirm={(reason) => {
            if (!lockUserId) return;
            actLock(lockUserId, reason);
          }}
        />

        <div className={`${cardShell} p-4 sm:p-6`}>
          <header className="mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">Manage Users</h1>
                <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                  Search, filter, and manage TutorLink user accounts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-1 text-[0.65rem] font-semibold text-[rgb(var(--fg))]">
                  {totalCount} users
                </span>

                <span className="rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-1 text-[0.65rem] font-semibold text-rose-700 dark:text-rose-400">
                  {lockedCount} locked
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

          <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, matric no"
              className="
                w-full rounded-2xl border border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none
                placeholder:text-[rgb(var(--muted2))]
                focus:border-[rgb(var(--primary))] focus:ring-1 focus:ring-[rgb(var(--primary)/0.25)]
              "
            />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="
                w-full rounded-2xl border border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none
                focus:border-[rgb(var(--primary))] focus:ring-1 focus:ring-[rgb(var(--primary)/0.25)]
              "
            >
              <option value="ALL">All roles</option>
              <option value="STUDENT">Student</option>
              <option value="TUTOR">Tutor</option>
              <option value="ADMIN">Admin</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="
                w-full rounded-2xl border border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none
                focus:border-[rgb(var(--primary))] focus:ring-1 focus:ring-[rgb(var(--primary)/0.25)]
              "
            >
              <option value="ALL">All verification</option>
              <option value="PENDING_REVIEW">Pending</option>
              <option value="AUTO_VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={lockFilter}
              onChange={(e) => setLockFilter(e.target.value)}
              className="
                w-full rounded-2xl border border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none
                focus:border-[rgb(var(--primary))] focus:ring-1 focus:ring-[rgb(var(--primary)/0.25)]
              "
            >
              <option value="ALL">All account states</option>
              <option value="ACTIVE">Active</option>
              <option value="LOCKED">Locked</option>
            </select>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={load}
              className="rounded-md bg-[rgb(var(--primary))] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Applying..." : "Apply filters"}
            </button>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRoleFilter("ALL");
                setVerificationFilter("ALL");
                setLockFilter("ALL");
                setTimeout(() => load(), 0);
              }}
              className={softBtn}
              disabled={loading}
            >
              Reset
            </button>
          </div>

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

          {loading && <div className="text-xs text-[rgb(var(--muted2))]">Loading users…</div>}

          {!loading && !err && users.length === 0 && (
            <div className="text-xs text-[rgb(var(--muted2))]">No users found.</div>
          )}

          {!loading && !err && users.length > 0 && (
            <div className="overflow-x-auto rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.55)]">
              <table className="min-w-[1180px] w-full text-left">
                <thead>
                  <tr className="bg-[rgb(var(--card2))] text-[0.7rem] uppercase tracking-wide text-[rgb(var(--muted2))] dark:bg-transparent">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Lock Details</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {users.map((u, idx) => {
                    const busy = busyId === u.id;
                    const locked = (u.accountLockStatus || "").toUpperCase() === "LOCKED";
                    const isAdmin = (u.role || "").toUpperCase() === "ADMIN";

                    return (
                      <tr
                        key={u.id}
                        className={`
                          align-top
                          hover:bg-[rgb(var(--soft))] dark:hover:bg-white/5
                          ${idx % 2 === 1 ? "bg-[rgb(var(--card))]" : ""}
                          ${idx % 2 === 1 ? "dark:bg-transparent" : ""}
                        `}
                      >
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                            {u.name ?? "—"}
                          </div>
                          <div className="text-xs text-[rgb(var(--muted2))]">{u.email}</div>
                          <div className="mt-1 text-[0.7rem] text-[rgb(var(--muted))]">
                            Matric: {u.matricNo ?? "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <RolePill role={u.role} />
                        </td>

                        <td className="px-4 py-4">
                          <VerificationPill status={u.verificationStatus} />
                        </td>

                        <td className="px-4 py-4">
                          <LockPill
                            lockStatus={u.accountLockStatus}
                            isDeactivated={u.isDeactivated}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-xs text-[rgb(var(--fg))]">
                            {new Date(u.createdAt).toLocaleString()}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {locked ? (
                            <>
                              <div className="text-[0.72rem] text-[rgb(var(--fg))]">
                                Locked: {u.lockedAt ? new Date(u.lockedAt).toLocaleString() : "—"}
                              </div>
                              <div className="mt-1 text-[0.72rem] text-rose-900/90 dark:text-rose-200/80 whitespace-pre-wrap">
                                Reason: {u.lockReason?.trim() ? u.lockReason : "—"}
                              </div>
                            </>
                          ) : (
                            <span className="text-[0.72rem] text-[rgb(var(--muted2))]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {locked ? (
                              <button
                                type="button"
                                onClick={() => actUnlock(u.id)}
                                disabled={busy || isAdmin}
                                className="
                                  inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-semibold
                                  bg-emerald-600 text-white hover:bg-emerald-500
                                  disabled:cursor-not-allowed disabled:opacity-40
                                "
                                title={isAdmin ? "Admin accounts cannot be changed here" : ""}
                              >
                                {busy ? "Working..." : "Unlock"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openLock(u.id)}
                                disabled={busy || isAdmin || u.isDeactivated}
                                className="
                                  inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-semibold
                                  bg-rose-600 text-white hover:bg-rose-500
                                  disabled:cursor-not-allowed disabled:opacity-40
                                "
                                title={
                                  isAdmin
                                    ? "Admin accounts cannot be changed here"
                                    : u.isDeactivated
                                    ? "Deactivated accounts cannot be locked"
                                    : ""
                                }
                              >
                                {busy ? "Working..." : "Lock"}
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
        </div>
      </div>
    </div>
  );
}