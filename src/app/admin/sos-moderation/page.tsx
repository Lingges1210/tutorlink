"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw, Search, ShieldAlert, ShieldCheck, ShieldX, X } from "lucide-react";
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

/* ─── helpers ─────────────────────────────────────────────── */

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function avatarColor(str: string) {
  const palette = [
    { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300" },
    { bg: "bg-sky-100 dark:bg-sky-900/40", text: "text-sky-700 dark:text-sky-300" },
    { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
    { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" },
    { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300" },
    { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-700 dark:text-teal-300" },
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

/* ─── badge ───────────────────────────────────────────────── */

function statusBadge(value: string) {
  const v = value.toUpperCase();
  const map: Record<string, { cls: string; dot: string }> = {
    RESOLVED:    { cls: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
    COMPLETED:   { cls: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800", dot: "bg-emerald-500" },
    ACCEPTED:    { cls: "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800", dot: "bg-sky-500" },
    IN_PROGRESS: { cls: "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800", dot: "bg-sky-500" },
    CANCELLED:   { cls: "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800", dot: "bg-rose-500" },
    EXPIRED:     { cls: "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800", dot: "bg-rose-500" },
  };
  const style = map[v] ?? { cls: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800", dot: "bg-amber-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wide ${style.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {v.replace(/_/g, " ")}
    </span>
  );
}

function moderationBadge(value: string) {
  const v = value.toUpperCase();
  if (v === "REMOVED_BY_ADMIN") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 dark:border-rose-800 bg-rose-100 dark:bg-rose-950/60 px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wide text-rose-800 dark:text-rose-300">
        <ShieldX size={11} />
        REMOVED
      </span>
    );
  }
  if (v === "FLAGGED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-800 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wide text-amber-800 dark:text-amber-300">
        <ShieldAlert size={11} />
        FLAGGED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[0.68rem] font-semibold tracking-wide text-emerald-800 dark:text-emerald-300">
      <ShieldCheck size={11} />
      VISIBLE
    </span>
  );
}

/* ─── stat card ───────────────────────────────────────────── */

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "rose" | "emerald" | "default";
}) {
  const accentMap = {
    rose: "border-l-rose-400 dark:border-l-rose-500",
    emerald: "border-l-emerald-400 dark:border-l-emerald-500",
    default: "border-l-[rgb(var(--border))]",
  };
  const bar = accentMap[accent ?? "default"];
  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-5 py-4 border-l-[3px] ${bar} transition-all`}
    >
      <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums text-[rgb(var(--fg))]">{value}</p>
    </div>
  );
}

/* ─── main ────────────────────────────────────────────────── */

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
      const res = await fetch(`/api/admin/sos?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load SOS moderation list");
      setRows(Array.isArray(data?.requests) ? data.requests : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load SOS moderation list");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [viewMode]);

  const counts = useMemo(() => {
    const active  = rows.filter((r) => r.moderationStatus !== "REMOVED_BY_ADMIN").length;
    const removed = rows.filter((r) => r.moderationStatus === "REMOVED_BY_ADMIN").length;
    return { active, removed, all: rows.length };
  }, [rows]);

  async function removeSos() {
    if (!selected) return;
    const reason = moderationReason.trim();
    const notes  = adminNotes.trim();
    if (!reason) { setErr("Please provide a moderation reason."); return; }
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/sos/${selected.id}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderationReason: reason, adminNotes: notes || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to remove SOS post");
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

  /* ── view-mode tab ── */
  const tabs: { label: string; value: ViewMode }[] = [
    { label: "Active",   value: "ACTIVE"   },
    { label: "Removed",  value: "REMOVED"  },
    { label: "All",      value: "ALL"      },
  ];

  const softBtn =
    "rounded-xl px-3.5 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] hover:border-[rgb(var(--primary)/0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="mx-auto mt-8 w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="space-y-8">

        {/* ── header ── */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:border-[rgb(var(--primary)/0.4)] transition-all"
            >
              <ArrowLeft size={13} />
              Admin
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60">
                  <ShieldAlert size={18} className="text-rose-600 dark:text-rose-400" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--fg))]">
                  SOS Moderation
                </h1>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[rgb(var(--muted))]">
                Review urgent help requests, remove inappropriate posts, and keep the SOS
                feed safe and academically relevant.
              </p>
            </div>
          </div>

          {/* tabs + refresh */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-1 gap-1">
              {tabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setViewMode(t.value)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                    viewMode === t.value
                      ? "bg-[rgb(var(--fg))] text-[rgb(var(--card))] shadow-sm"
                      : "text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={load}
              type="button"
              className={softBtn}
              disabled={loading}
            >
              <span className="flex items-center gap-1.5">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                {loading ? "Loading…" : "Refresh"}
              </span>
            </button>
          </div>
        </header>

        {/* ── error banner ── */}
        {err && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-4 py-3 text-sm text-rose-800 dark:text-rose-300">
            <ShieldX size={15} className="mt-0.5 shrink-0" />
            <span>{err}</span>
            <button
              type="button"
              onClick={() => setErr(null)}
              className="ml-auto shrink-0 opacity-60 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── stats + search ── */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Active"       value={counts.active}  accent="emerald" />
            <StatCard label="Removed"      value={counts.removed} accent="rose"    />
            <StatCard label="Total Loaded" value={counts.all}                       />
          </div>

          {/* search — always a single inline row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Search student, subject, description…"
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] py-2.5 pl-9 pr-4 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted))] focus:border-[rgb(var(--primary))] transition-colors"
              />
            </div>
            <button type="button" onClick={load} className={softBtn}>
              Search
            </button>
          </div>
        </div>

        {/* ── table ── */}
        <div className="overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.72)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {["SOS Request", "Student", "Subject", "Status", "Moderation", "Posted", ""].map(
                    (h, i) => (
                      <th
                        key={i}
                        className="border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-5 py-3.5 text-left text-[0.68rem] font-semibold uppercase tracking-widest text-[rgb(var(--muted))] first:rounded-tl-3xl last:rounded-tr-3xl"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-[rgb(var(--muted))]">
                        <RefreshCw size={20} className="animate-spin opacity-40" />
                        <span className="text-sm">Loading SOS posts…</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-[rgb(var(--muted))]">
                        <ShieldCheck size={28} className="opacity-30" />
                        <p className="text-sm">No SOS posts found for this view.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const av = avatarColor(row.student.email);
                    const isLast = idx === rows.length - 1;
                    const tdCls = `px-5 py-4 align-top text-sm ${isLast ? "" : "border-b border-[rgb(var(--border))]"}`;
                    return (
                      <tr
                        key={row.id}
                        className="group transition-colors hover:bg-[rgb(var(--card2)/0.5)]"
                      >
                        {/* SOS */}
                        <td className={tdCls}>
                          <div className="max-w-sm space-y-1.5">
                            <p className="font-mono text-[0.65rem] text-[rgb(var(--muted))]">
                              #{row.id.slice(0, 8)}…
                            </p>
                            <p className="line-clamp-2 text-sm leading-5 text-[rgb(var(--fg))]">
                              {row.description}
                            </p>
                            <span className="inline-block rounded-md bg-[rgb(var(--card2))] border border-[rgb(var(--border))] px-2 py-0.5 text-[0.65rem] font-medium text-[rgb(var(--muted))]">
                              {row.mode}
                            </span>
                          </div>
                        </td>

                        {/* Student */}
                        <td className={tdCls}>
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold ${av.bg} ${av.text}`}
                            >
                              {initials(row.student.name, row.student.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-[rgb(var(--fg))]">
                                {row.student.name || "Unnamed"}
                              </p>
                              <p className="truncate text-xs text-[rgb(var(--muted))]">
                                {row.student.email}
                              </p>
                              {row.student.accountLockStatus === "LOCKED" && (
                                <span className="mt-0.5 inline-block text-[0.6rem] font-semibold text-rose-600 dark:text-rose-400">
                                  LOCKED
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className={tdCls}>
                          <p className="font-semibold text-[rgb(var(--fg))]">{row.subject.code}</p>
                          <p className="mt-0.5 text-xs text-[rgb(var(--muted))]">{row.subject.title}</p>
                        </td>

                        {/* Status */}
                        <td className={tdCls}>{statusBadge(row.status)}</td>

                        {/* Moderation */}
                        <td className={tdCls}>
                          <div className="space-y-1.5">
                            {moderationBadge(row.moderationStatus)}
                            {row.moderationReason && (
                              <p className="max-w-[180px] text-[0.68rem] leading-4 text-[rgb(var(--muted))]">
                                {row.moderationReason}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Posted */}
                        <td className={`${tdCls} whitespace-nowrap text-xs text-[rgb(var(--muted))]`}>
                          {new Date(row.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          <br />
                          <span className="text-[0.65rem] opacity-70">
                            {new Date(row.createdAt).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>

                        {/* Action */}
                        <td className={tdCls}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(row);
                              setModerationReason(row.moderationReason || "");
                              setAdminNotes(row.adminNotes || "");
                            }}
                            className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3.5 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] opacity-0 transition-all group-hover:opacity-100 hover:border-[rgb(var(--primary)/0.5)]"
                          >
                            Review →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
              setModerationReason("");
              setAdminNotes("");
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-2xl">
            {/* modal header */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--card))] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60">
                  <ShieldAlert size={15} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">SOS Review</h2>
                  <p className="text-[0.68rem] text-[rgb(var(--muted))]">
                    #{selected.id.slice(0, 12)}…
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setModerationReason("");
                  setAdminNotes("");
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* meta grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Student",
                    primary: selected.student.name || "Unnamed user",
                    secondary: selected.student.email,
                  },
                  {
                    label: "Subject",
                    primary: selected.subject.code,
                    secondary: selected.subject.title,
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3"
                  >
                    <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
                      {card.label}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-[rgb(var(--fg))]">
                      {card.primary}
                    </p>
                    <p className="text-xs text-[rgb(var(--muted))]">{card.secondary}</p>
                  </div>
                ))}

                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3">
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
                    SOS Status
                  </p>
                  {statusBadge(selected.status)}
                </div>
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3">
                  <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
                    Moderation
                  </p>
                  {moderationBadge(selected.moderationStatus)}
                </div>
              </div>

              {/* description */}
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3">
                <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
                  Description
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--fg))]">
                  {selected.description}
                </p>
              </div>

              {/* moderation fields */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[rgb(var(--fg))]">
                    Moderation reason
                    <span className="ml-1 text-rose-500">*</span>
                  </label>
                  <input
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="Spam, offensive, irrelevant…"
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2.5 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted))] focus:border-[rgb(var(--primary))] transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[rgb(var(--fg))]">
                    Admin notes
                    <span className="ml-1 text-[rgb(var(--muted))]">(internal)</span>
                  </label>
                  <input
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Note for other admins…"
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2.5 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted))] focus:border-[rgb(var(--primary))] transition-colors"
                  />
                </div>
              </div>

              {/* modal actions */}
              <div className="flex flex-wrap items-center gap-3 border-t border-[rgb(var(--border))] pt-4">
                {selected.moderationStatus !== "REMOVED_BY_ADMIN" ? (
                  <button
                    type="button"
                    onClick={removeSos}
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/80 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                  >
                    <ShieldX size={13} />
                    {submitting ? "Removing…" : "Remove SOS"}
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
                    <ShieldX size={13} />
                    Already removed
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setModerationReason("");
                    setAdminNotes("");
                  }}
                  className={softBtn + " ml-auto"}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}