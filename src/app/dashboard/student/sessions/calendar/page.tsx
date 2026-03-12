"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import type { NavigateAction } from "react-big-calendar";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar as RBCalendar,
  dateFnsLocalizer,
  Views,
  type EventProps,
  type View,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";

import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";

const DnDCalendar = withDragAndDrop(RBCalendar);

type SessionRow = {
  id: string;
  scheduledAt: string;
  endsAt?: string | null;
  durationMin: number;
  status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | string;
  subject: { code: string; title: string };
  tutor: { id: string; name: string | null; email: string };
};

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

function endFromRow(s: SessionRow) {
  const start = new Date(s.scheduledAt).getTime();
  if (s.endsAt) return new Date(s.endsAt);
  return new Date(start + (s.durationMin ?? 60) * 60_000);
}

type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: SessionRow;
};

function prettyTime(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionEvent({ event }: EventProps<CalEvent>) {
  const s = event.resource;
  const pending = s.status === "PENDING";
  const accepted = s.status === "ACCEPTED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: "0.12em",
            padding: "2px 7px",
            borderRadius: 999,
            background: accepted
              ? "rgb(var(--primary) / 0.25)"
              : "rgb(var(--muted2) / 0.15)",
            color: accepted ? "rgb(var(--primary))" : "rgb(var(--muted))",
            border: accepted
              ? "1px solid rgb(var(--primary) / 0.4)"
              : "1px solid rgb(var(--border))",
            flexShrink: 0,
            textTransform: "uppercase",
          }}
        >
          {pending ? "Pending" : accepted ? "Accepted" : String(s.status)}
        </span>
      </div>

      <span
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: "rgb(var(--fg))",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
          lineHeight: 1.3,
        }}
        title={event.title}
      >
        {event.title}
      </span>

      <div
        style={{
          fontSize: 10,
          color: "rgb(var(--muted2))",
          fontWeight: 600,
          marginTop: "auto",
          letterSpacing: "0.02em",
        }}
      >
        {format(event.start, "HH:mm")} – {format(event.end, "HH:mm")}
      </div>
    </div>
  );
}

/* ─── tiny icon helpers ─── */
const IconCalendar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconDrag = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5 9 2 12 5 15" />
    <polyline points="9 5 12 2 15 5" />
    <polyline points="15 19 12 22 9 19" />
    <polyline points="19 9 22 12 19 15" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="12" y1="2" x2="12" y2="22" />
  </svg>
);

