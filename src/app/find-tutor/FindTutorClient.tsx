"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

type SubjectItem = { id: string; code: string; title: string };

// returned by GET /api/subjects/[id]/slots?durationMin=60
type SlotItem = {
  id: string; // stable key (we'll use start ISO)
  start: string; // ISO
  end: string; // ISO
  tutorCount?: number; // optional
};

function PrimaryButtonLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        inline-flex items-center justify-center
        rounded-md px-3 py-2 text-xs font-semibold text-white
        bg-[rgb(var(--primary))]
        transition-all duration-200
        hover:-translate-y-0.5
        hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]
      "
    >
      {children}
    </Link>
  );
}

function DisabledButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      disabled
      type="button"
      className="
        inline-flex items-center justify-center
        cursor-not-allowed rounded-md px-3 py-2 text-xs font-semibold
        border border-[rgb(var(--border))]
        bg-[rgb(var(--card2))]
        text-[rgb(var(--muted2))]
        opacity-70
      "
    >
      {children}
    </button>
  );
}

function prettyDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function prettyTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function dayKey(iso: string) {
  const d = new Date(iso);
  // "YYYY-MM-DD" in local time
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function prettyDayLabel(day: string) {
  try {
    // day is "YYYY-MM-DD"
    const [y, m, d] = day.split("-").map((x) => parseInt(x, 10));
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString([], {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return day;
  }
}

type ToastState =
  | null
  | {
      text: string;
      kind: "success" | "error" | "info";
      actionHref?: string;
      actionLabel?: string;
    };

export default function FindTutorClient({
  authed,
  verified,
}: {
  authed: boolean;
  verified: boolean;
}) {
  const canUse = authed && verified;

  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<SubjectItem[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  const [selected, setSelected] = useState<SubjectItem | null>(null);

  // ✅ Slots UI
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsMsg, setSlotsMsg] = useState<string | null>(null);

  // ✅ booking feedback
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);

  // ✅ duration filter
  const [durationMin, setDurationMin] = useState<number>(60);

  // ✅ A + C: day strip selection + show-more for selected day
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayLimit, setDayLimit] = useState<number>(9);

  // ✅ Toast
  const [toast, setToast] = useState<ToastState>(null);
  function showToast(t: NonNullable<ToastState>) {
    setToast(t);
  }
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canUse) return;

    const term = q.trim();
    if (!term) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoadingSuggest(true);
      try {
        const res = await fetch(
          `/api/subjects/suggest?q=${encodeURIComponent(term)}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        setSuggestions(Array.isArray(data.items) ? data.items : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggest(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q, canUse]);

  async function loadSlots(subjectId: string, dur: number) {
    setSlots([]);
    setSlotsMsg(null);
    setSlotsLoading(true);

    try {
      const res = await fetch(
        `/api/subjects/${subjectId}/slots?durationMin=${encodeURIComponent(
          String(dur)
        )}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));

      const list: unknown[] = Array.isArray(data.items) ? data.items : [];

      const normalized: SlotItem[] = list
        .filter(Boolean)
        .map((x: unknown) => {
          const obj = x as Record<string, unknown>;

          const id = String((obj.id ?? obj.start ?? "") as string);
          const start = String((obj.start ?? "") as string);
          const end = String((obj.end ?? "") as string);

          const tutorCount =
            typeof obj.tutorCount === "number"
              ? (obj.tutorCount as number)
              : undefined;

          return { id, start, end, tutorCount };
        })
        .filter((s: SlotItem) => !!s.id && !!s.start && !!s.end);

      setSlots(normalized);

      if (normalized.length === 0) {
        setSlotsMsg(
          "No free slots found (try a different duration or check later)."
        );
      }

      // ✅ Auto-jump day:
      // - If user never chose a day => pick earliest day
      // - If user chose a day but it became empty => jump to earliest day
      if (normalized.length > 0) {
        const earliestDay = dayKey(normalized[0].start);

        setSelectedDay((prevDay) => {
          if (!prevDay) return earliestDay;

          const stillHasSlots = normalized.some(
            (s) => dayKey(s.start) === prevDay
          );
          if (stillHasSlots) return prevDay;

          return earliestDay;
        });

        setDayLimit(9);
      }
    } catch {
      setSlotsMsg("Failed to load available slots.");
    } finally {
      setSlotsLoading(false);
    }
  }

  async function pickSubject(s: SubjectItem) {
    setSelected(s);
    setSuggestions([]);
    setBookingMsg(null);
    setSlots([]);
    setSlotsMsg(null);

    // reset A+C UI
    setSelectedDay(null);
    setDayLimit(9);

    if (canUse) {
      await loadSlots(s.id, durationMin);
    }
  }

  async function bookSlot(slot: SlotItem) {
    if (!selected) return;
    if (!canUse) return;

    setBookingSlotId(slot.id);
    setBookingMsg(null);

    try {
      const res = await fetch("/api/sessions/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selected.id,
          scheduledAt: slot.start,
          durationMin,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message ?? "Failed to book slot.";
        setBookingMsg(msg);
        showToast({ text: msg, kind: "error" });
        return;
      }

      setBookingMsg("Booked! Tutor assigned instantly. Check My Bookings →");
      showToast({
        text: "Booked! Tutor assigned instantly.",
        kind: "success",
        actionHref: "/dashboard/student/sessions",
        actionLabel: "My Bookings →",
      });

      await loadSlots(selected.id, durationMin);
    } catch {
      setBookingMsg("Failed to book slot.");
      showToast({ text: "Failed to book slot.", kind: "error" });
    } finally {
      setBookingSlotId(null);
    }
  }

  const headerBadge = useMemo(() => {
    if (!authed) {
      return (
        <PrimaryButtonLink href="/auth/login">Login to search</PrimaryButtonLink>
      );
    }
    if (!verified) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          ⏳ Pending verification
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        ✅ Verified
      </span>
    );
  }, [authed, verified]);

  // ✅ A+C: sorted slots, earliest, next 3
  const sortedAll = useMemo(() => {
    return [...slots].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }, [slots]);

  const earliest = sortedAll[0] ?? null;
  const next3 = useMemo(() => sortedAll.slice(1, 4), [sortedAll]);

  // ✅ A+C: day counts for strip
  const dayCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of slots) {
      const k = dayKey(s.start);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [slots]);

  // ✅ A+C: next 7 days (strip)
  const sevenDayKeys = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      out.push(`${y}-${m}-${dd}`);
    }
    return out;
  }, []);

  const selectedDaySlots = useMemo(() => {
    if (!selectedDay) return [];
    return sortedAll.filter((s) => dayKey(s.start) === selectedDay);
  }, [sortedAll, selectedDay]);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="
            fixed z-50 bottom-5 right-5
            w-[calc(100vw-2.5rem)] sm:w-[380px]
            rounded-2xl border p-4
            border-[rgb(var(--border))]
            bg-[rgb(var(--card) / 0.9)]
            backdrop-blur
            shadow-[0_20px_60px_rgb(var(--shadow)/0.18)]
          "
        >
          <div className="flex items-start gap-3">
            <div
              className={[
                "mt-0.5 h-2.5 w-2.5 rounded-full",
                toast.kind === "success"
                  ? "bg-emerald-500"
                  : toast.kind === "error"
                  ? "bg-rose-500"
                  : "bg-slate-400",
              ].join(" ")}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                {toast.text}
              </div>

              <div className="mt-2 flex items-center gap-2">
                {toast.actionHref && toast.actionLabel && (
                  <Link
                    href={toast.actionHref}
                    className="
                      rounded-md px-3 py-2 text-xs font-semibold
                      bg-[rgb(var(--primary))]
                      text-white
                      hover:opacity-95
                    "
                  >
                    {toast.actionLabel}
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="
                    rounded-md px-3 py-2 text-xs font-semibold
                    border border-[rgb(var(--border))]
                    bg-[rgb(var(--card2))]
                    text-[rgb(var(--fg))]
                    hover:bg-[rgb(var(--card)/0.6)]
                  "
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div
        className="
          rounded-3xl border p-6
          border-[rgb(var(--border))]
          bg-[rgb(var(--card) / 0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]
        "
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
              Find a Tutor
            </h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))] max-w-2xl">
              Search by subject/course, then book the earliest available time —
              or pick a day.
            </p>
            {!authed && (
              <p className="mt-2 text-xs text-[rgb(var(--muted2))]">
                You can view this page, but searching and booking require login +
                verification.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">{headerBadge}</div>
        </div>
      </div>

      {/* locked banner */}
      {authed && !verified && (
        <div className="rounded-3xl border p-5 border-amber-500/30 bg-amber-500/10 text-[rgb(var(--fg))]">
          <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            ⚠️ Search is locked until verification
          </div>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Once verified, you can search subjects and book available slots.
          </p>
        </div>
      )}

      {/* Search */}
      <section
        className="
          rounded-3xl border p-5
          border-[rgb(var(--border))]
          bg-[rgb(var(--card) / 0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]
        "
      >
        <div className="relative">
          <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
            Search Subject / Course
          </label>

          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelected(null);
              setBookingMsg(null);
              setSlots([]);
              setSlotsMsg(null);

              // reset A+C UI
              setSelectedDay(null);
              setDayLimit(9);
            }}
            disabled={!canUse}
            placeholder="e.g. WIA2003, Data Structures"
            className={[
              "w-full rounded-md border px-3 py-2 text-sm outline-none transition",
              "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))]",
              "focus:border-[rgb(var(--primary))]",
              canUse ? "" : "opacity-60 cursor-not-allowed",
            ].join(" ")}
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!authed ? (
              <PrimaryButtonLink href="/auth/login">Login</PrimaryButtonLink>
            ) : !verified ? (
              <DisabledButton>Search Locked</DisabledButton>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setSelected(null);
                    setSuggestions([]);
                    setBookingMsg(null);
                    setSlots([]);
                    setSlotsMsg(null);

                    // reset A+C UI
                    setSelectedDay(null);
                    setDayLimit(9);
                  }}
                  className="
                    rounded-md px-3 py-2 text-xs font-semibold
                    border border-[rgb(var(--border))]
                    bg-[rgb(var(--card2))]
                    text-[rgb(var(--fg))]
                    hover:bg-[rgb(var(--card)/0.6)]
                  "
                >
                  Clear
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[0.7rem] text-[rgb(var(--muted2))]">
                    Duration
                  </span>
                  <select
                    value={durationMin}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDurationMin(v);
                      setBookingMsg(null);

                      // reset day selection on duration change
                      setSelectedDay(null);
                      setDayLimit(9);

                      if (selected?.id) loadSlots(selected.id, v);
                    }}
                    disabled={!selected || slotsLoading}
                    className="
                      rounded-md border px-2 py-2 text-xs outline-none
                      border-[rgb(var(--border))]
                      bg-[rgb(var(--card2))]
                      text-[rgb(var(--fg))]
                      disabled:opacity-60
                    "
                  >
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Suggestions */}
          {canUse && (loadingSuggest || suggestions.length > 0) && (
            <div
              className="
                absolute z-20 mt-2 w-full overflow-hidden
                rounded-2xl border border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                shadow-[0_20px_60px_rgb(var(--shadow)/0.18)]
              "
            >
              {loadingSuggest && (
                <div className="px-3 py-3 text-xs text-[rgb(var(--muted2))]">
                  Searching…
                </div>
              )}

              {!loadingSuggest && suggestions.length === 0 && (
                <div className="px-3 py-3 text-xs text-[rgb(var(--muted2))]">
                  No matches
                </div>
              )}

              {!loadingSuggest &&
                suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickSubject(s)}
                    className="
                      w-full text-left px-3 py-3
                      hover:bg-[rgb(var(--card)/0.6)]
                      border-b border-[rgb(var(--border))]
                      last:border-b-0
                    "
                  >
                    <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                      {s.code} {s.title}
                    </div>
                    <div className="text-[0.7rem] text-[rgb(var(--muted2))]">
                      Click to view booking options
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Booking message */}
      {bookingMsg && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="
            rounded-2xl border p-4
            border-[rgb(var(--border))]
            bg-[rgb(var(--card) / 0.7)]
            text-sm text-[rgb(var(--fg))]
          "
        >
          {bookingMsg}
        </motion.div>
      )}

      {/* Selected */}
      {selected && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-[rgb(var(--muted2))]">
            Selected:{" "}
            <span className="font-semibold text-[rgb(var(--fg))]">
              {selected.code} — {selected.title}
            </span>
          </div>
          <Link
            href="/dashboard/student/sessions"
            className="text-xs font-medium text-[rgb(var(--primary))] hover:underline"
          >
            My Bookings →
          </Link>
        </div>
      )}

      {/* ✅ Slots section (A + C) */}
      {selected && (
        <section
          className="
            rounded-3xl border p-5
            border-[rgb(var(--border))]
            bg-[rgb(var(--card) / 0.7)]
            shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]
          "
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                Book a slot
              </div>
              <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                1 click: book earliest. Or pick a day to choose.
              </div>
            </div>

            <button
              type="button"
              disabled={slotsLoading || !!bookingSlotId}
              onClick={() => selected && loadSlots(selected.id, durationMin)}
              className="
                rounded-md px-3 py-2 text-xs font-semibold
                border border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                text-[rgb(var(--fg))]
                hover:bg-[rgb(var(--card)/0.6)]
                disabled:opacity-60
              "
            >
              {slotsLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {slotsLoading ? (
            <div className="mt-4 text-sm text-[rgb(var(--muted2))]">
              Loading slots…
            </div>
          ) : slots.length === 0 ? (
            <div className="mt-4 text-sm text-[rgb(var(--muted2))]">
              {slotsMsg ?? "No slots yet."}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* ✅ A: Earliest + next 3 */}
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                    Earliest available
                  </div>
                  <div className="text-[0.7rem] text-[rgb(var(--muted2))]">
                    {durationMin} min
                  </div>
                </div>

                {earliest && (
                  <button
                    type="button"
                    disabled={!!bookingSlotId}
                    onClick={() => bookSlot(earliest)}
                    className="
                      mt-3 w-full text-left rounded-2xl border px-4 py-4 transition
                      border-[rgb(var(--border))]
                      bg-[rgb(var(--primary))]
                      text-white
                      hover:opacity-95
                      disabled:opacity-60
                    "
                    title={`${prettyDateTime(
                      earliest.start
                    )} → ${prettyDateTime(earliest.end)}`}
                  >
                    <div className="text-sm font-bold">
                      Book earliest: {prettyDayLabel(dayKey(earliest.start))} ·{" "}
                      {prettyTime(earliest.start)}
                    </div>
                    <div className="mt-1 text-[0.75rem] opacity-90">
                      ends {prettyTime(earliest.end)}
                      {typeof earliest.tutorCount === "number"
                        ? ` · ${earliest.tutorCount} tutor${
                            earliest.tutorCount === 1 ? "" : "s"
                          }`
                        : ""}
                    </div>
                  </button>
                )}

                {next3.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[0.7rem] text-[rgb(var(--muted2))] mb-2">
                      Next available
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {next3.map((s) => {
                        const busy = bookingSlotId === s.id;
                        const disabled = !!bookingSlotId && !busy;

                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => bookSlot(s)}
                            className={[
                              "rounded-full px-3 py-2 text-xs font-semibold border transition",
                              "border-[rgb(var(--border))]",
                              "bg-[rgb(var(--card) / 0.8)] text-[rgb(var(--fg))]",
                              "hover:bg-[rgb(var(--card) / 1)]",
                              busy ? "opacity-80" : "",
                              disabled ? "opacity-60 cursor-not-allowed" : "",
                            ].join(" ")}
                            title={`${prettyDateTime(
                              s.start
                            )} → ${prettyDateTime(s.end)}`}
                          >
                            {prettyDayLabel(dayKey(s.start)).split(",")[0]} ·{" "}
                            {prettyTime(s.start)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ✅ C: 7-day strip */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                    Pick a day
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDay(null);
                      setDayLimit(9);
                    }}
                    className="text-[0.7rem] font-medium text-[rgb(var(--primary))] hover:underline"
                  >
                    Clear day
                  </button>
                </div>

                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {sevenDayKeys.map((d) => {
                    const count = dayCounts.get(d) ?? 0;
                    const active = selectedDay === d;
                    const disabled = count === 0;

                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setSelectedDay(d);
                          setDayLimit(9);
                        }}
                        className={[
                          "shrink-0 rounded-2xl border px-3 py-2 text-left transition",
                          "border-[rgb(var(--border))]",
                          active
                            ? "bg-[rgb(var(--primary))] text-white"
                            : "bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
                          disabled ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        <div className="text-xs font-semibold">
                          {prettyDayLabel(d).split(",")[0]}
                        </div>
                        <div className="mt-0.5 text-[0.7rem] opacity-80">
                          {count} slot{count === 1 ? "" : "s"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ✅ Day times */}
              {selectedDay && (
                <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                      {prettyDayLabel(selectedDay)}
                    </div>
                    <div className="text-[0.7rem] text-[rgb(var(--muted2))]">
                      {selectedDaySlots.length} slots
                    </div>
                  </div>

                  {selectedDaySlots.length === 0 ? (
                    <div className="mt-3 text-sm text-[rgb(var(--muted2))]">
                      No slots on this day.
                    </div>
                  ) : (
                    <>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {selectedDaySlots.slice(0, dayLimit).map((slot) => {
                          const busy = bookingSlotId === slot.id;
                          const disabled = !!bookingSlotId && !busy;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => bookSlot(slot)}
                              className={[
                                "w-full text-left rounded-xl border px-4 py-3 transition",
                                "border-[rgb(var(--border))] bg-[rgb(var(--card) / 0.65)] text-[rgb(var(--fg))]",
                                "hover:bg-[rgb(var(--card) / 0.9)]",
                                busy ? "opacity-80" : "",
                                disabled ? "opacity-60 cursor-not-allowed" : "",
                              ].join(" ")}
                              title={`${prettyDateTime(
                                slot.start
                              )} → ${prettyDateTime(slot.end)}`}
                            >
                              <div className="text-xs font-semibold">
                                {busy ? "Booking…" : prettyTime(slot.start)}
                              </div>
                              <div className="mt-1 text-[0.7rem] text-[rgb(var(--muted2))]">
                                ends {prettyTime(slot.end)} · {durationMin} min
                                {typeof slot.tutorCount === "number"
                                  ? ` · ${slot.tutorCount} tutor${
                                      slot.tutorCount === 1 ? "" : "s"
                                    }`
                                  : ""}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {selectedDaySlots.length > dayLimit && (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setDayLimit((v) => v + 9)}
                            className="
                              rounded-md px-3 py-2 text-xs font-semibold
                              border border-[rgb(var(--border))]
                              bg-[rgb(var(--card))]
                              text-[rgb(var(--fg))]
                              hover:bg-[rgb(var(--card)/0.8)]
                            "
                          >
                            Show more times
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="text-[0.7rem] text-[rgb(var(--muted2))]">
                If a slot disappears, someone else booked it — hit{" "}
                <span className="font-semibold">Refresh</span>.
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
