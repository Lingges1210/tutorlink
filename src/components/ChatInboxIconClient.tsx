"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ChatInboxIconClient({ initialUnread = 0 }: { initialUnread?: number }) {
  const [total, setTotal] = useState<number>(initialUnread);

  async function refresh() {
    const r = await fetch("/api/chat/unread-total", { cache: "no-store" });
    const j = await r.json();
    if (j?.ok) setTotal(j.total);
  }

  useEffect(() => {
  refresh();

  const interval = setInterval(refresh, 4000);

  // ✅ listen for "read happened" event (instant badge drop)
  const onRead = () => refresh();
  window.addEventListener("chat:unread-refresh", onRead);

  const ch = supabaseBrowser
    .channel("chat-unread-total")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "ChatMessage" },
      () => refresh()
    )
    .subscribe();

  return () => {
    clearInterval(interval);
    window.removeEventListener("chat:unread-refresh", onRead);
    supabaseBrowser.removeChannel(ch);
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
