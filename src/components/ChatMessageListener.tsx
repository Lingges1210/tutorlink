"use client";

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
  deletedAt?: string | null;
};

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
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<ToastItem[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  function dismiss(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function pushToast(item: ToastItem) {
    setItems((prev) => {
      if (prev.some((x) => x.id === item.id)) return prev;
      return [item, ...prev].slice(0, 3);
    });

    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    }, 6000);
  }

  function getOpenChannelId() {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("channelId");
  }

  useEffect(() => {
    if (!userId) return;

    globalUnreadCount = initialUnread;

    const supabase = supabaseBrowser;
    let mounted = true;
    let messageChannel: ReturnType<typeof supabase.channel> | null = null;
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted || !session?.access_token) return;

      await supabase.realtime.setAuth(session.access_token);

      if (!mounted) return;

      presenceChannel = supabase.channel("user-presence", {
        config: {
          presence: { key: userId },
        },
      });

      presenceChannel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel?.track({
            userId,
            onlineAt: new Date().toISOString(),
          });
        }
      });

      messageChannel = supabase
        .channel(`chat-message-listener-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "ChatMessage" },
          (payload) => {
  const row = payload.new as ChatMessageRow;

  if (!row) return;
  if (row.senderId === userId) return;
  if (row.isDeleted) return;
  if (seenIdsRef.current.has(row.id)) return;

  seenIdsRef.current.add(row.id);

  const isOnMessagingPage = pathnameRef.current?.startsWith("/messaging");
  const openChannelId = isOnMessagingPage ? getOpenChannelId() : null;
  const isCurrentlyOpen = !!openChannelId && openChannelId === row.channelId;

  const msg: Msg = {
    id: row.id,
    senderId: row.senderId,
    text: row.text ?? "",
    createdAt: row.createdAt,
    isDeleted: row.isDeleted,
    deletedAt: row.deletedAt ?? null,
    attachments: [],
  };

  window.dispatchEvent(
    new CustomEvent("chat:message-incoming", {
      detail: {
        channelId: row.channelId,
        message: msg,
      },
    })
  );

  const targetConv = useChatStore
    .getState()
    .conversations.find((c) => c.id === row.channelId);

  if (targetConv) {
    useChatStore.getState().patchConversation(row.channelId, {
      lastMessage: row.text?.trim() || "📎 Attachment",
      lastAt: row.createdAt,
      unread: isCurrentlyOpen ? 0 : targetConv.unread + 1,
    });
  }

  if (!isCurrentlyOpen) {
    globalUnreadCount += 1;
    onUnreadChange?.(globalUnreadCount);
  }

  window.dispatchEvent(new Event("chat:unread-refresh"));

  const shouldSuppressToast = isOnMessagingPage && isCurrentlyOpen;
  if (shouldSuppressToast) return;

  const conv = useChatStore
    .getState()
    .conversations.find((c) => c.id === row.channelId);

  const senderName = conv?.name ?? "New message";

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
          console.log(`[ChatMessageListener] ${userId}`, status);
        });
    }

    void start();

    return () => {
      mounted = false;
      if (messageChannel) supabase.removeChannel(messageChannel);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
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
            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />

            <div className="p-4">
              <div className="flex items-start gap-3">
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