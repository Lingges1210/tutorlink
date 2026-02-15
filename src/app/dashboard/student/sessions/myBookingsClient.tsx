"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Row = {
  id: string;
  scheduledAt: string;
  endsAt?: string | null;
  durationMin: number;
  status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | string;
  cancelReason: string | null;

  assigned: boolean;

  // ✅ proposal fields (return from /api/sessions/my)
  proposedAt?: string | null;
  proposedNote?: string | null;
  proposalStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | null;

  subject: { code: string; title: string };
  tutor: {
    id: string;
    name: string | null;
    programme: string | null;
    avatarUrl: string | null;
    email?: string;
  } | null;
};

function formatLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function prettyDate(iso: string) {
  return new Date(iso).toLocaleString();
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

function isPast(s: Row) {
  return s.status === "COMPLETED" || s.status === "CANCELLED";
}

export default function MyBookingsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const focusId = sp.get("focus");

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"RESCHEDULE" | "CANCEL" | null>(null);

  const [newTime, setNewTime] = useState(() =>
    formatLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [reason, setReason] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [showPast, setShowPast] = useState(false);

  function closeModal() {
    setMode(null);
    setActiveId(null);
    setReason("");
  }

  async function refresh(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;

    if (!silent) setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/sessions/my", { cache: "no-store" });
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
    const t = setInterval(() => {
      refresh({ silent: true });
    }, 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { upcoming, past } = useMemo(() => {
    const up: Row[] = [];
    const pa: Row[] = [];
    for (const it of items) {
      (isPast(it) ? pa : up).push(it);
    }
    up.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    pa.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
    return { upcoming: up, past: pa };
  }, [items]);

  // ✅ Focus UX: scroll + glow + auto-show Past + clear focus param after 3s
  useEffect(() => {
    if (!focusId) return;
    if (loading) return;
    if (!items.length) return;

    const exists = items.some((x) => x.id === focusId);
    if (!exists) return;

    // If focused one is in past, force showPast
    const isFocusedPast = past.some((x) => x.id === focusId);
    if (isFocusedPast) setShowPast(true);

    const el = document.getElementById(`session-${focusId}`);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("focus-glow");
      });
    }

    const t = window.setTimeout(() => {
      const el2 = document.getElementById(`session-${focusId}`);
      if (el2) el2.classList.remove("focus-glow");

      const next = new URLSearchParams(sp.toString());
      next.delete("focus");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 3000);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loading, items.length, past.length]);

  async function doReschedule() {
    if (!activeId) return;

    const chosen = new Date(newTime);
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
      const res = await fetch(`/api/sessions/${activeId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: chosen.toISOString() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) setMsg(data?.message ?? "Reschedule failed.");
      else {
        setMsg("Booking rescheduled successfully.");
        closeModal();
        await refresh({ silent: true });
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function doCancel() {
    if (!activeId) return;

    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/sessions/${activeId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) setMsg(data?.message ?? "Cancel failed.");
      else {
        setMsg("Booking cancelled successfully.");
        closeModal();
        await refresh({ silent: true });
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function acceptProposal(id: string) {
    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/sessions/${id}/proposal/accept`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) setMsg(data?.message ?? "Accept proposal failed.");
      else {
        setMsg("✅ Proposal accepted. Session updated.");
        await refresh({ silent: true });
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectProposal(id: string) {
    setActionLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/sessions/${id}/proposal/reject`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) setMsg(data?.message ?? "Reject proposal failed.");
      else {
        setMsg("Proposal rejected.");
        await refresh({ silent: true });
      }
    } finally {
      setActionLoading(false);
    }
  }

  function BookingCard({ s }: { s: Row }) {
    const closed = s.status === "CANCELLED" || s.status === "COMPLETED";

    const tutorName = s.tutor?.name ?? "Waiting for tutor…";
    const tutorProgramme = s.tutor?.programme ?? null;
    const unassigned = !s.tutor;

    const proposalPending = s.proposalStatus === "PENDING" && !!s.proposedAt;
    const isFocused = focusId === s.id;

    return (
      <div
        id={`session-${s.id}`} // ✅ scroll target
        className={[
          "rounded-2xl border p-4 border-[rgb(var(--border))] bg-[rgb(var(--card2))] transition-all duration-300",
          closed ? "opacity-80" : "",
          isFocused ? "ring-2 ring-[rgb(var(--primary))]" : "",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              {s.subject.code} — {s.subject.title}
            </div>

            <div className="mt-1 text-xs text-[rgb(var(--muted))]">
              Tutor: {tutorName}
              {tutorProgramme ? ` · ${tutorProgramme}` : ""}
            </div>

            {s.tutor && (
              <div className="mt-1 text-[0.7rem] font-medium text-emerald-600 dark:text-emerald-400">
                Tutor assigned: {s.tutor.name ?? "Tutor"}
              </div>
            )}

            {unassigned && (
              <div className="mt-1 text-[0.7rem] text-[rgb(var(--muted2))]">
                Waiting for tutor...
              </div>
            )}

            <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
              {prettyDate(s.scheduledAt)} · {s.durationMin} min
            </div>

            <AnimatePresence initial={false}>
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
                      Tutor proposed a new time
                    </div>
                    <div className="mt-0.5 text-[0.75rem] text-[rgb(var(--muted2))] truncate">
                      {prettyDate(s.proposedAt!)}
                      {s.proposedNote ? ` · ${s.proposedNote}` : ""}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      disabled={actionLoading}
                      onClick={() => acceptProposal(s.id)}
                      className="rounded-md px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:opacity-90 disabled:opacity-60"
                    >
                      {actionLoading ? "..." : "Accept"}
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      disabled={actionLoading}
                      onClick={() => rejectProposal(s.id)}
                      className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60"
                    >
                      Reject
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={[
                "rounded-full px-3 py-1 text-[11px] font-semibold border tracking-wide uppercase",
                statusBadgeClass(s.status),
              ].join(" ")}
            >
              {s.status}
            </span>

            <button
              disabled={closed || proposalPending}
              onClick={() => {
                setActiveId(s.id);
                setMode("RESCHEDULE");
                setNewTime(formatLocalInputValue(new Date(s.scheduledAt)));
                setMsg(null);
              }}
              className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60"
              title={
                proposalPending
                  ? "You have a pending proposal. Accept/Reject it first."
                  : ""
              }
            >
              Reschedule
            </button>

            <button
              disabled={closed}
              onClick={() => {
                setActiveId(s.id);
                setMode("CANCEL");
                setReason("");
                setMsg(null);
              }}
              className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>

        {s.status === "CANCELLED" && s.cancelReason && (
          <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted2))]">
            Reason: {s.cancelReason}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border p-6 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
              My Bookings
            </h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Track your session requests and manage reschedules/cancellations.
            </p>
          </div>

          <a
            href="/dashboard/student/sessions/calendar"
            className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]"
          >
            <Calendar size={16} />
            Open Calendar
          </a>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 rounded-2xl border p-4 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] text-sm text-[rgb(var(--fg))]">
          <CheckCircle size={16} className="opacity-80" />
          <span>{msg}</span>
        </div>
      )}

      <div className="rounded-3xl border p-5 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]">
        {loading ? (
          <div className="text-sm text-[rgb(var(--muted2))]">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-[rgb(var(--muted2))]">
            No bookings yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold tracking-wide text-[rgb(var(--fg))]">
                  UPCOMING
                </span>
                <span className="text-xs text-[rgb(var(--muted2))]">
                  {upcoming.length} item{upcoming.length === 1 ? "" : "s"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]"
              >
                {showPast ? "Hide Past" : `Show Past (${past.length})`}
              </button>
            </div>

            {upcoming.length === 0 ? (
              <div className="text-sm text-[rgb(var(--muted2))]">
                No upcoming bookings.
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((s) => (
                  <BookingCard key={s.id} s={s} />
                ))}
              </div>
            )}

            {showPast && (
              <div className="pt-2">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold tracking-wide text-[rgb(var(--fg))]">
                    PAST
                  </span>
                  <span className="text-xs text-[rgb(var(--muted2))]">
                    Completed and cancelled sessions
                  </span>
                </div>

                {past.length === 0 ? (
                  <div className="text-sm text-[rgb(var(--muted2))]">
                    No past sessions.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {past.map((s) => (
                      <BookingCard key={s.id} s={s} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {mode && activeId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onMouseDown={() => {
            if (!actionLoading) closeModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border p-5 border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-[0_30px_120px_rgb(var(--shadow)/0.35)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              {mode === "RESCHEDULE" ? "Reschedule booking" : "Cancel booking"}
            </div>

            {mode === "RESCHEDULE" ? (
              <div className="mt-4">
                <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
                  New date & time
                </label>
                <input
                  type="datetime-local"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] focus:border-[rgb(var(--primary))]"
                />
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
                  Reason (optional)
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. timetable clash"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] focus:border-[rgb(var(--primary))]"
                />
              </div>
            )}

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
                onClick={mode === "RESCHEDULE" ? doReschedule : doCancel}
                className="flex-1 rounded-md px-3 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)] disabled:opacity-70"
              >
                {actionLoading
                  ? "Working…"
                  : mode === "RESCHEDULE"
                  ? "Reschedule"
                  : "Cancel booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
