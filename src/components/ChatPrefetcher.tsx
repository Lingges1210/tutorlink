"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/chatStore";

export default function ChatPrefetcher({ userId }: { userId: string }) {
  const prefetch = useChatStore((s) => s.prefetch);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    void prefetch();

    timerRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        void prefetch();
      }
    }, 60000);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void prefetch();
      }
    };

    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userId, prefetch]);

  return null;
}