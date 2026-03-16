"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type Props = {
  enabled?: boolean;
};

export default function UserPresenceBeacon({ enabled = true }: Props) {
  const pathname = usePathname();

  const isProtectedPage =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/messaging") ||
    pathname?.startsWith("/study") ||
    pathname?.startsWith("/sos") ||
    pathname?.startsWith("/find-tutor");

  useEffect(() => {
    if (!enabled || !isProtectedPage) return;

    let stopped = false;

    async function sendPresence(isOnline: boolean) {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOnline }),
          keepalive: true,
          credentials: "include",
        });
      } catch {
        // ignore
      }
    }

    void sendPresence(true);

    const interval = window.setInterval(() => {
      if (!stopped && document.visibilityState === "visible") {
        void sendPresence(true);
      }
    }, 30000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendPresence(true);
      }
    };

    const onBeforeUnload = () => {
      void sendPresence(false);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [enabled, isProtectedPage]);

  return null;
}