const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default function StudentSessionCalendarPage() {
  const [items, setItems] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);

  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState<Date>(new Date());

  const [conflict, setConflict] = useState<{ student: boolean; tutor: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  const [pendingDrop, setPendingDrop] = useState<{
    eventId: string;
    start: Date;
    end: Date;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sessions/my", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const events: CalEvent[] = useMemo(() => {
    return items
      .filter((s) => s.status === "PENDING" || s.status === "ACCEPTED")
      .map((s) => ({
        id: s.id,
        title: `${s.subject.code} — ${s.subject.title}`,
        start: new Date(s.scheduledAt),
        end: endFromRow(s),
        resource: s,
      }));
  }, [items]);

  const draggableAccessor = (event: CalEvent) => event.resource.status === "PENDING";

  function eventPropGetter(event: CalEvent) {
    const s = event.resource;
    const accepted = s.status === "ACCEPTED";
    const pending = s.status === "PENDING";

    return {
      style: {
        borderRadius: 10,
        border: `1.5px solid ${accepted ? "rgb(var(--primary) / 0.3)" : "rgb(var(--border))"}`,
        padding: "6px 9px",
        color: "rgb(var(--fg))",
        background: accepted
          ? "rgb(var(--primary) / 0.14)"
          : "rgb(var(--card2))",
        boxShadow: accepted
          ? "0 4px 16px rgb(var(--primary) / 0.18), inset 0 1px 0 rgb(var(--primary) / 0.2)"
          : "0 2px 10px rgb(var(--shadow) / 0.12)",
        opacity: pending ? 1 : 0.88,
        cursor: pending ? "grab" : "default",
        transition: "transform 140ms ease, box-shadow 140ms ease",
      } as React.CSSProperties,
    };
  }

  function dayPropGetter(d: Date) {
    const isToday = new Date().toDateString() === new Date(d).toDateString();
    return {
      style: {
        background: isToday ? "rgb(var(--primary) / 0.05)" : "transparent",
      },
    };
  }

  async function onEventDrop({
    event,
    start,
    end,
  }: {
    event: CalEvent;
    start: Date;
    end: Date;
    isAllDay: boolean;
  }) {
    if (event.resource.status !== "PENDING") {
      setMsg({ text: "Only PENDING sessions can be rescheduled.", type: "error" });
      return;
    }

    setMsg(null);
    setPendingDrop({ eventId: event.id, start, end });
    setChecking(true);
    setConflict(null);

    try {
      const res = await fetch(`/api/sessions/${event.id}/check-conflict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: start.toISOString() }),
      });
      const data = await res.json().catch(() => ({}));
      setConflict({ student: !!data.studentConflict, tutor: !!data.tutorConflict });
    } finally {
      setChecking(false);
    }
  }

  async function confirmReschedule() {
    if (!pendingDrop) return;
    const { eventId, start } = pendingDrop;
    setSaving(true);
    setMsg({ text: "Saving new time…", type: "info" });

    const prev = items;
    const newDurationMin = Math.max(
      30,
      Math.round((pendingDrop.end.getTime() - pendingDrop.start.getTime()) / 60000)
    );

    setItems((old) =>
      old.map((x) =>
        x.id === eventId
          ? { ...x, scheduledAt: start.toISOString(), durationMin: newDurationMin, endsAt: pendingDrop.end.toISOString() }
          : x
      )
    );

    try {
      const res = await fetch(`/api/sessions/${eventId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: start.toISOString() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setItems(prev);
        setMsg({ text: data?.message ?? "Reschedule failed — conflict detected.", type: "error" });
        return;
      }

      setMsg({ text: "Session rescheduled successfully!", type: "success" });
      setPendingDrop(null);
      setConflict(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function cancelReschedule() {
    setPendingDrop(null);
    setConflict(null);
    setMsg({ text: "Reschedule cancelled.", type: "info" });
  }

  return (
    <div className="space-y-5">
      <style jsx global>{`
        /* ── Base calendar reset ───────────────────────── */
        .rbc-calendar {
          font-family: inherit;
          color: rgb(var(--fg));
        }

        /* ── Toolbar ───────────────────────────────────── */
        .rbc-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .rbc-toolbar .rbc-toolbar-label {
          font-weight: 800;
          font-size: 15px;
          color: rgb(var(--fg));
          letter-spacing: -0.01em;
          flex: 1;
          text-align: center;
        }
        .rbc-btn-group {
          display: flex;
          gap: 3px;
        }
        .rbc-btn-group button {
          border: 1.5px solid rgb(var(--border));
          background: rgb(var(--card2));
          color: rgb(var(--muted));
          padding: 6px 13px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 150ms ease;
          outline: none;
        }
        .rbc-btn-group button:hover {
          background: rgb(var(--card));
          color: rgb(var(--fg));
          border-color: rgb(var(--primary) / 0.4);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgb(var(--shadow) / 0.15);
        }
        .rbc-btn-group button.rbc-active,
        .rbc-btn-group button.rbc-active:hover {
          background: rgb(var(--primary) / 0.15);
          border-color: rgb(var(--primary) / 0.45);
          color: rgb(var(--primary));
          box-shadow: 0 0 0 3px rgb(var(--primary) / 0.08);
        }

        /* ── Week / Day view ───────────────────────────── */
        .rbc-time-view {
          border: 1.5px solid rgb(var(--border));
          border-radius: 16px;
          overflow: hidden;
          background: rgb(var(--card));
        }
        .rbc-time-header {
          background: rgb(var(--card2));
        }
        .rbc-header {
          background: rgb(var(--card2));
          border-bottom: 1.5px solid rgb(var(--border));
          color: rgb(var(--muted));
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 8px 4px;
        }
        .rbc-header a, .rbc-header a:hover {
          color: inherit;
          text-decoration: none;
        }
        .rbc-time-content {
          border-top: 1.5px solid rgb(var(--border));
        }
        .rbc-timeslot-group {
          border-bottom: 1px solid rgb(var(--border));
          min-height: 48px;
        }
        .rbc-time-gutter .rbc-label,
        .rbc-label {
          color: rgb(var(--muted2));
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 0 10px;
        }
        .rbc-current-time-indicator {
          background: rgb(var(--primary));
          height: 2px;
          box-shadow: 0 0 8px rgb(var(--primary) / 0.6);
        }
        .rbc-current-time-indicator::before {
          background: rgb(var(--primary));
          border-radius: 50%;
          width: 8px;
          height: 8px;
          top: -3px;
        }

        /* ── Event hover ───────────────────────────────── */
        .rbc-event {
          transition: transform 140ms ease, box-shadow 140ms ease !important;
          outline: none !important;
        }
        .rbc-event:hover {
          transform: translateY(-2px) scale(1.01) !important;
          box-shadow: 0 8px 24px rgb(var(--shadow) / 0.2) !important;
          z-index: 5;
        }
        .rbc-event:focus {
          outline: 2px solid rgb(var(--primary) / 0.5) !important;
          outline-offset: 2px;
        }
        .rbc-event.rbc-selected {
          box-shadow: 0 0 0 3px rgb(var(--primary) / 0.3) !important;
        }

        /* ── Drag ghost ────────────────────────────────── */
        .rbc-addons-dnd-drag-preview {
          opacity: 0.7 !important;
          border-radius: 10px !important;
          box-shadow: 0 12px 32px rgb(var(--shadow) / 0.3) !important;
          transform: rotate(1.5deg) !important;
        }

        /* ── Month view ────────────────────────────────── */
        .rbc-month-view {
          border: 1.5px solid rgb(var(--border));
          border-radius: 16px;
          overflow: hidden;
          background: rgb(var(--card));
        }
        .rbc-month-header {
          background: rgb(var(--card2));
          border-bottom: 1.5px solid rgb(var(--border));
        }
        .rbc-month-row {
          border-bottom: 1px solid rgb(var(--border));
        }
        .rbc-date-cell {
          color: rgb(var(--muted));
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
        }
        .rbc-date-cell.rbc-now {
          color: rgb(var(--primary));
          font-weight: 900;
        }
        .rbc-off-range-bg {
          background: rgb(var(--card2) / 0.4);
        }

        /* ── Today highlight ───────────────────────────── */
        .rbc-today {
          background: rgb(var(--primary) / 0.06) !important;
        }

        /* ── Agenda view ───────────────────────────────── */
        .rbc-agenda-view table.rbc-agenda-table {
          border: 1.5px solid rgb(var(--border));
          border-radius: 14px;
          overflow: hidden;
          background: rgb(var(--card));
          border-collapse: separate;
          border-spacing: 0;
        }
        .rbc-agenda-view .rbc-agenda-table thead tr th {
          background: rgb(var(--card2));
          color: rgb(var(--muted));
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 10px 14px;
          border-bottom: 1.5px solid rgb(var(--border));
        }
        .rbc-agenda-view .rbc-agenda-table tbody tr td {
          border-bottom: 1px solid rgb(var(--border));
          color: rgb(var(--fg));
          font-size: 12px;
          padding: 10px 14px;
        }
        .rbc-agenda-view .rbc-agenda-table tbody tr:last-child td {
          border-bottom: none;
        }
        .rbc-agenda-view .rbc-agenda-date-cell {
          color: rgb(var(--muted2));
          font-weight: 800;
          font-size: 11px;
          white-space: nowrap;
        }
        .rbc-agenda-view .rbc-agenda-time-cell {
          color: rgb(var(--muted));
          font-weight: 700;
          font-size: 11px;
          white-space: nowrap;
        }
        .rbc-agenda-view .rbc-agenda-event-cell {
          font-weight: 600;
        }
        .rbc-agenda-empty {
          color: rgb(var(--muted2));
          font-size: 12px;
          padding: 24px;
          text-align: center;
        }

        /* ── Popup ─────────────────────────────────────── */
        .rbc-overlay {
          background: rgb(var(--card2));
          border: 1.5px solid rgb(var(--border));
          border-radius: 14px;
          box-shadow: 0 16px 48px rgb(var(--shadow) / 0.25);
          padding: 8px;
        }
        .rbc-overlay-header {
          color: rgb(var(--muted));
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-bottom: 1px solid rgb(var(--border));
          padding: 6px 8px 10px;
          margin-bottom: 6px;
        }

        /* ═══════════════ DARK MODE ════════════════════ */
        .dark .rbc-calendar { background: transparent; }

        .dark .rbc-time-view,
        .dark .rbc-month-view {
          border-color: rgb(60 75 100 / 0.5) !important;
        }
        .dark .rbc-header,
        .dark .rbc-time-header {
          background: rgb(var(--card2));
          border-color: rgb(60 75 100 / 0.5) !important;
        }
        .dark .rbc-time-content {
          border-color: rgb(60 75 100 / 0.5) !important;
          border-left: 0 !important;
        }
        .dark .rbc-timeslot-group {
          border-color: rgb(60 75 100 / 0.4) !important;
        }
        .dark .rbc-time-slot {
          border-color: rgb(60 75 100 / 0.25) !important;
        }
        .dark .rbc-day-bg + .rbc-day-bg {
          border-color: rgb(60 75 100 / 0.4) !important;
        }
        .dark .rbc-time-content > * + * > * {
          border-color: rgb(60 75 100 / 0.4) !important;
        }
        .dark .rbc-time-header-content > * + * {
          border-color: rgb(60 75 100 / 0.4) !important;
        }
        .dark .rbc-time-gutter,
        .dark .rbc-time-header-gutter {
          border-color: rgb(60 75 100 / 0.4) !important;
        }
        .dark .rbc-time-header-content {
          border-color: rgb(60 75 100 / 0.4) !important;
        }
        .dark .rbc-off-range-bg { background: rgb(20 28 46 / 0.4); }
        .dark .rbc-today { background: rgb(var(--primary) / 0.07) !important; }
        .dark .rbc-month-row { border-color: rgb(60 75 100 / 0.35) !important; }
        .dark .rbc-agenda-view table.rbc-agenda-table {
          border-color: rgb(60 75 100 / 0.5) !important;
        }
        .dark .rbc-agenda-view .rbc-agenda-table thead tr th {
          border-color: rgb(60 75 100 / 0.5) !important;
        }
        .dark .rbc-agenda-view .rbc-agenda-table tbody tr td {
          border-color: rgb(60 75 100 / 0.35) !important;
        }
        .dark .rbc-overlay {
          background: rgb(var(--card2));
          border-color: rgb(60 75 100 / 0.5);
        }

        /* ── Spinner ────────────────────────────────────── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .cal-spinner {
          width: 28px; height: 28px;
          border: 3px solid rgb(var(--border));
          border-top-color: rgb(var(--primary));
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── Fade-in ────────────────────────────────────── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cal-fadein { animation: fadeUp 0.35s ease both; }

        /* ── Toast pulse ─────────────────────────────────── */
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cal-toast { animation: toastIn 0.25s ease both; }

        /* ── Modal backdrop ─────────────────────────────── */
        @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .cal-backdrop { animation: backdropIn 0.2s ease both; }
        .cal-modal   { animation: modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      {/* ─── Header card ─── */}
      <div
        className="cal-fadein rounded-2xl border px-6 py-5"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--card) / 0.75)",
          boxShadow: "0 1px 3px rgb(var(--shadow) / 0.08), 0 8px 24px rgb(var(--shadow) / 0.06)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 40,
                height: 40,
                background: "rgb(var(--primary) / 0.12)",
                color: "rgb(var(--primary))",
                border: "1.5px solid rgb(var(--primary) / 0.2)",
              }}
            >
              <IconCalendar />
            </div>
            <div>
              <h1
                className="text-xl font-bold tracking-tight"
                style={{ color: "rgb(var(--fg))", letterSpacing: "-0.02em" }}
              >
                My Sessions
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                Drag to reschedule · PENDING sessions only
              </p>
            </div>
          </div>

          {/* Legend pills */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-700"
              style={{
                border: "1.5px solid rgb(var(--border))",
                background: "rgb(var(--card2))",
                color: "rgb(var(--muted))",
                fontWeight: 700,
              }}
            >
              <IconDrag />
              Pending
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
              style={{
                border: "1.5px solid rgb(var(--primary) / 0.3)",
                background: "rgb(var(--primary) / 0.1)",
                color: "rgb(var(--primary))",
                fontWeight: 700,
              }}
            >
              <IconLock />
              Accepted
            </span>
          </div>
        </div>
      </div>

      {/* ─── Toast message ─── */}
      {msg && (
        <div
          className="cal-toast rounded-xl px-4 py-3 text-sm flex items-center gap-2.5"
          style={{
            border: `1.5px solid ${
              msg.type === "error"
                ? "rgb(239 68 68 / 0.35)"
                : msg.type === "success"
                ? "rgb(34 197 94 / 0.35)"
                : "rgb(var(--border))"
            }`,
            background:
              msg.type === "error"
                ? "rgb(239 68 68 / 0.08)"
                : msg.type === "success"
                ? "rgb(34 197 94 / 0.08)"
                : "rgb(var(--card) / 0.7)",
            color:
              msg.type === "error"
                ? "rgb(239 68 68)"
                : msg.type === "success"
                ? "rgb(34 197 94)"
                : "rgb(var(--fg))",
            fontWeight: 600,
          }}
        >
          {msg.type === "error" && <IconWarning />}
          {msg.type === "success" && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {msg.type === "info" && <IconClock />}
          {msg.text}
        </div>
      )}

      {/* ─── Calendar card ─── */}
      <div
        className="cal-fadein rounded-2xl border overflow-hidden"
        style={{
          borderColor: "rgb(var(--border))",
          background: "rgb(var(--card) / 0.75)",
          boxShadow: "0 1px 3px rgb(var(--shadow) / 0.06), 0 12px 40px rgb(var(--shadow) / 0.08)",
          backdropFilter: "blur(8px)",
          animationDelay: "0.06s",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div className="cal-spinner" />
            <p className="text-xs font-700" style={{ color: "rgb(var(--muted2))", fontWeight: 700 }}>
              Loading sessions…
            </p>
          </div>
        ) : (
          <div className="p-4">
            <div style={{ height: 680 }}>
              <DnDCalendar
                localizer={localizer}
                events={events}
                view={view}
                date={date}
                onView={(v: View) => setView(v)}
                onNavigate={(d: Date, _view: View, _action: NavigateAction) => setDate(d)}
                views={[Views.DAY, Views.WEEK, Views.AGENDA]}
                step={30}
                timeslots={2}
                popup
                resizable={false}
                onEventDrop={onEventDrop}
                draggableAccessor={draggableAccessor}
                eventPropGetter={eventPropGetter}
                dayPropGetter={dayPropGetter}
                components={{ event: SessionEvent }}
              />
            </div>

            {/* Conflict warning inline */}
            {(checking || (conflict && (conflict.student || conflict.tutor))) && (
              <div
                className="mt-3 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs"
                style={{
                  border: "1.5px solid rgb(239 68 68 / 0.35)",
                  background: "rgb(239 68 68 / 0.07)",
                  color: "rgb(239 68 68)",
                  fontWeight: 700,
                }}
              >
                {checking ? (
                  <>
                    <div style={{ width: 14, height: 14, border: "2px solid rgb(239 68 68 / 0.35)", borderTopColor: "rgb(239 68 68)", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                    Checking for conflicts…
                  </>
                ) : (
                  <>
                    <IconWarning />
                    Conflict detected:{" "}
                    {conflict?.student ? "you already have a session at this time. " : ""}
                    {conflict?.tutor ? "tutor is unavailable. " : ""}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Confirm reschedule modal ─── */}
      {pendingDrop && (
        <div
          className="cal-backdrop fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: "rgb(0 0 0 / 0.45)", backdropFilter: "blur(4px)" }}
          onMouseDown={cancelReschedule}
        >
          <div
            className="cal-modal w-full max-w-sm rounded-2xl border p-6"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgb(var(--card2))",
              boxShadow: "0 24px 80px rgb(var(--shadow) / 0.4)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 38,
                  height: 38,
                  background: "rgb(var(--primary) / 0.12)",
                  color: "rgb(var(--primary))",
                  border: "1.5px solid rgb(var(--primary) / 0.2)",
                  flexShrink: 0,
                }}
              >
                <IconClock />
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "rgb(var(--fg))", letterSpacing: "-0.01em" }}>
                  Confirm Reschedule
                </div>
                <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                  Review the new time below
                </div>
              </div>
            </div>

            {/* Time block */}
            <div
              className="rounded-xl px-4 py-3.5 mb-5"
              style={{
                border: "1.5px solid rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              <div className="text-xs font-800 mb-1" style={{ color: "rgb(var(--muted))", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                New time
              </div>
              <div className="font-bold text-sm" style={{ color: "rgb(var(--fg))", letterSpacing: "-0.01em" }}>
                {prettyTime(pendingDrop.start)}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted2))", fontWeight: 600 }}>
                Until {prettyTime(pendingDrop.end)}
              </div>
            </div>

            {/* Conflict warning inside modal */}
            {conflict && (conflict.student || conflict.tutor) && (
              <div
                className="rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2 text-xs"
                style={{
                  border: "1.5px solid rgb(239 68 68 / 0.35)",
                  background: "rgb(239 68 68 / 0.08)",
                  color: "rgb(239 68 68)",
                  fontWeight: 600,
                }}
              >
                <IconWarning />
                <span>
                  {conflict.student ? "You have a conflicting session. " : ""}
                  {conflict.tutor ? "Tutor is unavailable at this time. " : ""}
                  Saving may be rejected.
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelReschedule}
                disabled={saving}
                className="flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition-all"
                style={{
                  border: "1.5px solid rgb(var(--border))",
                  background: "rgb(var(--card))",
                  color: "rgb(var(--fg))",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.5 : 1,
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmReschedule}
                disabled={saving}
                className="flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition-all"
                style={{
                  background: saving ? "rgb(var(--primary) / 0.6)" : "rgb(var(--primary))",
                  color: "#fff",
                  border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  boxShadow: saving ? "none" : "0 4px 14px rgb(var(--primary) / 0.35)",
                }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    Saving…
                  </span>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>

            <p className="mt-3 text-center text-xs" style={{ color: "rgb(var(--muted2))", fontWeight: 500 }}>
              Conflicts will cause the server to reject this change.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}