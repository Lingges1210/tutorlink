// src/app/admin/tutor-applications/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type AppRow = {
  id: string;
  subjects: string;
  cgpa: number | null;
  transcriptPath?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason?: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    matricNo: string | null;
  };
};

const cardShell =
  "rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]";

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

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[0.7rem] font-semibold ${cls}`}
    >
      {s === "APPROVED" ? "✅ APPROVED" : s === "REJECTED" ? "❌ REJECTED" : "⏳ PENDING"}
    </span>
  );
}

function RejectModal({
  open,
  applicantLabel,
  defaultReason,
  submitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  applicantLabel: string;
  defaultReason?: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string | null) => void;
}) {
  const [reason, setReason] = useState(defaultReason ?? "");

  useEffect(() => {
    if (open) setReason(defaultReason ?? "");
  }, [open, defaultReason]);

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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
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
          <div className="text-sm font-semibold text-[rgb(var(--fg))]">
            Reject tutor application
          </div>
          <div className="mt-1 text-xs text-[rgb(var(--muted))]">
            Applicant:{" "}
            <span className="font-medium text-[rgb(var(--fg))]">{applicantLabel}</span>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div
            className="
              rounded-2xl border px-4 py-3
              border-rose-300 bg-rose-100
              dark:border-rose-500/25 dark:bg-rose-500/10
            "
          >
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
            placeholder="Example: Subjects too vague. Please list specific courses clearly."
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
              className="
                rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white
                hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {submitting ? "Rejecting..." : "Reject application"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminTutorApplicationsPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => apps.filter((a) => (a.status || "").toUpperCase() === "PENDING").length,
    [apps]
  );

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/tutor-applications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to load applications");
      setApps(Array.isArray(data.applications) ? data.applications : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load applications");
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

  async function actApprove(id: string) {
    setNotice(null);
    setBusyId(id);

    try {
      const res = await fetch(`/api/admin/tutor-applications/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Action failed");

      setApps((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "APPROVED", reviewedAt: new Date().toISOString(), rejectionReason: null }
            : a
        )
      );

      setNotice({ type: "success", text: "Approved ✅ Tutor role unlocked" });
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Something went wrong" });
    } finally {
      setBusyId(null);
    }
  }

  async function actReject(id: string, reason: string | null) {
    setNotice(null);
    setBusyId(id);

    try {
      const res = await fetch(`/api/admin/tutor-applications/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Action failed");

      setApps((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "REJECTED", reviewedAt: new Date().toISOString(), rejectionReason: reason }
            : a
        )
      );

      setNotice({ type: "success", text: "Rejected ✅" });
      setRejectOpen(false);
      setRejectId(null);
    } catch (e: any) {
      setNotice({ type: "error", text: e?.message ?? "Something went wrong" });
    } finally {
      setBusyId(null);
    }
  }

  const rejectTarget = rejectId ? apps.find((a) => a.id === rejectId) : null;
  const rejectApplicantLabel = rejectTarget
    ? `${rejectTarget.user?.name ?? "—"} (${rejectTarget.user?.email ?? ""})`
    : "—";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <RejectModal
          open={rejectOpen}
          applicantLabel={rejectApplicantLabel}
          defaultReason={rejectTarget?.rejectionReason ?? ""}
          submitting={!!busyId && busyId === rejectId}
          onClose={closeReject}
          onConfirm={(reason) => {
            if (!rejectId) return;
            actReject(rejectId, reason);
          }}
        />

        <div className={`${cardShell} p-4 sm:p-6`}>
          <header className="mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">Tutor Applications</h1>
                <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                  Review tutor applications. Approve to unlock Tutor dashboard & role
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
            <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-100 px-3 py-3 text-xs text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {err}
            </div>
          )}

          {loading && <div className="text-xs text-[rgb(var(--muted2))]">Loading applications…</div>}

          {!loading && !err && apps.length === 0 && (
            <div className="text-xs text-[rgb(var(--muted2))]">No tutor applications yet.</div>
          )}

          {!loading && !err && apps.length > 0 && (
            <div className="overflow-x-auto rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.55)]">
              <table className="min-w-[920px] w-full text-left">
                <thead>
                  <tr className="text-[0.7rem] uppercase tracking-wide text-[rgb(var(--muted2))] bg-[rgb(var(--card2))] dark:bg-transparent">
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Subjects</th>
                    <th className="px-4 py-3">CGPA</th>
                    <th className="px-4 py-3">Transcript</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {apps.map((a, idx) => {
                    const busy = busyId === a.id;
                    const pending = (a.status || "").toUpperCase() === "PENDING";

                    return (
                      <tr
                        key={a.id}
                        className={`
                          align-top
                          hover:bg-[rgb(var(--soft))] dark:hover:bg-white/5
                          ${idx % 2 === 1 ? "bg-[rgb(var(--card))]" : ""}
                          ${idx % 2 === 1 ? "dark:bg-transparent" : ""}
                        `}
                      >
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                            {a.user?.name ?? "—"}
                          </div>
                          <div className="text-xs text-[rgb(var(--muted2))]">{a.user?.email}</div>
                          <div className="mt-1 text-[0.7rem] text-[rgb(var(--muted))]">
                            Matric: {a.user?.matricNo ?? "—"}
                          </div>
                          <div className="mt-1 text-[0.7rem] text-[rgb(var(--muted2))]">
                            Submitted: {new Date(a.createdAt).toLocaleString()}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-xs text-[rgb(var(--fg))] whitespace-pre-wrap">
                            {a.subjects || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="text-xs text-[rgb(var(--fg))]">{a.cgpa ?? "—"}</div>
                        </td>

                        <td className="px-4 py-4">
                          {a.transcriptPath ? (
                            <a
                              href={`/api/admin/tutor-applications/${a.id}/transcript`}
                              target="_blank"
                              rel="noreferrer"
                              className={softBtn}
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-[0.7rem] text-rose-900 dark:text-rose-200">
                              Missing
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <StatusPill status={a.status} />

                          {a.reviewedAt && (
                            <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted2))]">
                              Reviewed: {new Date(a.reviewedAt).toLocaleString()}
                            </div>
                          )}

                          {(a.status || "").toUpperCase() === "REJECTED" && (
                            <div className="mt-2 text-[0.7rem] text-rose-900/90 dark:text-rose-200/80">
                              Reason: {a.rejectionReason?.trim() ? a.rejectionReason : "—"}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => actApprove(a.id)}
                              disabled={!pending || busy}
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
                              onClick={() => openReject(a.id)}
                              disabled={!pending || busy}
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