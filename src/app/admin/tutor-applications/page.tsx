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

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function AvatarCircle({ name }: { name: string | null }) {
  const colors = [
    "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
    "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  ];
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-semibold ${colors[idx]}`}
    >
      {initials(name)}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  if (s === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Approved
      </span>
    );
  }
  if (s === "REJECTED") {
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
            <div className="text-base font-semibold text-[rgb(var(--fg))]">Reject application</div>
            <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">
              {applicantLabel}
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
            placeholder="e.g. Subjects too vague. Please list specific course codes."
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
              {submitting ? "Rejecting…" : "Reject application"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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

export default function AdminTutorApplicationsPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const pending = apps.filter((a) => (a.status || "").toUpperCase() === "PENDING").length;
    const approved = apps.filter((a) => (a.status || "").toUpperCase() === "APPROVED").length;
    const rejected = apps.filter((a) => (a.status || "").toUpperCase() === "REJECTED").length;
    return { pending, approved, rejected, total: apps.length };
  }, [apps]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/tutor-applications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.success)
        throw new Error(data?.message || "Failed to load applications");
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
      setNotice({ type: "success", text: "Application approved — Tutor role unlocked." });
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
      setNotice({ type: "success", text: "Application rejected." });
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
    ? `${rejectTarget.user?.name ?? "Unknown"} · ${rejectTarget.user?.email ?? ""}`
    : "—";

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
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

      <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12 pt-7 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Tutor Applications</h1>
              {!loading && counts.pending > 0 && (
                <span className="inline-flex animate-pulse items-center rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400">
                  {counts.pending} pending
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">
              Approve to unlock Tutor dashboard &amp; role · Reject to send feedback to the applicant
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
        {!loading && !err && apps.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={counts.total} accent="sky" />
            <StatCard label="Pending" value={counts.pending} accent="amber" />
            <StatCard label="Approved" value={counts.approved} accent="emerald" />
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
        {!loading && !err && apps.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border))] py-16 text-center">
            <svg className="mb-3 h-8 w-8 text-[rgb(var(--muted2))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-[rgb(var(--muted))]">No applications yet</p>
            <p className="mt-1 text-xs text-[rgb(var(--muted2))]">New tutor applications will appear here</p>
          </div>
        )}

        {/* Table */}
        {!loading && !err && apps.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border))]">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left">
                <thead>
                  <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
                    {["Applicant", "Subjects", "CGPA", "Transcript", "Status", ""].map((h) => (
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
                  {apps.map((a) => {
                    const busy = busyId === a.id;
                    const pending = (a.status || "").toUpperCase() === "PENDING";

                    return (
                      <tr
                        key={a.id}
                        className="group align-top transition-colors hover:bg-[rgb(var(--card2))]"
                      >
                        {/* Applicant */}
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <AvatarCircle name={a.user?.name ?? null} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[rgb(var(--fg))]">
                                {a.user?.name ?? "—"}
                              </div>
                              <div className="truncate text-xs text-[rgb(var(--muted))]">
                                {a.user?.email}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-[0.68rem] text-[rgb(var(--muted2))]">
                                <span className="font-medium">Matric:</span>
                                {a.user?.matricNo ?? "—"}
                              </div>
                              <div className="mt-0.5 text-[0.65rem] text-[rgb(var(--muted2))]">
                                {new Date(a.createdAt).toLocaleDateString(undefined, {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Subjects */}
                        <td className="px-4 py-4 max-w-[200px]">
                          <p className="whitespace-pre-wrap text-xs text-[rgb(var(--fg))] leading-relaxed line-clamp-4">
                            {a.subjects || "—"}
                          </p>
                        </td>

                        {/* CGPA */}
                        <td className="px-4 py-4">
                          {a.cgpa != null ? (
                            <span className="inline-flex items-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-xs font-semibold tabular-nums text-[rgb(var(--fg))]">
                              {a.cgpa.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-[rgb(var(--muted2))]">—</span>
                          )}
                        </td>

                        {/* Transcript */}
                        <td className="px-4 py-4">
                          {a.transcriptPath ? (
                            <a
                              href={`/api/admin/tutor-applications/${a.id}/transcript`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] transition-colors"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[0.65rem] font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/8 dark:text-rose-400">
                              Missing
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <StatusPill status={a.status} />

                          {a.reviewedAt && (
                            <div className="mt-2 text-[0.65rem] text-[rgb(var(--muted2))]">
                              {new Date(a.reviewedAt).toLocaleDateString(undefined, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          )}

                          {(a.status || "").toUpperCase() === "REJECTED" && a.rejectionReason?.trim() && (
                            <div className="mt-2 max-w-[160px] rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[0.65rem] text-rose-700 dark:border-rose-500/15 dark:bg-rose-500/8 dark:text-rose-400 leading-relaxed">
                              {a.rejectionReason}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => actApprove(a.id)}
                              disabled={!pending || busy}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                            >
                              {busy && busyId === a.id ? (
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
                              onClick={() => openReject(a.id)}
                              disabled={!pending || busy}
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