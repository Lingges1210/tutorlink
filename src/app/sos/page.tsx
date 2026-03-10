"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LifeBuoy,
  RefreshCcw,
  Plus,
  Clock,
  XCircle,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Radio,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

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

// ─── Badge — uses semantic status colors that work in both themes ──────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; border: string; dot: string; pulse: boolean }> = {
    SEARCHING:   { bg: "rgba(245,158,11,0.12)",  text: "rgb(217,119,6)",   border: "rgba(245,158,11,0.35)", dot: "rgb(245,158,11)",  pulse: true  },
    ACCEPTED:    { bg: "rgba(16,185,129,0.12)",  text: "rgb(5,150,105)",   border: "rgba(16,185,129,0.35)", dot: "rgb(16,185,129)", pulse: false },
    IN_PROGRESS: { bg: "rgba(59,130,246,0.12)",  text: "rgb(37,99,235)",   border: "rgba(59,130,246,0.35)", dot: "rgb(59,130,246)", pulse: true  },
    RESOLVED:    { bg: "rgba(20,184,166,0.12)",  text: "rgb(15,118,110)",  border: "rgba(20,184,166,0.35)", dot: "rgb(20,184,166)", pulse: false },
    CANCELLED:   { bg: "rgba(113,113,122,0.10)", text: "rgb(var(--muted))",border: "rgba(113,113,122,0.25)",dot: "rgb(161,161,170)",pulse: false },
    EXPIRED:     { bg: "rgba(239,68,68,0.10)",   text: "rgb(220,38,38)",   border: "rgba(239,68,68,0.25)", dot: "rgb(239,68,68)",  pulse: false },
  };
  const v = map[status] ?? map.CANCELLED;

  return (
    <span
      style={{ background: v.bg, color: v.text, borderColor: v.border }}
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border px-2.5 py-1 rounded-full"
    >
      <span className="relative flex h-1.5 w-1.5 rounded-full" style={{ background: v.dot }}>
        {v.pulse && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ background: v.dot }}
          />
        )}
      </span>
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5 overflow-hidden relative"
      style={{ border: "1px solid rgb(var(--border))", background: "rgb(var(--card2))" }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-[rgba(128,128,128,0.08)] to-transparent" />
      <div className="flex justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/5 rounded-lg" style={{ background: "rgb(var(--border))" }} />
          <div className="h-3 w-3/5 rounded-lg" style={{ background: "rgb(var(--border))" }} />
          <div className="h-3 w-1/4 rounded-lg" style={{ background: "rgb(var(--border))" }} />
        </div>
        <div className="h-6 w-20 rounded-full" style={{ background: "rgb(var(--border))" }} />
      </div>
    </div>
  );
}

// ─── Burst ring for new tutor requests ────────────────────────────────────
function BurstRing({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="pointer-events-none absolute -inset-px rounded-2xl overflow-hidden">
      <span className="absolute inset-0 rounded-2xl border-2 border-red-400/50 animate-[ping_1.4s_ease-out_infinite]" />
    </span>
  );
}

