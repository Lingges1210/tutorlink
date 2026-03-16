"use client";

import { usePathname } from "next/navigation";
import NotificationsBellClient from "@/components/NotificationsBellClient";
import ChatInboxIconClient from "@/components/ChatInboxIconClient";
import TutorSOSNotificationListener from "@/components/TutorSOSNotificationListener";

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