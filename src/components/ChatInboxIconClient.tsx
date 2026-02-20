"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

export default function ChatInboxIconClient({
  initialUnread = 0,
}: {
  initialUnread?: number;
}) {
  const [total, setTotal] = useState<number>(initialUnread);

  useEffect(() => {
    let refreshing = false;
    let pending = false;
    let stop = false;

    async function safeRefresh() {
      if (stop) return;

      if (refreshing) {
        pending = true;
        return;
      }

      refreshing = true;
      try {
        const r = await fetch("/api/chat/unread-total", { cache: "no-store" });
        const j = await r.json().catch(() => null);
        if (!stop && j?.ok) setTotal(j.total);
      } finally {
        refreshing = false;
        if (pending && !stop) {
          pending = false;
          safeRefresh();
        }
      }
    }

    // initial load
    safeRefresh();

    // 🔁 listen for manual refresh (chat page marks read)
    const onRead = () => safeRefresh();
    window.addEventListener("chat:unread-refresh", onRead);

    // ✅ polling (light)
    const t = setInterval(safeRefresh, 8000);

    // optional: refresh when tab becomes active
    const onVis = () => {
      if (document.visibilityState === "visible") safeRefresh();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop = true;
      window.removeEventListener("chat:unread-refresh", onRead);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, []);

  return (
    <div className="relative">
      <Link
        href="/messaging"
        className="
          relative inline-flex h-10 w-10 items-center justify-center rounded-full border
          border-[rgb(var(--border))]
          bg-[rgb(var(--card)/0.70)]
          text-[rgb(var(--fg))]
          hover:bg-[rgb(var(--card)/0.95)]
          hover:ring-1 hover:ring-[rgb(var(--primary))/0.35]
          transition
        "
        aria-label="Messages"
        title="Messages"
      >
        <MessageSquare className="h-5 w-5" />
      </Link>

      {total > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
          {total > 99 ? "99+" : total}
        </span>
      )}
    </div>
  );
}