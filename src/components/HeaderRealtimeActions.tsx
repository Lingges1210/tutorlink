"use client";

// src/components/HeaderRealtimeActions.tsx

import { useState } from "react";
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

  // ChatMessageListener pushes the live unread count up here,
  // then we pass it down to ChatInboxIconClient so the badge
  // updates instantly without any re-fetch or page change.
  const [liveChatUnread, setLiveChatUnread] = useState<number>(initialChatUnread);

  const isAuthPage =
    pathname === "/auth/login" ||
    pathname === "/auth/register" ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/reset-password" ||
    pathname.startsWith("/auth/");

  if (isAuthPage) return null;

  return (
    <>
      {/* Background prefetch — keeps store warm on every page */}
      {userId && <ChatPrefetcher userId={userId} />}

      {/* Chat realtime listener — badge + toast popup, mirrors SOS pattern */}
      {userId && (
        <ChatMessageListener
          userId={userId}
          initialUnread={initialChatUnread}
          onUnreadChange={setLiveChatUnread}
        />
      )}

      {userId && isTutor && <TutorSOSNotificationListener userId={userId} />}

      <div className="flex items-center gap-0.5 rounded-xl bg-[rgb(var(--card))]/60 px-1 py-1 ring-1 ring-[rgb(var(--border))]/60">
        {/* unreadCount is controlled by ChatMessageListener via liveChatUnread */}
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