"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StarBackground from "@/components/StarBackground";

type SubjectItem = { id: string; code: string; title: string };

type SlotItem = {
  id: string;
  start: string;
  end: string;
  tutorCount?: number;
};

/* ─── tiny helpers ─────────────────────────────────────── */
function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}
function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString([], {
      weekday: "short", day: "2-digit", month: "short",
      year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}
function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayKey() { return dayKey(new Date().toISOString()); }
function tomorrowKey() { const d=new Date(); d.setDate(d.getDate()+1); return dayKey(d.toISOString()); }
function smartDay(day: string) {
  if (day===todayKey()) return "Today";
  if (day===tomorrowKey()) return "Tomorrow";
  try {
    const [y,m,d]=day.split("-").map(Number);
    return new Date(y,m-1,d).toLocaleDateString([],{weekday:"short",day:"2-digit",month:"short"});
  } catch { return day; }
}
function fullDay(day: string) {
  try {
    const [y,m,d]=day.split("-").map(Number);
    return new Date(y,m-1,d).toLocaleDateString([],{weekday:"long",day:"2-digit",month:"long",year:"numeric"});
  } catch { return day; }
}
function next7Days() {
  return Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()+i);
    return dayKey(d.toISOString());
  });
}

type ToastKind = "success"|"error"|"info";
type Toast = { text: string; kind: ToastKind; actionHref?: string; actionLabel?: string } | null;

/* ─── icons ────────────────────────────────────────────── */
const IconSearch = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const IconArrow = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const IconRefresh = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
  </svg>
);
const IconX = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
const IconClock = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const IconUser = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconChevron = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

