"use client";

import { useEffect } from "react";

type Props = {
  enabled?: boolean;
};

export default function UserPresenceBeacon({ enabled = true }: Props) {
  useEffect(() => {
    if (!enabled) return;

    let stopped = false;

    async function sendPresence(isOnline: boolean) {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOnline }),
          keepalive: true,
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
      } else {
        void sendPresence(false);
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
      void sendPresence(false);
    };
  }, [enabled]);

  return null;
}