async function fetchTutorIncoming() {
  return fetch("/api/tutor/sos/incoming", { cache: "no-store" });
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function SOSPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const isTutor = useMemo(() => roles.includes("TUTOR"), [roles]);
  const isStudent = useMemo(() => roles.includes("STUDENT"), [roles]);

  const [tab, setTab] = useState<Tab>("STUDENT");

  const [loadingStudent, setLoadingStudent] = useState(false);
  const [studentItems, setStudentItems] = useState<StudentSOS[]>([]);
  const [studentErr, setStudentErr] = useState<string | null>(null);

  const visibleStudentItems = useMemo(
    () => studentItems.filter((s) => s.status === "SEARCHING"),
    [studentItems]
  );

  const [loadingTutor, setLoadingTutor] = useState(false);
  const [tutorItems, setTutorItems] = useState<TutorSOS[]>([]);
  const [tutorErr, setTutorErr] = useState<string | null>(null);

  const [newSOSIds, setNewSOSIds] = useState<string[]>([]);
  const prevTutorIdsRef = useRef<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);

  // Live elapsed tick
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch("/api/me/roles", { cache: "no-store" });
        const j = await r.json().catch(() => null);
        if (!r.ok) { router.push("/auth/login"); return; }
        if (!mounted) return;
        const list = (j?.roles ?? []) as string[];
        setRoles(list);
        const tabParam = searchParams.get("tab");
        if (tabParam === "TUTOR" && list.includes("TUTOR")) setTab("TUTOR");
        else if (tabParam === "STUDENT" && list.includes("STUDENT")) setTab("STUDENT");
        else if (list.includes("TUTOR") && !list.includes("STUDENT")) setTab("TUTOR");
        else setTab("STUDENT");
      } finally {
        if (mounted) setLoadingRoles(false);
      }
    })();
    return () => { mounted = false; };
  }, [router, searchParams]);

  async function loadStudent(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;
    if (!silent) { setStudentErr(null); setLoadingStudent(true); }
    try {
      const res = await fetch("/api/sos", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load SOS");
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

  async function loadTutor(opts?: { silent?: boolean }) {
    const silent = !!opts?.silent;
    if (!silent) { setTutorErr(null); setLoadingTutor(true); }
    try {
      const res = await fetchTutorIncoming();
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load incoming SOS");
      setTutorItems(json.requests || []);
    } catch (e: any) {
      if (!silent) setTutorErr(e?.message || "Failed to load");
    } finally {
      if (!silent) setLoadingTutor(false);
    }
  }

  useEffect(() => {
    if (!isTutor) { prevTutorIdsRef.current = []; setNewSOSIds([]); return; }
    const prevIds = prevTutorIdsRef.current;
    const currentIds = tutorItems.map((item) => item.id);
    const freshIds = currentIds.filter((id) => !prevIds.includes(id));
    if (freshIds.length > 0) {
      setNewSOSIds((prev) => [...new Set([...prev, ...freshIds])]);
      freshIds.forEach((id) => {
        window.setTimeout(() => setNewSOSIds((prev) => prev.filter((x) => x !== id)), 6000);
      });
    }
    prevTutorIdsRef.current = currentIds;
  }, [tutorItems, isTutor]);

  useEffect(() => {
    if (loadingRoles) return;
    const supabase = supabaseBrowser;
    const channel = supabase
      .channel("sos-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "SOSRequest" }, () => {
        if (tab === "STUDENT" && isStudent) void loadStudent({ silent: true });
        if (tab === "TUTOR" && isTutor) void loadTutor({ silent: true });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadingRoles, tab, isStudent, isTutor]);

  useEffect(() => {
    if (loadingRoles) return;
    if (tab !== "STUDENT") stopPolling();
    if (tab === "STUDENT" && isStudent) loadStudent();
    if (tab === "TUTOR" && isTutor) loadTutor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loadingRoles, isStudent, isTutor]);

  useEffect(() => {
    if (!isStudent || tab !== "STUDENT") return;
    const hasSearching = studentItems.some((s) => s.status === "SEARCHING");
    if (!hasSearching) { stopPolling(); return; }
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try { await loadStudent({ silent: true }); } finally { inFlightRef.current = false; }
    }, 2500);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentItems, tab, isStudent]);

  const tabs = useMemo(() => {
    const t: { key: Tab; label: string; icon: any; count?: number }[] = [];
    if (isStudent) t.push({ key: "STUDENT", label: "My Requests", icon: LifeBuoy, count: visibleStudentItems.length });
    if (isTutor) t.push({ key: "TUTOR", label: "Incoming", icon: Radio, count: tutorItems.length });
    return t;
  }, [isStudent, isTutor, visibleStudentItems.length, tutorItems.length]);

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
      const res = await fetch(`/api/tutor/sos/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
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

  function elapsed(iso: string) {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  }

  if (loadingRoles) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-7 w-7 rounded-full border-2 border-[rgb(var(--primary))/0.2] border-t-[rgb(var(--primary))]"
        />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes shimmer { to { transform: translateX(200%); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        .sos-float { animation: float 4s ease-in-out infinite; }
      `}</style>

      <div className="pt-10 pb-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ─── Header ───────────────────────────────────────────────────── */}
          <motion.header
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-start justify-between gap-4"
          >
            <div className="space-y-3">
              {/* Live chip */}
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                style={{
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--card2))",
                  color: "rgb(var(--muted2))",
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live · Instant Tutor Connection
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight" style={{ color: "rgb(var(--fg))" }}>
                  SOS{" "}
                  <span className="bg-gradient-to-r from-violet-500 to-fuchsia-600 bg-clip-text text-transparent">
                    Help
                  </span>
                </h1>
                <p className="mt-1 text-sm max-w-sm" style={{ color: "rgb(var(--muted))" }}>
                  Get unstuck fast. Students request · Tutors connect · Chat instantly.
                </p>
              </div>
            </div>

            {isStudent && (
              <Link
                href="/sos/new"
                className="group hidden sm:inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all duration-200 hover:scale-[1.03] hover:opacity-95"
                style={{
                  background: "linear-gradient(135deg, rgb(139,92,246), rgb(217,70,239))",
                  boxShadow: "0 4px 20px rgba(139,92,246,0.4)",
                }}
              >
                <Zap className="h-4 w-4 group-hover:animate-bounce" />
                New SOS
              </Link>
            )}
          </motion.header>

          {/* ─── Main card ────────────────────────────────────────────────── */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="rounded-3xl overflow-hidden"
            style={{
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--card))",
              boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
            }}
          >
            {/* Top accent line */}
            <div
              className="h-px w-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)" }}
            />

            {/* ─── Tabs row ──────────────────────────────────────────────── */}
            <div
              className="flex items-center justify-between gap-3 px-5 pt-5 pb-4"
              style={{ borderBottom: "1px solid rgb(var(--border))" }}
            >
              <div className="flex items-center gap-2">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <motion.button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      whileTap={{ scale: 0.95 }}
                      className="relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200"
                      style={
                        active
                          ? {
                              background: "rgba(139,92,246,0.12)",
                              color: "rgb(var(--primary))",
                              border: "1px solid rgba(139,92,246,0.35)",
                            }
                          : {
                              color: "rgb(var(--muted))",
                              border: "1px solid transparent",
                            }
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                      {typeof t.count === "number" && t.count > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black"
                          style={
                            active
                              ? { background: "rgba(139,92,246,0.2)", color: "rgb(var(--primary))" }
                              : { background: "rgb(var(--card2))", color: "rgb(var(--muted))" }
                          }
                        >
                          {t.count}
                        </motion.span>
                      )}
                      {active && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute inset-0 rounded-xl"
                          style={{ boxShadow: "inset 0 0 0 1px rgba(139,92,246,0.35)" }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {tab === "STUDENT" && isStudent && (
                  <Link
                    href="/sos/new"
                    className="sm:hidden inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, rgb(139,92,246), rgb(217,70,239))" }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New
                  </Link>
                )}
                <motion.button
                  type="button"
                  whileTap={{ rotate: 180, scale: 0.9 }}
                  transition={{ duration: 0.35 }}
                  onClick={() => (tab === "STUDENT" ? loadStudent() : loadTutor())}
                  disabled={tab === "STUDENT" ? loadingStudent : loadingTutor}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold disabled:opacity-40 transition-colors"
                  style={{
                    border: "1px solid rgb(var(--border))",
                    background: "rgb(var(--card2))",
                    color: "rgb(var(--fg))",
                  }}
                >
                  <RefreshCcw
                    className={`h-3.5 w-3.5 ${
                      (tab === "STUDENT" ? loadingStudent : loadingTutor) ? "animate-spin" : ""
                    }`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </motion.button>
              </div>
            </div>

            {/* ─── Content ───────────────────────────────────────────────── */}
            <div className="p-5">
              <AnimatePresence mode="wait">

                {/* ══ STUDENT TAB ══ */}
                {tab === "STUDENT" && isStudent && (
                  <motion.div
                    key="student"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.18 }}
                  >
                    {studentErr && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 rounded-2xl p-3 text-sm flex items-center gap-2"
                        style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "rgb(220,38,38)" }}
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {studentErr}
                      </motion.div>
                    )}

                    {loadingStudent ? (
                      <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
                    ) : visibleStudentItems.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl p-10 text-center"
                        style={{
                          border: "1px dashed rgb(var(--border))",
                          background: "rgb(var(--card2))",
                        }}
                      >
                        <div
                          className="sos-float inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-4"
                          style={{
                            background: "rgba(139,92,246,0.1)",
                            border: "1px solid rgba(139,92,246,0.2)",
                          }}
                        >
                          <LifeBuoy className="h-7 w-7" style={{ color: "rgb(var(--primary))" }} />
                        </div>
                        <p className="text-sm font-semibold" style={{ color: "rgb(var(--fg))" }}>
                          No active requests
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
                          Tap below to get instant help from a tutor.
                        </p>
                        <Link
                          href="/sos/new"
                          className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all hover:scale-[1.03] hover:opacity-95"
                          style={{
                            background: "linear-gradient(135deg, rgb(139,92,246), rgb(217,70,239))",
                            boxShadow: "0 4px 20px rgba(139,92,246,0.35)",
                          }}
                        >
                          <Zap className="h-4 w-4" />
                          Create SOS
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        <AnimatePresence>
                          {visibleStudentItems.map((s, i) => {
                            const canCancel = s.status === "SEARCHING" || s.status === "ACCEPTED";
                            const isBusy = busyId === s.id;
                            return (
                              <motion.div
                                key={s.id}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ delay: i * 0.06 }}
                                className="relative rounded-2xl p-5 overflow-hidden transition-all duration-200"
                                style={{
                                  border: "1px solid rgb(var(--border))",
                                  background: "rgb(var(--card2))",
                                }}
                              >
                                {/* Left accent bar */}
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                                  style={{ background: "linear-gradient(to bottom, rgb(139,92,246), rgb(217,70,239))", opacity: 0.7 }}
                                />

                                <div className="pl-3">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                          className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                          style={{
                                            color: "rgb(var(--primary))",
                                            background: "rgba(139,92,246,0.1)",
                                            border: "1px solid rgba(139,92,246,0.25)",
                                          }}
                                        >
                                          {s.subject.code}
                                        </span>
                                        <span className="font-semibold text-sm truncate" style={{ color: "rgb(var(--fg))" }}>
                                          {s.subject.title}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-sm line-clamp-2" style={{ color: "rgb(var(--muted))" }}>
                                        {s.description}
                                      </p>
                                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: "rgb(var(--muted2))" }}>
                                        <span className="inline-flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {elapsed(s.createdAt)}
                                        </span>
                                        {s.expiresAt && (
                                          <span style={{ color: "rgb(217,119,6)" }}>
                                            Expires {new Date(s.expiresAt).toLocaleTimeString()}
                                          </span>
                                        )}
                                        <span
                                          className="rounded-full px-2 py-0.5"
                                          style={{
                                            border: "1px solid rgb(var(--border))",
                                            background: "rgb(var(--card))",
                                            color: "rgb(var(--muted))",
                                          }}
                                        >
                                          {s.mode}
                                        </span>
                                      </div>
                                    </div>
                                    <StatusBadge status={s.status} />
                                  </div>

                                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                                    <Link
                                      href={`/sos/${s.id}`}
                                      className="h-9 rounded-xl px-4 inline-flex items-center text-xs font-semibold transition-colors"
                                      style={{
                                        border: "1px solid rgb(var(--border))",
                                        background: "rgb(var(--card))",
                                        color: "rgb(var(--fg))",
                                      }}
                                    >
                                      View
                                    </Link>
                                    <motion.button
                                      type="button"
                                      whileTap={{ scale: 0.96 }}
                                      onClick={() => cancelSOS(s.id)}
                                      disabled={!canCancel || isBusy}
                                      className="h-9 rounded-xl px-4 inline-flex items-center gap-2 text-xs font-semibold disabled:opacity-40 transition-all"
                                      style={{
                                        background: "rgba(239,68,68,0.08)",
                                        border: "1px solid rgba(239,68,68,0.25)",
                                        color: "rgb(220,38,38)",
                                      }}
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      {isBusy ? "Cancelling…" : "Cancel"}
                                    </motion.button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ══ TUTOR TAB ══ */}
                {tab === "TUTOR" && isTutor && (
                  <motion.div
                    key="tutor"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.18 }}
                  >
                    {tutorErr && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 rounded-2xl p-3 text-sm flex items-center gap-2"
                        style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "rgb(220,38,38)" }}
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {tutorErr}
                      </motion.div>
                    )}

                    {loadingTutor ? (
                      <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
                    ) : tutorItems.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl p-10 text-center"
                        style={{ border: "1px dashed rgb(var(--border))", background: "rgb(var(--card2))" }}
                      >
                        <div
                          className="sos-float inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-4"
                          style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}
                        >
                          <Radio className="h-7 w-7 text-indigo-400" />
                        </div>
                        <p className="text-sm font-semibold" style={{ color: "rgb(var(--fg))" }}>
                          No incoming requests
                        </p>
                        <p className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
                          You'll see new SOS requests here in real-time.
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        <AnimatePresence initial={false}>
                          {tutorItems.map((r, i) => {
                            const isBusy = busyId === r.id;
                            const isNew = newSOSIds.includes(r.id);
                            const initials = (r.student.name ?? r.student.email).slice(0, 2).toUpperCase();

                            return (
                              <motion.div
                                key={r.id}
                                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -12, scale: 0.97 }}
                                transition={{ duration: 0.25, delay: i * 0.05 }}
                                className="relative rounded-2xl p-5 overflow-hidden transition-all duration-300"
                                style={
                                  isNew
                                    ? {
                                        border: "1px solid rgba(239,68,68,0.4)",
                                        background: "rgba(239,68,68,0.04)",
                                        boxShadow: "0 0 30px rgba(239,68,68,0.08)",
                                      }
                                    : {
                                        border: "1px solid rgb(var(--border))",
                                        background: "rgb(var(--card2))",
                                      }
                                }
                              >
                                <BurstRing active={isNew} />

                                {/* Left accent bar */}
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl opacity-70"
                                  style={{
                                    background: isNew
                                      ? "rgb(239,68,68)"
                                      : "linear-gradient(to bottom, rgb(99,102,241), rgb(139,92,246))",
                                  }}
                                />

                                <div className="pl-3">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span
                                          className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                                          style={
                                            isNew
                                              ? { color: "rgb(220,38,38)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }
                                              : { color: "rgb(99,102,241)", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }
                                          }
                                        >
                                          {r.subject.code}
                                        </span>
                                        <span className="font-semibold text-sm truncate" style={{ color: "rgb(var(--fg))" }}>
                                          {r.subject.title}
                                        </span>
                                        {isNew && (
                                          <motion.span
                                            animate={{ opacity: [1, 0.5, 1] }}
                                            transition={{ repeat: Infinity, duration: 0.9 }}
                                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest"
                                            style={{
                                              background: "rgba(239,68,68,0.12)",
                                              border: "1px solid rgba(239,68,68,0.3)",
                                              color: "rgb(220,38,38)",
                                            }}
                                          >
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                                            New
                                          </motion.span>
                                        )}
                                      </div>
                                      <p className="mt-2 text-sm line-clamp-2" style={{ color: "rgb(var(--muted))" }}>
                                        {r.description}
                                      </p>
                                    </div>
                                    <StatusBadge status={r.status} />
                                  </div>

                                  {/* Student info */}
                                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                                    <div
                                      className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                                      style={{ background: "linear-gradient(135deg, rgb(139,92,246), rgb(217,70,239))" }}
                                    >
                                      {initials}
                                    </div>
                                    <span className="text-[11px]" style={{ color: "rgb(var(--muted))" }}>
                                      {r.student.name ?? r.student.email}
                                    </span>
                                    <span className="text-[11px]" style={{ color: "rgb(var(--muted2))" }}>·</span>
                                    <span
                                      className="rounded-full px-2 py-0.5 text-[10px]"
                                      style={{
                                        border: "1px solid rgb(var(--border))",
                                        background: "rgb(var(--card))",
                                        color: "rgb(var(--muted))",
                                      }}
                                    >
                                      {r.mode}
                                    </span>
                                    <span className="text-[11px]" style={{ color: "rgb(var(--muted2))" }}>·</span>
                                    <span className="text-[11px]" style={{ color: "rgb(var(--muted2))" }}>
                                      {elapsed(r.createdAt)}
                                    </span>
                                  </div>

                                  {/* New SOS sweep bar */}
                                  {isNew && (
                                    <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: "rgba(239,68,68,0.1)" }}>
                                      <motion.div
                                        className="h-full w-16 rounded-full"
                                        style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.7), transparent)" }}
                                        animate={{ x: ["-100%", "500%"] }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                      />
                                    </div>
                                  )}

                                  {/* Actions */}
                                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                                    <motion.button
                                      type="button"
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => respondSOS(r.id, "DECLINE")}
                                      disabled={isBusy}
                                      className="h-9 rounded-xl px-4 inline-flex items-center gap-2 text-xs font-semibold disabled:opacity-40 transition-all"
                                      style={{
                                        border: "1px solid rgb(var(--border))",
                                        background: "rgb(var(--card))",
                                        color: "rgb(var(--fg))",
                                      }}
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      {isBusy ? "Working…" : "Decline"}
                                    </motion.button>
                                    <motion.button
                                      type="button"
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => respondSOS(r.id, "ACCEPT")}
                                      disabled={isBusy}
                                      className="h-9 rounded-xl px-4 inline-flex items-center gap-2 text-xs font-bold text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
                                      style={{
                                        background: "linear-gradient(135deg, rgb(16,185,129), rgb(13,148,136))",
                                        boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
                                      }}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      {isBusy ? "Accepting…" : "Accept"}
                                    </motion.button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom accent */}
            <div
              className="h-px w-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.35), transparent)" }}
            />
          </motion.section>
        </div>
      </div>
    </>
  );
}