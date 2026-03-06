// src/app/dashboard/student/sessions/myBookingsClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle, Star, Video } from "lucide-react";
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

  // proposal fields (return from /api/sessions/my)
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

function getEndTime(s: Row) {
  const start = new Date(s.scheduledAt).getTime();
  if (s.endsAt) return new Date(s.endsAt).getTime();
  return start + (s.durationMin ?? 60) * 60_000;
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

function countdownLabel(s: Row) {
  const end = getEndTime(s);
  const diff = end - Date.now();
  if (diff <= 0) return "Session ended";

  const min = Math.floor(diff / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  return `${min}m ${sec}s remaining`;
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

/** show only up to 7 buttons: 1 … 4 5 6 … last */
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

function Section({
  kind,
  title,
  subtitle,
  list,
  children,
}: {
  kind: "NEEDS_RATING" | "UPCOMING" | "PAST";
  title: string;
  subtitle?: string;
  list: Row[];
  children: React.ReactNode;
}) {
  if (!list.length) return null;

  const pill =
    kind === "NEEDS_RATING"
      ? "border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10"
      : "border-[rgb(var(--border))] text-[rgb(var(--fg))] bg-[rgb(var(--card))]";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={[
              "rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide uppercase",
              pill,
            ].join(" ")}
          >
            {title}
          </span>

          {subtitle ? (
            <span className="text-xs text-[rgb(var(--muted2))]">{subtitle}</span>
          ) : null}
        </div>

        <span className="text-xs text-[rgb(var(--muted2))]">
          {list.length} item{list.length === 1 ? "" : "s"}
        </span>
      </div>

      {children}
    </div>
  );
}

export default function MyBookingsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const focusId = sp.get("focus");
  const rateParam = sp.get("rate");

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

  const [pastFilter, setPastFilter] = useState<"ALL" | "COMPLETED" | "CANCELLED">(
    "ALL"
  );

  const PAST_PAGE_SIZE = 5;
  const [pastPage, setPastPage] = useState(1);

  const [rateOpen, setRateOpen] = useState(false);
  const [rateSessionId, setRateSessionId] = useState<string | null>(null);
  const [rateTutorName, setRateTutorName] = useState<string>("Tutor");
  const [rateValue, setRateValue] = useState<number>(5);
  const [rateHover, setRateHover] = useState<number>(0);
  const [rateComment, setRateComment] = useState<string>("");
  const [rateLoading, setRateLoading] = useState(false);

  const [rateConfirmed, setRateConfirmed] = useState(false);

  const [ratingBySession, setRatingBySession] = useState<
    Record<string, { rating: number; comment: string | null }>
  >({});

  const [ratingsHydrated, setRatingsHydrated] = useState(false);
  const [, setTick] = useState(0);

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
    setRateConfirmed(false);
  }

  async function hydrateRatingsForCompleted(list: Row[]) {
    const completed = list.filter((s) => s.status === "COMPLETED" && !!s.tutor);

    if (completed.length === 0) return;

    try {
      const results = await Promise.all(
        completed.map(async (s) => {
          try {
            const res = await fetch(`/api/sessions/${s.id}/rating`, {
              cache: "no-store",
            });
            const data: RatingResp = await res
              .json()
              .catch(() => ({ ok: false, rating: null }));

            if (res.ok && data?.ok && data.rating) {
              return [
                s.id,
                { rating: data.rating.rating, comment: data.rating.comment },
              ] as const;
            }
            return null;
          } catch {
            return null;
          }
        })
      );

      const map: Record<string, { rating: number; comment: string | null }> = {};
      for (const r of results) {
        if (!r) continue;
        map[r[0]] = r[1];
      }

      setRatingBySession((prev) => ({ ...prev, ...map }));
    } catch {
      // ignore
    }
  }

  async function refresh(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;

    if (!silent) setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/sessions/my", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.items) ? data.items : [];

      setItems(list);

      setRatingsHydrated(false);
      await hydrateRatingsForCompleted(list);
      setRatingsHydrated(true);
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
      stop();
      run();
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

  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(null), 5000);
    return () => window.clearTimeout(t);
  }, [msg]);

  const grouped = useMemo(() => {
    const needsRating: Row[] = [];
    const upcoming: Row[] = [];
    const past: Row[] = [];

    for (const it of items) {
      const isCancelled = it.status === "CANCELLED";
      const isCompleted = it.status === "COMPLETED";
      const hasTutor = !!it.tutor;

      const rated = ratingsHydrated ? !!ratingBySession[it.id] : false;

      if (isCancelled) {
        past.push(it);
        continue;
      }

      if (isCompleted && hasTutor && !ratingsHydrated) {
        past.push(it);
        continue;
      }

      if (isCompleted && hasTutor && !rated) {
        needsRating.push(it);
        continue;
      }

      if (it.status === "PENDING" || it.status === "ACCEPTED") {
        upcoming.push(it);
        continue;
      }

      if (isCompleted) {
        past.push(it);
        continue;
      }

      past.push(it);
    }

    needsRating.sort(
      (a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt)
    );
    upcoming.sort(
      (a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)
    );
    past.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));

    return { needsRating, upcoming, past };
  }, [items, ratingBySession, ratingsHydrated]);

  const activeCount = grouped.upcoming.length + grouped.needsRating.length;

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
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }, 3000);

        return () => window.clearTimeout(t);
      }

      tries++;
      if (tries < maxTries) window.setTimeout(findAndScroll, 120);
    };

    requestAnimationFrame(() => window.setTimeout(findAndScroll, 0));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loading, items.length, grouped.past.length, showPast]);

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
    setRateConfirmed(false);
    setMsg(null);

    const cached = ratingBySession[s.id];
    if (cached) {
      setRateValue(cached.rating);
      setRateComment(cached.comment ?? "");
      return;
    }

    try {
      setRateLoading(true);
      const res = await fetch(`/api/sessions/${s.id}/rating`, {
        cache: "no-store",
      });
      const data: RatingResp = await res
        .json()
        .catch(() => ({ ok: false, rating: null }));

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

  useEffect(() => {
    if (loading) return;
    if (!focusId) return;
    if (rateParam !== "1") return;
    if (rateOpen) return;

    const s = items.find((x) => x.id === focusId);
    if (!s) return;
    if (s.status !== "COMPLETED" || !s.tutor) return;

    const next = new URLSearchParams(sp.toString());
    next.delete("rate");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

    openRateModal(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, focusId, rateParam, items.length, rateOpen]);

  async function submitRating() {
    if (!rateSessionId) return;

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
          confirmed: rateConfirmed ? true : null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.message ?? "Rating failed.");
        return;
      }

      setRatingBySession((prev) => ({
        ...prev,
        [rateSessionId]: {
          rating,
          comment: rateComment.trim() ? rateComment.trim() : null,
        },
      }));

      closeRate();
      setMsg("Thanks! Your rating has been submitted.");
      await refresh({ silent: true });
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

    const ongoing = isOngoing(s);
    const showCall = s.status === "ACCEPTED" && !!s.tutor && ongoing;

    return (
      <div
        id={`session-${s.id}`}
        className={[
          "rounded-2xl border p-4 border-[rgb(var(--border))] bg-[rgb(var(--card2))] transition-all duration-300",
          closed ? "opacity-80" : "",
          ongoing ? "ring-2 ring-[rgb(var(--primary))]" : "",
          isStartingSoon(s) && !ongoing ? "ring-2 ring-amber-400 animate-pulse" : "",
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

          <div className="flex flex-col items-end gap-2 self-end">
            <span
              className={[
                "rounded-full px-3 py-1 text-[11px] font-semibold border tracking-wide uppercase",
                statusBadgeClass(s.status),
              ].join(" ")}
            >
              {s.status}
            </span>

            <div className="flex flex-wrap justify-end items-center gap-2">
              {showCall && (
                <button
                  disabled={actionLoading}
                  onClick={() => router.push(`/call/${s.id}`)}
                  className={[
                    "rounded-md p-2 border",
                    "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white",
                    actionLoading
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:opacity-90",
                  ].join(" ")}
                  title="Join call"
                  aria-label="Join call"
                >
                  <Video className="h-4 w-4" />
                </button>
              )}

              {s.status === "ACCEPTED" && !!s.tutor && ongoing && (
                <button
                  disabled={actionLoading}
                  onClick={() => startChat(s.id)}
                  className="rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60"
                >
                  Start chat
                </button>
              )}

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
        </div>

        {s.status === "CANCELLED" && s.cancelReason && (
          <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted2))]">
            Reason: {s.cancelReason}
          </div>
        )}
      </div>
    );
  }

  const leftPill = grouped.upcoming.length > 0 ? "SESSIONS" : "SESSIONS";
  const leftMeta =
    activeCount > 0
      ? `${activeCount} item${activeCount === 1 ? "" : "s"}`
      : "No active sessions";

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
          <div className="text-sm text-[rgb(var(--muted2))]">No bookings yet.</div>
        ) : (
          <div className="space-y-4">
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

            {activeCount === 0 && !showPast ? (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-8 text-center text-sm text-[rgb(var(--muted2))]">
                No active sessions at the moment.
                <div className="mt-2 text-xs text-[rgb(var(--muted2))]">
                  Past sessions are available in the archive.
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Section
                  kind="UPCOMING"
                  title="Upcoming"
                  subtitle="Scheduled sessions"
                  list={grouped.upcoming}
                >
                  <div className="space-y-3">
                    {grouped.upcoming.map((s) => (
                      <BookingCard key={s.id} s={s} />
                    ))}
                  </div>
                </Section>

                <Section
                  kind="NEEDS_RATING"
                  title="Needs rating"
                  subtitle="Session ended — please rate your tutor"
                  list={grouped.needsRating}
                >
                  <div className="space-y-3">
                    {grouped.needsRating.map((s) => (
                      <BookingCard key={s.id} s={s} />
                    ))}
                  </div>
                </Section>
              </div>
            )}

            {showPast && (
              <div className="pt-2">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1 text-[11px] font-semibold tracking-wide text-[rgb(var(--fg))]">
                      PAST
                    </span>
                    <span className="text-xs text-[rgb(var(--muted2))]">
                      Completed (rated) and cancelled sessions
                    </span>
                  </div>

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
                      <Star size={22} className={on ? "fill-current" : ""} />
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

            <label className="mt-4 flex items-center gap-2 text-xs text-[rgb(var(--fg))]">
              <input
                type="checkbox"
                checked={rateConfirmed}
                onChange={(e) => setRateConfirmed(e.target.checked)}
                disabled={rateLoading || !!ratingBySession[rateSessionId]}
                className="h-4 w-4 accent-[rgb(var(--primary))]"
              />
              I confirm this session happened
            </label>

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