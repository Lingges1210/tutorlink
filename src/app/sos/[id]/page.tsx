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
} from "lucide-react";

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

function badgeClass(status: string) {
  switch (status) {
    case "SEARCHING":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "ACCEPTED":
      return "bg-green-50 text-green-700 border-green-200";
    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "CANCELLED":
      return "bg-gray-50 text-gray-700 border-gray-200";
    case "EXPIRED":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function pillBase() {
  return "inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1 text-xs text-[rgb(var(--muted2))]";
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function initials(nameOrEmail: string) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

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

  //  polling control
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function load(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;

    if (!id) return;

    if (!silent) {
      setError(null);
      setLoading(true);
    }

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

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  //  If ACCEPTED and channelId is ready, send student straight to chat
  useEffect(() => {
    if (!sos) return;
    if (sos.status === "ACCEPTED" && channelId) {
      stopPolling();
      router.push(`/messaging?channelId=${encodeURIComponent(channelId)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sos, channelId]);

  //  Poll while SEARCHING, OR ACCEPTED but channel not ready yet
  useEffect(() => {
    if (!id) return;

    const shouldPoll =
      (sos?.status === "SEARCHING") || (sos?.status === "ACCEPTED" && !channelId);

    if (!shouldPoll) {
      stopPolling();
      return;
    }

    if (pollRef.current) return; // already polling

    pollRef.current = setInterval(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await load({ silent: true });
      } finally {
        inFlightRef.current = false;
      }
    }, 2000);

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sos?.status, channelId]);

  const canCancel = useMemo(() => {
    if (!sos) return false;
    return sos.status === "SEARCHING" || sos.status === "ACCEPTED";
  }, [sos]);

  async function cancel() {
    if (!id) return;
    setBusy(true);
    setError(null);
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

  const pageTitle = sos ? `${sos.subject.code} — ${sos.subject.title}` : "SOS Details";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.push("/sos")}
          className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.35]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Link
          href="/sos"
          className="text-xs text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] inline-flex items-center gap-1"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-[rgb(var(--fg))] truncate">{pageTitle}</h1>
            <p className="text-sm text-[rgb(var(--muted))]">
              Status and connection info for this request.
            </p>
          </div>

          {sos?.status && (
            <span className={`text-xs border px-2.5 py-1 rounded-full ${badgeClass(sos.status)}`}>
              {sos.status}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 space-y-3">
            <div className="h-4 w-2/3 rounded bg-[rgb(var(--card2))]" />
            <div className="h-4 w-full rounded bg-[rgb(var(--card2))]" />
            <div className="h-4 w-5/6 rounded bg-[rgb(var(--card2))]" />
            <div className="h-10 w-40 rounded-xl bg-[rgb(var(--card2))]" />
          </div>
        ) : !sos ? (
          <div className="mt-6 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 text-sm text-[rgb(var(--muted))]">
            Not found.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Request card */}
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                    {sos.subject.code} — {sos.subject.title}
                  </div>
                  <div className="mt-1 text-sm text-[rgb(var(--muted))] whitespace-pre-wrap">
                    {sos.description}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={pillBase()}>
                      <Clock className="h-4 w-4" />
                      Created: {fmtDateTime(sos.createdAt)}
                    </span>
                    <span className={pillBase()}>
                      <MessageCircle className="h-4 w-4" />
                      Mode: {sos.mode}
                    </span>
                    {sos.expiresAt && (
                      <span className={pillBase()}>
                        <Timer className="h-4 w-4" />
                        Expires: {fmtDateTime(sos.expiresAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Small “glow” accent */}
                <div className="hidden sm:block">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-[rgb(var(--border))]" />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">Timeline</div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-[rgb(var(--muted))]">
                    <CalendarClock className="h-4 w-4" />
                    Created
                  </span>
                  <span className="text-[rgb(var(--fg))]">{fmtDateTime(sos.createdAt)}</span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-[rgb(var(--muted))]">
                    <User className="h-4 w-4" />
                    Accepted
                  </span>
                  <span className="text-[rgb(var(--fg))]">{fmtDateTime(sos.acceptedAt)}</span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-[rgb(var(--muted))]">
                    <Timer className="h-4 w-4" />
                    Expires
                  </span>
                  <span className="text-[rgb(var(--fg))]">{fmtDateTime(sos.expiresAt)}</span>
                </div>
              </div>
            </div>

            {/* Tutor card */}
            {sos.acceptedTutor && (
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">Accepted Tutor</div>

                <div className="mt-3 flex items-center gap-3">
                  {sos.acceptedTutor.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sos.acceptedTutor.avatarUrl}
                      alt="Tutor avatar"
                      className="h-10 w-10 rounded-2xl object-cover border border-[rgb(var(--border))]"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-2xl border border-[rgb(var(--border))] bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25 grid place-items-center text-xs font-bold text-[rgb(var(--fg))]">
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

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {channelId && (
                <Link
                  href={`/messaging?channelId=${encodeURIComponent(channelId)}`}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] hover:opacity-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  Open chat
                </Link>
              )}

              {canCancel && (
                <button
                  onClick={cancel}
                  disabled={busy}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-50 hover:ring-1 hover:ring-[rgb(var(--primary))/0.25]"
                >
                  <XCircle className="h-4 w-4" />
                  {busy ? "Cancelling..." : "Cancel request"}
                </button>
              )}
            </div>

            {!channelId && sos.status === "ACCEPTED" && (
              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3 text-xs text-[rgb(var(--muted2))]">
                Tutor accepted — chat link will appear here once the channel is ready.
              </div>
            )}

            {/* Optional debug pills (kept subtle) */}
            {(sessionId || channelId) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {sessionId && <span className={pillBase()}>Session: {sessionId}</span>}
                {channelId && <span className={pillBase()}>Channel: {channelId}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}