// src/components/NotificationsBellClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, Trash2, CheckCheck, X, Sparkles } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
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

function viewerColor(v?: ViewerHint | null) {
  if (v === "TUTOR")
    return "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30 ring-violet-500/40";
  if (v === "STUDENT")
    return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30";
  return "bg-[rgb(var(--border)/0.6)] text-[rgb(var(--muted))] border-[rgb(var(--border))]";
}

function safeParseData(raw: any) {
  let data = raw;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = null; }
  }
  if (!data || typeof data !== "object") data = {};
  return data as Record<string, any>;
}

function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    function compute() {
      try {
        const diff = Date.now() - new Date(iso).getTime();
        const s = Math.floor(diff / 1000);
        if (s < 60) return setLabel("just now");
        const m = Math.floor(s / 60);
        if (m < 60) return setLabel(`${m}m ago`);
        const h = Math.floor(m / 60);
        if (h < 24) return setLabel(`${h}h ago`);
        const d = Math.floor(h / 24);
        if (d < 7) return setLabel(`${d}d ago`);
        setLabel(new Date(iso).toLocaleDateString());
      } catch {
        setLabel(iso);
      }
    }
    compute();
    const t = setInterval(compute, 30_000);
    return () => clearInterval(t);
  }, [iso]);

  return <span>{label}</span>;
}

/* ── Notification row ── */
function NotiRow({
  n, isUnread, viewer, onOpen, onDelete, deleting, setDraggingId,
}: {
  n: NotiItem;
  isUnread: boolean;
  viewer: ViewerHint | null;
  onOpen: (n: NotiItem) => Promise<void> | void;
  onDelete: (n: NotiItem) => Promise<void> | void;
  deleting: boolean;
  setDraggingId: (id: string | null) => void;
}) {
  const x = useMotionValue(0);
  const revealOpacity = useTransform(x, [0, -14, -70], [0, 0, 1]);
  const deleteSlideX = useTransform(x, [0, -20, -90], [14, 10, 0]);
  const deleteScale = useTransform(x, [0, -30, -90], [0.96, 0.98, 1]);
  const rowBg = useTransform(x, [0, -90], ["rgba(239,68,68,0)", "rgba(239,68,68,0.06)"]);
  const draggingRef = useRef(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, scale: 0.96 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative overflow-visible"
    >
      {/* Delete reveal layer */}
      <motion.div
        style={{ opacity: revealOpacity, backgroundColor: rowBg as any }}
        className="absolute inset-0 rounded-2xl border border-rose-500/20 flex items-center justify-end pr-4"
        aria-hidden="true"
      >
        <motion.div
          style={{ x: deleteSlideX, scale: deleteScale }}
          className="flex items-center gap-1.5 text-rose-500 text-xs font-bold tracking-wide"
        >
          <Trash2 size={14} />
          <span>Delete</span>
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.button
        type="button"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -160, right: 0 }}
        dragElastic={0.07}
        style={{ x }}
        onDragStart={() => {
          draggingRef.current = true;
          setDraggingId(n.id);
        }}
        onDragEnd={async (_e, info) => {
          window.setTimeout(() => {
            draggingRef.current = false;
            setDraggingId(null);
          }, 0);
          if (info.offset.x <= -120) {
            await onDelete(n);
            return;
          }
          animate(x, 0, { type: "spring", stiffness: 560, damping: 40 });
        }}
        onClick={async () => {
          if (draggingRef.current || deleting) return;
          await onOpen(n);
        }}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        transition={{ duration: 0.12 }}
        className={[
          "group relative w-full text-left rounded-2xl p-3.5 transition-all duration-200",
          "border bg-[rgb(var(--card2))] hover:bg-[rgb(var(--card))]",
          isUnread
            ? "border-[rgb(var(--primary)/0.35)] shadow-[0_0_0_1px_rgb(var(--primary)/0.18),0_2px_12px_rgb(var(--primary)/0.08)]"
            : "border-[rgb(var(--border))] hover:border-[rgb(var(--border)/0.8)] hover:shadow-md",
        ].join(" ")}
      >
        {/* Unread glow strip */}
        {isUnread && (
          <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-[rgb(var(--primary))] opacity-90" />
        )}

        <div className="flex items-start gap-3">
          {/* Icon bubble */}
          <div className={[
            "shrink-0 mt-0.5 h-8 w-8 rounded-xl grid place-items-center text-xs font-bold",
            isUnread
              ? "bg-[rgb(var(--primary)/0.15)] text-[rgb(var(--primary))] ring-1 ring-[rgb(var(--primary)/0.25)]"
              : "bg-[rgb(var(--border)/0.5)] text-[rgb(var(--muted))]",
          ].join(" ")}>
            {isUnread ? <Sparkles size={14} /> : <Bell size={13} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-[rgb(var(--fg))] leading-tight truncate">
                {n.title}
              </span>
              <span className={[
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase leading-none",
                viewerColor(viewer),
              ].join(" ")}>
                {viewerLabel(viewer)}
              </span>
            </div>

            <p className="mt-1 text-xs text-[rgb(var(--muted2))] leading-relaxed line-clamp-2">
              {n.body}
            </p>

            <div className="mt-2 text-[11px] text-[rgb(var(--muted))] font-medium">
              <RelativeTime iso={n.createdAt} />
            </div>
          </div>

          {isUnread && (
            <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-[rgb(var(--primary))] shadow-[0_0_6px_rgb(var(--primary)/0.7)] animate-pulse" />
          )}
        </div>
      </motion.button>
    </motion.div>
  );
}

