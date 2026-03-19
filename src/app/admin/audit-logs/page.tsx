"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type LogRow = {
  id: string;
  adminId: string;
  targetUserId: string | null;
  actionType: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  admin: { id: string; name: string | null; email: string };
  targetUser: { id: string; name: string | null; email: string } | null;
};

/* ─── helpers ─────────────────────────────────────────────────── */

function getActionColor(action: string): "green" | "red" | "blue" | "gray" {
  const a = (action || "").toUpperCase();
  if (a.includes("APPROVE") || a.includes("VERIFY_USER_APPROVE") || a.includes("TUTOR_APP_APPROVE") || a.includes("UNLOCK") || a.includes("RESTORE"))
    return "green";
  if (a.includes("REJECT") || a.includes("LOCK") || a.includes("REMOVE") || a.includes("FLAG"))
    return "red";
  if (a.includes("ROLE_CHANGE"))
    return "blue";
  return "gray";
}

const DOT_CLS: Record<string, string> = {
  green: "bg-green-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  gray: "bg-[rgb(var(--muted2))]",
};

function getPillStyle(action: string) {
  const color = getActionColor(action);
  if (color === "green")
    return {
      pill: "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-400",
      dot: "bg-green-500",
    };
  if (color === "red")
    return {
      pill: "border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-400",
      dot: "bg-red-500",
    };
  if (color === "blue")
    return {
      pill: "border-blue-400/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      dot: "bg-blue-500",
    };
  return {
    pill: "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))]",
    dot: "bg-[rgb(var(--muted2))]",
  };
}

function ActionPill({ action }: { action: string }) {
  const { pill, dot } = getPillStyle(action);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {(action || "").toUpperCase()}
    </span>
  );
}

function prettyJson(v: Record<string, any> | null) {
  if (!v) return "—";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "—";
  }
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

/* ─── stat card ───────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: number | string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl bg-[rgb(var(--card2))] px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${valueClass || "text-[rgb(var(--fg))]"}`}>
        {value}
      </p>
    </div>
  );
}

/* ─── shared field classes ───────────────────────────────────────── */

const fieldCls =
  "w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))] focus:ring-1 focus:ring-[rgb(var(--primary)/0.2)]";

/* ─── action type dropdown ───────────────────────────────────────── */

