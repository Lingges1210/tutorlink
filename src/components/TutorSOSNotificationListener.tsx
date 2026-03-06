"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, BellRing, X, ChevronRight } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { channel } from "process";

type Props = {
  userId: string;
};

type ToastItem = {
  id: string;
  title: string;
  body: string;
  sosId?: string | null;
  createdAt?: string | null;
};

type NotificationRow = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: {
    sosId?: string;
    subjectId?: string;
    mode?: string;
  } | null;
  createdAt?: string;
};

export default function TutorSOSNotificationListener({ userId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ToastItem[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());

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
    }, 8000);
  }

  useEffect(() => {
  if (!userId) return;

  console.log("TutorSOSNotificationListener mounted", userId);

  const supabase = supabaseBrowser;

  const channel = supabase
  .channel(`tutor-sos-notifications-${userId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "Notification",
    },
    (payload) => {
      console.log("Notification realtime payload:", payload);

      const row = payload.new as NotificationRow;

      if (!row) return;
      if (row.type !== "SOS_REQUEST") return;
      if (row.userId !== userId) return;
      if (seenIdsRef.current.has(row.id)) return;

      seenIdsRef.current.add(row.id);

      pushToast({
        id: row.id,
        title: row.title || "New SOS Request",
        body: row.body || "A student needs urgent help.",
        sosId: row.data?.sosId ?? null,
        createdAt: row.createdAt ?? null,
      });
    }
  )
  .subscribe((status) => {
    console.log("Notification realtime status:", status);
  });

  return () => {
    void supabase.removeChannel(channel);
  };
}, [userId]);

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[100] flex w-[min(92vw,380px)] flex-col gap-3">
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
                  <BellRing className="h-4 w-4 text-[rgb(var(--fg))]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                        <AlertCircle className="h-3 w-3" />
                        New SOS
                      </div>

                      <div className="mt-2 text-sm font-semibold text-[rgb(var(--fg))]">
                        {item.title}
                      </div>

                      <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                        {item.body}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => dismiss(item.id)}
                      className="rounded-lg p-1 text-[rgb(var(--muted2))] hover:bg-[rgb(var(--card2))] hover:text-[rgb(var(--fg))]"
                      aria-label="Dismiss SOS notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => dismiss(item.id)}
                      className="h-9 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.2]"
                    >
                      Dismiss
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        dismiss(item.id);
                        router.push("/sos");
                      }}
                      className="inline-flex h-9 items-center gap-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] hover:opacity-95"
                    >
                      View
                      <ChevronRight className="h-4 w-4" />
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