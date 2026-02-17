"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Row = {
  id: string;
  scheduledAt: string;
  endsAt?: string | null;
  durationMin: number;
  status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | string;
  cancelReason: string | null;

  // ✅ proposal fields (return from API)
  proposedAt?: string | null;
  proposedNote?: string | null;
  proposalStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | null;

  subject: { code: string; title: string };
  student: {
    id: string;
    name: string | null;
    email: string;
    programme: string | null;
    avatarUrl: string | null;
  };
};

function prettyDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function getEndTime(s: Row) {
  const start = new Date(s.scheduledAt).getTime();
  if (s.endsAt) return new Date(s.endsAt).getTime();
  return start + (s.durationMin ?? 60) * 60_000;
}

function canComplete(s: Row) {
  if (s.status !== "ACCEPTED") return false;
  return Date.now() >= getEndTime(s);
}

function isOngoing(s: Row) {
  const now = Date.now();
  const start = new Date(s.scheduledAt).getTime();
  const end = getEndTime(s);
  return s.status === "ACCEPTED" && now >= start && now < end;
}

function isStartingSoon(s: Row) {
  const start = new Date(s.scheduledAt).getTime();
  const diff = start - Date.now();
  return diff > 0 && diff <= 5 * 60_000;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

function tutorHasOverlap(target: Row, all: Row[]) {
  const tStart = new Date(target.scheduledAt).getTime();
  const tEnd = getEndTime(target);

  return all.some((x) => {
    if (x.id === target.id) return false;

    const active = x.status === "PENDING" || x.status === "ACCEPTED";
    if (!active) return false;

    const xStart = new Date(x.scheduledAt).getTime();
    const xEnd = getEndTime(x);

    return overlaps(tStart, tEnd, xStart, xEnd);
  });
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "PENDING":
      return `
        border-amber-500
        text-amber-600
        dark:text-amber-400
        bg-transparent
      `;
    case "ACCEPTED":
      return `
        border-emerald-500
        text-emerald-600
        dark:text-emerald-400
        bg-transparent
      `;
    case "COMPLETED":
      return `
        border-slate-500/40
        bg-slate-500/10
        text-slate-600
        dark:text-slate-400
      `;
    case "CANCELLED":
      return `
        border-rose-500
        text-rose-600
        dark:text-rose-400
        bg-transparent
      `;
    default:
      return `
        border-[rgb(var(--border))]
        bg-[rgb(var(--card))]
        text-[rgb(var(--fg))]
      `;
  }
}

function countdownLabel(s: Row) {
  const end = getEndTime(s);
  const diff = end - Date.now();
  if (diff <= 0) return "Session ended";

  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return `${min}m ${sec}s remaining`;
}

/** ✅ show only up to 7 buttons: 1 … 4 5 6 … last */
function getPastPageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const last = total;

  // near start
  if (current <= 3) return [1, 2, 3, 4, "…", last - 1, last];

  // near end
  if (current >= total - 2)
    return [1, 2, "…", last - 3, last - 2, last - 1, last];

  // middle
  return [1, "…", current - 1, current, current + 1, "…", last];
}

