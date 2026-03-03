// src/app/sos/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LifeBuoy,
  RefreshCcw,
  Plus,
  Clock,
  Inbox,
  XCircle,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";

type Subject = { id: string; code: string; title: string };

type StudentSOS = {
  id: string;
  description: string;
  mode: string;
  status: string;
  createdAt: string;
  acceptedAt: string | null;
  expiresAt: string | null;
  subject: Subject;
};

type TutorSOS = {
  id: string;
  description: string;
  mode: string;
  status: string;
  createdAt: string;
  subject: Subject;
  student: { id: string; name: string | null; email: string; avatarUrl: string | null };
};

type Tab = "STUDENT" | "TUTOR";

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

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

async function fetchTutorIncoming() {
  return fetch("/api/tutor/sos/incoming", { cache: "no-store" });
}

function pill() {
  return "text-xs border border-[rgb(var(--border))] px-2 py-1 rounded-full bg-[rgb(var(--card))]";
}

export default function SOSPage() {
  const router = useRouter();

  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const isTutor = useMemo(() => roles.includes("TUTOR"), [roles]);
  const isStudent = useMemo(() => roles.includes("STUDENT"), [roles]);

  const [tab, setTab] = useState<Tab>("STUDENT");

  // student list
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [studentItems, setStudentItems] = useState<StudentSOS[]>([]);
  const [studentErr, setStudentErr] = useState<string | null>(null);

  //  ONLY SHOW SEARCHING (hide ACCEPTED / CANCELLED / etc.)
  const visibleStudentItems = useMemo(() => {
    return studentItems.filter((s) => s.status === "SEARCHING");
  }, [studentItems]);

  // tutor list
  const [loadingTutor, setLoadingTutor] = useState(false);
  const [tutorItems, setTutorItems] = useState<TutorSOS[]>([]);
  const [tutorErr, setTutorErr] = useState<string | null>(null);

  // per-item busy (cancel/accept/decline)
  const [busyId, setBusyId] = useState<string | null>(null);

  //  polling control
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const r = await fetch("/api/me/roles", { cache: "no-store" });
        const j = await r.json().catch(() => null);

        if (!r.ok) {
          router.push("/auth/login");
          return;
        }

        if (!mounted) return;

        const list = (j?.roles ?? []) as string[];
        setRoles(list);

        // default tab
        if (list.includes("TUTOR") && !list.includes("STUDENT")) setTab("TUTOR");
        else setTab("STUDENT");
      } finally {
        if (mounted) setLoadingRoles(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function loadStudent(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;

    if (!silent) setStudentErr(null);
    if (!silent) setLoadingStudent(true);

    try {
      const res = await fetch("/api/sos", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load SOS");

      //  If any ACCEPTED request has channelId, send student to chat immediately
      const acceptedWithChannel = (json?.requests || []).find(
        (r: any) => r?.status === "ACCEPTED" && r?.channelId
      );

      if (acceptedWithChannel?.channelId) {
        stopPolling();
        router.push(`/messaging?channelId=${encodeURIComponent(acceptedWithChannel.channelId)}`);
        return;
      }

      setStudentItems(json?.requests || []);
    } catch (e: any) {
      if (!silent) setStudentErr(e?.message || "Failed to load");
    } finally {
      if (!silent) setLoadingStudent(false);
    }
  }

  async function loadTutor() {
    setTutorErr(null);
    setLoadingTutor(true);
    try {
      const res = await fetchTutorIncoming();
      const json = await res.json().catch(() => null);

      if (!res.ok) throw new Error(json?.error || "Failed to load incoming SOS");
      setTutorItems(json.requests || []);
    } catch (e: any) {
      setTutorErr(e?.message || "Failed to load");
    } finally {
      setLoadingTutor(false);
    }
  }

  useEffect(() => {
    if (loadingRoles) return;

    // stop polling when leaving student tab
    if (tab !== "STUDENT") stopPolling();

    if (tab === "STUDENT" && isStudent) loadStudent();
    if (tab === "TUTOR" && isTutor) loadTutor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loadingRoles, isStudent, isTutor]);

  //  Poll while there is at least 1 SEARCHING item (to catch acceptance)
  useEffect(() => {
    if (!isStudent) return;
    if (tab !== "STUDENT") return;

    const hasSearching = studentItems.some((s) => s.status === "SEARCHING");

    if (!hasSearching) {
      stopPolling();
      return;
    }

    if (pollRef.current) return; // already polling

    pollRef.current = setInterval(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await loadStudent({ silent: true });
      } finally {
        inFlightRef.current = false;
      }
    }, 2500);

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentItems, tab, isStudent]);

  const tabs = useMemo(() => {
    const t: { key: Tab; label: string; icon: any }[] = [];
    if (isStudent) t.push({ key: "STUDENT", label: "My Requests", icon: LifeBuoy });
    if (isTutor) t.push({ key: "TUTOR", label: "Incoming", icon: Inbox });
    return t;
  }, [isStudent, isTutor]);

  async function cancelSOS(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/sos/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: "Cancelled by student" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Cancel failed");
      await loadStudent();
    } catch (e: any) {
      setStudentErr(e?.message || "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  async function respondSOS(id: string, decision: "ACCEPT" | "DECLINE") {
    setBusyId(id);
    setTutorErr(null);
    try {
      const res = await fetch(`/api/sos/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");

      // If accepted: go to chat immediately
      if (json.status === "ACCEPTED" && json.channelId) {
        router.push(`/messaging?channelId=${encodeURIComponent(json.channelId)}`);
        return;
      }

      await loadTutor();
    } catch (e: any) {
      setTutorErr(e?.message || "Failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loadingRoles) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-[rgb(var(--muted))]">
        Loading…
      </div>
    );
  }

  return (
    <div className="pt-10 pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header (more “brand”) */}
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs text-[rgb(var(--muted2))]">
              <Sparkles className="h-4 w-4" />
              Instant Tutor Connection
            </div>

            <h1 className="mt-3 text-2xl font-semibold text-[rgb(var(--fg))]">SOS Help</h1>
            <p className="text-sm text-[rgb(var(--muted))] max-w-2xl">
              Students create SOS requests. Tutors accept and instantly start a chat.
            </p>
          </div>

          {isStudent && (
            <Link
              href="/sos/new"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              New SOS
            </Link>
          )}
        </header>

        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
          {/* Tabs + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4">
            <div className="flex items-center gap-2">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition
                      ${
                        active
                          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--card))]"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile new SOS */}
              {tab === "STUDENT" && isStudent && (
                <Link
                  href="/sos/new"
                  className="sm:hidden inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] hover:opacity-95"
                >
                  <Plus className="h-4 w-4" />
                  New SOS
                </Link>
              )}

              <button
                type="button"
                onClick={() => (tab === "STUDENT" ? loadStudent() : loadTutor())}
                className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.35]"
                disabled={tab === "STUDENT" ? loadingStudent : loadingTutor}
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-4">
            {/* STUDENT */}
            {tab === "STUDENT" && isStudent && (
              <>
                {studentErr && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {studentErr}
                  </div>
                )}

                {loadingStudent ? (
                  <div className="space-y-3">
                    <div className="h-20 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]" />
                    <div className="h-20 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]" />
                  </div>
                ) : visibleStudentItems.length === 0 ? (
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-5">
                    <div className="text-sm font-semibold text-[rgb(var(--fg))]">No requests yet</div>
                    <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                      Click <b>New SOS</b> to create one and get connected quickly.
                    </p>
                    <div className="mt-4">
                      <Link
                        href="/sos/new"
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] hover:opacity-95"
                      >
                        <Plus className="h-4 w-4" />
                        Create SOS
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleStudentItems.map((s) => {
                      const canCancel = s.status === "SEARCHING" || s.status === "ACCEPTED";
                      const isBusy = busyId === s.id;

                      return (
                        <div
                          key={s.id}
                          className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-[rgb(var(--fg))] truncate">
                                {s.subject.code} — {s.subject.title}
                              </div>
                              <div className="mt-1 text-sm text-[rgb(var(--muted))] truncate">
                                {s.description}
                              </div>

                              <div className="mt-2 text-[0.75rem] text-[rgb(var(--muted2))] inline-flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Created: {fmt(s.createdAt)}
                                {s.expiresAt
                                  ? ` • Expires: ${new Date(s.expiresAt).toLocaleTimeString()}`
                                  : ""}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs border px-2.5 py-1 rounded-full ${badgeClass(
                                  s.status
                                )}`}
                              >
                                {s.status}
                              </span>
                              <span className={pill()}>{s.mode}</span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                            <Link
                              href={`/sos/${s.id}`}
                              className="h-10 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 inline-flex items-center text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.35]"
                            >
                              View
                            </Link>

                            <button
                              type="button"
                              onClick={() => cancelSOS(s.id)}
                              disabled={!canCancel || isBusy}
                              className="h-10 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 inline-flex items-center gap-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-50 hover:ring-1 hover:ring-[rgb(var(--primary))/0.20]"
                            >
                              <XCircle className="h-4 w-4" />
                              {isBusy ? "Cancelling..." : "Cancel"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* TUTOR */}
            {tab === "TUTOR" && isTutor && (
              <>
                {tutorErr && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {tutorErr}
                  </div>
                )}

                {loadingTutor ? (
                  <div className="space-y-3">
                    <div className="h-20 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]" />
                    <div className="h-20 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]" />
                  </div>
                ) : tutorItems.length === 0 ? (
                  <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-5 text-sm text-[rgb(var(--muted))]">
                    No SOS requests right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tutorItems.map((r) => {
                      const isBusy = busyId === r.id;

                      return (
                        <div
                          key={r.id}
                          className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-[rgb(var(--fg))] truncate">
                                {r.subject.code} — {r.subject.title}
                              </div>
                              <div className="mt-1 text-sm text-[rgb(var(--muted))] truncate">
                                {r.description}
                              </div>
                              <div className="mt-2 text-[0.75rem] text-[rgb(var(--muted2))]">
                                Student: {r.student.name ?? r.student.email} • Mode: {r.mode} •{" "}
                                {fmt(r.createdAt)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs border px-2.5 py-1 rounded-full ${badgeClass(
                                  r.status
                                )}`}
                              >
                                {r.status}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => respondSOS(r.id, "DECLINE")}
                              disabled={isBusy}
                              className="h-10 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 inline-flex items-center gap-2 text-xs font-semibold text-[rgb(var(--fg))] disabled:opacity-50 hover:ring-1 hover:ring-[rgb(var(--primary))/0.20]"
                            >
                              <XCircle className="h-4 w-4" />
                              {isBusy ? "Working..." : "Decline"}
                            </button>

                            <button
                              type="button"
                              onClick={() => respondSOS(r.id, "ACCEPT")}
                              disabled={isBusy}
                              className="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 inline-flex items-center gap-2 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] disabled:opacity-50 hover:opacity-95"
                            >
                              <CheckCircle className="h-4 w-4" />
                              {isBusy ? "Accepting..." : "Accept"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}