/* ── Bell button with animated ring ── */
function BellButton({ unread, onClick }: { unread: number; onClick: () => void }) {
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    if (unread > 0) {
      setRinging(true);
      const t = setTimeout(() => setRinging(false), 600);
      return () => clearTimeout(t);
    }
  }, [unread]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Notifications"
      className="relative rounded-xl border px-2.5 py-2
                 border-[rgb(var(--border))]
                 bg-[rgb(var(--card)/0.7)]
                 hover:bg-[rgb(var(--card))]
                 hover:border-[rgb(var(--border)/0.6)]
                 hover:shadow-md
                 transition-all duration-200
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary)/0.5)]"
    >
      <motion.div
        animate={ringing ? {
          rotate: [0, -18, 18, -14, 14, -8, 8, 0],
          transition: { duration: 0.55, ease: "easeInOut" }
        } : {}}
      >
        <Bell size={20} className="text-[rgb(var(--fg))] opacity-85" />
      </motion.div>

      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key="badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            className="absolute -right-1.5 -top-1.5 min-w-[18px] h-[18px] grid place-items-center
                       rounded-full px-1 text-[10px] font-bold text-white leading-none
                       bg-[rgb(var(--primary))]
                       shadow-[0_2px_8px_rgb(var(--primary)/0.5)]"
          >
            {unread > 99 ? "99+" : unread}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/* ── Main component ── */
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
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const shown = showAll ? items : items.slice(0, 3);
  const hasItems = items.length > 0;

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => { if (!open) setShowAll(false); }, [open]);

  // Poll unread
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch("/api/notifications/unread", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && data?.success) setUnread(Number(data.unread ?? 0));
      } catch {}
    }
    tick();
    const t = setInterval(tick, 12_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Fetch on open
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const res = await fetch("/api/notifications?limit=10", { cache: "no-store" });
        const data: ListResp = await res.json().catch(() => ({} as any));
        if (!alive) return;
        if (!res.ok) {
          setErr((data as any)?.message ?? "Failed to load.");
          setItems([]);
        } else {
          setItems((Array.isArray(data.items) ? data.items : [])
            .map(n => ({ ...n, data: safeParseData(n.data) })));
          setUnread(Number(data.unreadCount ?? 0));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open]);

  function baseSessionsPath(viewer?: ViewerHint | null) {
    if (viewer === "TUTOR") return "/dashboard/tutor/sessions";
    if (viewer === "STUDENT") return "/dashboard/student/sessions";
    return dashboardHref.startsWith("/dashboard/tutor")
      ? "/dashboard/tutor/sessions"
      : "/dashboard/student/sessions";
  }

  function buildFocusHref(sessionId?: string, viewer?: ViewerHint | null, page?: number) {
    const base = baseSessionsPath(viewer);
    if (!sessionId) return base;
    const params = new URLSearchParams();
    params.set("focus", sessionId);
    if (typeof page === "number" && Number.isFinite(page) && page > 0)
      params.set("page", String(page));
    return `${base}?${params.toString()}`;
  }

  function pickHref(n: NotiItem) {
    const data = safeParseData(n.data);
    if (typeof data.href === "string") return data.href;
    const sessionId = typeof data.sessionId === "string" ? data.sessionId : undefined;
    const viewer = (data.viewer as ViewerHint | undefined) ?? null;
    const page = typeof data.page === "number" ? data.page
      : typeof data.page === "string" ? parseInt(data.page, 10) : undefined;
    return buildFocusHref(sessionId, viewer, page);
  }

  async function deleteOne(n: NotiItem) {
    if (deletingId) return;
    setErr(null);
    setDeletingId(n.id);
    const wasUnread = !n.readAt;
    const prev = items, prevU = unread;
    setItems(p => p.filter(x => x.id !== n.id));
    if (wasUnread) setUnread(u => Math.max(0, u - 1));
    try {
      const res = await fetch(`/api/notifications/${n.id}/delete`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setItems(prev);
      setUnread(prevU);
      setErr("Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  }

  async function openNotification(n: NotiItem) {
    setErr(null);
    if (!n.readAt) {
      setItems(p => p.map(x => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x));
      setUnread(u => Math.max(0, u - 1));
      try { await fetch(`/api/notifications/${n.id}/read`, { method: "POST" }); } catch {}
    }
    setOpen(false);
    router.push(pickHref(n));
  }

  const panel = useMemo(() => (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={[
        "absolute right-0 top-[calc(100%+12px)] z-50 w-[min(400px,93vw)]",
        "rounded-3xl border overflow-hidden",
        "border-[rgb(var(--border))]",
        "bg-[rgb(var(--card))]",
        "shadow-[0_8px_40px_-4px_rgb(0,0,0,0.18),0_2px_16px_-2px_rgb(0,0,0,0.1)]",
        "dark:shadow-[0_8px_40px_-4px_rgb(0,0,0,0.5),0_2px_16px_-2px_rgb(0,0,0,0.3)]",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5
                      border-b border-[rgb(var(--border))]
                      bg-[rgb(var(--card2)/0.6)]">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-xl grid place-items-center
                          bg-[rgb(var(--primary)/0.12)] ring-1 ring-[rgb(var(--primary)/0.2)]">
            <Bell size={14} className="text-[rgb(var(--primary))]" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[rgb(var(--fg))] leading-tight">
              Notifications
            </div>
            {unread > 0 ? (
              <div className="text-[11px] text-[rgb(var(--primary))] font-semibold leading-tight">
                {unread} unread
              </div>
            ) : (
              <div className="text-[11px] text-[rgb(var(--muted))] leading-tight">
                All caught up
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={async () => {
              if (markingAll) return;
              setErr(null);
              setMarkingAll(true);
              try {
                const res = await fetch("/api/notifications/read-all", { method: "POST" });
                if (!res.ok) throw new Error();
                setItems(p => p.map(x => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
                setUnread(0);
              } catch {
                setErr("Failed to mark all as read.");
              } finally {
                setMarkingAll(false);
              }
            }}
            disabled={markingAll || unread === 0}
            className={[
              "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5",
              "text-[11px] font-semibold transition-all duration-150",
              "border-[rgb(var(--border))] bg-[rgb(var(--card2))]",
              "text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] hover:shadow-sm",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            <CheckCheck size={12} />
            <span>Mark all read</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setOpen(false)}
            className="rounded-xl border p-1.5 transition-all duration-150
                       border-[rgb(var(--border))] bg-[rgb(var(--card2))]
                       text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]
                       hover:bg-[rgb(var(--card))] hover:shadow-sm"
          >
            <X size={13} />
          </motion.button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        {loading ? (
          <div className="space-y-2.5 p-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="rounded-2xl border border-[rgb(var(--border))] p-3.5
                                      bg-[rgb(var(--card2))] animate-pulse"
                   style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-xl bg-[rgb(var(--border))]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded-full bg-[rgb(var(--border))]" />
                    <div className="h-2.5 w-full rounded-full bg-[rgb(var(--border)/0.6)]" />
                    <div className="h-2 w-1/3 rounded-full bg-[rgb(var(--border)/0.4)]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : err ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-rose-500/30 bg-rose-500/8 p-3.5
                       text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2.5"
          >
            <span className="text-base">⚠️</span>
            {err}
          </motion.div>
        ) : !hasItems ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 py-8 text-center"
          >
            <div className="h-12 w-12 rounded-2xl grid place-items-center
                            bg-[rgb(var(--border)/0.4)] border border-[rgb(var(--border))]">
              <Bell size={20} className="text-[rgb(var(--muted))] opacity-60" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[rgb(var(--fg))] opacity-70">
                No notifications
              </div>
              <div className="text-xs text-[rgb(var(--muted))] mt-0.5">
                You're all caught up!
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            <div
              style={{
                maxHeight: showAll ? 356 : undefined,
                overflowY: showAll ? "auto" : "visible",
                overflowX: "visible",
                paddingLeft: 4,
                paddingRight: showAll ? 14 : 4,
                paddingTop: 4,
                paddingBottom: 4,
              }}
              className="space-y-2"
            >
              <AnimatePresence initial={false}>
                {shown.map(n => {
                  const isUnread = !n.readAt;
                  const data = safeParseData(n.data);
                  const viewer = (data.viewer as ViewerHint | undefined) ?? null;
                  return (
                    <NotiRow
                      key={n.id}
                      n={n}
                      isUnread={isUnread}
                      viewer={viewer}
                      deleting={deletingId === n.id}
                      setDraggingId={setDraggingId}
                      onDelete={deleteOne}
                      onOpen={openNotification}
                    />
                  );
                })}
              </AnimatePresence>
            </div>

            {items.length > 3 && (
              <div className="mt-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowAll(v => !v)}
                  className="w-full rounded-xl border px-3 py-2.5 text-xs font-semibold
                             border-[rgb(var(--border))] bg-[rgb(var(--card2))]
                             text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] hover:shadow-sm
                             flex items-center justify-center gap-2 transition-all duration-150"
                >
                  <span>
                    {showAll ? "Show less" : `Show all ${items.length} notifications`}
                  </span>
                  <motion.div
                    animate={{ rotate: showAll ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={13} />
                  </motion.div>
                </motion.button>
              </div>
            )}

            <div className="mt-2.5 pt-2.5 border-t border-[rgb(var(--border)/0.6)]">
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setConfirmClearOpen(true)}
                className="w-full rounded-xl px-3 py-2 text-xs font-semibold
                           text-rose-500 dark:text-rose-400
                           hover:bg-rose-500/8 transition-all duration-150
                           flex items-center justify-center gap-1.5"
              >
                <Trash2 size={12} />
                <span>Clear all</span>
              </motion.button>
            </div>

            {/* Confirm modal */}
            <AnimatePresence>
              {confirmClearOpen && (
                <motion.div
                  className="absolute inset-0 z-[60] grid place-items-center p-4 rounded-3xl"
                  style={{ backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.25)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onMouseDown={() => setConfirmClearOpen(false)}
                >
                  <motion.div
                    className="w-full max-w-[300px] rounded-2xl border p-4
                               border-[rgb(var(--border))]
                               bg-[rgb(var(--card))]
                               shadow-[0_20px_60px_rgb(0,0,0,0.25)]"
                    initial={{ y: 16, scale: 0.96, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1 }}
                    exit={{ y: 16, scale: 0.96, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                    onMouseDown={e => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-9 w-9 rounded-xl grid place-items-center
                                      bg-rose-500/12 border border-rose-500/25 shrink-0">
                        <Trash2 size={16} className="text-rose-500" />
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-[rgb(var(--fg))]">
                          Clear all notifications?
                        </div>
                        <div className="mt-1 text-xs text-[rgb(var(--muted2))] leading-relaxed">
                          This can't be undone. All notifications will be removed.
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmClearOpen(false)}
                        className="rounded-xl border px-3 py-1.5 text-xs font-semibold
                                   border-[rgb(var(--border))] bg-[rgb(var(--card2))]
                                   text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setErr(null);
                          try {
                            const res = await fetch("/api/notifications/clear-all", { method: "POST" });
                            if (!res.ok) throw new Error();
                            setItems([]);
                            setUnread(0);
                            setShowAll(false);
                            setConfirmClearOpen(false);
                          } catch {
                            setErr("Failed to clear.");
                            setConfirmClearOpen(false);
                          }
                        }}
                        className="rounded-xl px-3 py-1.5 text-xs font-bold text-white
                                   bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm
                                   shadow-rose-500/30"
                      >
                        Clear all
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  ), [
    unread, markingAll, loading, err, hasItems, items, shown, showAll,
    deletingId, confirmClearOpen, dashboardHref, router,
  ]);

  return (
    <div ref={rootRef} className="relative">
      <BellButton unread={unread} onClick={() => setOpen(v => !v)} />
      <AnimatePresence initial={false}>{open ? panel : null}</AnimatePresence>
    </div>
  );
}