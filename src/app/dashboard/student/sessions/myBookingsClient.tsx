"use client";

import { useEffect, useMemo, useState, memo, useCallback } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Star,
  Video,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  User,
  Filter,
} from "lucide-react";
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
  rating: {
    id: string;
    sessionId: string;
    tutorId: string;
    studentId: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

function formatLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function prettyDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function getPastPageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const last = total;
  if (current <= 3) return [1, 2, 3, 4, "…", last - 1, last];
  if (current >= total - 2) return [1, 2, "…", last - 3, last - 2, last - 1, last];
  return [1, "…", current - 1, current, current + 1, "…", last];
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  PENDING: {
    label: "Pending",
    dot: "bg-amber-400",
    badge: "bg-amber-500/10 border-amber-400/60 text-amber-600 dark:text-amber-300",
  },
  ACCEPTED: {
    label: "Accepted",
    dot: "bg-emerald-400",
    badge: "bg-emerald-500/10 border-emerald-400/60 text-emerald-600 dark:text-emerald-300",
  },
  COMPLETED: {
    label: "Completed",
    dot: "bg-slate-400",
    badge: "bg-slate-500/10 border-slate-400/40 text-slate-500 dark:text-slate-400",
  },
  CANCELLED: {
    label: "Cancelled",
    dot: "bg-rose-400",
    badge: "bg-rose-500/10 border-rose-400/60 text-rose-600 dark:text-rose-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    dot: "bg-slate-400",
    badge: "bg-slate-500/10 border-slate-400/40 text-slate-500",
  };
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase",
        cfg.badge,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", cfg.dot].join(" ")} />
      {cfg.label}
    </span>
  );
}

function AvatarPlaceholder({ name }: { name: string | null }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[rgb(var(--primary)/0.7)] to-[rgb(var(--primary))] flex items-center justify-center text-white text-xs font-bold shadow-sm">
      {initials}
    </div>
  );
}

// ─── SectionHeader (outside, pure) ───────────────────────────────────────────
function SectionHeader({
  icon,
  title,
  subtitle,
  count,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count: number;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        <div className={["flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide uppercase", accent ?? "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]"].join(" ")}>
          {icon}
          {title}
        </div>
        {subtitle && <span className="text-xs text-[rgb(var(--muted2))] hidden sm:inline">{subtitle}</span>}
      </div>
      <span className="text-[0.7rem] font-semibold text-[rgb(var(--muted2))] bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-full px-2 py-0.5">
        {count}
      </span>
    </div>
  );
}

// ─── BookingCard props ────────────────────────────────────────────────────────
type BookingCardProps = {
  s: Row;
  focusId: string | null;
  actionLoading: boolean;
  ratingBySession: Record<string, { rating: number; comment: string | null }>;
  // callbacks
  onJoin: (id: string) => void;
  onChat: (id: string) => void;
  onOpenRate: (s: Row) => void;
  onReschedule: (s: Row) => void;
  onReport: (s: Row) => void;
  onCancel: (s: Row) => void;
  onAcceptProposal: (id: string) => void;
  onRejectProposal: (id: string) => void;
};

