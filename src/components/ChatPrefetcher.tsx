"use client";

// src/components/ChatPrefetcher.tsx
//
// Mount this once inside HeaderRealtimeActions (or anywhere inside the
// logged-in layout). It triggers the background prefetch as soon as the
// user session is available and re-runs every 60 s while the tab is visible.

import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/chatStore";

export default function ChatPrefetcher({ userId }: { userId: string }) {
  const prefetch = useChatStore((s) => s.prefetch);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Immediate fetch on mount
    void prefetch();

    // Refresh every 60 s while the page is visible
    timerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        void prefetch();
      }
    }, 60_000);

    const onVis = () => {
      if (document.visibilityState === "visible") void prefetch();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userId, prefetch]);

  return null;
}