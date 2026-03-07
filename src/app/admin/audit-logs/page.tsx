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
  admin: {
    id: string;
    name: string | null;
    email: string;
  };
  targetUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

const cardShell =
  "rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]";

const softBtn =
  "rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.65)] disabled:opacity-60 disabled:cursor-not-allowed";

function ActionPill({ action }: { action: string }) {
  const a = (action || "").toUpperCase();

  const cls =
    a.includes("APPROVE")
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : a.includes("REJECT") || a.includes("LOCK")
      ? "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400"
      : a.includes("UNLOCK")
      ? "border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-400"
      : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))]";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[0.7rem] font-semibold ${cls}`}>
      {a}
    </span>
  );
}

function prettyJson(value: Record<string, any> | null) {
  if (!value) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "—";
  }
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction =
        actionFilter === "ALL" ? true : (log.actionType || "").toUpperCase() === actionFilter;

      const haystack = [
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

      const matchesSearch = search.trim()
        ? haystack.includes(search.trim().toLowerCase())
        : true;

      return matchesAction && matchesSearch;
    });
  }, [logs, search, actionFilter]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/admin/audit-logs", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load audit logs");
      }

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

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => (l.actionType || "").toUpperCase()).filter(Boolean)));
  }, [logs]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className={`${cardShell} p-4 sm:p-6`}>
          <header className="mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">Audit Logs</h1>
                <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                  Track admin actions across TutorLink for accountability and system governance.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-1 text-[0.65rem] font-semibold text-[rgb(var(--fg))]">
                  {logs.length} logs
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

          <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search admin, target user, reason, action"
              className="
                w-full rounded-2xl border border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none
                placeholder:text-[rgb(var(--muted2))]
                focus:border-[rgb(var(--primary))] focus:ring-1 focus:ring-[rgb(var(--primary)/0.25)]
              "
            />

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="
                w-full rounded-2xl border border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                px-3 py-2.5 text-sm text-[rgb(var(--fg))] outline-none
                focus:border-[rgb(var(--primary))] focus:ring-1 focus:ring-[rgb(var(--primary)/0.25)]
              "
            >
              <option value="ALL">All actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={load}
                className="rounded-md bg-[rgb(var(--primary))] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Loading..." : "Reload"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActionFilter("ALL");
                }}
                className={softBtn}
                disabled={loading}
              >
                Reset
              </button>
            </div>
          </div>

          {err && (
            <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-100 px-3 py-3 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              {err}
            </div>
          )}

          {loading && <div className="text-xs text-[rgb(var(--muted2))]">Loading audit logs…</div>}

          {!loading && !err && filteredLogs.length === 0 && (
            <div className="text-xs text-[rgb(var(--muted2))]">No audit logs found.</div>
          )}

          {!loading && !err && filteredLogs.length > 0 && (
            <div className="overflow-x-auto rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] dark:bg-[rgb(var(--card)/0.55)]">
              <table className="min-w-[1280px] w-full text-left">
                <thead>
                  <tr className="bg-[rgb(var(--card2))] text-[0.7rem] uppercase tracking-wide text-[rgb(var(--muted2))] dark:bg-transparent">
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Target User</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Metadata</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[rgb(var(--border))]">
                  {filteredLogs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={`
                        align-top
                        hover:bg-[rgb(var(--soft))] dark:hover:bg-white/5
                        ${idx % 2 === 1 ? "bg-[rgb(var(--card))]" : ""}
                        ${idx % 2 === 1 ? "dark:bg-transparent" : ""}
                      `}
                    >
                      <td className="px-4 py-4">
                        <div className="text-xs text-[rgb(var(--fg))]">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <ActionPill action={log.actionType} />
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                          {log.admin?.name ?? "—"}
                        </div>
                        <div className="text-xs text-[rgb(var(--muted2))]">{log.admin?.email}</div>
                      </td>

                      <td className="px-4 py-4">
                        {log.targetUser ? (
                          <>
                            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                              {log.targetUser.name ?? "—"}
                            </div>
                            <div className="text-xs text-[rgb(var(--muted2))]">
                              {log.targetUser.email}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-[rgb(var(--muted2))]">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-xs text-[rgb(var(--fg))]">{log.entityType}</div>
                        <div className="mt-1 break-all text-[0.7rem] text-[rgb(var(--muted2))]">
                          {log.entityId ?? "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="max-w-[220px] whitespace-pre-wrap text-[0.72rem] text-[rgb(var(--fg))]">
                          {log.reason?.trim() ? log.reason : "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <pre className="max-w-[360px] overflow-x-auto rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3 text-[0.68rem] leading-5 text-[rgb(var(--fg))]">
                          {prettyJson(log.metadata)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}