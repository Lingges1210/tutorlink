"use client";

// src/components/ChatMessageListener.tsx
//
// Mirrors TutorSOSNotificationListener exactly.
// Subscribes to postgres_changes on ChatMessage via Supabase Realtime.
// When a new message arrives from another user:
//   1. Shows a toast popup (like SOS) — dismissable, auto-hides after 6s
//   2. Updates the header badge directly via local state (no refresh needed)
//   3. Merges the message into the Zustand store so /messaging loads instantly
//
// Mounted globally in HeaderRealtimeActions, runs on every page.

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, ChevronRight } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useChatStore } from "@/store/chatStore";
import type { Msg } from "@/store/chatStore";

type ToastItem = {
  id: string;
  senderName: string;
  text: string;
  channelId: string;
  createdAt: string;
};

type ChatMessageRow = {
  id: string;
  channelId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isDeleted?: boolean;
};

// How many unread to show in badge — kept in module scope so it
// persists across re-renders without being in React state
let globalUnreadCount = 0;

export default function ChatMessageListener({
  userId,
  initialUnread = 0,
  onUnreadChange,
}: {
  userId: string;
  initialUnread?: number;
  onUnreadChange?: (count: number) => void;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<ToastItem[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Track current pathname in a ref so the realtime callback can read it
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  function dismiss(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function pushToast(item: ToastItem) {
    setItems((prev) => {
      if (prev.some((x) => x.id === item.id)) return prev;
      return [item, ...prev].slice(0, 3); // max 3 toasts
    });
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    }, 6000);
  }

  useEffect(() => {
    if (!userId) return;

    // Sync initial unread into module-level counter
    globalUnreadCount = initialUnread;

    const supabase = supabaseBrowser;

    const channel = supabase
      .channel(`chat-message-listener-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ChatMessage",
        },
        async (payload) => {
          const row = payload.new as ChatMessageRow;

          if (!row) return;
          if (row.senderId === userId) return; // ignore own messages
          if (row.isDeleted) return;

          // Skip if MessagingClient already processed this (user is on /messaging
          // with this chat open — MessagingClient's own CDC handler runs first
          // via markProcessed, so we don't double-count or double-toast)
          if (useChatStore.getState().processedMsgIds.has(row.id)) return;
          if (seenIdsRef.current.has(row.id)) return;
          seenIdsRef.current.add(row.id);

          // ── 1. Update badge ───────────────────────────────────────────────
          globalUnreadCount += 1;
          onUnreadChange?.(globalUnreadCount);
          // Also dispatch so ChatInboxIconClient re-fetches the real count
          window.dispatchEvent(new Event("chat:unread-refresh"));

          // ── 2. Merge into Zustand store ───────────────────────────────────
          const msg: Msg = {
            id: row.id,
            senderId: row.senderId,
            text: row.text ?? "",
            createdAt: row.createdAt,
            isDeleted: row.isDeleted,
          };
          useChatStore.getState().mergeMessages(row.channelId, [msg]);

          // Update sidebar unread count in store
          const convs = useChatStore.getState().conversations;
          const updated = convs.map((c) =>
            c.id === row.channelId
              ? {
                  ...c,
                  lastMessage: row.text?.trim() || "📎 Attachment",
                  lastAt: row.createdAt,
                  unread: c.unread + 1,
                }
              : c
          );
          updated.sort(
            (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
          );
          useChatStore.getState().setConversations(updated);

          // ── 3. Show toast popup ───────────────────────────────────────────
          // Don't show toast if user is already on /messaging viewing this chat
          const onMessagingPage = pathnameRef.current?.startsWith("/messaging");
          if (onMessagingPage) return;

          // Fetch sender name for the toast
          let senderName = "Someone";
          try {
            const conv = useChatStore.getState().conversations.find(
              (c) => c.id === row.channelId
            );
            if (conv?.name) senderName = conv.name;
          } catch {}

          pushToast({
            id: row.id,
            senderName,
            text: row.text?.trim() || "📎 Attachment",
            channelId: row.channelId,
            createdAt: row.createdAt,
          });
        }
      )
      .subscribe((status) => {
        console.log(`[ChatMessageListener] chat-message-listener-${userId}`, status);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, initialUnread, onUnreadChange]);

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[100] flex w-[min(92vw,360px)] flex-col gap-3">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
          >
            {/* Accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />

            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="mt-0.5 rounded-2xl border border-[rgb(var(--border))] bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 p-2">
                  <MessageSquare className="h-4 w-4 text-[rgb(var(--fg))]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.72rem] font-semibold text-[rgb(var(--fg))]">
                        {item.senderName}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-[rgb(var(--muted))]">
                        {item.text}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => dismiss(item.id)}
                      className="rounded-lg p-1 text-[rgb(var(--muted2))] hover:bg-[rgb(var(--card2))] hover:text-[rgb(var(--fg))]"
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => dismiss(item.id)}
                      className="h-8 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.2]"
                    >
                      Dismiss
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        dismiss(item.id);
                        router.push(`/messaging?channelId=${item.channelId}`);
                      }}
                      className="inline-flex h-8 items-center gap-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 text-xs font-semibold text-white shadow-[0_6px_18px_rgba(124,58,237,0.35)] hover:opacity-95"
                    >
                      Reply
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}