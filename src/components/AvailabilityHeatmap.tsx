"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const DAY_LABEL: Record<DayKey, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu",
  FRI: "Fri", SAT: "Sat", SUN: "Sun",
};

export type TimeSlot = { start: string; end: string };
export type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };
export type AvailabilityState = DayAvailability[];

/* ---------- time helpers ---------- */
function toMinutes(hhmm: string) {
  if (!hhmm || hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + m;
}
function toHHMM(mins: number) {
  const safe = Math.max(0, Math.min(24 * 60, mins));
  if (safe === 24 * 60) return "24:00";
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
function buildTimes(startHHMM: string, endHHMM: string, stepMin: number) {
  const out: number[] = [];
  for (let t = toMinutes(startHHMM); t < toMinutes(endHHMM); t += stepMin) out.push(t);
  return out;
}

function availabilityToSelected(av: AvailabilityState, stepMin: number) {
  const times = buildTimes("00:00", "24:00", stepMin);
  const selected = new Set<string>();
  for (const d of av ?? []) {
    if (!d || d.off) continue;
    for (const slot of d.slots ?? []) {
      if (!slot?.start || !slot?.end) continue;
      const a = toMinutes(slot.start), b = toMinutes(slot.end);
      for (const t of times)
        if (t >= a && t + stepMin <= b) selected.add(`${d.day}|${t}`);
    }
  }
  return selected;
}

function selectedToAvailability(selected: Set<string>, stepMin: number): AvailabilityState {
  const days = Object.keys(DAY_LABEL) as DayKey[];
  const times = buildTimes("00:00", "24:00", stepMin);
  return days.map((day) => {
    const blocks = times.filter((t) => selected.has(`${day}|${t}`)).sort((a, b) => a - b);
    if (!blocks.length) return { day, off: true, slots: [{ start: "", end: "" }] };
    const slots: TimeSlot[] = [];
    let runStart = blocks[0], prev = blocks[0];
    for (let i = 1; i < blocks.length; i++) {
      if (blocks[i] === prev + stepMin) { prev = blocks[i]; continue; }
      slots.push({ start: toHHMM(runStart), end: toHHMM(prev + stepMin) });
      runStart = blocks[i]; prev = blocks[i];
    }
    slots.push({ start: toHHMM(runStart), end: toHHMM(prev + stepMin) });
    return { day, off: false, slots };
  });
}

type Props = { value: AvailabilityState; onChange: (next: AvailabilityState) => void; stepMin?: number; };
type SlideDir = "next" | "prev";
type Phase = "idle" | "out" | "in";

export default function AvailabilityHeatmap({ value, onChange, stepMin = 30 }: Props) {
  const days = useMemo(() => Object.keys(DAY_LABEL) as DayKey[], []);
  const [selected, setSelected] = useState<Set<string>>(() => availabilityToSelected(value, stepMin));
  const syncRef = useRef(false);

  useEffect(() => {
    syncRef.current = true;
    setSelected(availabilityToSelected(value, stepMin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), stepMin]);

  useEffect(() => {
    if (syncRef.current) { syncRef.current = false; return; }
    onChange(selectedToAvailability(selected, stepMin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, stepMin]);

  const WINDOW_MIN = 6 * 60;
  const [windowStartMin, setWindowStartMin] = useState(0);
  const [stagedStartMin, setStagedStartMin] = useState<number | null>(null);
  const [slideDir, setSlideDir] = useState<SlideDir>("next");
  const [phase, setPhase] = useState<Phase>("idle");
  const animLock = useRef(false);

  /* ripple */
  const [ripples, setRipples] = useState<{ key: string; id: number }[]>([]);
  const rippleId = useRef(0);
  function addRipple(key: string) {
    const id = rippleId.current++;
    setRipples((p) => [...p, { key, id }]);
    setTimeout(() => setRipples((p) => p.filter((r) => r.id !== id)), 480);
  }

  const totalWindows = Math.ceil(1440 / WINDOW_MIN);
  const currentWindow = Math.round(windowStartMin / WINDOW_MIN);

  function jumpTo(target: number) {
    if (animLock.current) return;
    const dir: SlideDir = target >= windowStartMin ? "next" : "prev";
    animLock.current = true;
    setSlideDir(dir); setPhase("out");
    window.setTimeout(() => { setStagedStartMin(target); setPhase("in"); }, 220);
    window.setTimeout(() => { setWindowStartMin(target); setStagedStartMin(null); setPhase("idle"); animLock.current = false; }, 500);
  }

  function startSlide(dir: SlideDir) {
    const next = dir === "next"
      ? Math.min(1440 - WINDOW_MIN, windowStartMin + WINDOW_MIN)
      : Math.max(0, windowStartMin - WINDOW_MIN);
    if (dir === "next" && windowStartMin >= 1440 - WINDOW_MIN) return;
    if (dir === "prev" && windowStartMin <= 0) return;
    jumpTo(next);
  }

  const visibleStart = stagedStartMin ?? windowStartMin;
  const visibleEnd = Math.min(1440, visibleStart + WINDOW_MIN);
  const windowStart = toHHMM(visibleStart);
  const windowEnd = toHHMM(visibleEnd);
  const times = useMemo(() => buildTimes(windowStart, windowEnd, stepMin), [windowStart, windowEnd, stepMin]);

  /* auto-fit cell size */
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [cell, setCell] = useState(30);
  const [gap, setGap] = useState(10);
  const LEFT_COL = 50;
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      const w = wrapRef.current!.clientWidth;
      const usable = Math.max(0, w - 24);
      const g = Math.max(6, Math.min(12, Math.round(usable / 160)));
      setGap(g);
      setCell(Math.max(22, Math.min(44, Math.floor((usable - LEFT_COL - g * 6) / 7))));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `${LEFT_COL}px repeat(7, ${cell}px)`,
    columnGap: gap,
  };

  /* scroll advance */
  const heatmapRef = useRef<HTMLDivElement | null>(null);
  const throttleRef = useRef(false);
  const lastScrollY = useRef(0);
  useEffect(() => {
    lastScrollY.current = window.scrollY || 0;
    function onScroll() {
      if (!heatmapRef.current || animLock.current) return;
      const currentY = window.scrollY || 0;
      const dir: "down" | "up" = currentY > lastScrollY.current ? "down" : "up";
      lastScrollY.current = currentY;
      if (throttleRef.current) return;
      throttleRef.current = true;
      window.setTimeout(() => (throttleRef.current = false), 240);
      const rect = heatmapRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      if (dir === "down" && rect.bottom < vh + 90) startSlide("next");
      if (dir === "up" && rect.top > -90) startSlide("prev");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [windowStartMin]);

  /* drag paint */
  const drag = useRef<{ active: boolean; mode: "add" | "remove" }>({ active: false, mode: "add" });
  function applyBlock(day: DayKey, t: number) {
    const key = `${day}|${t}`;
    setSelected((prev) => {
      const next = new Set(prev);
      drag.current.mode === "add" ? next.add(key) : next.delete(key);
      return next;
    });
  }
  function onMouseDown(day: DayKey, t: number) {
    const key = `${day}|${t}`;
    drag.current = { active: true, mode: selected.has(key) ? "remove" : "add" };
    applyBlock(day, t);
    addRipple(key);
  }
  function onMouseEnter(day: DayKey, t: number) { if (drag.current.active) applyBlock(day, t); }
  function stopDrag() { drag.current.active = false; }

  function clearWindow() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const d of days) for (const t of times) next.delete(`${d}|${t}`);
      return next;
    });
  }
  function fillWindow() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const d of days) for (const t of times) next.add(`${d}|${t}`);
      return next;
    });
  }

  /* stats */
  const selectedCount = useMemo(() => {
    let n = 0;
    for (const d of days) for (const t of times) if (selected.has(`${d}|${t}`)) n++;
    return n;
  }, [selected, days, times]);
  const totalSlots = days.length * times.length;
  const fillPercent = totalSlots > 0 ? Math.round((selectedCount / totalSlots) * 100) : 0;

  /* animation values */
  const slideY = phase === "idle" ? 0 : phase === "out" ? (slideDir === "next" ? -18 : 18) : slideDir === "next" ? 18 : -18;
  const slideOp = phase === "idle" ? 1 : phase === "out" ? 0 : 1;
  const slideBlur = phase === "idle" ? 0 : phase === "out" ? 3 : 0;

  /* dark mode */
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  /* ── design tokens ── */
  const bd = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.09)";
  const pillBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const OFF_BG = isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.042)";
  const OFF_BD = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
  const ON_BG = "rgb(var(--primary))";
  const ON_GLOW = isDark
    ? "0 0 0 1.5px rgba(255,255,255,0.13), 0 4px 16px rgba(124,58,237,0.6)"
    : "0 0 0 1.5px rgba(124,58,237,0.25), 0 4px 12px rgba(124,58,237,0.28)";
  const panelBg = isDark
    ? "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(124,58,237,0.2) 0%, transparent 62%), rgba(255,255,255,0.022)"
    : "radial-gradient(ellipse 90% 55% at 50% -5%, rgba(124,58,237,0.07) 0%, transparent 62%), rgba(255,255,255,0.75)";
  const accentTxt = isDark ? "rgba(196,181,253,1)" : "rgba(109,40,217,1)";
  const fg = "rgb(var(--fg))";
  const muted = "rgb(var(--muted))";
  const shadow = isDark
    ? "0 20px 60px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.055)"
    : "0 6px 28px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)";

  return (
    <div
      ref={heatmapRef}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      className="space-y-3"
      style={{ fontFamily: "inherit" }}
    >
      {/* ── Toolbar ── */}
      <div style={{
        background: panelBg, border: `1.5px solid ${bd}`,
        borderRadius: 16, backdropFilter: "blur(10px)",
        boxShadow: isDark
          ? "0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        padding: "10px 14px",
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
      }}>
        {/* Clock badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "5px 11px", borderRadius: 10,
          background: pillBg, border: `1px solid ${bd}`,
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.55, flexShrink: 0 }}>
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 5v3l2 1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: fg }}>{windowStart} – {windowEnd}</span>
          <span style={{ fontSize: 11, color: muted }}>· {stepMin}m</span>
        </div>

        {/* Fill bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 72, height: 5, borderRadius: 99,
            background: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${fillPercent}%`, borderRadius: 99,
              background: "rgb(var(--primary))",
              transition: "width 380ms cubic-bezier(.22,1,.36,1)",
              boxShadow: "0 0 7px rgba(124,58,237,0.45)",
            }} />
          </div>
          <span style={{ fontSize: 11, color: muted, fontWeight: 500 }}>{fillPercent}%</span>
        </div>

        {/* Right controls */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {/* Prev */}
            <button type="button" onClick={() => startSlide("prev")}
              disabled={windowStartMin <= 0}
              style={{
                width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${bd}`,
                background: pillBg, color: fg, fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: windowStartMin <= 0 ? 0.28 : 1,
                transition: "opacity 200ms",
                pointerEvents: windowStartMin <= 0 ? "none" : "auto",
              }}>‹</button>

            {/* Progress dots */}
            {Array.from({ length: totalWindows }).map((_, i) => (
              <button key={i} type="button" onClick={() => jumpTo(i * WINDOW_MIN)}
                title={`${toHHMM(i * WINDOW_MIN)} – ${toHHMM(Math.min(1440, (i + 1) * WINDOW_MIN))}`}
                style={{
                  height: 6, width: i === currentWindow ? 20 : 6,
                  borderRadius: 99, border: "none", padding: 0, cursor: "pointer",
                  background: i === currentWindow
                    ? "rgb(var(--primary))"
                    : isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)",
                  boxShadow: i === currentWindow ? "0 0 6px rgba(124,58,237,0.4)" : "none",
                  transition: "all 300ms cubic-bezier(.22,1,.36,1)",
                }} />
            ))}

            {/* Next */}
            <button type="button" onClick={() => startSlide("next")}
              disabled={windowStartMin >= 1440 - WINDOW_MIN}
              style={{
                width: 30, height: 30, borderRadius: 9, border: `1.5px solid ${bd}`,
                background: pillBg, color: fg, fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: windowStartMin >= 1440 - WINDOW_MIN ? 0.28 : 1,
                transition: "opacity 200ms",
                pointerEvents: windowStartMin >= 1440 - WINDOW_MIN ? "none" : "auto",
              }}>›</button>
          </div>

          <div style={{ width: 1, height: 18, background: bd }} />

          <button type="button" onClick={clearWindow}
            style={{
              fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 9,
              border: `1.5px solid ${bd}`, background: pillBg,
              color: fg, cursor: "pointer", transition: "all 180ms ease",
            }}>Clear</button>

          <button type="button" onClick={fillWindow}
            style={{
              fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 9,
              border: "1.5px solid rgba(124,58,237,0.38)",
              background: isDark ? "rgba(124,58,237,0.20)" : "rgba(124,58,237,0.09)",
              color: accentTxt, cursor: "pointer", transition: "all 180ms ease",
            }}>Fill all</button>
        </div>
      </div>

      {/* ── Grid panel ── */}
      <div style={{
        background: panelBg, border: `1.5px solid ${bd}`,
        borderRadius: 16, padding: 20,
        backdropFilter: "blur(14px)", boxShadow: shadow,
      }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 1100 }}>
            <div ref={wrapRef} style={{ width: "100%", overflowX: "auto", display: "flex", justifyContent: "center" }}>
              <div style={{ display: "inline-block" }}>

                {/* Day headers */}
                <div className="grid items-end" style={{ ...gridStyle, marginBottom: 12 }}>
                  <div />
                  {days.map((d) => {
                    const hits = times.filter((t) => selected.has(`${d}|${t}`)).length;
                    const full = hits === times.length, partial = hits > 0 && !full;
                    return (
                      <div key={d} style={{ width: cell, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          letterSpacing: "0.07em", textTransform: "uppercase",
                          color: full ? "rgb(var(--primary))" : partial ? accentTxt : muted,
                          transition: "color 220ms",
                        }}>{DAY_LABEL[d]}</span>
                        <div style={{
                          width: "65%", height: 2.5, borderRadius: 99,
                          background: full
                            ? "rgb(var(--primary))"
                            : partial
                            ? isDark ? "rgba(196,181,253,0.45)" : "rgba(124,58,237,0.28)"
                            : "transparent",
                          boxShadow: full ? "0 0 5px rgba(124,58,237,0.45)" : "none",
                          transition: "all 280ms cubic-bezier(.22,1,.36,1)",
                        }} />
                      </div>
                    );
                  })}
                </div>

                {/* Animated rows */}
                <div style={{
                  display: "flex", flexDirection: "column", gap: 5,
                  transform: `translateY(${slideY}px)`,
                  opacity: slideOp, filter: `blur(${slideBlur}px)`,
                  transition: "transform 500ms cubic-bezier(.22,1,.36,1), opacity 500ms cubic-bezier(.22,1,.36,1), filter 500ms cubic-bezier(.22,1,.36,1)",
                  willChange: "transform, opacity, filter",
                }}>
                  {times.map((t) => {
                    const label = toHHMM(t);
                    const isHour = t % 60 === 0;
                    return (
                      <div key={t} className="grid items-center" style={gridStyle}>
                        <div style={{
                          fontSize: 11, fontWeight: isHour ? 600 : 400,
                          color: isHour ? fg : muted,
                          opacity: isHour ? 0.85 : 0.5,
                          textAlign: "right", paddingRight: 8,
                          userSelect: "none",
                        }}>{label}</div>

                        {days.map((day) => {
                          const key = `${day}|${t}`;
                          const isOn = selected.has(key);
                          const hasRipple = ripples.some((r) => r.key === key);
                          return (
                            <div key={key} style={{ width: cell, height: cell, position: "relative", flexShrink: 0 }}>
                              <button
                                type="button"
                                onMouseDown={() => onMouseDown(day, t)}
                                onMouseEnter={() => onMouseEnter(day, t)}
                                title={`${DAY_LABEL[day]} ${label} – ${isOn ? "Available" : "Unavailable"}`}
                                style={{
                                  width: "100%", height: "100%", borderRadius: 7,
                                  border: "none", cursor: "crosshair",
                                  background: isOn ? ON_BG : OFF_BG,
                                  boxShadow: isOn ? ON_GLOW : `inset 0 0 0 1px ${OFF_BD}`,
                                  transform: isOn ? "scale(1)" : "scale(0.92)",
                                  transition: "background 130ms ease, box-shadow 180ms ease, transform 130ms ease",
                                  position: "relative", overflow: "hidden",
                                }}
                              >
                                {hasRipple && (
                                  <span style={{
                                    position: "absolute", inset: 0, borderRadius: 7,
                                    background: "rgba(255,255,255,0.38)",
                                    animation: "av-ripple 480ms ease-out forwards",
                                    pointerEvents: "none",
                                  }} />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{
                  marginTop: 16, display: "flex", flexWrap: "wrap",
                  alignItems: "center", gap: 14,
                  fontSize: 11, color: muted,
                }}>
                  <span style={{ fontWeight: 700, color: fg, fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    Legend
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: 4, background: OFF_BG, boxShadow: `inset 0 0 0 1px ${OFF_BD}` }} />
                    Unavailable
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: 4, background: ON_BG, boxShadow: ON_GLOW }} />
                    Available
                  </span>
                  <span style={{ marginLeft: "auto", opacity: 0.65 }}>
                    {selectedCount} / {totalSlots} slots selected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes av-ripple {
          0%   { opacity: 0.65; transform: scale(0.4); }
          100% { opacity: 0;   transform: scale(2.4); }
        }
      `}</style>
    </div>
  );
}