export default function TutorSessionsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const focusId = sp.get("focus");

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [, setTick] = useState(0);

  const [actionLoading, setActionLoading] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const [pastFilter, setPastFilter] = useState<
    "ALL" | "COMPLETED" | "CANCELLED"
  >("ALL");

  // ✅ Past pagination state (only for past)
  const PAST_PAGE_SIZE = 5;
  const [pastPage, setPastPage] = useState(1);

  // ✅ modal state
  const [mode, setMode] = useState<"CANCEL" | "PROPOSE" | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [proposedTime, setProposedTime] = useState(() =>
    formatLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [note, setNote] = useState("");

  function closeModal() {
    setMode(null);
    setActiveId(null);
    setReason("");
    setNote("");
  }

  async function refresh(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);

    try {
      const res = await fetch("/api/tutor/sessions", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setItems(Array.isArray(data.items) ? data.items : []);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => refresh({ silent: true }), 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let t: any;

    const run = async () => {
      try {
        await fetch("/api/reminders/pull", { cache: "no-store" });
      } catch {}
    };

    const start = () => {
      stop(); // ✅ prevent duplicate intervals
      run(); // run immediately
      t = setInterval(run, 60_000);
    };

    const stop = () => {
      if (t) clearInterval(t);
      t = null;
    };

    const onVis = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    onVis();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  async function accept(id: string) {
    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/tutor/sessions/${id}/accept`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) setMsg(data?.message ?? "Accept failed.");
      else {
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function startChat(sessionId: string) {
  try {
    const r = await fetch("/api/chat/channel-from-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const j = await r.json();
    if (j?.ok && j.channelId) {
      router.push(
  `/messaging?channelId=${j.channelId}&returnTo=/dashboard/tutor/sessions&focus=${sessionId}`
);

    } else {
      setMsg(j?.message ?? "Unable to start chat.");
    }
  } catch {
    setMsg("Unable to start chat.");
  }
}


  async function complete(id: string) {
    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/tutor/sessions/${id}/complete`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) setMsg(data?.message ?? "Complete failed.");
      else {
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelSession() {
    if (!activeId) return;

    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/tutor/sessions/${activeId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) setMsg(data?.message ?? "Cancel failed.");
      else {
        setMsg("Session cancelled.");
        closeModal();
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function proposeTime() {
    if (!activeId) return;

    const chosen = new Date(proposedTime);
    if (Number.isNaN(chosen.getTime())) {
      setMsg("Please choose a valid date/time.");
      return;
    }
    if (chosen.getTime() < Date.now() + 5 * 60 * 1000) {
      setMsg("Choose a time at least 5 minutes from now.");
      return;
    }

    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/tutor/sessions/${activeId}/propose-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedAt: chosen.toISOString(),
          note: note?.trim() ? note.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) setMsg(data?.message ?? "Propose failed.");
      else {
        setMsg("Proposed new time sent to student for confirmation.");
        closeModal();
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
      }
    } finally {
      setActionLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const now = Date.now();

    const isClosed = (s: Row) =>
      s.status === "CANCELLED" || s.status === "COMPLETED";

    const past = items.filter((s) => isClosed(s) || getEndTime(s) <= now);
    const ongoing = items.filter((s) => !isClosed(s) && isOngoing(s));

    const upcoming = items.filter((s) => {
      if (isClosed(s)) return false;
      const t = new Date(s.scheduledAt).getTime();
      return t > now && !isOngoing(s);
    });

    upcoming.sort(
      (a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)
    );
    past.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));

    return { ongoing, upcoming, past };
  }, [items]);

  const filteredPast =
    pastFilter === "ALL"
      ? grouped.past
      : grouped.past.filter((x) => x.status === pastFilter);

  const totalPastPages = Math.max(
    1,
    Math.ceil(filteredPast.length / PAST_PAGE_SIZE)
  );
  const safePastPage = Math.min(pastPage, totalPastPages);

  const pagedPast = filteredPast.slice(
    (safePastPage - 1) * PAST_PAGE_SIZE,
    safePastPage * PAST_PAGE_SIZE
  );

  useEffect(() => {
    if (pastPage > totalPastPages) setPastPage(totalPastPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPastPages]);

  useEffect(() => {
    if (!focusId) return;
    if (loading) return;
    if (!items.length) return;

    const exists = items.some((x) => x.id === focusId);
    if (!exists) return;

    const isFocusedPast = grouped.past.some((x) => x.id === focusId);
    if (isFocusedPast) {
      setShowPast(true);

      const idx = filteredPast.findIndex((x) => x.id === focusId);
      if (idx >= 0) {
        const computedPage = Math.floor(idx / PAST_PAGE_SIZE) + 1;
        setPastPage((p) => (p === computedPage ? p : computedPage));
      }
    }

    let alive = true;
    let tries = 0;
    const maxTries = 40;

    const findAndScroll = () => {
      if (!alive) return;

      const el = document.getElementById(`session-${focusId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("focus-glow");

        const t = window.setTimeout(() => {
          const el2 = document.getElementById(`session-${focusId}`);
          if (el2) el2.classList.remove("focus-glow");

          const next = new URLSearchParams(sp.toString());
          next.delete("focus");
          const qs = next.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }, 3000);

        return () => window.clearTimeout(t);
      }

      tries++;
      if (tries < maxTries) window.setTimeout(findAndScroll, 120);
    };

    requestAnimationFrame(() => {
      window.setTimeout(findAndScroll, 0);
    });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    focusId,
    loading,
    items.length,
    grouped.past.length,
    filteredPast.length,
    pastFilter,
    pastPage,
    showPast,
  ]);

  function Section({
    title,
    list,
    subtitle,
    rightSlot,
  }: {
    title: string;
    subtitle?: string;
    list: Row[];
    rightSlot?: React.ReactNode;
  }) {
    if (list.length === 0) return null;

    return (
      <motion.div layout="position" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold tracking-wide text-[rgb(var(--fg))] uppercase">
              {title}
            </span>
            <span className="text-xs text-[rgb(var(--muted2))]">
              {list.length} item{list.length === 1 ? "" : "s"}
              {subtitle ? ` · ${subtitle}` : ""}
            </span>
          </div>

          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>

        <AnimatePresence initial={false}>
          {list.map((s) => {
            const pending = s.status === "PENDING";
            const accepted = s.status === "ACCEPTED";
            const ongoing = isOngoing(s);
            const conflict = pending && tutorHasOverlap(s, items);

            const active = pending || accepted;
            const proposalPending =
              active && s.proposalStatus === "PENDING" && !!s.proposedAt;

            const isFocused = focusId === s.id;

            return (
              <motion.div
                key={s.id}
                id={`session-${s.id}`}
                layout="position"
                initial={{ opacity: 0, y: 10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.985 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={[
                  "rounded-2xl border p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
                  "border-[rgb(var(--border))] bg-[rgb(var(--card2))]",
                  ongoing ? "ring-2 ring-[rgb(var(--primary))]" : "",
                  isStartingSoon(s) && !ongoing
                    ? "ring-2 ring-amber-400 animate-pulse"
                    : "",
                  isFocused ? "ring-2 ring-[rgb(var(--primary))]" : "",
                ].join(" ")}
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                      {s.subject.code} — {s.subject.title}
                    </div>

                    <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                      {s.student.name ?? "Student"} · {s.student.email}
                    </div>

                    <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                      {prettyDate(s.scheduledAt)} · {s.durationMin} min
                    </div>

                    {proposalPending && (
                      <motion.div
                        key={`proposal-${s.id}`}
                        initial={{ opacity: 0, y: 10, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.985 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-[0.8rem] font-semibold text-[rgb(var(--fg))]">
                            Proposed time sent to student
                          </div>

                          <div className="mt-0.5 text-[0.75rem] text-[rgb(var(--muted2))] truncate">
                            {prettyDate(s.proposedAt!)}
                            {s.proposedNote ? ` · ${s.proposedNote}` : ""}
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span className="rounded-full px-3 py-1 text-[11px] font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                            Waiting confirmation
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {ongoing && (
                      <motion.div
                        initial={{ opacity: 0.6, y: 2 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-1 text-xs text-[rgb(var(--primary))] font-medium"
                      >
                        {countdownLabel(s)}
                      </motion.div>
                    )}

                    {s.status === "CANCELLED" && s.cancelReason && (
                      <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted2))]">
                        Reason: {s.cancelReason}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 items-center">
                    <motion.span
                      layout="position"
                      initial={{ scale: 0.95, opacity: 0.6 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className={[
                        "rounded-full px-3 py-1 text-[11px] font-semibold border tracking-wide uppercase",
                        statusBadgeClass(s.status),
                      ].join(" ")}
                    >
                      {s.status}
                    </motion.span>

                    {/* ✅ START CHAT button (only when ACCEPTED) */}
  {accepted && (
    <button
      disabled={actionLoading}
      onClick={() => startChat(s.id)}
      className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60"
    >
      Start chat
    </button>
  )}


                    <div className="flex items-center gap-2">
                      {pending && conflict && (
                        <span className="text-[0.65rem] text-rose-500 font-semibold">
                          Time conflict
                        </span>
                      )}

                      {pending && !proposalPending && (
                        <button
                          disabled={actionLoading || conflict}
                          onClick={() => accept(s.id)}
                          className={[
                            "rounded-md px-3 py-2 text-xs font-semibold text-white",
                            "bg-[rgb(var(--primary))]",
                            actionLoading || conflict
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:opacity-90",
                          ].join(" ")}
                          title={
                            conflict
                              ? "Time conflict: you already have a session overlapping this slot."
                              : ""
                          }
                        >
                          Accept
                        </button>
                      )}

                      {canComplete(s) && (
                        <button
                          disabled={actionLoading}
                          onClick={() => complete(s.id)}
                          className={[
                            "rounded-md px-3 py-2 text-xs font-semibold text-white",
                            "bg-[rgb(var(--primary))]",
                            actionLoading
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:opacity-90",
                          ].join(" ")}
                        >
                          Complete
                        </button>
                      )}

                      {active && (
                        <button
                          disabled={actionLoading}
                          onClick={() => {
                            setActiveId(s.id);
                            setMode("PROPOSE");
                            setMsg(null);
                            setNote("");
                            setProposedTime(
                              formatLocalInputValue(new Date(s.scheduledAt))
                            );
                          }}
                          className={[
                            "rounded-md px-3 py-2 text-xs font-semibold border",
                            "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]",
                            actionLoading
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-[rgb(var(--card)/0.6)]",
                          ].join(" ")}
                        >
                          Propose time
                        </button>
                      )}

                      {active && (
                        <button
                          disabled={actionLoading}
                          onClick={() => {
                            setActiveId(s.id);
                            setMode("CANCEL");
                            setMsg(null);
                            setReason("");
                          }}
                          className={[
                            "rounded-md px-3 py-2 text-xs font-semibold border",
                            "border-rose-500/60 text-rose-600 dark:text-rose-400",
                            "bg-[rgb(var(--card))]",
                            actionLoading
                              ? "opacity-60 cursor-not-allowed"
                              : "hover:bg-rose-500/10",
                          ].join(" ")}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ✅ helper counts for the “student-style” header row
  const activeCount = grouped.ongoing.length + grouped.upcoming.length;
  const leftPill =
    grouped.ongoing.length > 0
      ? "ONGOING"
      : grouped.upcoming.length > 0
      ? "UPCOMING"
      : "SESSIONS";

  const leftMeta =
    activeCount > 0
      ? `${activeCount} item${activeCount === 1 ? "" : "s"}`
      : "No active sessions";

  return (
    <div className="space-y-6">
      <motion.div
        layout="position"
        className="rounded-3xl border p-6 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]"
      >
        <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
          Tutor Sessions
        </h1>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Manage upcoming requests, ongoing sessions, and archived history.
        </p>
      </motion.div>

      {msg && (
        <motion.div
          layout="position"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-4 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] text-sm text-[rgb(var(--fg))]"
        >
          {msg}
        </motion.div>
      )}

      {/* ✅ Student-style main card wrapper */}
      <div className="rounded-3xl border p-5 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]">
        {loading ? (
          <div className="text-sm text-[rgb(var(--muted2))]">Loading…</div>
        ) : (
          <div className="space-y-4">
            {/* ✅ Header row ALWAYS visible (like student page) */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold tracking-wide text-[rgb(var(--fg))]">
                  {leftPill}
                </span>

                <span className="text-xs text-[rgb(var(--muted2))]">
                  {leftMeta}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPast((p) => {
                    const next = !p;
                    setPastPage(1);
                    if (!next) setPastFilter("ALL");
                    return next;
                  })
                }
                className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]"
              >
                {showPast ? "Hide Past" : `Show Past (${grouped.past.length})`}
              </button>
            </div>

            {/* ✅ When no active sessions & past hidden -> show same empty card as student page */}
            {activeCount === 0 && !showPast ? (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-8 text-center text-sm text-[rgb(var(--muted2))]">
                No active sessions at the moment.
                <div className="mt-2 text-xs text-[rgb(var(--muted2))]">
                  Past sessions are available in the archive.
                </div>
              </div>
            ) : (
              <>
                {/* ✅ Sections (unchanged) */}
                <Section title="Ongoing" subtitle="Live now" list={grouped.ongoing} />
                <Section
                  title="Upcoming"
                  subtitle="Scheduled next"
                  list={grouped.upcoming}
                />
              </>
            )}

            {/* ✅ Past section (same behavior as before) */}
            {showPast && (
              <>
                <Section
                  title="Past Sessions"
                  subtitle="Completed and cancelled"
                  list={pagedPast}
                  rightSlot={
                    <div className="flex gap-2">
                      {(["ALL", "COMPLETED", "CANCELLED"] as const).map((k) => (
                        <button
                          key={k}
                          onClick={() => {
                            setPastFilter(k);
                            setPastPage(1);
                          }}
                          className={[
                            "rounded-full px-3 py-1 text-[11px] font-semibold border transition-all duration-150",
                            k === pastFilter
                              ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)]"
                              : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
                          ].join(" ")}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  }
                />

                {filteredPast.length > 0 && totalPastPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {getPastPageItems(safePastPage, totalPastPages).map(
                      (it, idx) =>
                        it === "…" ? (
                          <span
                            key={`dots-${idx}`}
                            className="px-2 text-xs text-[rgb(var(--muted2))]"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={it}
                            onClick={() => setPastPage(it)}
                            className={[
                              "rounded-full px-3 py-1 text-[11px] font-semibold border transition-all duration-150",
                              it === safePastPage
                                ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.08)]"
                                : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
                            ].join(" ")}
                          >
                            {it}
                          </button>
                        )
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ✅ CANCEL MODAL (unchanged) */}
      {mode === "CANCEL" && activeId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onMouseDown={() => !actionLoading && closeModal()}
        >
          <div
            className="w-full max-w-md rounded-3xl border p-5 border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-[0_30px_120px_rgb(var(--shadow)/0.35)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              Cancel session
            </div>

            <div className="mt-4">
              <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
                Reason (optional)
              </label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Not available / emergency"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] focus:border-rose-500"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                disabled={actionLoading}
                onClick={closeModal}
                className="flex-1 rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60"
              >
                Close
              </button>

              <button
                disabled={actionLoading}
                onClick={cancelSession}
                className="flex-1 rounded-md px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:opacity-90 disabled:opacity-60"
              >
                {actionLoading ? "Working…" : "Cancel session"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ PROPOSE MODAL (unchanged) */}
      {mode === "PROPOSE" && activeId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onMouseDown={() => !actionLoading && closeModal()}
        >
          <div
            className="w-full max-w-md rounded-3xl border p-5 border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-[0_30px_120px_rgb(var(--shadow)/0.35)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              Propose a new time
            </div>

            <div className="mt-3 text-xs text-[rgb(var(--muted2))]">
              Student must confirm this change. Until then, the session time
              stays the same.
            </div>

            <div className="mt-4">
              <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
                Proposed date & time
              </label>
              <input
                type="datetime-local"
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] focus:border-[rgb(var(--primary))]"
              />
            </div>

            <div className="mt-4">
              <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
                Note (optional)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. I have a class at that time—can we shift?"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] focus:border-[rgb(var(--primary))]"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                disabled={actionLoading}
                onClick={closeModal}
                className="flex-1 rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60"
              >
                Close
              </button>

              <button
                disabled={actionLoading}
                onClick={proposeTime}
                className="flex-1 rounded-md px-3 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90 disabled:opacity-60"
              >
                {actionLoading ? "Sending…" : "Send proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
