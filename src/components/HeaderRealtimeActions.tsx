"use client";

// src/components/HeaderRealtimeActions.tsx

import { usePathname } from "next/navigation";
import NotificationsBellClient from "@/components/NotificationsBellClient";
import ChatInboxIconClient from "@/components/ChatInboxIconClient";
import TutorSOSNotificationListener from "@/components/TutorSOSNotificationListener";
import ChatPrefetcher from "@/components/ChatPrefetcher";
import ChatUnreadListener from "@/components/ChatUnreadListener";

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

  const isAuthPage =
    pathname === "/auth/login" ||
    pathname === "/auth/register" ||
    pathname === "/auth/forgot-password" ||
    pathname === "/auth/reset-password" ||
    pathname.startsWith("/auth/");

  if (isAuthPage) return null;

  return (
    <>
      {/* Background chat prefetch — keeps store warm on every page */}
      {userId && <ChatPrefetcher userId={userId} />}

      {/* Global listener for incoming messages on any channel */}
      {userId && <ChatUnreadListener userId={userId} />}

      {userId && isTutor && <TutorSOSNotificationListener userId={userId} />}

      <div className="flex items-center gap-0.5 rounded-xl bg-[rgb(var(--card))]/60 px-1 py-1 ring-1 ring-[rgb(var(--border))]/60">
        <ChatInboxIconClient initialUnread={initialChatUnread} />
        <NotificationsBellClient
          initialUnread={initialUnread}
          dashboardHref={dashboardHref}
        />
      </div>
    </>
  );
}