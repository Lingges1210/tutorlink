"use client";

import { useEffect, useMemo, useState } from "react";
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

function getPillStyle(action: string) {
  const a = (action || "").toUpperCase();
  if (a.includes("APPROVE"))
    return {
      pill: "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-400",
      dot: "bg-green-500",
    };
  if (a.includes("REJECT") || (a.includes("LOCK") && !a.includes("UN")))
    return {
      pill: "border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-400",
      dot: "bg-red-500",
    };
  if (a.includes("UNLOCK"))
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

/* ─── input / select shared classes ─────────────────────────────── */

const fieldCls =
  "w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-sm text-[rgb(var(--fg))] outline-none placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))] focus:ring-1 focus:ring-[rgb(var(--primary)/0.2)]";

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

  useEffect(() => {
    load();
  }, []);

  const uniqueActions = useMemo(
    () =>
      Array.from(
        new Set(logs.map((l) => (l.actionType || "").toUpperCase()).filter(Boolean))
      ).sort(),
    [logs]
  );

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

  /* derived stats */
  const stats = useMemo(() => {
    const approve = logs.filter((l) =>
      (l.actionType || "").toUpperCase().includes("APPROVE")
    ).length;
    const reject = logs.filter((l) => {
      const a = (l.actionType || "").toUpperCase();
      return a.includes("REJECT") || (a.includes("LOCK") && !a.includes("UN"));
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
              label="Approved"
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

        {/* filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
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

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className={`${fieldCls} w-auto`}
          >
            <option value="ALL">All action types</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

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
                  {["Timestamp", "Action", "Admin", "Target user", "Entity", "Reason", "Metadata"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[0.68rem] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))]"
                      >
                        {h}
                      </th>
                    )
                  )}
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
                        <p className="text-sm font-medium text-[rgb(var(--fg))]">
                          {log.admin?.name ?? "—"}
                        </p>
                        <p className="text-[0.7rem] text-[rgb(var(--muted2))]">
                          {log.admin?.email}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        {log.targetUser ? (
                          <>
                            <p className="text-sm font-medium text-[rgb(var(--fg))]">
                              {log.targetUser.name ?? "—"}
                            </p>
                            <p className="text-[0.7rem] text-[rgb(var(--muted2))]">
                              {log.targetUser.email}
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-[rgb(var(--muted2))]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-[rgb(var(--fg))]">
                          {log.entityType}
                        </p>
                        <p className="mt-0.5 break-all text-[0.68rem] text-[rgb(var(--muted2))]">
                          {log.entityId ?? "—"}
                        </p>
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