// src/app/sos/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  MessageCircle,
  XCircle,
  User,
  CalendarClock,
  Timer,
  ChevronRight,
  Zap,
  Radio,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Subject = { id: string; code: string; title: string };
type Tutor = { id: string; name: string | null; email: string; avatarUrl: string | null };

type SOS = {
  id: string;
  description: string;
  mode: string;
  status: string;
  createdAt: string;
  acceptedAt: string | null;
  expiresAt: string | null;
  subject: Subject;
  acceptedTutor: Tutor | null;
};

/* ─── Status config ─────────────────────────────────────────────────── */
function statusConfig(status: string) {
  switch (status) {
    case "SEARCHING":
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/40",
        glow: "shadow-[0_0_20px_rgba(245,158,11,0.25)]",
        dot: "bg-amber-400",
        pulse: true,
        label: "Searching…",
      };
    case "ACCEPTED":
      return {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700/40",
        glow: "shadow-[0_0_20px_rgba(16,185,129,0.25)]",
        dot: "bg-emerald-400",
        pulse: true,
        label: "Accepted",
      };
    case "IN_PROGRESS":
      return {
        badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700/40",
        glow: "shadow-[0_0_20px_rgba(59,130,246,0.2)]",
        dot: "bg-blue-400",
        pulse: true,
        label: "In Progress",
      };
    case "RESOLVED":
      return {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700/40",
        glow: "",
        dot: "bg-emerald-500",
        pulse: false,
        label: "Resolved",
      };
    case "CANCELLED":
      return {
        badge: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700",
        glow: "",
        dot: "bg-gray-400",
        pulse: false,
        label: "Cancelled",
      };
    case "EXPIRED":
      return {
        badge: "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/40",
        glow: "",
        dot: "bg-red-400",
        pulse: false,
        label: "Expired",
      };
    default:
      return {
        badge: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-700",
        glow: "",
        dot: "bg-gray-400",
        pulse: false,
        label: status,
      };
  }
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(nameOrEmail: string) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

/* ─── Skeleton shimmer ──────────────────────────────────────────────── */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-black/5 dark:bg-white/5 ${className ?? ""}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent" />
    </div>
  );
}