/* ─── Spinner ───────────────────────────────────────────── */
function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Skeleton ──────────────────────────────────────────── */
function SkeletonSlots() {
  return (
    <div className="space-y-3 animate-pulse mt-5">
      <div className="h-[88px] rounded-2xl bg-[rgb(var(--border)/0.5)]" />
      <div className="flex gap-2 pt-1">
        {[90,72,72,72,72,72,72].map((w,i) => (
          <div key={i} style={{width:w}} className="h-14 shrink-0 rounded-xl bg-[rgb(var(--border)/0.4)]" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        {Array.from({length:6}).map((_,i) => (
          <div key={i} className="h-16 rounded-xl bg-[rgb(var(--border)/0.35)]" />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function FindTutorClient({
  authed, verified,
}: { authed: boolean; verified: boolean }) {
  const canUse = authed && verified;

  /* search state */
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<SubjectItem[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [showDrop, setShowDrop] = useState(false);

  /* subject + slots */
  const [selected, setSelected] = useState<SubjectItem | null>(null);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  /* booking */
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookedSlot, setBookedSlot] = useState<SlotItem | null>(null);

  /* ui */
  const [durationMin, setDurationMin] = useState(60);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayLimit, setDayLimit] = useState(9);
  const [toast, setToast] = useState<Toast>(null);
  const [inputFocused, setInputFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── click-outside for dropdown ── */
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  /* ── search suggest ── */
  useEffect(() => {
    if (!canUse) return;
    const term = q.trim();
    if (selected && q === `${selected.code} — ${selected.title}`) return;
    if (!term) { setSuggestions([]); setShowDrop(false); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggest(true);
      setShowDrop(true);
      try {
        const res = await fetch(`/api/subjects/suggest?q=${encodeURIComponent(term)}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        setSuggestions(Array.isArray(data.items) ? data.items : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggest(false);
      }
    }, 240);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, canUse, selected]);

  /* ── load slots ── */
  const loadSlots = useCallback(async (subjectId: string, dur: number) => {
    setSlots([]);
    setSlotsError(null);
    setSlotsLoading(true);
    setBookedSlot(null);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/slots?durationMin=${dur}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const raw: unknown[] = Array.isArray(data.items) ? data.items : [];
      const norm: SlotItem[] = raw
        .filter(Boolean)
        .map((x) => {
          const o = x as Record<string, unknown>;
          return {
            id: String(o.id ?? o.start ?? ""),
            start: String(o.start ?? ""),
            end: String(o.end ?? ""),
            tutorCount: typeof o.tutorCount === "number" ? o.tutorCount : undefined,
          };
        })
        .filter(s => s.id && s.start && s.end);

      setSlots(norm);
      if (norm.length > 0) {
        const first = dayKey(norm[0].start);
        setSelectedDay(prev => {
          if (!prev) return first;
          return norm.some(s => dayKey(s.start) === prev) ? prev : first;
        });
        setDayLimit(9);
      } else {
        setSlotsError("No available slots found. Try a different duration or come back later.");
      }
    } catch {
      setSlotsError("Couldn't load slots. Check your connection and try again.");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  /* ── pick subject ── */
  const pickSubject = useCallback(async (s: SubjectItem) => {
    setSelected(s);
    setQ(`${s.code} — ${s.title}`);
    setSuggestions([]);
    setShowDrop(false);
    setSlots([]);
    setSlotsError(null);
    setSelectedDay(null);
    setDayLimit(9);
    setBookedSlot(null);
    if (canUse) await loadSlots(s.id, durationMin);
  }, [canUse, durationMin, loadSlots]);

  /* ── book slot ── */
  const bookSlot = useCallback(async (slot: SlotItem) => {
    if (!selected || !canUse) return;
    setBookingId(slot.id);
    try {
      const res = await fetch("/api/sessions/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: selected.id, scheduledAt: slot.start, durationMin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message ?? "Booking failed. Please try again.";
        setToast({ text: msg, kind: "error" });
        return;
      }
      setBookedSlot(slot);
      setToast({ text: "Session booked! A tutor has been assigned.", kind: "success", actionHref: "/dashboard/student/sessions", actionLabel: "View sessions →" });
      await loadSlots(selected.id, durationMin);
    } catch {
      setToast({ text: "Something went wrong. Please try again.", kind: "error" });
    } finally {
      setBookingId(null);
    }
  }, [selected, canUse, durationMin, loadSlots]);

  /* ── derived ── */
  const sorted = useMemo(() => [...slots].sort((a,b) => +new Date(a.start) - +new Date(b.start)), [slots]);
  const earliest = sorted[0] ?? null;
  const nextFew = sorted.slice(1, 4);

  const dayCounts = useMemo(() => {
    const m = new Map<string, number>();
    slots.forEach(s => { const k = dayKey(s.start); m.set(k, (m.get(k)??0)+1); });
    return m;
  }, [slots]);

  const dayKeys = useMemo(() => next7Days(), []);

  const daySlots = useMemo(() => {
    if (!selectedDay) return [];
    return sorted.filter(s => dayKey(s.start) === selectedDay);
  }, [sorted, selectedDay]);

  const durations = [30, 45, 60, 90, 120];
  const popularSubjects = [
    { code: "WIA2003", name: "Data Structures" },
    { code: "WIA2001", name: "OOP" },
    { code: "WIA1002", name: "Operating Systems" },
    { code: "WIF3005", name: "Networks" },
    { code: "MAT100", name: "Calculus" },
  ];

  /* ═══════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Star background ── */}
      <StarBackground />

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="fixed z-50 bottom-6 right-5 w-[calc(100vw-2.5rem)] sm:w-[360px] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.97)] backdrop-blur-xl shadow-[0_24px_48px_rgb(0,0,0,0.16)] p-4"
          >
            <div className="flex gap-3 items-start">
              <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${toast.kind==="success"?"bg-emerald-500 shadow-[0_0_8px_rgb(16,185,129,0.6)]":toast.kind==="error"?"bg-rose-500":"bg-blue-500"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[rgb(var(--fg))]">{toast.text}</p>
                <div className="mt-2.5 flex gap-2">
                  {toast.actionHref && (
                    <Link href={toast.actionHref} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[rgb(var(--primary))] text-white hover:opacity-90 transition-opacity">
                      {toast.actionLabel}
                    </Link>
                  )}
                  <button onClick={() => setToast(null)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════
          PAGE
      ═════════════════════════════════════════════════════*/}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-0 pt-6 sm:pt-8 pb-24">

        {/* ── Top bar ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[rgb(var(--primary))] mb-1">
              Tutoring Platform
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[rgb(var(--fg))] leading-none">
              Find a Tutor
            </h1>
            <p className="mt-2 text-sm text-[rgb(var(--muted))] max-w-md leading-relaxed">
              Search a subject, pick a time, get matched instantly.
            </p>
          </div>

          {/* Auth badge */}
          <div>
            {!authed ? (
              <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white hover:opacity-90 transition-opacity shadow-[0_4px_16px_rgb(var(--primary)/0.3)]">
                Login to book <IconArrow />
              </Link>
            ) : !verified ? (
              <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending verification
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Verified
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Verification locked banner ── */}
        <AnimatePresence>
          {authed && !verified && (
            <motion.div
              initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 px-5 py-4">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">⚠ Account pending verification</p>
                <p className="mt-0.5 text-sm text-[rgb(var(--muted))]">Search and booking will unlock once your account is verified.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MAIN TWO-COLUMN GRID ── */}
        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">

          {/* ════════════════════════════════
              LEFT COLUMN
          ════════════════════════════════ */}
          <motion.div
            initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.4, delay:0.08 }}
            className="space-y-4 lg:sticky lg:top-6 lg:self-start"
          >

            {/* ── Search card ── */}
            <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.8)] p-5 shadow-[0_8px_32px_rgb(var(--shadow)/0.08)]">

              {/* Search input */}
              <div ref={dropRef} className="relative">
                <div className={`relative flex items-center rounded-2xl border transition-all duration-200 bg-[rgb(var(--card2))] overflow-visible
                  ${inputFocused && canUse
                    ? "border-[rgb(var(--primary)/0.6)] shadow-[0_0_0_3px_rgb(var(--primary)/0.12)]"
                    : "border-[rgb(var(--border))]"
                  }`}
                >
                  <span className={`pl-4 shrink-0 transition-colors duration-200 ${inputFocused && canUse ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--muted2))]"}`}>
                    <IconSearch />
                  </span>
                  <input
                    ref={inputRef}
                    value={q}
                    onChange={e => {
                      const val = e.target.value;
                      setQ(val);
                      if (selected && val !== `${selected.code} — ${selected.title}`) {
                        setSelected(null);
                        setSlots([]);
                        setSlotsError(null);
                        setSelectedDay(null);
                        setBookedSlot(null);
                      }
                    }}
                    onFocus={() => {
                      setInputFocused(true);
                      if (q.trim() && suggestions.length > 0) setShowDrop(true);
                    }}
                    onBlur={() => {
                      setInputFocused(false);
                      setTimeout(() => {
                        if (!dropRef.current?.contains(document.activeElement)) setShowDrop(false);
                      }, 150);
                    }}
                    disabled={!canUse}
                    placeholder={canUse ? "Search subject code or name…" : authed ? "Locked — awaiting verification" : "Login to search"}
                    className="flex-1 bg-transparent px-3 py-3.5 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] outline-none disabled:cursor-not-allowed"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="pr-3 shrink-0">
                    {loadingSuggest ? (
                      <span className="text-[rgb(var(--primary))]"><Spinner size={15} /></span>
                    ) : q && canUse ? (
                      <button
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setQ("");
                          setSelected(null);
                          setSuggestions([]);
                          setShowDrop(false);
                          setSlots([]);
                          setSlotsError(null);
                          setSelectedDay(null);
                          setBookedSlot(null);
                          inputRef.current?.focus();
                        }}
                        className="flex items-center justify-center h-6 w-6 rounded-full bg-[rgb(var(--border)/0.8)] text-[rgb(var(--muted))] hover:bg-[rgb(var(--border))] hover:text-[rgb(var(--fg))] transition-colors"
                      >
                        <IconX />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Dropdown */}
                <AnimatePresence>
                  {canUse && showDrop && (loadingSuggest || suggestions.length > 0) && (
                    <motion.div
                      key="drop"
                      initial={{ opacity:0, y:-6, scaleY:0.97 }}
                      animate={{ opacity:1, y:0, scaleY:1 }}
                      exit={{ opacity:0, y:-6, scaleY:0.97 }}
                      style={{ transformOrigin: "top" }}
                      transition={{ duration: 0.14 }}
                      className="absolute z-30 top-full mt-2 w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-[0_16px_48px_rgb(0,0,0,0.16)] overflow-hidden"
                    >
                      {loadingSuggest && (
                        <div className="flex items-center gap-2.5 px-4 py-3.5 text-xs text-[rgb(var(--muted2))]">
                          <Spinner size={13} /> Searching…
                        </div>
                      )}
                      {!loadingSuggest && suggestions.length === 0 && (
                        <div className="px-4 py-3.5 text-xs text-[rgb(var(--muted2))]">No subjects matched — try a different keyword.</div>
                      )}
                      <div className="max-h-60 overflow-y-auto">
                        {!loadingSuggest && suggestions.map((s, i) => (
                          <motion.button
                            key={s.id}
                            initial={{ opacity:0, x:-8 }}
                            animate={{ opacity:1, x:0 }}
                            transition={{ delay: i*0.04 }}
                            type="button"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => pickSubject(s)}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[rgb(var(--primary)/0.07)] border-b border-[rgb(var(--border)/0.5)] last:border-0 transition-colors group"
                          >
                            <div className="shrink-0 h-8 w-8 rounded-lg bg-[rgb(var(--primary)/0.12)] flex items-center justify-center text-[rgb(var(--primary))]">
                              <span className="text-[0.6rem] font-black leading-none">{s.code.slice(0,3)}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-[rgb(var(--fg))] truncate">
                                <span className="text-[rgb(var(--primary))]">{s.code}</span>
                                <span className="text-[rgb(var(--muted))] font-normal"> · {s.title}</span>
                              </div>
                              <div className="text-[0.67rem] text-[rgb(var(--muted2))] mt-0.5">Tap to see available slots</div>
                            </div>
                            <span className="text-[rgb(var(--muted2))] group-hover:text-[rgb(var(--primary))] transition-colors">
                              <IconChevron />
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Duration selector */}
              {canUse && (
                <div className="mt-4">
                  <p className="text-[0.67rem] font-bold uppercase tracking-widest text-[rgb(var(--muted2))] mb-2">Session length</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {durations.map(d => (
                      <button
                        key={d}
                        type="button"
                        disabled={slotsLoading}
                        onClick={() => {
                          setDurationMin(d);
                          if (selected?.id) loadSlots(selected.id, d);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border
                          ${durationMin===d
                            ? "bg-[rgb(var(--primary))] text-white border-transparent shadow-[0_2px_12px_rgb(var(--primary)/0.35)]"
                            : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:border-[rgb(var(--primary)/0.4)]"
                          } ${slotsLoading?"opacity-50 cursor-not-allowed":""}`}
                      >
                        {d}<span className="opacity-70 font-normal">m</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[0.67rem] text-[rgb(var(--muted2))] mt-2">Changing duration reloads available slots.</p>
                </div>
              )}

              {/* Popular subjects */}
              {!selected && canUse && (
                <div className="mt-5 pt-4 border-t border-[rgb(var(--border)/0.6)]">
                  <p className="text-[0.67rem] font-bold uppercase tracking-widest text-[rgb(var(--muted2))] mb-2.5">Popular</p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularSubjects.map((p, i) => (
                      <motion.button
                        key={p.code}
                        initial={{ opacity:0, scale:0.92 }}
                        animate={{ opacity:1, scale:1 }}
                        transition={{ delay: 0.3 + i*0.06 }}
                        type="button"
                        onClick={() => { setQ(`${p.code} ${p.name}`); inputRef.current?.focus(); }}
                        className="flex items-baseline gap-1.5 px-3 py-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-xs transition-all duration-200 hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary)/0.06)] group"
                      >
                        <span className="font-bold text-[rgb(var(--primary))]">{p.code}</span>
                        <span className="text-[rgb(var(--muted))] text-[0.7rem]">{p.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Selected subject card ── */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  key="subject-card"
                  initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
                  className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.8)] p-5 shadow-[0_8px_32px_rgb(var(--shadow)/0.08)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[rgb(var(--primary)/0.14)] flex items-center justify-center shrink-0">
                      <span className="text-[0.58rem] font-black text-[rgb(var(--primary))] leading-none">{selected.code.slice(0,3)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.67rem] font-bold uppercase tracking-widest text-[rgb(var(--muted2))]">Selected subject</p>
                      <p className="mt-0.5 text-sm font-bold text-[rgb(var(--fg))] truncate">
                        <span className="text-[rgb(var(--primary))]">{selected.code}</span>
                        <span className="font-normal text-[rgb(var(--muted))]"> — </span>
                        {selected.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[0.67rem] font-semibold px-2.5 py-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]">
                          <IconClock /> {durationMin} min
                        </span>
                        {slots.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[0.67rem] font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {slots.length} slots available
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(null);
                        setQ("");
                        setSlots([]);
                        setSlotsError(null);
                        setSelectedDay(null);
                        setBookedSlot(null);
                        setTimeout(() => inputRef.current?.focus(), 0);
                      }}
                      className="shrink-0 h-7 w-7 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] flex items-center justify-center text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
                      title="Change subject"
                    >
                      <IconX />
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[rgb(var(--border)/0.6)] flex items-center justify-between">
                    <Link href="/dashboard/student/sessions" className="text-xs font-semibold text-[rgb(var(--primary))] hover:underline flex items-center gap-1">
                      My sessions <IconChevron />
                    </Link>
                    <button
                      type="button"
                      disabled={slotsLoading}
                      onClick={() => loadSlots(selected.id, durationMin)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] disabled:opacity-50 transition-colors"
                    >
                      {slotsLoading ? <><Spinner size={12}/> Loading…</> : <><IconRefresh /> Refresh</>}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── How it works ── */}
            {!selected && (
              <motion.div
                initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.25 }}
                className="rounded-3xl border border-[rgb(var(--border)/0.6)] bg-[rgb(var(--card)/0.5)] p-5"
              >
                <p className="text-[0.67rem] font-bold uppercase tracking-widest text-[rgb(var(--muted2))] mb-3">How it works</p>
                <div className="space-y-3">
                  {[
                    { n:"01", icon:"🔍", t:"Search", d:"Type a subject code or topic name" },
                    { n:"02", icon:"📅", t:"Pick a time", d:"Choose the earliest or browse by day" },
                    { n:"03", icon:"⚡", t:"Booked!", d:"A tutor is assigned to you instantly" },
                  ].map(item => (
                    <div key={item.n} className="flex items-start gap-3">
                      <span className="text-[0.6rem] font-black text-[rgb(var(--muted2)/0.5)] mt-1 w-5 shrink-0">{item.n}</span>
                      <div>
                        <p className="text-xs font-bold text-[rgb(var(--fg))]">{item.icon} {item.t}</p>
                        <p className="text-[0.7rem] text-[rgb(var(--muted))]">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* ════════════════════════════════
              RIGHT COLUMN — Slots
          ════════════════════════════════ */}
          <motion.div
            initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.4, delay:0.14 }}
          >
            {/* Empty state */}
            {!selected && (
              <div className="h-full min-h-[320px] rounded-3xl border border-dashed border-[rgb(var(--border))] flex flex-col items-center justify-center text-center p-8 gap-4">
                <div className="h-16 w-16 rounded-2xl bg-[rgb(var(--card2))] flex items-center justify-center text-3xl shadow-sm">
                  🎓
                </div>
                <div>
                  <p className="text-base font-bold text-[rgb(var(--fg))]">Search a subject to get started</p>
                  <p className="mt-1 text-sm text-[rgb(var(--muted))] max-w-xs">
                    {canUse
                      ? "Type a subject code or name in the search box, then book any available slot."
                      : authed
                        ? "Your account is pending verification. Slots will appear here once verified."
                        : "Login and verify your account to see available tutoring slots."
                    }
                  </p>
                </div>
                {!authed && (
                  <Link href="/auth/login" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white hover:opacity-90 transition-opacity shadow-[0_4px_16px_rgb(var(--primary)/0.25)]">
                    Login to get started <IconArrow />
                  </Link>
                )}
              </div>
            )}

            {/* Loading skeleton */}
            {selected && slotsLoading && <SkeletonSlots />}

            {/* Error state */}
            {selected && !slotsLoading && slotsError && slots.length === 0 && (
              <motion.div
                initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.8)] p-6 text-center space-y-4"
              >
                <div className="text-4xl">😞</div>
                <div>
                  <p className="text-sm font-bold text-[rgb(var(--fg))]">No slots available</p>
                  <p className="mt-1 text-sm text-[rgb(var(--muted))]">{slotsError}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-[rgb(var(--muted2))]">
                  {["Try 45m / 90m duration", "Refresh in a few minutes", "Try another subject"].map(t => (
                    <span key={t} className="px-3 py-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))]">{t}</span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => loadSlots(selected.id, durationMin)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <IconRefresh /> Try again
                </button>
              </motion.div>
            )}

            {/* ── SLOTS ── */}
            {selected && !slotsLoading && slots.length > 0 && (
              <div className="space-y-4">

                {/* Booked confirmation banner */}
                <AnimatePresence>
                  {bookedSlot && (
                    <motion.div
                      key="booked"
                      initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
                      className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 flex items-center gap-3"
                    >
                      <span className="text-xl">✅</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Session booked!</p>
                        <p className="text-xs text-[rgb(var(--muted))]">
                          {smartDay(dayKey(bookedSlot.start))} at {fmtTime(bookedSlot.start)} · {durationMin} min · tutor assigned
                        </p>
                      </div>
                      <Link href="/dashboard/student/sessions" className="shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1">
                        View <IconChevron />
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* HERO earliest slot */}
                {earliest && (
                  <motion.div
                    initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
                    className="relative overflow-hidden rounded-3xl border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.06)] p-5"
                  >
                    <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[rgb(var(--primary)/0.15)] blur-2xl" />

                    <div className="relative flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          <p className="text-[0.67rem] font-black uppercase tracking-widest text-[rgb(var(--primary))]">Earliest Available</p>
                        </div>
                        <p className="text-2xl font-black text-[rgb(var(--fg))] leading-none">
                          {fmtTime(earliest.start)}
                          <span className="text-base font-semibold text-[rgb(var(--muted))] ml-2">→ {fmtTime(earliest.end)}</span>
                        </p>
                        <p className="mt-1 text-sm text-[rgb(var(--muted))]">{fullDay(dayKey(earliest.start))}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[0.67rem] font-semibold px-2.5 py-1.5 rounded-full bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--muted))]">
                            <IconClock /> {durationMin} min
                          </span>
                          {typeof earliest.tutorCount === "number" && (
                            <span className="inline-flex items-center gap-1.5 text-[0.67rem] font-semibold px-2.5 py-1.5 rounded-full bg-[rgb(var(--card))] border border-[rgb(var(--border))] text-[rgb(var(--muted))]">
                              <IconUser /> {earliest.tutorCount} tutor{earliest.tutorCount!==1?"s":""}
                            </span>
                          )}
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale:1.03, y:-1 }} whileTap={{ scale:0.97 }}
                        type="button"
                        disabled={!!bookingId}
                        onClick={() => bookSlot(earliest)}
                        className="shrink-0 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[rgb(var(--primary))] text-white text-sm font-bold shadow-[0_6px_24px_rgb(var(--primary)/0.4)] hover:shadow-[0_10px_32px_rgb(var(--primary)/0.5)] disabled:opacity-60 transition-all duration-200"
                        title={fmtDateTime(earliest.start)}
                      >
                        {bookingId===earliest.id ? <><Spinner size={15}/> Booking…</> : <>Book now <IconArrow /></>}
                      </motion.button>
                    </div>

                    {nextFew.length > 0 && (
                      <div className="relative mt-4 pt-4 border-t border-[rgb(var(--primary)/0.15)]">
                        <p className="text-[0.67rem] font-bold uppercase tracking-widest text-[rgb(var(--muted2))] mb-2.5">Also soon</p>
                        <div className="flex flex-wrap gap-2">
                          {nextFew.map(s => (
                            <motion.button
                              key={s.id}
                              whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}
                              type="button"
                              disabled={!!bookingId}
                              onClick={() => bookSlot(s)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] text-xs font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary)/0.07)] disabled:opacity-50 transition-all duration-150"
                              title={fmtDateTime(s.start)}
                            >
                              {bookingId===s.id ? <Spinner size={12}/> : null}
                              <span className="font-normal text-[rgb(var(--muted))]">{smartDay(dayKey(s.start))}</span>
                              <span className="font-bold">{fmtTime(s.start)}</span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 7-day strip */}
                <motion.div
                  initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
                  className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.8)] p-5 shadow-[0_8px_32px_rgb(var(--shadow)/0.06)]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[0.67rem] font-black uppercase tracking-widest text-[rgb(var(--muted2))]">Browse by day</p>
                    {selectedDay && (
                      <button type="button" onClick={() => { setSelectedDay(null); setDayLimit(9); }} className="text-[0.7rem] font-semibold text-[rgb(var(--primary))] hover:underline">
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {dayKeys.map((d, i) => {
                      const count = dayCounts.get(d) ?? 0;
                      const active = selectedDay === d;
                      const empty = count === 0;
                      return (
                        <motion.button
                          key={d}
                          initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.12+i*0.05 }}
                          type="button"
                          disabled={empty}
                          onClick={() => { setSelectedDay(d); setDayLimit(9); }}
                          className={`shrink-0 flex flex-col items-center min-w-[72px] px-3 py-2.5 rounded-2xl border transition-all duration-200
                            ${active
                              ? "bg-[rgb(var(--primary))] border-transparent text-white shadow-[0_4px_16px_rgb(var(--primary)/0.35)]"
                              : empty
                                ? "border-[rgb(var(--border)/0.5)] bg-transparent opacity-35 cursor-not-allowed"
                                : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary)/0.06)]"
                            }`}
                        >
                          <span className="text-[0.67rem] font-bold leading-none">{smartDay(d)}</span>
                          <span className={`mt-1 text-[0.62rem] font-semibold leading-none ${active?"opacity-80":"text-[rgb(var(--muted2))]"}`}>
                            {count === 0 ? "—" : `${count}`}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Day slots grid */}
                  <AnimatePresence mode="wait">
                    {selectedDay && (
                      <motion.div
                        key={selectedDay}
                        initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                        transition={{ duration:0.2 }}
                        className="mt-4 pt-4 border-t border-[rgb(var(--border)/0.6)]"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-sm font-bold text-[rgb(var(--fg))]">{smartDay(selectedDay)}</span>
                            <span className="ml-2 text-xs text-[rgb(var(--muted2))]">{fullDay(selectedDay)}</span>
                          </div>
                          <span className="text-[0.67rem] font-semibold px-2.5 py-1 rounded-full bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
                            {daySlots.length} slot{daySlots.length!==1?"s":""}
                          </span>
                        </div>

                        {daySlots.length === 0 ? (
                          <p className="text-sm text-[rgb(var(--muted2))] text-center py-4">No slots on this day.</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {daySlots.slice(0, dayLimit).map((slot, i) => {
                                const busy = bookingId === slot.id;
                                const disabled = !!bookingId && !busy;
                                return (
                                  <motion.button
                                    key={slot.id}
                                    initial={{ opacity:0, scale:0.94 }} animate={{ opacity:1, scale:1 }} transition={{ delay:i*0.04 }}
                                    whileHover={{ scale:1.03 }} whileTap={{ scale:0.96 }}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => bookSlot(slot)}
                                    className={`group w-full text-left rounded-2xl border px-4 py-3.5 transition-all duration-200
                                      ${busy
                                        ? "border-[rgb(var(--primary)/0.5)] bg-[rgb(var(--primary)/0.08)]"
                                        : "border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] hover:border-[rgb(var(--primary)/0.5)] hover:bg-[rgb(var(--primary)/0.06)] hover:shadow-[0_4px_16px_rgb(var(--primary)/0.1)]"
                                      } ${disabled?"opacity-40 cursor-not-allowed":""}`}
                                    title={`${fmtDateTime(slot.start)} → ${fmtDateTime(slot.end)}`}
                                  >
                                    <p className="text-sm font-black text-[rgb(var(--fg))] group-hover:text-[rgb(var(--primary))] transition-colors">
                                      {busy ? <span className="flex items-center gap-1.5"><Spinner size={13}/> Booking…</span> : fmtTime(slot.start)}
                                    </p>
                                    <p className="text-[0.67rem] text-[rgb(var(--muted2))] mt-0.5">
                                      → {fmtTime(slot.end)}
                                      {typeof slot.tutorCount === "number" ? ` · ${slot.tutorCount}t` : ""}
                                    </p>
                                  </motion.button>
                                );
                              })}
                            </div>

                            {daySlots.length > dayLimit && (
                              <button
                                type="button"
                                onClick={() => setDayLimit(v => v + 9)}
                                className="mt-3 w-full text-center text-xs font-semibold py-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
                              >
                                Show {Math.min(9, daySlots.length - dayLimit)} more times
                              </button>
                            )}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <p className="flex items-center gap-1.5 text-[0.67rem] text-[rgb(var(--muted2))] px-1">
                  <span className="h-1 w-1 rounded-full bg-[rgb(var(--muted2))]" />
                  Slots update in real time — if one disappears, someone else just booked it.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="mobile-sticky"
            initial={{ y:64, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:64, opacity:0 }}
            transition={{ type:"spring", stiffness:420, damping:34 }}
            className="fixed bottom-0 left-0 right-0 z-40 sm:hidden border-t border-[rgb(var(--border))] bg-[rgb(var(--card)/0.95)] backdrop-blur-xl px-4 py-3"
          >
            <div className="flex gap-2 max-w-6xl mx-auto">
              <button
                type="button"
                disabled={slotsLoading}
                onClick={() => loadSlots(selected.id, durationMin)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-sm font-semibold text-[rgb(var(--fg))] disabled:opacity-50"
              >
                {slotsLoading ? <><Spinner size={14}/> Loading…</> : <><IconRefresh /> Refresh</>}
              </button>
              <Link
                href="/dashboard/student/sessions"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[rgb(var(--primary))] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                My sessions <IconChevron />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {selected && <div className="h-20 sm:hidden" />}
    </>
  );
}