// ─── BookingCard (OUTSIDE parent — prevents re-creation on every tick) ────────
const BookingCard = memo(function BookingCard({
  s,
  focusId,
  actionLoading,
  ratingBySession,
  onJoin,
  onChat,
  onOpenRate,
  onReschedule,
  onReport,
  onCancel,
  onAcceptProposal,
  onRejectProposal,
}: BookingCardProps) {
  const closed = s.status === "CANCELLED" || s.status === "COMPLETED";
  const tutorName = s.tutor?.name ?? null;
  const tutorProgramme = s.tutor?.programme ?? null;
  const proposalPending = s.proposalStatus === "PENDING" && !!s.proposedAt;
  const isFocused = focusId === s.id;
  const canRate = s.status === "COMPLETED" && !!s.tutor;
  const rated = !!ratingBySession[s.id];
  const ongoing = isOngoing(s);
  const soon = isStartingSoon(s);

  // Local tick for countdown — only this card re-renders each second, not the whole tree
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!ongoing) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [ongoing]);

  return (
    <motion.div
      id={`session-${s.id}`}
      layout
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={[
        "group relative rounded-2xl border overflow-hidden transition-all duration-300",
        "bg-[rgb(var(--card2))] border-[rgb(var(--border))]",
        closed ? "opacity-75" : "hover:shadow-[0_8px_32px_rgb(var(--shadow)/0.12)] hover:-translate-y-0.5",
        ongoing ? "ring-2 ring-[rgb(var(--primary))/0.6] shadow-[0_0_24px_rgb(var(--primary)/0.10)]" : "",
        soon && !ongoing ? "ring-2 ring-amber-400/70" : "",
        isFocused ? "ring-2 ring-[rgb(var(--primary))]" : "",
      ].join(" ")}
    >
      {/* Top accent bar */}
      {ongoing && (
        <div className="h-0.5 w-full bg-gradient-to-r from-[rgb(var(--primary)/0.4)] via-[rgb(var(--primary))] to-[rgb(var(--primary)/0.4)]" />
      )}
      {soon && !ongoing && (
        <div className="h-0.5 w-full bg-gradient-to-r from-amber-400/40 via-amber-400 to-amber-400/40" />
      )}

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left — info */}
          <div className="flex items-start gap-3 min-w-0">
            {/* Avatar */}
            <div className="shrink-0 mt-0.5">
              {s.tutor?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.tutor.avatarUrl}
                  alt={tutorName ?? "Tutor"}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-[rgb(var(--border))]"
                />
              ) : (
                <AvatarPlaceholder name={tutorName} />
              )}
            </div>

            <div className="min-w-0">
              {/* Subject */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[0.8rem] font-bold text-[rgb(var(--fg))] leading-tight">
                  {s.subject.code}
                </span>
                <span className="text-[0.75rem] text-[rgb(var(--muted))] truncate max-w-[200px]">
                  {s.subject.title}
                </span>
              </div>

              {/* Tutor line */}
              <div className="mt-1 flex items-center gap-1.5">
                <User size={11} className="text-[rgb(var(--muted2))] shrink-0" />
                {tutorName ? (
                  <span className="text-xs text-[rgb(var(--muted))]">
                    {tutorName}
                    {tutorProgramme && (
                      <span className="text-[rgb(var(--muted2))]"> · {tutorProgramme}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-xs italic text-[rgb(var(--muted2))]">Awaiting tutor assignment…</span>
                )}
              </div>

              {/* Date / duration */}
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[rgb(var(--muted2))]">
                <Clock size={11} className="shrink-0" />
                <span>{prettyDate(s.scheduledAt)}</span>
                <span className="opacity-50">·</span>
                <span>{s.durationMin} min</span>
              </div>

              {/* Ongoing countdown */}
              <AnimatePresence>
                {ongoing && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[rgb(var(--primary)/0.12)] border border-[rgb(var(--primary)/0.3)] px-2.5 py-1 text-[0.7rem] font-semibold text-[rgb(var(--primary))]"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--primary))] opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[rgb(var(--primary))]" />
                    </span>
                    Live · {countdownLabel(s)}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Starting soon */}
              {soon && !ongoing && (
                <motion.div
                  animate={{ opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-400/50 px-2.5 py-1 text-[0.7rem] font-semibold text-amber-600 dark:text-amber-300"
                >
                  Starting soon
                </motion.div>
              )}
            </div>
          </div>

          {/* Right — badge + actions */}
          <div className="flex flex-col items-end gap-2.5 shrink-0">
            <StatusBadge status={s.status} />

            <div className="flex flex-wrap justify-end items-center gap-1.5">
              {/* Join call */}
              {s.status === "ACCEPTED" && !!s.tutor && ongoing && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={actionLoading}
                  onClick={() => onJoin(s.id)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white bg-[rgb(var(--primary))] shadow-[0_4px_14px_rgb(var(--primary)/0.35)] hover:opacity-90 disabled:opacity-60 transition-all"
                  title="Join call"
                >
                  <Video className="h-3.5 w-3.5" />
                  Join
                </motion.button>
              )}

              {/* Chat */}
              {s.status === "ACCEPTED" && !!s.tutor && ongoing && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={actionLoading}
                  onClick={() => onChat(s.id)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat
                </motion.button>
              )}

              {/* Rate */}
              {canRate && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={rated}
                  onClick={() => onOpenRate(s)}
                  className={[
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all",
                    rated
                      ? "border-slate-400/40 bg-slate-500/10 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      : "border-amber-400/50 bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20",
                  ].join(" ")}
                  title={rated ? "Already rated" : "Rate tutor"}
                >
                  <Star size={13} className={rated ? "fill-current" : ""} />
                  {rated ? "Rated" : "Rate"}
                </motion.button>
              )}

              {/* Reschedule */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={closed || proposalPending}
                onClick={() => onReschedule(s)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-40 transition-colors"
                title={proposalPending ? "Resolve pending proposal first" : ""}
              >
                <RefreshCw size={12} />
                Reschedule
              </motion.button>

              {/* Report */}
              {s.tutor && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onReport(s)}
                  className="flex items-center gap-1 rounded-lg p-1.5 border border-rose-400/30 bg-rose-500/8 text-rose-500 hover:bg-rose-500/15 transition-colors"
                  title="Report session or tutor"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                </motion.button>
              )}

              {/* Cancel */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                disabled={closed}
                onClick={() => onCancel(s)}
                className="flex items-center gap-1 rounded-lg p-1.5 border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:border-rose-400/50 hover:text-rose-500 hover:bg-rose-500/8 disabled:opacity-40 transition-all"
                title="Cancel booking"
              >
                <XCircle className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Proposal banner */}
        <AnimatePresence initial={false}>
          {proposalPending && (
            <motion.div
              key={`proposal-${s.id}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.06)] px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-[0.8rem] font-semibold text-[rgb(var(--fg))] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[rgb(var(--primary))]" />
                  Tutor proposed a new time
                </div>
                <div className="mt-0.5 text-[0.75rem] text-[rgb(var(--muted2))] truncate">
                  {prettyDate(s.proposedAt!)}
                  {s.proposedNote && ` · ${s.proposedNote}`}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={actionLoading}
                  onClick={() => onAcceptProposal(s.id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:opacity-90 disabled:opacity-60 shadow-sm transition-all"
                >
                  {actionLoading ? "…" : "Accept"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={actionLoading}
                  onClick={() => onRejectProposal(s.id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60 transition-colors"
                >
                  Reject
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel reason */}
        {s.status === "CANCELLED" && s.cancelReason && (
          <div className="mt-3 flex items-center gap-1.5 text-[0.7rem] text-[rgb(var(--muted2))] bg-rose-500/5 border border-rose-400/20 rounded-lg px-3 py-2">
            <XCircle size={11} className="shrink-0 text-rose-400" />
            {s.cancelReason}
          </div>
        )}
      </div>
    </motion.div>
  );
});

// ─── Main component ───────────────────────────────────────────────────────────
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

  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [showPast, setShowPast] = useState(false);
  const [pastFilter, setPastFilter] = useState<"ALL" | "COMPLETED" | "CANCELLED">("ALL");

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
            const res = await fetch(`/api/sessions/${s.id}/rating`, { cache: "no-store" });
            const data: RatingResp = await res.json().catch(() => ({ ok: false, rating: null }));
            if (res.ok && data?.ok && data.rating) {
              return [s.id, { rating: data.rating.rating, comment: data.rating.comment }] as const;
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
    } catch {}
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

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  useEffect(() => {
    const t = setInterval(() => refresh({ silent: true }), 10_000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line

  // NOTE: The global tick is removed. Each BookingCard manages its own countdown tick.

  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    const run = async () => { try { await fetch("/api/reminders/pull", { cache: "no-store" }); } catch {} };
    const start = () => { stop(); run(); t = setInterval(run, 60_000); };
    const stop = () => { if (t) clearInterval(t); t = null; };
    const onVis = () => { if (document.visibilityState === "visible") start(); else stop(); };
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
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

      if (isCancelled) { past.push(it); continue; }
      if (isCompleted && hasTutor && !ratingsHydrated) { past.push(it); continue; }
      if (isCompleted && hasTutor && !rated) { needsRating.push(it); continue; }
      if (it.status === "PENDING" || it.status === "ACCEPTED") { upcoming.push(it); continue; }
      if (isCompleted) { past.push(it); continue; }
      past.push(it);
    }

    needsRating.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
    upcoming.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    past.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));

    return { needsRating, upcoming, past };
  }, [items, ratingBySession, ratingsHydrated]);

  const activeCount = grouped.upcoming.length + grouped.needsRating.length;

  const filteredPast =
    pastFilter === "ALL" ? grouped.past : grouped.past.filter((x) => x.status === pastFilter);

  const totalPastPages = Math.max(1, Math.ceil(filteredPast.length / PAST_PAGE_SIZE));
  const safePastPage = Math.min(pastPage, totalPastPages);
  const pagedPast = filteredPast.slice((safePastPage - 1) * PAST_PAGE_SIZE, safePastPage * PAST_PAGE_SIZE);

  useEffect(() => {
    if (pastPage > totalPastPages) setPastPage(totalPastPages);
  }, [totalPastPages]); // eslint-disable-line

  useEffect(() => {
    if (!focusId || loading || !items.length) return;
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
          document.getElementById(`session-${focusId}`)?.classList.remove("focus-glow");
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
    return () => { alive = false; };
  }, [focusId, loading, items.length, grouped.past.length, showPast]); // eslint-disable-line

  async function doReschedule() {
    if (!activeId) return;
    const chosen = new Date(newTime);
    if (Number.isNaN(chosen.getTime())) { setMsg({ text: "Please choose a valid date/time.", type: "error" }); return; }
    if (chosen.getTime() < Date.now() + 5 * 60 * 1000) { setMsg({ text: "Choose a time at least 5 minutes from now.", type: "error" }); return; }
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/sessions/${activeId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: chosen.toISOString() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ text: data?.message ?? "Reschedule failed.", type: "error" });
      else {
        closeModal();
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
        setMsg({ text: "Booking rescheduled successfully.", type: "success" });
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
      if (!res.ok) setMsg({ text: data?.message ?? "Cancel failed.", type: "error" });
      else {
        closeModal();
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
        setMsg({ text: "Booking cancelled successfully.", type: "success" });
      }
    } finally {
      setActionLoading(false);
    }
  }

  const acceptProposal = useCallback(async (id: string) => {
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/sessions/${id}/proposal/accept`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ text: data?.message ?? "Accept proposal failed.", type: "error" });
      else {
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
        setMsg({ text: "Proposal accepted. Session updated.", type: "success" });
      }
    } finally {
      setActionLoading(false);
    }
  }, []); // eslint-disable-line

  const rejectProposal = useCallback(async (id: string) => {
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/sessions/${id}/proposal/reject`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ text: data?.message ?? "Reject proposal failed.", type: "error" });
      else {
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
        setMsg({ text: "Proposal rejected.", type: "success" });
      }
    } finally {
      setActionLoading(false);
    }
  }, []); // eslint-disable-line

  const startChat = useCallback(async (sessionId: string) => {
    try {
      const r = await fetch("/api/chat/channel-from-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const j = await r.json();
      if (j?.ok && j.channelId) {
        router.push(`/messaging?channelId=${j.channelId}&returnTo=/dashboard/student/sessions&focus=${sessionId}`);
      } else {
        setMsg({ text: j?.message ?? "Unable to start chat.", type: "error" });
      }
    } catch {
      setMsg({ text: "Unable to start chat.", type: "error" });
    }
  }, [router]);

  const openReportForm = useCallback((s: Row) => {
    if (!s.tutor) return;
    const params = new URLSearchParams({
      sessionId: s.id,
      reportedUserId: s.tutor.id,
      reportedRole: "TUTOR",
      subject: `${s.subject.code} — ${s.subject.title}`,
      source: "SESSION",
    });
    router.push(`/dashboard/student/report?${params.toString()}`);
  }, [router]);

  const openRateModal = useCallback(async (s: Row) => {
    if (s.status !== "COMPLETED" || !s.tutor) return;
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
    if (cached) { setRateValue(cached.rating); setRateComment(cached.comment ?? ""); return; }
    try {
      setRateLoading(true);
      const res = await fetch(`/api/sessions/${s.id}/rating`, { cache: "no-store" });
      const data: RatingResp = await res.json().catch(() => ({ ok: false, rating: null }));
      if (res.ok && data?.ok && data.rating) {
        setRatingBySession((prev) => ({ ...prev, [s.id]: { rating: data.rating!.rating, comment: data.rating!.comment } }));
        setRateValue(data.rating.rating);
        setRateComment(data.rating.comment ?? "");
      }
    } finally {
      setRateLoading(false);
    }
  }, [ratingBySession]);

  const handleReschedule = useCallback((s: Row) => {
    setActiveId(s.id);
    setMode("RESCHEDULE");
    setNewTime(formatLocalInputValue(new Date(s.scheduledAt)));
    setMsg(null);
  }, []);

  const handleCancel = useCallback((s: Row) => {
    setActiveId(s.id);
    setMode("CANCEL");
    setReason("");
    setMsg(null);
  }, []);

  const handleJoin = useCallback((id: string) => {
    router.push(`/call/${id}`);
  }, [router]);

  useEffect(() => {
    if (loading || !focusId || rateParam !== "1" || rateOpen) return;
    const s = items.find((x) => x.id === focusId);
    if (!s || s.status !== "COMPLETED" || !s.tutor) return;
    const next = new URLSearchParams(sp.toString());
    next.delete("rate");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    openRateModal(s);
  }, [loading, focusId, rateParam, items.length, rateOpen]); // eslint-disable-line

  async function submitRating() {
    if (!rateSessionId) return;
    if (ratingBySession[rateSessionId]) { setMsg({ text: "You already rated this session.", type: "error" }); return; }
    const rating = Number(rateValue);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) { setMsg({ text: "Please select a rating from 1 to 5.", type: "error" }); return; }
    if (rateComment.trim().length > 500) { setMsg({ text: "Comment too long (max 500 chars).", type: "error" }); return; }
    setRateLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/sessions/${rateSessionId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: rateComment.trim() ? rateComment.trim() : undefined, confirmed: rateConfirmed ? true : null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ text: data?.message ?? "Rating failed.", type: "error" }); return; }
      setRatingBySession((prev) => ({ ...prev, [rateSessionId]: { rating, comment: rateComment.trim() ? rateComment.trim() : null } }));
      closeRate();
      setMsg({ text: "Thanks! Your rating has been submitted.", type: "success" });
      await refresh({ silent: true });
    } finally {
      setRateLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] px-6 py-5 shadow-[0_8px_32px_rgb(var(--shadow)/0.08)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-[rgb(var(--fg))] tracking-tight flex items-center gap-2">
              <BookOpen size={20} className="text-[rgb(var(--primary))]" />
              My Bookings
            </h1>
            <p className="mt-0.5 text-sm text-[rgb(var(--muted))]">
              Track session requests and manage reschedules or cancellations.
            </p>
          </div>

          <a
            href="/dashboard/student/sessions/calendar"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white bg-[rgb(var(--primary))] shadow-[0_4px_14px_rgb(var(--primary)/0.30)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(var(--primary)/0.40)]"
          >
            <Calendar size={14} />
            Calendar
          </a>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={[
              "flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium",
              msg.type === "success"
                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-300",
            ].join(" ")}
          >
            {msg.type === "success"
              ? <CheckCircle size={15} className="shrink-0" />
              : <XCircle size={15} className="shrink-0" />
            }
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Panel ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5 shadow-[0_8px_32px_rgb(var(--shadow)/0.06)]">
        {loading ? (
          <div className="flex flex-col gap-3 py-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-5 animate-pulse">
                <div className="flex gap-3">
                  <div className="h-9 w-9 rounded-full bg-[rgb(var(--muted2)/0.2)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-[rgb(var(--muted2)/0.2)]" />
                    <div className="h-2.5 w-1/4 rounded bg-[rgb(var(--muted2)/0.15)]" />
                    <div className="h-2.5 w-2/5 rounded bg-[rgb(var(--muted2)/0.12)]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-12 text-center">
            <BookOpen size={32} className="mx-auto text-[rgb(var(--muted2))] opacity-40 mb-3" />
            <p className="text-sm font-medium text-[rgb(var(--muted))]">No bookings yet</p>
            <p className="mt-1 text-xs text-[rgb(var(--muted2))]">Your scheduled sessions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[rgb(var(--fg))] bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-full px-3 py-1 uppercase tracking-wide">
                  Sessions
                </span>
                <span className="text-xs text-[rgb(var(--muted2))]">
                  {activeCount > 0 ? `${activeCount} active` : "No active sessions"}
                </span>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={() => setShowPast((p) => { const next = !p; setPastPage(1); if (!next) setPastFilter("ALL"); return next; })}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] transition-colors"
              >
                {showPast ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showPast ? "Hide Past" : `Past (${grouped.past.length})`}
              </motion.button>
            </div>

            {/* Active content */}
            {activeCount === 0 && !showPast ? (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-8 text-center">
                <p className="text-sm text-[rgb(var(--muted))]">No active sessions right now.</p>
                <p className="mt-1 text-xs text-[rgb(var(--muted2))]">Past sessions are archived below.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Upcoming */}
                {grouped.upcoming.length > 0 && (
                  <div>
                    <SectionHeader
                      icon={<Clock size={11} />}
                      title="Upcoming"
                      subtitle="Scheduled sessions"
                      count={grouped.upcoming.length}
                      accent="border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.08)] text-[rgb(var(--primary))]"
                    />
                    <div className="space-y-3">
                      <AnimatePresence>
                        {grouped.upcoming.map((s) => (
                          <BookingCard
                            key={s.id}
                            s={s}
                            focusId={focusId}
                            actionLoading={actionLoading}
                            ratingBySession={ratingBySession}
                            onJoin={handleJoin}
                            onChat={startChat}
                            onOpenRate={openRateModal}
                            onReschedule={handleReschedule}
                            onReport={openReportForm}
                            onCancel={handleCancel}
                            onAcceptProposal={acceptProposal}
                            onRejectProposal={rejectProposal}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Needs rating */}
                {grouped.needsRating.length > 0 && (
                  <div>
                    <SectionHeader
                      icon={<Star size={11} />}
                      title="Rate your tutor"
                      subtitle="Session ended"
                      count={grouped.needsRating.length}
                      accent="border-amber-400/60 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                    />
                    <div className="space-y-3">
                      <AnimatePresence>
                        {grouped.needsRating.map((s) => (
                          <BookingCard
                            key={s.id}
                            s={s}
                            focusId={focusId}
                            actionLoading={actionLoading}
                            ratingBySession={ratingBySession}
                            onJoin={handleJoin}
                            onChat={startChat}
                            onOpenRate={openRateModal}
                            onReschedule={handleReschedule}
                            onReport={openReportForm}
                            onCancel={handleCancel}
                            onAcceptProposal={acceptProposal}
                            onRejectProposal={rejectProposal}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Past */}
            <AnimatePresence>
              {showPast && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden pt-1"
                >
                  <div className="border-t border-[rgb(var(--border))] pt-5">
                    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                      <SectionHeader
                        icon={<Filter size={11} />}
                        title="Past"
                        subtitle="Completed & cancelled"
                        count={filteredPast.length}
                      />

                      <div className="flex gap-1.5">
                        {(["ALL", "COMPLETED", "CANCELLED"] as const).map((k) => (
                          <motion.button
                            key={k}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => { setPastFilter(k); setPastPage(1); }}
                            className={[
                              "rounded-full px-3 py-1 text-[10px] font-bold border transition-all duration-150 uppercase tracking-wide",
                              k === pastFilter
                                ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.10)]"
                                : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--card)/0.6)]",
                            ].join(" ")}
                          >
                            {k}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {filteredPast.length === 0 ? (
                      <p className="text-sm text-[rgb(var(--muted2))]">No past sessions found.</p>
                    ) : (
                      <>
                        <div className="space-y-3">
                          <AnimatePresence>
                            {pagedPast.map((s) => (
                              <BookingCard
                                key={s.id}
                                s={s}
                                focusId={focusId}
                                actionLoading={actionLoading}
                                ratingBySession={ratingBySession}
                                onJoin={handleJoin}
                                onChat={startChat}
                                onOpenRate={openRateModal}
                                onReschedule={handleReschedule}
                                onReport={openReportForm}
                                onCancel={handleCancel}
                                onAcceptProposal={acceptProposal}
                                onRejectProposal={rejectProposal}
                              />
                            ))}
                          </AnimatePresence>
                        </div>

                        {totalPastPages > 1 && (
                          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-4">
                            {getPastPageItems(safePastPage, totalPastPages).map((it, idx) =>
                              it === "…" ? (
                                <span key={`dots-${idx}`} className="px-2 text-xs text-[rgb(var(--muted2))]">…</span>
                              ) : (
                                <motion.button
                                  key={it}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setPastPage(it)}
                                  className={[
                                    "rounded-full w-8 h-8 text-[11px] font-bold border transition-all",
                                    it === safePastPage
                                      ? "border-[rgb(var(--primary))] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.10)]"
                                      : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--card)/0.6)]",
                                  ].join(" ")}
                                >
                                  {it}
                                </motion.button>
                              )
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Reschedule / Cancel Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {mode && activeId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
            onMouseDown={() => { if (!actionLoading) closeModal(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-[0_32px_80px_rgb(0,0,0,0.20)] p-6"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-1">
                {mode === "RESCHEDULE"
                  ? <RefreshCw size={16} className="text-[rgb(var(--primary))]" />
                  : <XCircle size={16} className="text-rose-500" />
                }
                <span className="text-sm font-bold text-[rgb(var(--fg))]">
                  {mode === "RESCHEDULE" ? "Reschedule booking" : "Cancel booking"}
                </span>
              </div>
              <p className="text-xs text-[rgb(var(--muted2))] mb-5">
                {mode === "RESCHEDULE"
                  ? "Choose a new date and time for your session."
                  : "Are you sure you want to cancel this session?"}
              </p>

              {mode === "RESCHEDULE" ? (
                <div>
                  <label className="block text-[0.7rem] font-semibold text-[rgb(var(--muted2))] mb-1.5 uppercase tracking-wide">
                    New date & time
                  </label>
                  <input
                    type="datetime-local"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.15)] transition-all"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[0.7rem] font-semibold text-[rgb(var(--muted2))] mb-1.5 uppercase tracking-wide">
                    Reason (optional)
                  </label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. timetable clash"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.15)] transition-all"
                  />
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  disabled={actionLoading}
                  onClick={closeModal}
                  className="flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60 transition-colors"
                >
                  Close
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={actionLoading}
                  onClick={mode === "RESCHEDULE" ? doReschedule : doCancel}
                  className={[
                    "flex-1 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-70",
                    mode === "RESCHEDULE"
                      ? "bg-[rgb(var(--primary))] shadow-[0_4px_14px_rgb(var(--primary)/0.30)] hover:opacity-90"
                      : "bg-rose-600 shadow-[0_4px_14px_rgb(239,68,68,0.25)] hover:opacity-90",
                  ].join(" ")}
                >
                  {actionLoading ? "Working…" : mode === "RESCHEDULE" ? "Reschedule" : "Cancel booking"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rate Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {rateOpen && rateSessionId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
            onMouseDown={() => { if (!rateLoading) closeRate(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-[0_32px_80px_rgb(0,0,0,0.20)] p-6"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Star size={16} className="text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-[rgb(var(--fg))]">Rate your tutor</span>
              </div>
              <p className="text-xs text-[rgb(var(--muted2))] mb-5">
                {rateTutorName} · Share how your session went
              </p>

              {/* Stars */}
              <div className="mb-5">
                <div className="text-[0.7rem] font-semibold text-[rgb(var(--muted2))] mb-2.5 uppercase tracking-wide">Rating</div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => {
                    const on = (rateHover || rateValue) >= n;
                    return (
                      <motion.button
                        key={n}
                        type="button"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={rateLoading || !!ratingBySession[rateSessionId]}
                        onMouseEnter={() => setRateHover(n)}
                        onMouseLeave={() => setRateHover(0)}
                        onClick={() => setRateValue(n)}
                        className={["p-0.5 rounded transition-all", rateLoading || !!ratingBySession[rateSessionId] ? "opacity-60 cursor-not-allowed" : ""].join(" ")}
                        title={`${n} star${n === 1 ? "" : "s"}`}
                      >
                        <Star
                          size={28}
                          className={on ? "text-amber-400 fill-amber-400" : "text-[rgb(var(--muted2))]"}
                        />
                      </motion.button>
                    );
                  })}
                  <span className="ml-2 text-sm font-bold text-[rgb(var(--fg))]">{rateValue}<span className="text-xs font-normal text-[rgb(var(--muted2))]">/5</span></span>
                </div>

                {ratingBySession[rateSessionId] && (
                  <div className="mt-2 text-[0.75rem] text-slate-500 dark:text-slate-400">
                    You already rated this session.
                  </div>
                )}
              </div>

              {/* Comment */}
              <div className="mb-5">
                <label className="block text-[0.7rem] font-semibold text-[rgb(var(--muted2))] mb-1.5 uppercase tracking-wide">
                  Comment (optional)
                </label>
                <textarea
                  value={rateComment}
                  onChange={(e) => setRateComment(e.target.value)}
                  placeholder="Share feedback…"
                  disabled={rateLoading || !!ratingBySession[rateSessionId]}
                  rows={3}
                  className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.15)] disabled:opacity-60 transition-all"
                />
                <div className="mt-1 text-right text-[0.65rem] text-[rgb(var(--muted2))]">
                  {Math.min(rateComment.length, 500)}/500
                </div>
              </div>

              {/* Confirm checkbox */}
              <label className="flex items-center gap-2.5 text-xs text-[rgb(var(--fg))] cursor-pointer mb-5 select-none">
                <input
                  type="checkbox"
                  checked={rateConfirmed}
                  onChange={(e) => setRateConfirmed(e.target.checked)}
                  disabled={rateLoading || !!ratingBySession[rateSessionId]}
                  className="h-4 w-4 rounded accent-[rgb(var(--primary))]"
                />
                I confirm this session happened
              </label>

              <div className="flex gap-2">
                <button
                  disabled={rateLoading}
                  onClick={closeRate}
                  className="flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60 transition-colors"
                >
                  Close
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  disabled={rateLoading || !!ratingBySession[rateSessionId]}
                  onClick={submitRating}
                  className="flex-1 rounded-xl px-3 py-2.5 text-xs font-bold text-white bg-amber-500 shadow-[0_4px_14px_rgb(245,158,11,0.30)] hover:opacity-90 disabled:opacity-60 transition-all"
                >
                  {rateLoading ? "Submitting…" : "Submit rating"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}