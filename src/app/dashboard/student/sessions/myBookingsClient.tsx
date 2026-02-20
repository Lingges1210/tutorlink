"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle, Star } from "lucide-react";
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

type RatingResp = {
  ok: boolean;
  rating:
    | {
        id: string;
        sessionId: string;
        tutorId: string;
        studentId: string;
        rating: number;
        comment: string | null;
        createdAt: string;
        updatedAt: string;
      }
    | null;
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

  const [pastFilter, setPastFilter] = useState<
    "ALL" | "COMPLETED" | "CANCELLED"
  >("ALL");

  // ✅ Past pagination state (only for past)
  const PAST_PAGE_SIZE = 5;
  const [pastPage, setPastPage] = useState(1);

  // ✅ Rating state (NEW)
  const [rateOpen, setRateOpen] = useState(false);
  const [rateSessionId, setRateSessionId] = useState<string | null>(null);
  const [rateTutorName, setRateTutorName] = useState<string>("Tutor");
  const [rateValue, setRateValue] = useState<number>(5);
  const [rateHover, setRateHover] = useState<number>(0);
  const [rateComment, setRateComment] = useState<string>("");
  const [rateLoading, setRateLoading] = useState(false);

  // cache ratings so UI can show “Rated” without refetch spam
  const [ratingBySession, setRatingBySession] = useState<
    Record<string, { rating: number; comment: string | null }>
  >({});

  function closeModal() {
    setMode(null);
    setActiveId(null);
    setReason("");
  }

  function closeRate() {
    setRateOpen(false);
    setRateSessionId(null);
    setRateTutorName("Tutor");
    setRateValue(5);
    setRateHover(0);
    setRateComment("");
    setRateLoading(false);
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

    onVis(); // init based on current visibility
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const { upcoming, past } = useMemo(() => {
    const up: Row[] = [];
    const pa: Row[] = [];

    for (const it of items) {
      const closed = it.status === "COMPLETED" || it.status === "CANCELLED";

      // ✅ CANCELLED/COMPLETED always Past (even if scheduledAt is future)
      if (closed) {
        pa.push(it);
        continue;
      }

      // ✅ Only these can be Upcoming/Active bucket
      if (it.status === "PENDING" || it.status === "ACCEPTED") {
        up.push(it);
        continue;
      }

      // any other weird status -> treat as Past to avoid polluting Upcoming
      pa.push(it);
    }

    up.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    pa.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));

    return { upcoming: up, past: pa };
  }, [items]);

  const filteredPast =
    pastFilter === "ALL" ? past : past.filter((x) => x.status === pastFilter);

  // ✅ Past pagination derived values
  const totalPastPages = Math.max(
    1,
    Math.ceil(filteredPast.length / PAST_PAGE_SIZE)
  );
  const safePastPage = Math.min(pastPage, totalPastPages);

  const pagedPast = filteredPast.slice(
    (safePastPage - 1) * PAST_PAGE_SIZE,
    safePastPage * PAST_PAGE_SIZE
  );

  // ✅ keep page valid if filter changes or list shrinks
  useEffect(() => {
    if (pastPage > totalPastPages) setPastPage(totalPastPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPastPages]);

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

    let alive = true;
    let tries = 0;
    const maxTries = 30;

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
          router.replace(qs ? `${pathname}?${qs}` : pathname, {
            scroll: false,
          });
        }, 3000);

        return () => window.clearTimeout(t);
      }

      tries++;
      if (tries < maxTries) {
        // wait for DOM + (if past) wait for Past section to render
        window.setTimeout(findAndScroll, 120);
      }
    };

    // start after paint
    requestAnimationFrame(() => {
      window.setTimeout(findAndScroll, 0);
    });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loading, items.length, past.length, showPast]);

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
        closeModal();
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
        setMsg("Booking rescheduled successfully.");
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
        closeModal();
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
        setMsg("Booking cancelled successfully.");
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
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
        setMsg("Proposal accepted. Session updated.");
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
          `/messaging?channelId=${j.channelId}&returnTo=/dashboard/student/sessions&focus=${sessionId}`
        );
      } else {
        setMsg(j?.message ?? "Unable to start chat.");
      }
    } catch {
      setMsg("Unable to start chat.");
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
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
        setMsg("Proposal rejected.");
      }
    } finally {
      setActionLoading(false);
    }
  }

  // ✅ NEW: rating helpers
  async function openRateModal(s: Row) {
    if (s.status !== "COMPLETED") return;
    if (!s.tutor) return;

    const tutorName = s.tutor?.name ?? "Tutor";

    setRateOpen(true);
    setRateSessionId(s.id);
    setRateTutorName(tutorName);
    setRateValue(5);
    setRateHover(0);
    setRateComment("");
    setMsg(null);

    // if already cached, preload it
    const cached = ratingBySession[s.id];
    if (cached) {
      setRateValue(cached.rating);
      setRateComment(cached.comment ?? "");
      return;
    }

    // fetch rating if exists
    try {
      setRateLoading(true);
      const res = await fetch(`/api/sessions/${s.id}/rating`, {
        cache: "no-store",
      });
      const data: RatingResp = await res.json().catch(() => ({
        ok: false,
        rating: null,
      }));

      if (res.ok && data?.ok && data.rating) {
        setRatingBySession((prev) => ({
          ...prev,
          [s.id]: { rating: data.rating!.rating, comment: data.rating!.comment },
        }));
        setRateValue(data.rating.rating);
        setRateComment(data.rating.comment ?? "");
      }
    } finally {
      setRateLoading(false);
    }
  }

  async function submitRating() {
    if (!rateSessionId) return;

    // if already rated, don't allow re-submit (API will 409 anyway)
    if (ratingBySession[rateSessionId]) {
      setMsg("You already rated this session.");
      return;
    }

    const rating = Number(rateValue);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setMsg("Please select a rating from 1 to 5.");
      return;
    }
    if (rateComment.trim().length > 500) {
      setMsg("Comment too long (max 500 chars).");
      return;
    }

    setRateLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/sessions/${rateSessionId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: rateComment.trim() ? rateComment.trim() : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.message ?? "Rating failed.");
        return;
      }

      // update cache
      setRatingBySession((prev) => ({
        ...prev,
        [rateSessionId]: {
          rating,
          comment: rateComment.trim() ? rateComment.trim() : null,
        },
      }));

      closeRate();
      setMsg("Thanks! Your rating has been submitted.");
    } finally {
      setRateLoading(false);
    }
  }

  function BookingCard({ s }: { s: Row }) {
    const closed = s.status === "CANCELLED" || s.status === "COMPLETED";

    const tutorName = s.tutor?.name ?? "Waiting for tutor…";
    const tutorProgramme = s.tutor?.programme ?? null;
    const unassigned = !s.tutor;

    const proposalPending = s.proposalStatus === "PENDING" && !!s.proposedAt;
    const isFocused = focusId === s.id;

    const canRate = s.status === "COMPLETED" && !!s.tutor;
    const rated = !!ratingBySession[s.id];

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

            {/* ✅ START CHAT (only when accepted, tutor exists) */}
            {s.status === "ACCEPTED" && !!s.tutor && (
              <button
                onClick={() => startChat(s.id)}
                className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]"
              >
                Start chat
              </button>
            )}

            {/* ✅ RATE TUTOR (only when COMPLETED + tutor exists) */}
            {canRate && (
              <button
                disabled={rated}
                onClick={() => openRateModal(s)}
                className={[
                  "rounded-md px-3 py-2 text-xs font-semibold border flex items-center gap-2",
                  rated
                    ? "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                    : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
                ].join(" ")}
                title={rated ? "You already rated this session." : "Rate tutor"}
              >
                <Star size={14} />
                {rated ? "Rated" : "Rate"}
              </button>
            )}

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
            {/* ✅ Header row always visible (like tutor page) */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* show the UPCOMING pill only when there is upcoming */}
                <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold tracking-wide text-[rgb(var(--fg))]">
                  {upcoming.length > 0 ? "UPCOMING" : "SESSIONS"}
                </span>

                <span className="text-xs text-[rgb(var(--muted2))]">
                  {upcoming.length > 0
                    ? `${upcoming.length} item${
                        upcoming.length === 1 ? "" : "s"
                      }`
                    : "No active sessions"}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPast((v) => {
                    const next = !v;
                    setPastPage(1);
                    if (!next) setPastFilter("ALL");
                    return next;
                  })
                }
                className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]"
              >
                {showPast ? "Hide Past" : `Show Past (${past.length})`}
              </button>
            </div>

            {/* ✅ Upcoming content OR empty card */}
            {upcoming.length === 0 && !showPast ? (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-8 text-center text-sm text-[rgb(var(--muted2))]">
                No active sessions at the moment.
                <div className="mt-2 text-xs text-[rgb(var(--muted2))]">
                  Past sessions are available in the archive.
                </div>
              </div>
            ) : upcoming.length > 0 ? (
              <div className="space-y-3">
                {upcoming.map((s) => (
                  <BookingCard key={s.id} s={s} />
                ))}
              </div>
            ) : null}

            {showPast && (
              <div className="pt-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold tracking-wide text-[rgb(var(--fg))]">
                      PAST
                    </span>
                    <span className="text-xs text-[rgb(var(--muted2))]">
                      Completed and cancelled sessions
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {(["ALL", "COMPLETED", "CANCELLED"] as const).map((k) => (
                      <button
                        key={k}
                        onClick={() => {
                          setPastFilter(k);
                          setPastPage(1); // ✅ reset page on filter change
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
                </div>

                {filteredPast.length === 0 ? (
                  <div className="text-sm text-[rgb(var(--muted2))]">
                    No past sessions.
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {pagedPast.map((s) => (
                        <BookingCard key={s.id} s={s} />
                      ))}
                    </div>

                    {/* ✅ Pagination buttons (max 7 visible with …) */}
                    {totalPastPages > 1 && (
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
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
        )}
      </div>

      {/* ✅ RESCHEDULE / CANCEL modal (unchanged) */}
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

      {/* ✅ NEW: RATE MODAL */}
      {rateOpen && rateSessionId && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onMouseDown={() => {
            if (!rateLoading) closeRate();
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border p-5 border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-[0_30px_120px_rgb(var(--shadow)/0.35)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              Rate your tutor
            </div>
            <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
              Tutor: {rateTutorName}
            </div>

            <div className="mt-4">
              <div className="text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-2">
                Rating
              </div>

              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => {
                  const on = (rateHover || rateValue) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={rateLoading || !!ratingBySession[rateSessionId]}
                      onMouseEnter={() => setRateHover(n)}
                      onMouseLeave={() => setRateHover(0)}
                      onClick={() => setRateValue(n)}
                      className={[
                        "p-1 rounded-md transition-all",
                        rateLoading || !!ratingBySession[rateSessionId]
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:bg-[rgb(var(--card)/0.6)]",
                      ].join(" ")}
                      title={`${n} star${n === 1 ? "" : "s"}`}
                    >
                      <Star
                        size={22}
                        className={on ? "fill-current" : ""}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-xs text-[rgb(var(--muted2))]">
                  {rateValue}/5
                </span>
              </div>

              {ratingBySession[rateSessionId] && (
                <div className="mt-2 text-[0.75rem] text-slate-600 dark:text-slate-400">
                  You already rated this session.
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
                Comment (optional)
              </label>
              <textarea
                value={rateComment}
                onChange={(e) => setRateComment(e.target.value)}
                placeholder="Share feedback (optional)…"
                disabled={rateLoading || !!ratingBySession[rateSessionId]}
                className="w-full min-h-[90px] resize-none rounded-md border px-3 py-2 text-sm outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] focus:border-[rgb(var(--primary))] disabled:opacity-60"
              />
              <div className="mt-1 text-[0.7rem] text-[rgb(var(--muted2))]">
                {Math.min(rateComment.length, 500)}/500
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                disabled={rateLoading}
                onClick={closeRate}
                className="flex-1 rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60"
              >
                Close
              </button>

              <button
                disabled={rateLoading || !!ratingBySession[rateSessionId]}
                onClick={submitRating}
                className="flex-1 rounded-md px-3 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90 disabled:opacity-60"
              >
                {rateLoading ? "Submitting…" : "Submit rating"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}