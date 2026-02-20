"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const DAY_LABEL: Record<DayKey, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

export type TimeSlot = { start: string; end: string };
export type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };
export type AvailabilityState = DayAvailability[];

/** ---------- time helpers ---------- */
function toMinutes(hhmm: string) {
  if (!hhmm || hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}
function toHHMM(mins: number) {
  const safe = Math.max(0, Math.min(24 * 60, mins));
  if (safe === 24 * 60) return "24:00";
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function buildTimes(startHHMM: string, endHHMM: string, stepMin: number) {
  const start = toMinutes(startHHMM);
  const end = toMinutes(endHHMM);
  const out: number[] = [];
  for (let t = start; t < end; t += stepMin) out.push(t);
  return out;
}

/** Convert AvailabilityState -> selected blocks set (FULL 24h) */
function availabilityToSelected(av: AvailabilityState, stepMin: number) {
  const times = buildTimes("00:00", "24:00", stepMin);
  const selected = new Set<string>();

  for (const d of av ?? []) {
    if (!d || d.off) continue;
    for (const slot of d.slots ?? []) {
      if (!slot?.start || !slot?.end) continue;
      const a = toMinutes(slot.start);
      const b = toMinutes(slot.end);

      for (const t of times) {
        const blockStart = t;
        const blockEnd = t + stepMin;
        if (blockStart >= a && blockEnd <= b) selected.add(`${d.day}|${blockStart}`);
      }
    }
  }
  return selected;
}

/** Convert selected blocks -> AvailabilityState */
function selectedToAvailability(selected: Set<string>, stepMin: number): AvailabilityState {
  const days = Object.keys(DAY_LABEL) as DayKey[];
  const times = buildTimes("00:00", "24:00", stepMin);

  return days.map((day) => {
    const blocks = times.filter((t) => selected.has(`${day}|${t}`)).sort((a, b) => a - b);
    if (blocks.length === 0) return { day, off: true, slots: [{ start: "", end: "" }] };

    const slots: TimeSlot[] = [];
    let runStart = blocks[0];
    let prev = blocks[0];

    for (let i = 1; i < blocks.length; i++) {
      const cur = blocks[i];
      if (cur === prev + stepMin) {
        prev = cur;
        continue;
      }
      slots.push({ start: toHHMM(runStart), end: toHHMM(prev + stepMin) });
      runStart = cur;
      prev = cur;
    }
    slots.push({ start: toHHMM(runStart), end: toHHMM(prev + stepMin) });

    return { day, off: false, slots };
  });
}

type Props = {
  value: AvailabilityState;
  onChange: (next: AvailabilityState) => void;
  stepMin?: number; // 15 / 30 / 60
};

type SlideDir = "next" | "prev";
type Phase = "idle" | "out" | "in";

export default function AvailabilityHeatmap({ value, onChange, stepMin = 30 }: Props) {
  const days = useMemo(() => Object.keys(DAY_LABEL) as DayKey[], []);

  const [selected, setSelected] = useState<Set<string>>(() => availabilityToSelected(value, stepMin));
  const syncingFromParentRef = useRef(false);

  useEffect(() => {
    syncingFromParentRef.current = true;
    setSelected(availabilityToSelected(value, stepMin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), stepMin]);

  useEffect(() => {
    if (syncingFromParentRef.current) {
      syncingFromParentRef.current = false;
      return;
    }
    onChange(selectedToAvailability(selected, stepMin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, stepMin]);

  /**  6-hour window */
  const WINDOW_MIN = 6 * 60;

  const [windowStartMin, setWindowStartMin] = useState(0);
  const [stagedStartMin, setStagedStartMin] = useState<number | null>(null);

  const [slideDir, setSlideDir] = useState<SlideDir>("next");
  const [phase, setPhase] = useState<Phase>("idle");
  const animLock = useRef(false);

  function canGoNext(startMin: number) {
    return startMin < 1440 - WINDOW_MIN;
  }
  function canGoPrev(startMin: number) {
    return startMin > 0;
  }

  function startSlide(dir: SlideDir) {
    if (animLock.current) return;

    const nextStart =
      dir === "next"
        ? Math.min(1440 - WINDOW_MIN, windowStartMin + WINDOW_MIN)
        : Math.max(0, windowStartMin - WINDOW_MIN);

    if (dir === "next" && !canGoNext(windowStartMin)) return;
    if (dir === "prev" && !canGoPrev(windowStartMin)) return;

    animLock.current = true;
    setSlideDir(dir);
    setPhase("out");

    window.setTimeout(() => {
      setStagedStartMin(nextStart);
      setPhase("in");
    }, 230);

    window.setTimeout(() => {
      setWindowStartMin(nextStart);
      setStagedStartMin(null);
      setPhase("idle");
      animLock.current = false;
    }, 520);
  }

  const visibleStartMin = stagedStartMin ?? windowStartMin;
  const visibleEndMin = Math.min(1440, visibleStartMin + WINDOW_MIN);
  const windowStart = toHHMM(visibleStartMin);
  const windowEnd = toHHMM(visibleEndMin);

  const times = useMemo(() => buildTimes(windowStart, windowEnd, stepMin), [windowStart, windowEnd, stepMin]);

  /** auto-fit width (bigger blocks) */
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [cell, setCell] = useState(28);
  const [gap, setGap] = useState(10);

  const LEFT_COL = 80;
  const MIN_CELL = 22;
  const MAX_CELL = 42;

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const usable = Math.max(0, w - 24);

      const nextGap = Math.max(8, Math.min(12, Math.round(usable / 160)));
      const availableForCells = usable - LEFT_COL - nextGap * 6;
      const nextCell = Math.floor(availableForCells / 7);

      const clamped = Math.max(MIN_CELL, Math.min(MAX_CELL, nextCell));
      setGap(nextGap);
      setCell(clamped);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `${LEFT_COL}px repeat(7, ${cell}px)`,
    columnGap: gap,
  };

  /** scroll advance */
  const heatmapRef = useRef<HTMLDivElement | null>(null);
  const throttleRef = useRef(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY || 0;

    function onScroll() {
      if (!heatmapRef.current) return;
      if (animLock.current) return;

      const currentY = window.scrollY || 0;
      const direction: "down" | "up" = currentY > lastScrollY.current ? "down" : "up";
      lastScrollY.current = currentY;

      if (throttleRef.current) return;
      throttleRef.current = true;
      window.setTimeout(() => (throttleRef.current = false), 240);

      const rect = heatmapRef.current.getBoundingClientRect();
      const vh = window.innerHeight;

      const shouldNext = direction === "down" && rect.bottom < vh + 90;
      const shouldPrev = direction === "up" && rect.top > -90;

      if (shouldNext) startSlide("next");
      if (shouldPrev) startSlide("prev");
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [windowStartMin]);

  /** drag painting */
  const drag = useRef<{ active: boolean; mode: "add" | "remove" }>({ active: false, mode: "add" });

  function applyBlock(day: DayKey, t: number) {
    const key = `${day}|${t}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (drag.current.mode === "add") next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function onMouseDown(day: DayKey, t: number) {
    const key = `${day}|${t}`;
    const isOn = selected.has(key);
    drag.current.active = true;
    drag.current.mode = isOn ? "remove" : "add";
    applyBlock(day, t);
  }

  function onMouseEnter(day: DayKey, t: number) {
    if (!drag.current.active) return;
    applyBlock(day, t);
  }

  function stopDrag() {
    drag.current.active = false;
  }

  function clearWindow() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const day of days) for (const t of times) next.delete(`${day}|${t}`);
      return next;
    });
  }

  function fillWindow() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const day of days) for (const t of times) next.add(`${day}|${t}`);
      return next;
    });
  }

  const slideY =
    phase === "idle" ? 0 : phase === "out" ? (slideDir === "next" ? -18 : 18) : slideDir === "next" ? 18 : -18;

  const opacity = phase === "idle" ? 1 : phase === "out" ? 0 : 1;
  const blurPx = phase === "idle" ? 0 : phase === "out" ? 3 : 0;

  //  detect dark mode from your Tailwind `.dark` class on <html>
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;

    const update = () => setIsDark(root.classList.contains("dark"));
    update();

    const mo = new MutationObserver(update);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  //  brighter blocks in dark mode (both ON and OFF)
  const OFF_BG = isDark ? "rgba(148,163,184,0.22)" : "rgb(var(--card2))";
  const OFF_BORDER = isDark ? "rgba(226,232,240,0.18)" : "rgba(148,163,184,0.22)";

  const ON_BG = "rgb(var(--primary))";
  const ON_GLOW = isDark ? "0 0 0 1px rgba(255,255,255,0.12), 0 14px 32px rgba(124,58,237,0.55)" : "0 12px 26px rgba(124,58,237,0.26)";

  return (
    <div ref={heatmapRef} onMouseUp={stopDrag} onMouseLeave={stopDrag} className="space-y-4">
      {/* top row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs text-[rgb(var(--muted))]">
          Drag to paint. Showing{" "}
          <span className="font-semibold text-[rgb(var(--fg))]">
            {windowStart}–{windowEnd}
          </span>{" "}
          ({stepMin}-minute blocks). Scroll page to continue.
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={clearWindow}
            className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:opacity-90"
          >
            Clear (6h)
          </button>

          <button
            type="button"
            onClick={fillWindow}
            className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:opacity-90"
          >
            Fill (6h)
          </button>
        </div>
      </div>

      {/* panel */}
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.72)] p-4">
        <div
          className="rounded-2xl border border-[rgb(var(--border))] p-4"
          style={{
            background:
              "radial-gradient(900px 420px at 20% 5%, rgb(var(--primary)/0.16), transparent 55%), radial-gradient(700px 380px at 80% 0%, rgb(var(--primary2)/0.10), transparent 55%), rgb(var(--card))",
          }}
        >
          {/*  Center + equal side breathing room */}
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[1100px] px-5">
              <div ref={wrapRef} className="w-full overflow-x-auto flex justify-center">
                <div className="inline-block">
                  {/* header */}
                  <div className="grid items-end mb-3" style={gridStyle}>
                    <div />
                    {days.map((d) => (
                      <div
                        key={d}
                        className="text-[11px] font-semibold text-[rgb(var(--muted))] text-center"
                        style={{ width: cell }}
                      >
                        {DAY_LABEL[d]}
                      </div>
                    ))}
                  </div>

                  {/* animated grid */}
                  <div
                    className="space-y-2 will-change-transform will-change-filter"
                    style={{
                      transform: `translateY(${slideY}px)`,
                      opacity,
                      filter: `blur(${blurPx}px)`,
                      transition:
                        "transform 520ms cubic-bezier(.22,1,.36,1), opacity 520ms cubic-bezier(.22,1,.36,1), filter 520ms cubic-bezier(.22,1,.36,1)",
                    }}
                  >
                    {times.map((t) => {
                      const label = toHHMM(t);
                      return (
                        <div key={t} className="grid items-center" style={gridStyle}>
                          <div className="text-[11px] text-[rgb(var(--muted))] pr-2">{label}</div>

                          {days.map((day) => {
                            const key = `${day}|${t}`;
                            const isOn = selected.has(key);

                            return (
                              <button
                                key={key}
                                type="button"
                                onMouseDown={() => onMouseDown(day, t)}
                                onMouseEnter={() => onMouseEnter(day, t)}
                                className="rounded-md transition-all duration-150 ease-out"
                                style={{
                                  width: cell,
                                  height: cell,
                                  background: isOn ? ON_BG : OFF_BG,
                                  boxShadow: isOn ? ON_GLOW : `inset 0 0 0 1px ${OFF_BORDER}`,
                                  opacity: isOn ? 1 : isDark ? 0.95 : 0.82, //  off blocks brighter in dark mode
                                }}
                                title={`${day} ${label} ${isOn ? "Available" : "Unavailable"}`}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* legend */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-[rgb(var(--muted))]">
                    <span className="font-semibold text-[rgb(var(--fg))]">Legend</span>

                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block rounded-md"
                        style={{
                          width: 14,
                          height: 14,
                          background: OFF_BG,
                          boxShadow: `inset 0 0 0 1px ${OFF_BORDER}`,
                          opacity: isDark ? 0.95 : 0.82,
                        }}
                      />
                      Unavailable
                    </span>

                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block rounded-md"
                        style={{
                          width: 14,
                          height: 14,
                          background: ON_BG,
                          boxShadow: ON_GLOW,
                        }}
                      />
                      Available
                    </span>

                    <span className="ml-auto text-[11px] text-[rgb(var(--muted))]">
                      Window: {windowStart}–{windowEnd} • Step: {stepMin}m
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* end centered wrapper */}
        </div>

        <div className="mt-3 text-[11px] text-[rgb(var(--muted))]">
          Scroll the page to move through time windows (6 hours at a time).
        </div>
      </div>
    </div>
  );
}
