"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, ChevronRight } from "lucide-react";
import { getPusherClient } from "@/lib/pusherClient";
import { useChatStore } from "@/store/chatStore";
import type { Msg } from "@/store/chatStore";

type ToastItem = {
  id: string;
  senderName: string;
  text: string;
  channelId: string;
  createdAt: string;
};

type PusherNewMessage = Msg;

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
  const subscribedChannels = useRef<Set<string>>(new Set());
  const onUnreadChangeRef = useRef(onUnreadChange);

  useEffect(() => {
    onUnreadChangeRef.current = onUnreadChange;
  }, [onUnreadChange]);

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

    function subscribeToConversations() {
      const conversations = useChatStore.getState().conversations;
      if (!conversations.length) return;

      const pusher = getPusherClient();

      for (const conv of conversations) {
        const channelName = `private-chat-${conv.id}`;

        if (subscribedChannels.current.has(channelName)) continue;
        subscribedChannels.current.add(channelName);

        const channel = pusher.subscribe(channelName);

        channel.bind("new-message", (msg: PusherNewMessage) => {
          if (msg.senderId === userId) return;
          if (msg.isDeleted) return;
          if (seenIdsRef.current.has(msg.id)) return;
          seenIdsRef.current.add(msg.id);

          const isOnMessagingPage = pathnameRef.current?.startsWith("/messaging");
          const openChannelId = isOnMessagingPage ? getOpenChannelId() : null;
          const isCurrentlyOpen = !!openChannelId && openChannelId === conv.id;

          window.dispatchEvent(
            new CustomEvent("chat:message-incoming", {
              detail: { channelId: conv.id, message: msg },
            })
          );

          useChatStore.getState().mergeMessages(conv.id, [msg]);

          // If attachments present, fetch signed URLs and re-merge
          if (msg.attachments?.length) {
            fetch(`/api/chat/messages?channelId=${conv.id}&take=1`, { cache: 'no-store' })
              .then((r) => r.json())
              .then((full) => {
                if (!full?.ok || !Array.isArray(full.items)) return;
                const withUrls = full.items.find((m: { id: string }) => m.id === msg.id);
                if (withUrls) useChatStore.getState().mergeMessages(conv.id, [withUrls]);
              })
              .catch(() => {});
          }

          const targetConv = useChatStore
            .getState()
            .conversations.find((c) => c.id === conv.id);

          if (targetConv) {
            useChatStore.getState().patchConversation(conv.id, {
              lastMessage: msg.text?.trim() || "📎 Attachment",
              lastAt: msg.createdAt,
              unread: isCurrentlyOpen ? 0 : targetConv.unread + 1,
            });
          }

          if (!isCurrentlyOpen) {
            globalUnreadCount += 1;
            onUnreadChangeRef.current?.(globalUnreadCount);
          }

          window.dispatchEvent(new Event("chat:unread-refresh"));

          if (isOnMessagingPage && isCurrentlyOpen) return;

          const senderName = targetConv?.name ?? "New message";

          pushToast({
            id: msg.id,
            senderName,
            text: msg.text?.trim() || "📎 Attachment",
            channelId: conv.id,
            createdAt: msg.createdAt,
          });
        });
      }
    }

    // Kick off prefetch if conversations not yet loaded
    const convLoaded = useChatStore.getState().convLoaded;
    if (!convLoaded) {
      useChatStore.getState().prefetch().then(() => {
        subscribeToConversations();
      });
    } else {
      subscribeToConversations();
    }

    // Throttled store subscriber — catches new convs added after load
    let subscribeTimer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useChatStore.subscribe(() => {
      if (subscribeTimer) return;
      subscribeTimer = setTimeout(() => {
        subscribeTimer = null;
        subscribeToConversations();
      }, 300);
    });

    return () => {
      unsub();
      if (subscribeTimer) clearTimeout(subscribeTimer);
      const pusher = getPusherClient();
      for (const channelName of subscribedChannels.current) {
        pusher.unsubscribe(channelName);
      }
      subscribedChannels.current.clear();
    };
  }, [userId, initialUnread]);

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