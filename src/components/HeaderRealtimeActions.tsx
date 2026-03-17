"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NotificationsBellClient from "@/components/NotificationsBellClient";
import ChatInboxIconClient from "@/components/ChatInboxIconClient";
import TutorSOSNotificationListener from "@/components/TutorSOSNotificationListener";
import ChatPrefetcher from "@/components/ChatPrefetcher";
import ChatMessageListener from "@/components/ChatMessageListener";

export default function HeaderRealtimeActions({
  userId,
  isTutor,
  initialUnread,
  initialChatUnread,
  dashboardHref,
}: {
  userId: string | null;
  isTutor: boolean;
  initialUnread: number;
  initialChatUnread: number;
  dashboardHref: string;
}) {
  const pathname = usePathname();
  const [liveChatUnread, setLiveChatUnread] = useState<number>(initialChatUnread);

  const isAuthPage =
    pathname === "/auth/login" ||
    pathname === "/auth/register" ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/reset-password" ||
    pathname.startsWith("/auth/");

  useEffect(() => {
    setLiveChatUnread(initialChatUnread);
  }, [initialChatUnread]);

  useEffect(() => {
    if (!userId || isAuthPage) return;

    let stopped = false;

    async function refreshChatUnread() {
      const r = await fetch("/api/chat/unread-total", { cache: "no-store" }).catch(
        () => null
      );
      if (!r || !r.ok || stopped) return;

      const j = await r.json().catch(() => null);
      if (!stopped && j?.ok) {
        setLiveChatUnread(j.total ?? 0);
      }
    }

    const onRefresh = () => {
      void refreshChatUnread();
    };

    window.addEventListener("chat:unread-refresh", onRefresh);

    return () => {
      stopped = true;
      window.removeEventListener("chat:unread-refresh", onRefresh);
    };
  }, [userId, isAuthPage]);

  if (isAuthPage) return null;

  return (
    <>
      {userId && <ChatPrefetcher userId={userId} />}

      {userId && (
        <ChatMessageListener
          userId={userId}
          initialUnread={initialChatUnread}
          onUnreadChange={setLiveChatUnread}
        />
      )}

      {userId && isTutor && <TutorSOSNotificationListener userId={userId} />}

      <div className="flex items-center gap-0.5 rounded-xl bg-[rgb(var(--card))]/60 px-1 py-1 ring-1 ring-[rgb(var(--border))]/60">
        <ChatInboxIconClient
          initialUnread={initialChatUnread}
          unreadCount={liveChatUnread}
        />
        <NotificationsBellClient
          initialUnread={initialUnread}
          dashboardHref={dashboardHref}
        />
      </div>
    </>
  );
}