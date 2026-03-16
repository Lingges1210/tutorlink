"use client";

// src/components/ChatUnreadListener.tsx
//
// Subscribes to a per-user Supabase Realtime channel `user-inbox-{userId}`.
// When MessagingClient broadcasts a "new-message" event on that channel
// (see the send() function), this listener:
//   1. Dispatches "chat:unread-refresh" so the header badge updates.
//   2. Updates the Zustand store so the sidebar count is correct if the
//      user opens /messaging.

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useChatStore } from "@/store/chatStore";
import type { Msg } from "@/store/chatStore";

export default function ChatUnreadListener({ userId }: { userId: string }) {
  const mergeMessages = useChatStore((s) => s.mergeMessages);
  const setConversations = useChatStore((s) => s.setConversations);
  const conversations = useChatStore((s) => s.conversations);
  const channelRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const supabase = supabaseBrowser;
    let mounted = true;

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted || !session?.access_token) return;

      await supabase.realtime.setAuth(session.access_token);

      const channel = supabase
        .channel(`user-inbox-${userId}`, {
          config: { broadcast: { self: false } },
        })
        .on(
          "broadcast",
          { event: "new-message" },
          ({ payload }) => {
            const data = payload as {
              channelId: string;
              senderId: string;
              message: Msg;
            };

            if (!data?.message) return;
            if (data.senderId === userId) return; // ignore own messages

            // 1. Notify header badge
            window.dispatchEvent(new Event("chat:unread-refresh"));

            // 2. Merge into store so MessagingClient sees it on open
            mergeMessages(data.channelId, [data.message]);

            // 3. Update sidebar unread count in store
            const convs = useChatStore.getState().conversations;
            const updated = convs.map((c) =>
              c.id === data.channelId
                ? {
                    ...c,
                    lastMessage: data.message.text?.trim() || "📎 Attachment",
                    lastAt: data.message.createdAt,
                    unread: c.unread + 1,
                  }
                : c
            );
            updated.sort(
              (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
            );
            setConversations(updated);
          }
        );

      channelRef.current = channel;
      channel.subscribe();
    }

    void start();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, mergeMessages, setConversations]);

  return null;
}