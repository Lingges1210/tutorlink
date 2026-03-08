"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  acceptedTutor?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  moderatedByAdmin?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

type ViewMode = "ACTIVE" | "REMOVED" | "ALL";

const cardShell =
  "rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.72)] shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]";

const softBtn =
  "rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.65)] disabled:opacity-60 disabled:cursor-not-allowed";

function badgeClasses(value: string, kind: "status" | "moderation") {
  const v = (value || "").toUpperCase();

  const redCls =
    "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400";

  if (kind === "moderation") {
    if (v === "REMOVED_BY_ADMIN") {
      return redCls;
    }
    if (v === "FLAGGED") {
      return "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400";
    }
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }

  if (v === "RESOLVED" || v === "COMPLETED") {
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }
  if (v === "ACCEPTED" || v === "IN_PROGRESS") {
    return "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-400";
  }
  if (v === "CANCELLED" || v === "EXPIRED") {
    return redCls;
  }
  return "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400";
}

function Badge({
  value,
  kind,
}: {
  value: string;
  kind: "status" | "moderation";
}) {
  const label =
    value === "REMOVED_BY_ADMIN"
      ? "REMOVED"
      : value.replaceAll("_", " ");

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[0.7rem] font-semibold ${badgeClasses(
        value,
        kind
      )}`}
    >
      {label}
    </span>
  );
}

export default function AdminSosModerationPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<SosRow[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("ACTIVE");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<SosRow | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const params = new URLSearchParams();
      params.set("view", viewMode);
      if (search.trim()) params.set("q", search.trim());

      const res = await fetch(`/api/admin/sos?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load SOS moderation list");
      }

      setRows(Array.isArray(data?.requests) ? data.requests : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load SOS moderation list");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [viewMode]);

  const counts = useMemo(() => {
    const active = rows.filter((r) => r.moderationStatus !== "REMOVED_BY_ADMIN").length;
    const removed = rows.filter((r) => r.moderationStatus === "REMOVED_BY_ADMIN").length;
    return {
      active,
      removed,
      all: rows.length,
    };
  }, [rows]);

  async function removeSos() {
    if (!selected) return;

    const reason = moderationReason.trim();
    const notes = adminNotes.trim();

    if (!reason) {
      setErr("Please provide a moderation reason.");
      return;
    }

    setSubmitting(true);
    setErr(null);

    try {
      const res = await fetch(`/api/admin/sos/${selected.id}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moderationReason: reason,
          adminNotes: notes || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to remove SOS post");
      }

      setSelected(null);
      setModerationReason("");
      setAdminNotes("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to remove SOS post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
         <div className="min-w-0 space-y-3">
  <Link
    href="/admin"
    className="inline-flex items-center gap-2 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--primary))]"
  >
    <ArrowLeft size={14} />
    Back
  </Link>

  <div>
    <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
      SOS Moderation
    </h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">
      Review SOS requests, remove inappropriate posts, and keep urgent academic help
      relevant and safe.
    </p>
  </div>
</div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("ACTIVE")}
              className={`${softBtn} ${viewMode === "ACTIVE" ? "border-[rgb(var(--primary))]" : ""}`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setViewMode("REMOVED")}
              className={`${softBtn} ${viewMode === "REMOVED" ? "border-[rgb(var(--primary))]" : ""}`}
            >
              Removed
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ALL")}
              className={`${softBtn} ${viewMode === "ALL" ? "border-[rgb(var(--primary))]" : ""}`}
            >
              All
            </button>
            <button onClick={load} type="button" className={softBtn} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {err && (
          <div className="rounded-2xl border border-rose-300 bg-rose-100 px-4 py-3 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            {err}
          </div>
        )}

        <section className={cardShell}>
          <div className="px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Active
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">{counts.active}</p>
                </div>
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Removed
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">{counts.removed}</p>
                </div>
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                    Loaded Rows
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">{counts.all}</p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student, email, subject, or description"
                  className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted))] focus:border-[rgb(var(--primary))]"
                />
                <button type="button" onClick={load} className={softBtn}>
                  Search
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className={cardShell}>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-[0.72rem] uppercase tracking-wide text-[rgb(var(--muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-5 py-4 font-semibold">
                    SOS
                  </th>
                  <th className="border-b border-[rgb(var(--border))] px-5 py-4 font-semibold">
                    Student
                  </th>
                  <th className="border-b border-[rgb(var(--border))] px-5 py-4 font-semibold">
                    Subject
                  </th>
                  <th className="border-b border-[rgb(var(--border))] px-5 py-4 font-semibold">
                    Status
                  </th>
                  <th className="border-b border-[rgb(var(--border))] px-5 py-4 font-semibold">
                    Moderation
                  </th>
                  <th className="border-b border-[rgb(var(--border))] px-5 py-4 font-semibold">
                    Created
                  </th>
                  <th className="border-b border-[rgb(var(--border))] px-5 py-4 font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-sm text-[rgb(var(--muted))]"
                    >
                      Loading SOS posts...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-sm text-[rgb(var(--muted))]"
                    >
                      No SOS posts found for this view.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="border-b border-[rgb(var(--border))] px-5 py-4">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-[rgb(var(--fg))]">#{row.id}</p>
                          <p className="max-w-md text-sm leading-6 text-[rgb(var(--fg))]">
                            {row.description}
                          </p>
                          <p className="text-[0.7rem] text-[rgb(var(--muted))]">
                            Mode: {row.mode}
                          </p>
                        </div>
                      </td>

                      <td className="border-b border-[rgb(var(--border))] px-5 py-4">
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-[rgb(var(--fg))]">
                            {row.student.name || "Unnamed user"}
                          </p>
                          <p className="text-[rgb(var(--muted))]">{row.student.email}</p>
                          <p className="text-[0.7rem] text-[rgb(var(--muted))]">
                            Account: {row.student.accountLockStatus}
                          </p>
                        </div>
                      </td>

                      <td className="border-b border-[rgb(var(--border))] px-5 py-4">
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-[rgb(var(--fg))]">{row.subject.code}</p>
                          <p className="text-[rgb(var(--muted))]">{row.subject.title}</p>
                        </div>
                      </td>

                      <td className="border-b border-[rgb(var(--border))] px-5 py-4">
                        <Badge value={row.status} kind="status" />
                      </td>

                      <td className="border-b border-[rgb(var(--border))] px-5 py-4">
                        <div className="space-y-2">
                          <Badge value={row.moderationStatus} kind="moderation" />
                          {row.moderationReason && (
                            <p className="max-w-xs text-[0.72rem] leading-5 text-[rgb(var(--muted))]">
                              {row.moderationReason}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="border-b border-[rgb(var(--border))] px-5 py-4 text-sm text-[rgb(var(--muted))]">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>

                      <td className="border-b border-[rgb(var(--border))] px-5 py-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(row);
                            setModerationReason(row.moderationReason || "");
                            setAdminNotes(row.adminNotes || "");
                          }}
                          className={softBtn}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">SOS Details</h2>
                <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                  Review the SOS content and take moderation action if needed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setModerationReason("");
                  setAdminNotes("");
                }}
                className={softBtn}
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  Student
                </p>
                <p className="mt-2 text-sm font-semibold text-[rgb(var(--fg))]">
                  {selected.student.name || "Unnamed user"}
                </p>
                <p className="text-sm text-[rgb(var(--muted))]">{selected.student.email}</p>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  Subject
                </p>
                <p className="mt-2 text-sm font-semibold text-[rgb(var(--fg))]">
                  {selected.subject.code}
                </p>
                <p className="text-sm text-[rgb(var(--muted))]">{selected.subject.title}</p>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  SOS Status
                </p>
                <div className="mt-2">
                  <Badge value={selected.status} kind="status" />
                </div>
              </div>

              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  Moderation Status
                </p>
                <div className="mt-2">
                  <Badge value={selected.moderationStatus} kind="moderation" />
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                Description
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--fg))]">
                {selected.description}
              </p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold text-[rgb(var(--fg))]">
                  Moderation Reason
                </label>
                <input
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  placeholder="Spam, offensive, irrelevant, non-academic misuse..."
                  className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted))] focus:border-[rgb(var(--primary))]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-[rgb(var(--fg))]">
                  Admin Notes
                </label>
                <input
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal note for admins"
                  className="w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted))] focus:border-[rgb(var(--primary))]"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {selected.moderationStatus !== "REMOVED_BY_ADMIN" && (
                <button
                  type="button"
                  onClick={removeSos}
                  disabled={submitting}
                  className="rounded-md border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400"
                >
                  {submitting ? "Removing..." : "Remove SOS"}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setModerationReason("");
                  setAdminNotes("");
                }}
                className={softBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}