/* ─── Pulsing search ring ───────────────────────────────────────────── */
function SearchingRings() {
  return (
    <div className="relative mx-auto mt-2 mb-1 flex h-20 w-20 items-center justify-center">
      <span className="absolute h-20 w-20 rounded-full border-2 border-amber-400/30 animate-[ping_1.8s_ease-out_infinite]" />
      <span className="absolute h-14 w-14 rounded-full border-2 border-amber-400/50 animate-[ping_1.8s_ease-out_0.4s_infinite]" />
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/10 border border-amber-400/40">
        <Radio className="h-5 w-5 text-amber-500 dark:text-amber-400" />
      </span>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function SOSDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [sos, setSOS] = useState<SOS | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function load(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;
    if (!id) return;
    if (!silent) { setError(null); setLoading(true); }
    try {
      const res = await fetch(`/api/sos/${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Not found");
      setSOS(json.sos || null);
      setSessionId(json.sessionId ?? null);
      setChannelId(json.channelId ?? null);
    } catch (e: any) {
      if (!silent) setError(e?.message || "Failed to load");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  useEffect(() => {
    if (!id) return;
    const supabase = supabaseBrowser;
    const channel = supabase
      .channel(`sos-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "SOSRequest", filter: `id=eq.${id}` },
        () => void load({ silent: true }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    if (!sos) return;
    if (sos.status === "ACCEPTED" && channelId) {
      stopPolling();
      router.push(`/messaging?channelId=${encodeURIComponent(channelId)}`);
    }
  }, [sos, channelId]);

  useEffect(() => {
    if (!id) return;
    const shouldPoll = sos?.status === "SEARCHING" || (sos?.status === "ACCEPTED" && !channelId);
    if (!shouldPoll) { stopPolling(); return; }
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try { await load({ silent: true }); } finally { inFlightRef.current = false; }
    }, 2000);
    return () => stopPolling();
  }, [id, sos?.status, channelId]);

  const canCancel = useMemo(() => sos?.status === "SEARCHING" || sos?.status === "ACCEPTED", [sos]);

  async function cancel() {
    if (!id) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/sos/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: "Cancelled by student" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Cancel failed");
      await load();
    } catch (e: any) {
      setError(e?.message || "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  const cfg = sos ? statusConfig(sos.status) : null;
  const pageTitle = sos ? `${sos.subject.code} — ${sos.subject.title}` : "SOS Details";

  return (
    <>
      {/* Global keyframe injections */}
      <style>{`
        @keyframes shimmer { to { transform: translateX(200%); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .anim-fade-up   { animation: fadeUp 0.45s cubic-bezier(.22,1,.36,1) both; }
        .anim-scale-in  { animation: scaleIn 0.4s cubic-bezier(.22,1,.36,1) both; }
        .anim-slide-r   { animation: slideRight 0.4s cubic-bezier(.22,1,.36,1) both; }
        .delay-1 { animation-delay: 0.08s; }
        .delay-2 { animation-delay: 0.15s; }
        .delay-3 { animation-delay: 0.22s; }
        .delay-4 { animation-delay: 0.30s; }
        .delay-5 { animation-delay: 0.38s; }
      `}</style>

      <div
        className={`mx-auto w-full max-w-3xl px-4 sm:px-6 py-10 space-y-5 transition-opacity duration-300 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* ── Top nav ── */}
        <div className="anim-slide-r flex items-center justify-between gap-3">
          <button
            onClick={() => router.push("/sos")}
            className="group inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] transition-all duration-200 hover:border-violet-400/50 hover:shadow-[0_0_14px_rgba(139,92,246,0.15)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back
          </button>

          <Link
            href="/sos"
            className="text-xs text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] inline-flex items-center gap-1 transition-colors duration-150"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* ── Main card ── */}
        <div className={`anim-scale-in delay-1 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_20px_50px_rgba(0,0,0,0.10)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.35)] overflow-hidden ${cfg?.glow ?? ""}`}>

          {/* Card header gradient strip */}
          <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />

          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Zap className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  <h1 className="text-xl font-bold text-[rgb(var(--fg))] truncate tracking-tight">
                    {pageTitle}
                  </h1>
                </div>
                <p className="text-sm text-[rgb(var(--muted))] pl-6">
                  Live status and connection info for this request.
                </p>
              </div>

              {cfg && (
                <span
                  className={`inline-flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-full font-semibold flex-shrink-0 ${cfg.badge}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${
                      cfg.pulse ? "animate-pulse" : ""
                    }`}
                  />
                  {cfg.label}
                </span>
              )}
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* ── Loading skeletons ── */}
            {loading ? (
              <div className="mt-6 space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-10 w-36 rounded-xl" />
                  <Skeleton className="h-10 w-36 rounded-xl" />
                </div>
              </div>
            ) : !sos ? (
              <div className="mt-6 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 text-sm text-[rgb(var(--muted))]">
                Request not found.
              </div>
            ) : (
              <div className="mt-6 space-y-4">

                {/* ── Searching animation ── */}
                {sos.status === "SEARCHING" && (
                  <div className="anim-fade-up delay-2 rounded-2xl border border-amber-200/60 dark:border-amber-700/30 bg-amber-50/60 dark:bg-amber-900/10 px-4 py-5 text-center">
                    <SearchingRings />
                    <p className="mt-3 text-sm font-semibold text-amber-700 dark:text-amber-400">
                      Looking for an available tutor…
                    </p>
                    <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5">
                      Hang tight — we'll notify you the moment one accepts.
                    </p>
                  </div>
                )}

                {/* ── Request info card ── */}
                <div className="anim-fade-up delay-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[rgb(var(--fg))] tracking-tight">
                        {sos.subject.code}{" "}
                        <span className="font-normal text-[rgb(var(--muted))]">—</span>{" "}
                        {sos.subject.title}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--muted))] whitespace-pre-wrap">
                        {sos.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {[
                          {
                            icon: <Clock className="h-3.5 w-3.5" />,
                            label: `Created ${fmtDateTime(sos.createdAt)}`,
                          },
                          {
                            icon: <MessageCircle className="h-3.5 w-3.5" />,
                            label: sos.mode,
                          },
                          sos.expiresAt && {
                            icon: <Timer className="h-3.5 w-3.5" />,
                            label: `Expires ${fmtDateTime(sos.expiresAt)}`,
                          },
                        ]
                          .filter(Boolean)
                          .map((item: any, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1 text-[11px] font-medium text-[rgb(var(--muted2))]"
                            >
                              {item.icon}
                              {item.label}
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Accent block */}
                    <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-400/20 dark:border-violet-500/20 flex-shrink-0">
                      <Zap className="h-5 w-5 text-violet-500" />
                    </div>
                  </div>
                </div>

                {/* ── Timeline ── */}
                <div className="anim-fade-up delay-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarClock className="h-4 w-4 text-[rgb(var(--muted))]" />
                    <span className="text-sm font-bold text-[rgb(var(--fg))] tracking-tight">Timeline</span>
                  </div>

                  <div className="relative pl-4">
                    {/* Vertical line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-violet-400/40 via-fuchsia-400/30 to-transparent dark:from-violet-500/30" />

                    {[
                      { icon: <CalendarClock className="h-3.5 w-3.5" />, label: "Created", value: fmtDateTime(sos.createdAt), active: true },
                      { icon: <User className="h-3.5 w-3.5" />, label: "Accepted", value: fmtDateTime(sos.acceptedAt), active: !!sos.acceptedAt },
                      { icon: <Timer className="h-3.5 w-3.5" />, label: "Expires", value: fmtDateTime(sos.expiresAt), active: !!sos.expiresAt },
                    ].map((row, i) => (
                      <div key={i} className="relative mb-2 last:mb-0">
                        {/* Dot on the line */}
                        <span
                          className={`absolute -left-4 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full border-2 ${
                            row.active
                              ? "bg-violet-500 border-violet-300 dark:border-violet-700"
                              : "bg-[rgb(var(--card2))] border-[rgb(var(--border))]"
                          }`}
                        />
                        <div
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                            row.active
                              ? "border-violet-200/60 bg-violet-50/60 dark:border-violet-700/30 dark:bg-violet-900/10"
                              : "border-[rgb(var(--border))] bg-[rgb(var(--card))]"
                          }`}
                        >
                          <span
                            className={`inline-flex items-center gap-2 ${
                              row.active ? "text-violet-700 dark:text-violet-400" : "text-[rgb(var(--muted))]"
                            }`}
                          >
                            {row.icon}
                            {row.label}
                          </span>
                          <span
                            className={`font-medium tabular-nums ${
                              row.value === "—" ? "text-[rgb(var(--muted2))]" : "text-[rgb(var(--fg))]"
                            }`}
                          >
                            {row.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Tutor card ── */}
                {sos.acceptedTutor && (
                  <div className="anim-fade-up delay-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-700/30 bg-emerald-50/40 dark:bg-emerald-900/10 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-bold text-[rgb(var(--fg))] tracking-tight">
                        Tutor Connected
                      </span>
                      <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>

                    <div className="flex items-center gap-3">
                      {sos.acceptedTutor.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sos.acceptedTutor.avatarUrl}
                          alt="Tutor avatar"
                          className="h-11 w-11 rounded-2xl object-cover border-2 border-emerald-300/50 dark:border-emerald-700/40 shadow-sm"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-2xl border-2 border-emerald-300/50 dark:border-emerald-700/40 bg-gradient-to-br from-emerald-400/30 to-teal-500/30 grid place-items-center text-sm font-bold text-emerald-700 dark:text-emerald-300 shadow-sm">
                          {initials(sos.acceptedTutor.name ?? sos.acceptedTutor.email)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[rgb(var(--fg))] truncate">
                          {sos.acceptedTutor.name ?? sos.acceptedTutor.email}
                        </div>
                        <div className="text-xs text-[rgb(var(--muted2))] truncate">
                          {sos.acceptedTutor.email}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Channel not-yet-ready notice ── */}
                {!channelId && sos.status === "ACCEPTED" && (
                  <div className="anim-fade-up delay-4 rounded-xl border border-violet-200/50 dark:border-violet-700/30 bg-violet-50/50 dark:bg-violet-900/10 px-4 py-3 flex items-center gap-2.5 text-xs text-violet-700 dark:text-violet-400">
                    <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
                    Tutor accepted — chat channel is being set up, almost ready…
                  </div>
                )}

                {/* ── Actions ── */}
                <div className="anim-fade-up delay-5 flex flex-wrap items-center justify-end gap-2 pt-1">
                  {channelId && (
                    <Link
                      href={`/messaging?channelId=${encodeURIComponent(channelId)}`}
                      className="group inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-xs font-bold text-white shadow-[0_6px_20px_rgba(124,58,237,0.35)] hover:shadow-[0_8px_28px_rgba(124,58,237,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    >
                      <MessageCircle className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      Open chat
                    </Link>
                  )}

                  {canCancel && (
                    <button
                      onClick={cancel}
                      disabled={busy}
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-50 hover:border-red-300 dark:hover:border-red-700/60 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150"
                    >
                      <XCircle className="h-4 w-4" />
                      {busy ? "Cancelling…" : "Cancel request"}
                    </button>
                  )}
                </div>

                {/* ── Debug pills ── */}
                {(sessionId || channelId) && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-[rgb(var(--border))] mt-1">
                    {sessionId && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1 text-[10px] font-mono text-[rgb(var(--muted2))]">
                        Session: {sessionId}
                      </span>
                    )}
                    {channelId && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1 text-[10px] font-mono text-[rgb(var(--muted2))]">
                        Channel: {channelId}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}