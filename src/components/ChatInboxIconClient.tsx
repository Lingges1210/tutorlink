"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";

export default function ChatInboxIconClient({
  initialUnread = 0,
  unreadCount,
}: {
  initialUnread?: number;
  unreadCount?: number;
}) {
  const [total, setTotal] = useState<number>(initialUnread);
  const pathname = usePathname();

  useEffect(() => {
    if (unreadCount !== undefined) setTotal(unreadCount);
  }, [unreadCount]);

  const isPublicAuthPage =
    pathname?.startsWith("/auth/") ||
    pathname === "/" ||
    pathname === "/auth/login" ||
    pathname === "/auth/register" ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/reset-password";

  const refreshing = useRef(false);
  const pending = useRef(false);
  const stopped = useRef(false);

  async function safeRefresh() {
    if (stopped.current) return;
    if (refreshing.current) {
      pending.current = true;
      return;
    }

    refreshing.current = true;

    try {
      const r = await fetch("/api/chat/unread-total", { cache: "no-store" });
      if (!r.ok) return;

      const j = await r.json().catch(() => null);
      if (!stopped.current && j?.ok) {
        setTotal(j.total ?? 0);
      }
    } finally {
      refreshing.current = false;
      if (pending.current && !stopped.current) {
        pending.current = false;
        void safeRefresh();
      }
    }
  }

  useEffect(() => {
    if (isPublicAuthPage) return;
    stopped.current = false;

    void safeRefresh();

    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        void safeRefresh();
      }
    }, 5000);

    const onRefresh = () => void safeRefresh();
    window.addEventListener("chat:unread-refresh", onRefresh);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void safeRefresh();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stopped.current = true;
      clearInterval(t);
      window.removeEventListener("chat:unread-refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isPublicAuthPage]);

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