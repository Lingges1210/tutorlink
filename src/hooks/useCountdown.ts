// src/hooks/useCountdown.ts
"use client";

import { useEffect, useMemo, useState } from "react";

export function formatRemaining(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");

  return { hh, mm, ss, totalSec };
}

/**
 * endAtMs = epoch milliseconds when the timer should hit 0
 */
export function useCountdown(endAtMs: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endAtMs) return;

    // tick every second
    const id = window.setInterval(() => setNow(Date.now()), 1000);

    // make sure it updates instantly when mounted
    setNow(Date.now());

    return () => window.clearInterval(id);
  }, [endAtMs]);

  const remainingMs = useMemo(() => {
    if (!endAtMs) return 0;
    return Math.max(0, endAtMs - now);
  }, [endAtMs, now]);

  const { hh, mm, ss, totalSec } = useMemo(() => {
    return formatRemaining(remainingMs);
  }, [remainingMs]);

  const isActive = !!endAtMs && remainingMs > 0;

  return { isActive, remainingMs, hh, mm, ss, totalSec };
}