function ActionTypeDropdown({
  value,
  onChange,
  actions,
  counts,
}: {
  value: string;
  onChange: (v: string) => void;
  actions: string[];
  counts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 40);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? actions.filter((a) => a.toLowerCase().includes(q)) : actions;
  }, [actions, search]);

  const totalCount = Object.values(counts).reduce((s, n) => s + n, 0);
  const selectedDot = value === "ALL" ? "bg-[rgb(var(--muted2))]" : DOT_CLS[getActionColor(value)];

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* ── trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
          open
            ? "border-[rgb(var(--primary))] bg-[rgb(var(--card2))] ring-1 ring-[rgb(var(--primary)/0.15)]"
            : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] hover:border-[rgb(var(--muted2))]",
          "text-[rgb(var(--fg))]",
        ].join(" ")}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${selectedDot}`} />
          <span className="truncate text-sm">
            {value === "ALL" ? "All action types" : value}
          </span>
        </span>
        <svg
          className={`flex-shrink-0 text-[rgb(var(--muted2))] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          width="12" height="12" viewBox="0 0 12 12" fill="none"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* ── panel ── */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[230px] overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-lg">
          {/* search */}
          <div className="border-b border-[rgb(var(--border))] p-2">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40"
                width="11" height="11" viewBox="0 0 16 16" fill="none"
              >
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter actions…"
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] py-1.5 pl-7 pr-2.5 text-xs text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))]"
              />
            </div>
          </div>

          {/* options list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {/* "All" option — hidden while searching */}
            {!search.trim() && (
              <>
                <button
                  type="button"
                  onClick={() => { onChange("ALL"); setOpen(false); }}
                  className={[
                    "flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors",
                    value === "ALL"
                      ? "bg-[rgb(var(--primary)/0.08)] text-[rgb(var(--primary))]"
                      : "text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))]",
                  ].join(" ")}
                >
                  <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${value === "ALL" ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--muted2))]"}`} />
                  <span className="font-medium">All action types</span>
                  {totalCount > 0 && (
                    <span className="ml-auto rounded-full bg-[rgb(var(--card2))] px-1.5 py-0.5 text-[0.65rem] text-[rgb(var(--muted2))]">
                      {totalCount}
                    </span>
                  )}
                </button>
                <div className="mx-2 my-1 border-t border-[rgb(var(--border))]" />
              </>
            )}

            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-[rgb(var(--muted2))]">No matching actions.</p>
            )}

            {filtered.map((a) => {
              const dotCls = DOT_CLS[getActionColor(a)];
              const isSelected = value === a;
              const count = counts[a] ?? 0;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => { onChange(a); setOpen(false); }}
                  className={[
                    "flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors",
                    isSelected
                      ? "bg-[rgb(var(--primary)/0.08)] text-[rgb(var(--primary))]"
                      : "text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))]",
                  ].join(" ")}
                >
                  <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isSelected ? "bg-[rgb(var(--primary))]" : dotCls}`} />
                  <span>{a}</span>
                  {count > 0 && (
                    <span className="ml-auto rounded-full bg-[rgb(var(--card2))] px-1.5 py-0.5 text-[0.65rem] text-[rgb(var(--muted2))]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── known action types — synced from AdminActionType enum in schema.prisma ── */

const KNOWN_ACTIONS = [
  "VERIFY_USER_APPROVE",
  "VERIFY_USER_REJECT",
  "TUTOR_APP_APPROVE",
  "TUTOR_APP_REJECT",
  "USER_LOCK",
  "USER_UNLOCK",
  "USER_ROLE_CHANGE",
  "SOS_FLAG",
  "SOS_REMOVE",
  "SOS_RESTORE",
];

/* ─── page ─────────────────────────────────────────────────────── */

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/audit-logs", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success)
        throw new Error(data?.message || "Failed to load audit logs");
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const uniqueActions = useMemo(
    () =>
      Array.from(
        new Set([
          ...KNOWN_ACTIONS,
          ...logs.map((l) => (l.actionType || "").toUpperCase()).filter(Boolean),
        ])
      ).sort(),
    [logs]
  );

  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      const a = (log.actionType || "").toUpperCase();
      if (a) counts[a] = (counts[a] ?? 0) + 1;
    }
    return counts;
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchAction =
        actionFilter === "ALL"
          ? true
          : (log.actionType || "").toUpperCase() === actionFilter;
      const hay = [
        log.actionType,
        log.entityType,
        log.reason,
        log.admin?.name,
        log.admin?.email,
        log.targetUser?.name,
        log.targetUser?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchAction && (search.trim() ? hay.includes(search.trim().toLowerCase()) : true);
    });
  }, [logs, search, actionFilter]);

  const stats = useMemo(() => {
    const approve = logs.filter((l) => {
      const a = (l.actionType || "").toUpperCase();
      return a.includes("APPROVE") || a === "USER_UNLOCK" || a === "SOS_RESTORE";
    }).length;
    const reject = logs.filter((l) => {
      const a = (l.actionType || "").toUpperCase();
      return a.includes("REJECT") || a === "USER_LOCK" || a === "SOS_REMOVE" || a === "SOS_FLAG";
    }).length;
    const admins = new Set(logs.map((l) => l.admin?.id).filter(Boolean)).size;
    return { approve, reject, admins };
  }, [logs]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <div className="mx-auto max-w-screen-xl space-y-5 px-4 pb-10 pt-7 sm:px-6 lg:px-8">

        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">Audit logs</h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Track admin actions across TutorLink for accountability and governance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[0.68rem] font-semibold text-[rgb(var(--muted))]">
              {logs.length} entr{logs.length === 1 ? "y" : "ies"}
            </span>
            <button
              onClick={load}
              disabled={loading}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "↺ Refresh"}
            </button>
            <Link
              href="/admin"
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs font-semibold text-[rgb(var(--muted))] hover:bg-[rgb(var(--card))]"
            >
              ← Admin
            </Link>
          </div>
        </div>

        {/* stat cards */}
        {!loading && !err && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total actions" value={logs.length} />
            <StatCard
              label="Approved / unlocked"
              value={stats.approve}
              valueClass="text-green-600 dark:text-green-400"
            />
            <StatCard
              label="Rejected / locked"
              value={stats.reject}
              valueClass="text-red-600 dark:text-red-400"
            />
            <StatCard label="Unique admins" value={stats.admins} />
          </div>
        )}

        {/* filters — 60/40 split: search takes 3fr, dropdown takes 2fr */}
        <div className="flex flex-wrap gap-3">
          <div className="relative" style={{ flex: "3 1 0", minWidth: "160px" }}>
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
              width="14" height="14" viewBox="0 0 16 16" fill="none"
            >
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search admin, user, reason, action…"
              className={`${fieldCls} pl-9`}
            />
          </div>

          <div style={{ flex: "2 1 0", minWidth: "160px" }}>
            <ActionTypeDropdown
              value={actionFilter}
              onChange={setActionFilter}
              actions={uniqueActions}
              counts={actionCounts}
            />
          </div>

          {(search || actionFilter !== "ALL") && (
            <button
              onClick={() => { setSearch(""); setActionFilter("ALL"); }}
              className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--muted))] hover:bg-[rgb(var(--card))]"
            >
              Clear
            </button>
          )}

          {(search || actionFilter !== "ALL") && (
            <p className="self-center text-xs text-[rgb(var(--muted2))]">
              Showing {filteredLogs.length} of {logs.length}
            </p>
          )}
        </div>

        {/* error */}
        {err && (
          <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {err}
          </div>
        )}

        {/* loading */}
        {loading && (
          <p className="text-sm text-[rgb(var(--muted2))]">Loading audit logs…</p>
        )}

        {/* empty */}
        {!loading && !err && filteredLogs.length === 0 && (
          <p className="text-sm text-[rgb(var(--muted2))]">No audit logs found.</p>
        )}

        {/* table */}
        {!loading && !err && filteredLogs.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[rgb(var(--border))]">
            <table className="min-w-[960px] w-full text-left">
              <thead>
                <tr className="border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
                  {["Timestamp", "Action", "Admin", "Target user", "Entity", "Reason", "Metadata"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(var(--border))]">
                {filteredLogs.map((log) => {
                  const { date, time } = fmtDate(log.createdAt);
                  return (
                    <tr
                      key={log.id}
                      className="align-top transition-colors hover:bg-[rgb(var(--card2)/0.5)]"
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-[rgb(var(--fg))]">{date}</p>
                        <p className="text-[0.68rem] text-[rgb(var(--muted2))]">{time}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <ActionPill action={log.actionType} />
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-medium text-[rgb(var(--fg))]">{log.admin?.name ?? "—"}</p>
                        <p className="text-[0.7rem] text-[rgb(var(--muted2))]">{log.admin?.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        {log.targetUser ? (
                          <>
                            <p className="text-sm font-medium text-[rgb(var(--fg))]">{log.targetUser.name ?? "—"}</p>
                            <p className="text-[0.7rem] text-[rgb(var(--muted2))]">{log.targetUser.email}</p>
                          </>
                        ) : (
                          <span className="text-xs text-[rgb(var(--muted2))]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-[rgb(var(--fg))]">{log.entityType}</p>
                        <p className="mt-0.5 break-all text-[0.68rem] text-[rgb(var(--muted2))]">{log.entityId ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="max-w-[180px] whitespace-pre-wrap text-[0.72rem] leading-relaxed text-[rgb(var(--fg))]">
                          {log.reason?.trim() ? log.reason : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <pre className="max-w-[320px] overflow-x-auto rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-2.5 text-[0.67rem] leading-5 text-[rgb(var(--fg))]">
                          {prettyJson(log.metadata)}
                        </pre>
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
  );
}