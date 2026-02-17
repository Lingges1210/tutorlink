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

    // fallback polling
    const interval = setInterval(refresh, 4000);

    // realtime: whenever a ChatMessage is inserted, refresh total
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
      supabaseBrowser.removeChannel(ch);
    };
  }, []);

  return (
    <div className="relative">
      <Link
        href="/messaging"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-sky-400"
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
