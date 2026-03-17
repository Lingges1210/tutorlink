"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";

export default function ChatInboxIconClient({
  initialUnread = 0,
  unreadCount,
}: {
  initialUnread?: number;
  unreadCount?: number;
}) {
  const [total, setTotal] = useState<number>(unreadCount ?? initialUnread);
  const pathname = usePathname();

  useEffect(() => {
    if (unreadCount !== undefined) {
      setTotal(unreadCount);
    }
  }, [unreadCount]);

  const isPublicAuthPage =
    pathname?.startsWith("/auth/") ||
    pathname === "/" ||
    pathname === "/auth/login" ||
    pathname === "/auth/register" ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/reset-password";

  useEffect(() => {
    if (isPublicAuthPage) return;
    if (unreadCount !== undefined) return;

    let stopped = false;

    (async () => {
      const r = await fetch("/api/chat/unread-total", { cache: "no-store" }).catch(
        () => null
      );
      if (!r || !r.ok || stopped) return;

      const j = await r.json().catch(() => null);
      if (!stopped && j?.ok) {
        setTotal(j.total ?? 0);
      }
    })();

    return () => {
      stopped = true;
    };
  }, [isPublicAuthPage, unreadCount]);

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