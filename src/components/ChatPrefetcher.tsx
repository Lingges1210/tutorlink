"use client";

import { useEffect } from "react";
import { useChatStore } from "@/store/chatStore";

export default function ChatPrefetcher({ userId }: { userId: string }) {
  const prefetch = useChatStore((s) => s.prefetch);

  useEffect(() => {
    if (!userId) return;

    void prefetch();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void prefetch();
      }
    };

    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [userId, prefetch]);

  return null;
}