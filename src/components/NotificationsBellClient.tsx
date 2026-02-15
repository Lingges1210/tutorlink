// src/components/NotificationsBellClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

type ViewerHint = "STUDENT" | "TUTOR";

type NotiItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  createdAt: string;
  readAt: string | null;
};

type ListResp = {
  items: NotiItem[];
  nextCursor: string | null;
  unreadCount: number;
};

function viewerLabel(v?: ViewerHint | null) {
  if (v === "TUTOR") return "Tutor";
  if (v === "STUDENT") return "Student";
  return "General";
}

function safeParseData(raw: any) {
  let data = raw;

  // Prisma sometimes returns JSON as string
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  if (!data || typeof data !== "object") data = {};
  return data as Record<string, any>;
}

export default function NotificationsBellClient({
  initialUnread = 0,
  dashboardHref,
}: {
  initialUnread?: number;
  dashboardHref: string;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState<number>(initialUnread);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotiItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);

  // derived list (3 only unless Show all)
  const shown = showAll ? items : items.slice(0, 3);
  const hasItems = items.length > 0;

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // When closing panel, reset "show all"
  useEffect(() => {
    if (!open) setShowAll(false);
  }, [open]);

  // Poll unread count
  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const res = await fetch("/api/notifications/unread", {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && data?.success) setUnread(Number(data.unread ?? 0));
      } catch {
        // ignore
      }
    }

    tick();
    const t = setInterval(tick, 12_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // When opening dropdown: fetch latest 10
  useEffect(() => {
    if (!open) return;

    let alive = true;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const res = await fetch("/api/notifications?limit=10", {
          cache: "no-store",
        });
        const data: ListResp = await res.json().catch(() => ({} as any));

        if (!alive) return;

        if (!res.ok) {
          setErr((data as any)?.message ?? "Failed to load notifications.");
          setItems([]);
        } else {
          const arr = Array.isArray(data.items) ? data.items : [];
          // normalize data field
          setItems(
            arr.map((n) => ({
              ...n,
              data: safeParseData(n.data),
            }))
          );
          setUnread(Number(data.unreadCount ?? 0));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open]);

  function pretty(iso: string) {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function baseSessionsPath(viewer?: ViewerHint | null) {
    if (viewer === "TUTOR") return "/dashboard/tutor/sessions";
    if (viewer === "STUDENT") return "/dashboard/student/sessions";

    // fallback (older notifications / general)
    return dashboardHref.startsWith("/dashboard/tutor")
      ? "/dashboard/tutor/sessions"
      : "/dashboard/student/sessions";
  }

  function buildFocusHref(sessionId?: string, viewer?: ViewerHint | null) {
    const base = baseSessionsPath(viewer);
    if (!sessionId) return base;
    return `${base}?focus=${encodeURIComponent(sessionId)}`;
  }

  function pickHref(n: NotiItem) {
    const data = safeParseData(n.data);

    // ✅ best: direct href (new notify.ts will inject this)
    const href = typeof data.href === "string" ? data.href : null;
    if (href) return href;

    // fallback: old logic
    const sessionId =
      typeof data.sessionId === "string" ? data.sessionId : undefined;
    const viewer = (data.viewer as ViewerHint | undefined) ?? null;
    return buildFocusHref(sessionId, viewer);
  }

  const panel = useMemo(() => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.985 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={[
          "absolute right-0 top-[calc(100%+10px)] z-50 w-[min(420px,92vw)]",
          "rounded-3xl border p-3 overflow-hidden", // ✅ keep dropdown compact
          "border-[rgb(var(--border))] bg-[rgb(var(--card))]",
          "shadow-[0_24px_90px_rgb(var(--shadow)/0.22)]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              Notifications
            </div>
            <div className="text-[0.72rem] text-[rgb(var(--muted2))]">
              Unread: {unread}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setErr(null);
                try {
                  const res = await fetch("/api/notifications/read-all", {
                    method: "POST",
                  });
                  if (!res.ok) throw new Error();

                  setItems((prev) =>
                    prev.map((x) => ({
                      ...x,
                      readAt: x.readAt ?? new Date().toISOString(),
                    }))
                  );
                  setUnread(0);
                } catch {
                  setErr("Failed to mark all as read.");
                }
              }}
              className="rounded-xl border px-3 py-2 text-xs font-semibold
                         border-[rgb(var(--border))] bg-[rgb(var(--card2))]
                         text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.7)]"
            >
              Mark all read
            </button>

            <Link
              href={dashboardHref}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-white
                         bg-[rgb(var(--primary))] hover:opacity-90"
              onClick={() => setOpen(false)}
            >
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="px-2 pb-2">
          {loading ? (
            <div className="rounded-2xl border p-3 text-sm text-[rgb(var(--muted2))] border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
              Loading…
            </div>
          ) : err ? (
            <div className="rounded-2xl border p-3 text-sm text-rose-600 dark:text-rose-400 border-rose-500/40 bg-rose-500/10">
              {err}
            </div>
          ) : !hasItems ? (
            <div className="rounded-2xl border p-3 text-sm text-[rgb(var(--muted2))] border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
              No notifications.
            </div>
          ) : (
            <>
              {/* ✅ Scroll area (hard constrained, cannot fail) */}
              <div
                style={{
                  maxHeight: showAll ? 360 : undefined,
                  overflowY: showAll ? "auto" : "hidden",
                  paddingRight: showAll ? 6 : 0,
                  WebkitOverflowScrolling: "touch",
                }}
                className="space-y-2"
              >
                {shown.map((n) => {
                  const isUnread = !n.readAt;
                  const data = safeParseData(n.data);
                  const viewer = (data.viewer as ViewerHint | undefined) ?? null;

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={async () => {
                        setErr(null);

                        // Mark read (optimistic)
                        if (isUnread) {
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === n.id
                                ? { ...x, readAt: new Date().toISOString() }
                                : x
                            )
                          );
                          setUnread((u) => Math.max(0, u - 1));

                          try {
                            await fetch(`/api/notifications/${n.id}/read`, {
                              method: "POST",
                            });
                          } catch {
                            // ignore
                          }
                        }

                        setOpen(false);
                        router.push(pickHref(n));
                      }}
                      className={[
                        "w-full text-left rounded-2xl border p-3 transition",
                        "border-[rgb(var(--border))] bg-[rgb(var(--card2))]",
                        "hover:bg-[rgb(var(--card)/0.75)]",
                        isUnread ? "ring-1 ring-[rgb(var(--primary))]" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-[rgb(var(--fg))] truncate">
                              {n.title}
                            </div>

                            {/* viewer badge */}
                            <span
                              className={[
                                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                "border-[rgb(var(--border))] bg-[rgb(var(--card))]",
                                "text-[rgb(var(--muted))]",
                                viewer === "TUTOR"
                                  ? "ring-1 ring-[rgb(var(--primary))]"
                                  : "",
                              ].join(" ")}
                              title={`This notification is for your ${viewerLabel(
                                viewer
                              )} view`}
                            >
                              {viewerLabel(viewer)}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                            {n.body}
                          </div>
                          <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted))]">
                            {pretty(n.createdAt)}
                          </div>
                        </div>

                        {isUnread && (
                          <span className="shrink-0 mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[rgb(var(--primary))]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ✅ Toggle stays outside the scroll area (always visible) */}
              {items.length > 3 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="w-full rounded-xl border px-3 py-2 text-xs font-semibold
                               border-[rgb(var(--border))] bg-[rgb(var(--card2))]
                               text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.7)]
                               flex items-center justify-center gap-2"
                  >
                    <span>
                      {showAll ? "Show less" : `Show all (${items.length})`}
                    </span>
                    <ChevronDown
                      size={14}
                      className={[
                        "transition-transform",
                        showAll ? "rotate-180" : "",
                      ].join(" ")}
                    />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    );
  }, [dashboardHref, err, hasItems, items, loading, router, showAll, shown, unread]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl border px-3 py-2
                   border-[rgb(var(--border))]
                   bg-[rgb(var(--card)/0.65)]
                   hover:bg-[rgb(var(--card)/0.9)]"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-[rgb(var(--fg))] opacity-90" />

        {unread > 0 && (
          <span
            className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center
                       rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white
                       bg-[rgb(var(--primary))]"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>{open ? panel : null}</AnimatePresence>
    </div>
  );
}
