"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Video, Clock, CheckCircle2, XCircle, Zap, Calendar, MessageSquare, ChevronRight } from "lucide-react";

type Row = {
  id: string;
  scheduledAt: string;
  endsAt?: string | null;
  durationMin: number;
  status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | string;
  cancelReason: string | null;
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

// ─── Pure helpers ────────────────────────────────────────────────────────────

function prettyDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function normalizeTopicLabel(s: string) {
  return s.trim().replace(/\s+/g, " ").replace(/[^\p{L}\p{N}\s\-+.#/()]/gu, "");
}

function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function statusConfig(status: string) {
  switch (status) {
    case "PENDING":
      return { label: "Pending", dotClass: "bg-amber-400", badgeClass: "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300" };
    case "ACCEPTED":
      return { label: "Accepted", dotClass: "bg-emerald-400", badgeClass: "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300" };
    case "COMPLETED":
      return { label: "Completed", dotClass: "bg-slate-400", badgeClass: "border-slate-400/30 bg-slate-400/10 text-slate-500 dark:text-slate-400" };
    case "CANCELLED":
      return { label: "Cancelled", dotClass: "bg-rose-400", badgeClass: "border-rose-400/40 bg-rose-400/10 text-rose-600 dark:text-rose-300" };
    default:
      return { label: status, dotClass: "bg-[rgb(var(--muted2))]", badgeClass: "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]" };
  }
}

function sectionConfig(kind?: string) {
  switch (kind) {
    case "ONGOING":        return { dot: "bg-emerald-400 animate-pulse", label: "Live" };
    case "NEEDS_COMPLETION": return { dot: "bg-amber-400 animate-pulse", label: "Action needed" };
    case "UPCOMING":       return { dot: "bg-[rgb(var(--primary))]", label: "Scheduled" };
    default:               return { dot: "bg-[rgb(var(--muted2))]", label: "" };
  }
}

const inputClass = "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary)/0.15)] transition-all";
const labelClass = "block text-[0.7rem] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))] mb-1.5";

// ─── ModalShell (outside parent — stable identity) ───────────────────────────

function ModalShell({ children, onClose, actionLoading }: { children: React.ReactNode; onClose: () => void; actionLoading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={() => !actionLoading && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-[0_40px_120px_rgb(var(--shadow)/0.4)] overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ─── SessionCard (outside parent — stable identity) ──────────────────────────

type SessionCardProps = {
  s: Row;
  kind?: string;
  focusId: string | null;
  items: Row[];
  actionLoading: boolean;
  onAccept: (id: string) => void;
  onJoinCall: (id: string) => void;
  onChat: (id: string) => void;
  onComplete: (id: string) => void;
  onPropose: (s: Row) => void;
  onReport: (s: Row) => void;
  onCancel: (id: string) => void;
};

function SessionCard({ s, kind, focusId, items, actionLoading, onAccept, onJoinCall, onChat, onComplete, onPropose, onReport, onCancel }: SessionCardProps) {
  const pending = s.status === "PENDING";
  const accepted = s.status === "ACCEPTED";
  const ongoing = isOngoing(s);
  const conflict = pending && tutorHasOverlap(s, items);
  const active = pending || accepted;
  const proposalPending = active && s.proposalStatus === "PENDING" && !!s.proposedAt;
  const isFocused = focusId === s.id;
  const endedNeedsCompletion = accepted && canComplete(s);
  const isNeedsCompletion = kind === "NEEDS_COMPLETION";
  const showEndedAmber = isNeedsCompletion && endedNeedsCompletion && !proposalPending;
  const sc = statusConfig(s.status);
  const initials = getInitials(s.student.name, s.student.email);
  const soon = isStartingSoon(s) && !ongoing;

  return (
    <motion.div
      id={`session-${s.id}`}
      layout="position"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={[
        "group relative rounded-2xl border overflow-hidden transition-all duration-300",
        "border-[rgb(var(--border))] bg-[rgb(var(--card2))]",
        "hover:shadow-[0_8px_32px_rgb(var(--shadow)/0.12)] hover:-translate-y-0.5",
        ongoing ? "ring-2 ring-emerald-400/60 shadow-[0_0_0_4px_rgb(var(--shadow)/0.04)]" : "",
        soon ? "ring-2 ring-amber-400/60" : "",
        showEndedAmber ? "ring-2 ring-amber-400/60" : "",
        isFocused ? "ring-2 ring-[rgb(var(--primary)/0.7)]" : "",
      ].join(" ")}
    >
      <div className={[
        "absolute top-0 left-0 right-0 h-[2px]",
        ongoing ? "bg-gradient-to-r from-emerald-400 via-emerald-300 to-transparent" :
        showEndedAmber ? "bg-gradient-to-r from-amber-400 via-amber-300 to-transparent" :
        pending ? "bg-gradient-to-r from-amber-400/60 via-amber-300/40 to-transparent" :
        accepted ? "bg-gradient-to-r from-[rgb(var(--primary))] via-[rgb(var(--primary)/0.5)] to-transparent" :
        "bg-transparent"
      ].join(" ")} />

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={[
            "relative flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold select-none ring-2",
            ongoing ? "ring-emerald-400/50 bg-emerald-400/15 text-emerald-600 dark:text-emerald-300" :
            pending ? "ring-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300" :
            accepted ? "ring-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]" :
            "ring-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted2))]"
          ].join(" ")}>
            {s.student.avatarUrl
              ? <img src={s.student.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              : initials}
            {ongoing && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[rgb(var(--card2))]" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-[rgb(var(--primary))] opacity-80">{s.subject.code}</span>
                  <span className="text-[10px] text-[rgb(var(--muted2))]">·</span>
                  <span className="text-sm font-semibold text-[rgb(var(--fg))] truncate">{s.subject.title}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
                  <span className="font-medium">{s.student.name ?? "Student"}</span>
                  <span className="opacity-40">·</span>
                  <span className="truncate opacity-75">{s.student.email}</span>
                </div>
              </div>
              <span className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border tracking-wide", sc.badgeClass].join(" ")}>
                <span className={["h-1.5 w-1.5 rounded-full flex-shrink-0", sc.dotClass].join(" ")} />
                {sc.label}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-[rgb(var(--muted2))]">
                <Calendar className="h-3 w-3 opacity-60" />
                <span>{prettyDate(s.scheduledAt)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-[rgb(var(--muted2))]">
                <Clock className="h-3 w-3 opacity-60" />
                <span>{s.durationMin} min</span>
              </div>
            </div>

            {ongoing && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 border border-emerald-400/30 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                <Zap className="h-3 w-3" />
                {countdownLabel(s)}
              </motion.div>
            )}

            {soon && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-300 animate-pulse">
                <Clock className="h-3 w-3" />Starting soon
              </div>
            )}

            {showEndedAmber && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                <CheckCircle2 className="h-3 w-3" />Session ended — please complete review
              </div>
            )}

            {pending && conflict && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-400/15 border border-rose-400/30 px-3 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-300">
                <AlertTriangle className="h-3 w-3" />Time conflict
              </div>
            )}

            {s.status === "CANCELLED" && s.cancelReason && (
              <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted2))] italic">Reason: {s.cancelReason}</div>
            )}

            {proposalPending && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-400/30 bg-indigo-400/10 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-[0.8rem] font-semibold text-indigo-600 dark:text-indigo-300">Proposed time sent to student</div>
                  <div className="mt-0.5 text-[0.72rem] text-[rgb(var(--muted2))] truncate">
                    {prettyDate(s.proposedAt!)}
                    {s.proposedNote ? ` · ${s.proposedNote}` : ""}
                  </div>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold border border-indigo-400/30 bg-indigo-400/15 text-indigo-600 dark:text-indigo-300">
                  Awaiting confirmation
                </span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 justify-end border-t border-[rgb(var(--border)/0.5)] pt-3">
          {showEndedAmber && (
            <button disabled={actionLoading} onClick={() => onComplete(s.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90 disabled:opacity-60 transition-opacity shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />Complete session
            </button>
          )}

          {!showEndedAmber && (
            <>
              {accepted && ongoing && (
                <button disabled={actionLoading} onClick={() => onJoinCall(s.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 transition-colors shadow-sm">
                  <Video className="h-3.5 w-3.5" />Join call
                </button>
              )}
              {accepted && ongoing && (
                <button disabled={actionLoading} onClick={() => onChat(s.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60 transition-colors">
                  <MessageSquare className="h-3.5 w-3.5" />Chat
                </button>
              )}
              {pending && !proposalPending && (
                <button disabled={actionLoading || conflict} onClick={() => onAccept(s.id)}
                  title={conflict ? "Time conflict: you already have a session overlapping this slot." : ""}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90 disabled:opacity-60 transition-opacity shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" />Accept
                </button>
              )}
              {canComplete(s) && (
                <button disabled={actionLoading} onClick={() => onComplete(s.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90 disabled:opacity-60 transition-opacity shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5" />Complete
                </button>
              )}
              {active && (
                <button disabled={actionLoading} onClick={() => onPropose(s)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60 transition-colors">
                  <Calendar className="h-3.5 w-3.5" />Propose time
                </button>
              )}
              <button onClick={() => onReport(s)}
                className="inline-flex items-center gap-1 rounded-lg p-2 border border-rose-400/30 bg-rose-400/8 text-rose-500 dark:text-rose-400 hover:bg-rose-400/15 transition-colors"
                title="Report this session or student">
                <AlertTriangle className="h-3.5 w-3.5" />
              </button>
              {active && (
                <button disabled={actionLoading} onClick={() => onCancel(s.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold border border-rose-400/40 text-rose-600 dark:text-rose-400 hover:bg-rose-400/10 disabled:opacity-60 transition-colors">
                  <XCircle className="h-3.5 w-3.5" />Cancel
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section (outside parent — stable identity) ──────────────────────────────

type SectionProps = {
  title: string;
  subtitle?: string;
  list: Row[];
  rightSlot?: React.ReactNode;
  kind?: "ONGOING" | "UPCOMING" | "NEEDS_COMPLETION" | "PAST";
  focusId: string | null;
  items: Row[];
  actionLoading: boolean;
  onAccept: (id: string) => void;
  onJoinCall: (id: string) => void;
  onChat: (id: string) => void;
  onComplete: (id: string) => void;
  onPropose: (s: Row) => void;
  onReport: (s: Row) => void;
  onCancel: (id: string) => void;
};

function Section({ title, list, subtitle, rightSlot, kind, focusId, items, actionLoading, onAccept, onJoinCall, onChat, onComplete, onPropose, onReport, onCancel }: SectionProps) {
  if (list.length === 0) return null;
  const sc = sectionConfig(kind);

  return (
    <motion.div layout="position" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] pl-2 pr-3 py-1">
            <span className={["h-2 w-2 rounded-full flex-shrink-0", sc.dot].join(" ")} />
            <span className="text-[11px] font-bold tracking-wide text-[rgb(var(--fg))] uppercase">{title}</span>
          </div>
          <span className="text-[11px] text-[rgb(var(--muted2))]">
            {list.length} session{list.length !== 1 ? "s" : ""}{subtitle ? ` · ${subtitle}` : ""}
          </span>
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>

      <AnimatePresence initial={false}>
        {list.map((s) => (
          <SessionCard key={s.id} s={s} kind={kind} focusId={focusId} items={items} actionLoading={actionLoading}
            onAccept={onAccept} onJoinCall={onJoinCall} onChat={onChat} onComplete={onComplete}
            onPropose={onPropose} onReport={onReport} onCancel={onCancel} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TutorSessionsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const focusId = sp.get("focus");

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [modalMsg, setModalMsg] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [pastFilter, setPastFilter] = useState<"ALL" | "COMPLETED" | "CANCELLED">("ALL");
  const PAST_PAGE_SIZE = 5;
  const [pastPage, setPastPage] = useState(1);
  const [mode, setMode] = useState<"CANCEL" | "PROPOSE" | "COMPLETE" | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [proposedTime, setProposedTime] = useState(() =>
    formatLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState("");
  const [confidenceBefore, setConfidenceBefore] = useState(3);
  const [confidenceAfter, setConfidenceAfter] = useState(4);
  const [nextSteps, setNextSteps] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [topics, setTopics] = useState<string[]>([]);

  const activeSession = useMemo(() => {
    if (!activeId) return null;
    return items.find((x) => x.id === activeId) ?? null;
  }, [activeId, items]);

  function resetCompleteForm() {
    setSummary(""); setConfidenceBefore(3); setConfidenceAfter(4);
    setNextSteps(""); setTopicInput(""); setTopics([]);
  }

  function closeModal() {
    setMode(null); setActiveId(null); setReason(""); setNote("");
    setModalMsg(null); resetCompleteForm();
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

  useEffect(() => { refresh(); }, []);

  // Pause polling while any modal is open
  useEffect(() => {
    if (mode !== null) return;
    const t = setInterval(() => refresh({ silent: true }), 3_000);
    return () => clearInterval(t);
  }, [mode]);

  // Pause countdown tick while any modal is open
  useEffect(() => {
    if (mode !== null) return;
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [mode]);

  useEffect(() => {
    let t: any;
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

  async function accept(id: string) {
    setActionLoading(true); setMsg(null);
    try {
      const res = await fetch(`/api/tutor/sessions/${id}/accept`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(data?.message ?? "Accept failed.");
      else { await refresh({ silent: true }); await fetch("/api/reminders/pull", { cache: "no-store" }); }
    } finally { setActionLoading(false); }
  }

  async function startChat(sessionId: string) {
    try {
      const r = await fetch("/api/chat/channel-from-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const j = await r.json();
      if (j?.ok && j.channelId) router.push(`/messaging?channelId=${j.channelId}&returnTo=/dashboard/tutor/sessions&focus=${sessionId}`);
      else setMsg(j?.message ?? "Unable to start chat.");
    } catch { setMsg("Unable to start chat."); }
  }

  function openReportForm(s: Row) {
    const params = new URLSearchParams({
      sessionId: s.id, reportedUserId: s.student.id, reportedRole: "STUDENT",
      subject: `${s.subject.code} — ${s.subject.title}`, source: "SESSION",
    });
    router.push(`/dashboard/student/report?${params.toString()}`);
  }

  async function submitComplete() {
    if (!activeId) return;
    setModalMsg(null);
    const trimmedSummary = summary.trim();
    if (!trimmedSummary) { setModalMsg("Please write a short session summary."); return; }
    const before = clampInt(Number(confidenceBefore), 1, 5);
    const after = clampInt(Number(confidenceAfter), 1, 5);
    const cleanedTopics = topics.map(normalizeTopicLabel).filter(Boolean);
    if (cleanedTopics.length === 0) { setModalMsg("Please add at least 1 topic covered."); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tutor/sessions/${activeId}/complete`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: trimmedSummary, confidenceBefore: before, confidenceAfter: after, topics: cleanedTopics, nextSteps: nextSteps.trim() ? nextSteps.trim() : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setModalMsg(data?.message ?? "Complete failed.");
      else {
        closeModal();
        await refresh({ silent: true });
        await fetch("/api/reminders/pull", { cache: "no-store" });
        setMsg("Session Completed and Progress Updated.");
      }
    } finally { setActionLoading(false); }
  }

  async function cancelSession() {
    if (!activeId) return;
    setModalMsg(null); setActionLoading(true);
    try {
      const res = await fetch(`/api/tutor/sessions/${activeId}/cancel`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setModalMsg(data?.message ?? "Cancel failed.");
      else {
        setMsg("Session cancelled."); closeModal();
        await refresh({ silent: true }); await fetch("/api/reminders/pull", { cache: "no-store" });
      }
    } finally { setActionLoading(false); }
  }

  async function proposeTime() {
    if (!activeId) return;
    setModalMsg(null);
    const chosen = new Date(proposedTime);
    if (Number.isNaN(chosen.getTime())) { setModalMsg("Please choose a valid date/time."); return; }
    if (chosen.getTime() < Date.now() + 5 * 60 * 1000) { setModalMsg("Choose a time at least 5 minutes from now."); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tutor/sessions/${activeId}/propose-time`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedAt: chosen.toISOString(), note: note?.trim() ? note.trim() : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setModalMsg(data?.message ?? "Propose failed.");
      else {
        setMsg("Proposed new time sent to student for confirmation."); closeModal();
        await refresh({ silent: true }); await fetch("/api/reminders/pull", { cache: "no-store" });
      }
    } finally { setActionLoading(false); }
  }

  function addTopic(raw: string) {
    const t = normalizeTopicLabel(raw);
    if (!t) return;
    setTopics((prev) => {
      if (prev.some((x) => x.toLowerCase() === t.toLowerCase())) return prev;
      return [...prev, t].slice(0, 12);
    });
  }

  function removeTopic(label: string) {
    setTopics((prev) => prev.filter((x) => x !== label));
  }

  function onTopicKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      if (topicInput.trim()) { addTopic(topicInput); setTopicInput(""); }
    }
    if (e.key === "Backspace" && !topicInput && topics.length > 0) removeTopic(topics[topics.length - 1]);
  }

  const grouped = useMemo(() => {
    const now = Date.now();
    const isClosed = (s: Row) => s.status === "CANCELLED" || s.status === "COMPLETED";
    const isEndedAccepted = (s: Row) => s.status === "ACCEPTED" && getEndTime(s) <= now;
    const past = items.filter((s) => isClosed(s));
    const needsCompletion = items.filter((s) => !isClosed(s) && isEndedAccepted(s));
    const ongoing = items.filter((s) => !isClosed(s) && isOngoing(s));
    const upcoming = items.filter((s) => {
      if (isClosed(s) || isEndedAccepted(s)) return false;
      return new Date(s.scheduledAt).getTime() > now && !isOngoing(s);
    });
    upcoming.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    past.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
    needsCompletion.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
    return { ongoing, upcoming, needsCompletion, past };
  }, [items]);

  const filteredPast = pastFilter === "ALL" ? grouped.past : grouped.past.filter((x) => x.status === pastFilter);
  const totalPastPages = Math.max(1, Math.ceil(filteredPast.length / PAST_PAGE_SIZE));
  const safePastPage = Math.min(pastPage, totalPastPages);
  const pagedPast = filteredPast.slice((safePastPage - 1) * PAST_PAGE_SIZE, safePastPage * PAST_PAGE_SIZE);

  useEffect(() => {
    if (pastPage > totalPastPages) setPastPage(totalPastPages);
  }, [totalPastPages]);

  useEffect(() => {
    if (!focusId || loading || !items.length) return;
    if (!items.some((x) => x.id === focusId)) return;
    const isFocusedPast = grouped.past.some((x) => x.id === focusId);
    if (isFocusedPast) {
      setShowPast(true);
      const idx = filteredPast.findIndex((x) => x.id === focusId);
      if (idx >= 0) setPastPage((p) => { const cp = Math.floor(idx / PAST_PAGE_SIZE) + 1; return p === cp ? p : cp; });
    }
    let alive = true;
    let tries = 0;
    const findAndScroll = () => {
      if (!alive) return;
      const el = document.getElementById(`session-${focusId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("focus-glow");
        window.setTimeout(() => {
          document.getElementById(`session-${focusId}`)?.classList.remove("focus-glow");
          const next = new URLSearchParams(sp.toString());
          next.delete("focus");
          const qs = next.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }, 3000);
      } else {
        tries++;
        if (tries < 40) window.setTimeout(findAndScroll, 120);
      }
    };
    requestAnimationFrame(() => window.setTimeout(findAndScroll, 0));
    return () => { alive = false; };
  }, [focusId, loading, items.length, grouped.past.length, filteredPast.length, pastFilter, pastPage, showPast]);

  const activeCount = grouped.ongoing.length + grouped.upcoming.length + grouped.needsCompletion.length;

  // Shared card action callbacks
  const handleComplete = (id: string) => { setActiveId(id); setMode("COMPLETE"); setModalMsg(null); resetCompleteForm(); };
  const handleCancel  = (id: string) => { setActiveId(id); setMode("CANCEL");   setModalMsg(null); setReason(""); };
  const handlePropose = (s: Row)     => { setActiveId(s.id); setMode("PROPOSE"); setModalMsg(null); setNote(""); setProposedTime(formatLocalInputValue(new Date(s.scheduledAt))); };
  const handleJoinCall = (id: string) => router.push(`/call/${id}`);

  const sharedCardProps = { focusId, items, actionLoading, onAccept: accept, onJoinCall: handleJoinCall, onChat: startChat, onComplete: handleComplete, onPropose: handlePropose, onReport: openReportForm, onCancel: handleCancel };

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div layout="position" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] overflow-hidden">
        <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-[rgb(var(--primary)/0.08)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-[rgb(var(--primary)/0.05)] blur-2xl" />
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[rgb(var(--fg))] tracking-tight">Tutor Sessions</h1>
              <p className="mt-1 text-sm text-[rgb(var(--muted))] max-w-md">Manage upcoming requests, live sessions, and archived history.</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              {grouped.ongoing.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">{grouped.ongoing.length} live</span>
                </div>
              )}
              {grouped.needsCompletion.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-300">{grouped.needsCompletion.length} pending review</span>
                </div>
              )}
              {grouped.upcoming.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-full border border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.08)] px-3 py-1.5">
                  <span className="text-xs font-semibold text-[rgb(var(--primary))]">{grouped.upcoming.length} upcoming</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Success banner */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />{msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions panel */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.07)] overflow-hidden">
        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[rgb(var(--border))]" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 w-1/3 rounded-full bg-[rgb(var(--border))]" />
                      <div className="h-2.5 w-1/2 rounded-full bg-[rgb(var(--border))]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={["h-2 w-2 rounded-full", grouped.ongoing.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-[rgb(var(--muted2))]"].join(" ")} />
                  <span className="text-sm font-semibold text-[rgb(var(--fg))]">
                    {activeCount > 0 ? `${activeCount} active session${activeCount !== 1 ? "s" : ""}` : "No active sessions"}
                  </span>
                </div>
                <button type="button"
                  onClick={() => setShowPast((p) => { const next = !p; setPastPage(1); if (!next) setPastFilter("ALL"); return next; })}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.5)] transition-colors">
                  <span>{showPast ? "Hide past" : "Past sessions"}</span>
                  {!showPast && grouped.past.length > 0 && (
                    <span className="rounded-full bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))] px-1.5 py-0.5 text-[10px] font-bold">{grouped.past.length}</span>
                  )}
                  <ChevronRight className={["h-3 w-3 transition-transform", showPast ? "rotate-90" : ""].join(" ")} />
                </button>
              </div>

              {activeCount === 0 && !showPast && (
                <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-12 text-center">
                  <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-[rgb(var(--card))] border border-[rgb(var(--border))] flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-[rgb(var(--muted2))]" />
                  </div>
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">No active sessions</div>
                  <div className="mt-1 text-xs text-[rgb(var(--muted2))]">Past sessions are available in the archive below.</div>
                </div>
              )}

              {activeCount > 0 && (
                <>
                  <Section kind="ONGOING" title="Ongoing" subtitle="Live now" list={grouped.ongoing} {...sharedCardProps} />
                  <Section kind="NEEDS_COMPLETION" title="Needs completion" subtitle="Session ended" list={grouped.needsCompletion} {...sharedCardProps} />
                  <Section kind="UPCOMING" title="Upcoming" subtitle="Scheduled next" list={grouped.upcoming} {...sharedCardProps} />
                </>
              )}

              <AnimatePresence>
                {showPast && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
                    <div className="space-y-4 pt-1">
                      <Section kind="PAST" title="Past Sessions" subtitle="Completed & cancelled" list={pagedPast} {...sharedCardProps}
                        rightSlot={
                          <div className="flex gap-1.5">
                            {(["ALL", "COMPLETED", "CANCELLED"] as const).map((k) => (
                              <button key={k} onClick={() => { setPastFilter(k); setPastPage(1); }}
                                className={["rounded-full px-3 py-1 text-[10px] font-semibold border transition-all duration-150",
                                  k === pastFilter
                                    ? "border-[rgb(var(--primary)/0.5)] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]"
                                    : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]",
                                ].join(" ")}>{k}</button>
                            ))}
                          </div>
                        }
                      />

                      {filteredPast.length > 0 && totalPastPages > 1 && (
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                          {getPastPageItems(safePastPage, totalPastPages).map((it, idx) =>
                            it === "…"
                              ? <span key={`dots-${idx}`} className="px-2 text-xs text-[rgb(var(--muted2))]">…</span>
                              : <button key={it} onClick={() => setPastPage(it)}
                                  className={["rounded-full px-3 py-1 text-[11px] font-semibold border transition-all duration-150",
                                    it === safePastPage
                                      ? "border-[rgb(var(--primary)/0.5)] text-[rgb(var(--primary))] bg-[rgb(var(--primary)/0.1)]"
                                      : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.5)]",
                                  ].join(" ")}>{it}</button>
                          )}
                        </div>
                      )}

                      {filteredPast.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-8 text-center text-sm text-[rgb(var(--muted2))]">
                          No {pastFilter !== "ALL" ? pastFilter.toLowerCase() : ""} sessions found.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── CANCEL MODAL ── */}
      <AnimatePresence>
        {mode === "CANCEL" && activeId && (
          <ModalShell onClose={closeModal} actionLoading={actionLoading}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-rose-400/15 border border-rose-400/30 flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[rgb(var(--fg))]">Cancel session</div>
                  <div className="text-xs text-[rgb(var(--muted2))]">This action cannot be undone</div>
                </div>
              </div>
              {modalMsg && (
                <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">{modalMsg}</div>
              )}
              <div>
                <label className={labelClass}>Reason (optional)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Not available / emergency" className={inputClass} />
              </div>
              <div className="mt-5 flex gap-2">
                <button disabled={actionLoading} onClick={closeModal}
                  className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.5)] disabled:opacity-60 transition-colors">
                  Keep session
                </button>
                <button disabled={actionLoading} onClick={cancelSession}
                  className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60 transition-colors">
                  {actionLoading ? "Cancelling…" : "Cancel session"}
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── PROPOSE MODAL ── */}
      <AnimatePresence>
        {mode === "PROPOSE" && activeId && (
          <ModalShell onClose={closeModal} actionLoading={actionLoading}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-[rgb(var(--primary)/0.15)] border border-[rgb(var(--primary)/0.3)] flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-[rgb(var(--primary))]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[rgb(var(--fg))]">Propose a new time</div>
                  <div className="text-xs text-[rgb(var(--muted2))]">Student must confirm before time changes</div>
                </div>
              </div>
              {modalMsg && (
                <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">{modalMsg}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Proposed date & time</label>
                  <input type="datetime-local" value={proposedTime} onChange={(e) => setProposedTime(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Note (optional)</label>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I have a conflict — can we shift?" className={inputClass} />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button disabled={actionLoading} onClick={closeModal}
                  className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.5)] disabled:opacity-60 transition-colors">
                  Close
                </button>
                <button disabled={actionLoading} onClick={proposeTime}
                  className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90 disabled:opacity-60 transition-opacity">
                  {actionLoading ? "Sending…" : "Send proposal"}
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* ── COMPLETE MODAL ── */}
      <AnimatePresence>
        {mode === "COMPLETE" && activeId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
            onMouseDown={() => !actionLoading && closeModal()}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-xl rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-[0_40px_120px_rgb(var(--shadow)/0.4)] overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}>
              <div className="relative px-6 pt-6 pb-5 border-b border-[rgb(var(--border)/0.6)]">
                <div className="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-[rgb(var(--primary)/0.05)]" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[rgb(var(--primary)/0.15)] border border-[rgb(var(--primary)/0.3)] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-[rgb(var(--primary))]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[rgb(var(--fg))]">Complete session</div>
                      {activeSession && (
                        <div className="mt-0.5 text-xs text-[rgb(var(--muted2))]">{activeSession.subject.code} · {activeSession.student.name ?? "Student"}</div>
                      )}
                    </div>
                  </div>
                  <button disabled={actionLoading} onClick={closeModal}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.5)] disabled:opacity-60 transition-colors">
                    Close
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
                {modalMsg && (
                  <div className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">{modalMsg}</div>
                )}
                <div>
                  <label className={labelClass}>Session summary <span className="text-[rgb(var(--primary))]">*</span></label>
                  <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
                    placeholder="What was covered? Key concepts, exercises, mistakes corrected…"
                    rows={4} className={inputClass + " resize-none"} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Confidence before <span className="text-[rgb(var(--primary))]">*</span></label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={1} max={5} value={confidenceBefore} onChange={(e) => setConfidenceBefore(Number(e.target.value))} className={inputClass} />
                      <span className="text-sm font-bold text-[rgb(var(--muted2))] min-w-[20px] text-center">{confidenceBefore}</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Confidence after <span className="text-[rgb(var(--primary))]">*</span></label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={1} max={5} value={confidenceAfter} onChange={(e) => setConfidenceAfter(Number(e.target.value))} className={inputClass} />
                      <span className="text-sm font-bold text-[rgb(var(--muted2))] min-w-[20px] text-center">{confidenceAfter}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Topics covered <span className="text-[rgb(var(--primary))]">*</span> <span className="normal-case font-normal text-[rgb(var(--muted2))]">(Enter or comma)</span></label>
                  <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2.5 focus-within:border-[rgb(var(--primary))] focus-within:ring-2 focus-within:ring-[rgb(var(--primary)/0.15)] transition-all">
                    <div className="flex flex-wrap gap-1.5">
                      {topics.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.08)] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--primary))]">
                          {t}
                          <button type="button" onClick={() => removeTopic(t)} className="opacity-60 hover:opacity-100 hover:text-rose-500 transition-colors" aria-label={`Remove ${t}`}>✕</button>
                        </span>
                      ))}
                      <input value={topicInput} onChange={(e) => setTopicInput(e.target.value)} onKeyDown={onTopicKeyDown}
                        onBlur={() => { if (topicInput.trim()) { addTopic(topicInput); setTopicInput(""); } }}
                        placeholder={topics.length === 0 ? "e.g. Derivatives, Chain rule, Integrals" : "Add more…"}
                        className="min-w-[160px] flex-1 bg-transparent text-sm outline-none text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))]" />
                    </div>
                    <div className="mt-1.5 text-[11px] text-[rgb(var(--muted2))]">Up to 12 topics · {topics.length}/12</div>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Next steps <span className="normal-case font-normal text-[rgb(var(--muted2))]">(optional)</span></label>
                  <input value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} placeholder="Homework / what to revise before next session" className={inputClass} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button disabled={actionLoading} onClick={closeModal}
                    className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.5)] disabled:opacity-60 transition-colors">
                    Back
                  </button>
                  <button disabled={actionLoading} onClick={submitComplete}
                    className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90 disabled:opacity-60 transition-opacity">
                    {actionLoading ? "Saving…" : "Submit & complete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}