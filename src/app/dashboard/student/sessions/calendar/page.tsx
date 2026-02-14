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

/** ✅ Custom event UI: shows status pill + title */
function SessionEvent({ event }: EventProps<CalEvent>) {
  const s = event.resource;
  const pending = s.status === "PENDING";
  const accepted = s.status === "ACCEPTED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.08em",
            padding: "3px 8px",
            borderRadius: 999,
            border: `1px solid ${
              accepted ? "rgb(var(--primary) / 0.35)" : "rgb(var(--border))"
            }`,
            background: accepted ? "rgb(var(--primary) / 0.16)" : "rgb(var(--card))",
            color: accepted ? "rgb(var(--primary))" : "rgb(var(--muted))",
            flexShrink: 0,
          }}
        >
          {pending ? "PENDING" : accepted ? "ACCEPTED" : String(s.status)}
        </span>

        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "rgb(var(--fg))",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
          title={event.title}
        >
          {event.title}
        </span>
      </div>

      <div style={{ fontSize: 11, color: "rgb(var(--muted2))", fontWeight: 700 }}>
        {format(event.start, "HH:mm")} – {format(event.end, "HH:mm")}
      </div>
    </div>
  );
}

export default function StudentSessionCalendarPage() {
  const [items, setItems] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ CONTROLLED VIEW + DATE (fixes Day/Week/Agenda buttons)
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

  // ✅ Only PENDING draggable
  const draggableAccessor = (event: CalEvent) => event.resource.status === "PENDING";

  function eventPropGetter(event: CalEvent) {
    const s = event.resource;
    const accepted = s.status === "ACCEPTED";
    const pending = s.status === "PENDING";

    return {
      style: {
        borderRadius: 12,
        border: `1px solid ${
          accepted ? "rgb(var(--primary) / 0.25)" : "rgb(var(--border))"
        }`,
        padding: "8px 10px",
        color: "rgb(var(--fg))",
        background: accepted ? "rgb(var(--primary) / 0.22)" : "rgb(var(--card2))",
        boxShadow: accepted
          ? "0 10px 26px rgb(var(--shadow) / 0.20)"
          : "0 8px 18px rgb(var(--shadow) / 0.14)",
        opacity: pending ? 1 : 0.9,
        cursor: pending ? "grab" : "not-allowed",
      } as React.CSSProperties,
    };
  }

  function dayPropGetter(d: Date) {
    const isToday = new Date().toDateString() === new Date(d).toDateString();
    return {
      style: {
        background: isToday ? "rgb(var(--primary) / 0.06)" : "transparent",
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
      setMsg("Only PENDING sessions can be moved.");
      return;
    }

    setMsg(null);
    setPendingDrop({ eventId: event.id, start, end });

    setChecking(true);
    try {
      const res = await fetch(`/api/sessions/${event.id}/check-conflict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: start.toISOString() }),
      });

      const data = await res.json().catch(() => ({}));
      setConflict({
        student: !!data.studentConflict,
        tutor: !!data.tutorConflict,
      });
    } finally {
      setChecking(false);
    }
  }

  async function confirmReschedule() {
    if (!pendingDrop) return;

    const { eventId, start } = pendingDrop;

    setSaving(true);
    setMsg("Saving new time…");

    const prev = items;
    const newDurationMin = Math.max(
      30,
      Math.round((pendingDrop.end.getTime() - pendingDrop.start.getTime()) / 60000)
    );

    // optimistic UI
    setItems((old) =>
      old.map((x) =>
        x.id === eventId
          ? {
              ...x,
              scheduledAt: start.toISOString(),
              durationMin: newDurationMin,
              endsAt: pendingDrop.end.toISOString(),
            }
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
        setMsg(data?.message ?? "Reschedule failed (conflict).");
        return;
      }

      setMsg("✅ Rescheduled!");
      setPendingDrop(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function cancelReschedule() {
    setPendingDrop(null);
    setMsg("Reschedule cancelled.");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border p-6 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
        <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">My Sessions Calendar</h1>
        <p className="mt-1 text-sm text-[rgb(var(--muted))]">
          Drag a session to reschedule. (Only <b>PENDING</b> can be moved)
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1 text-[rgb(var(--fg))]">
            <span className="inline-block h-2 w-2 rounded-full bg-[rgb(var(--card))]" />
            Pending (draggable)
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--primary)/0.25)] bg-[rgb(var(--primary)/0.14)] px-3 py-1 text-[rgb(var(--primary))]">
            <span className="inline-block h-2 w-2 rounded-full bg-[rgb(var(--primary))]" />
            Accepted (locked)
          </span>
        </div>
      </div>

      {msg && (
        <div className="rounded-2xl border p-4 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] text-sm text-[rgb(var(--fg))]">
          {msg}
        </div>
      )}

      <div className="rounded-3xl border p-4 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]">
        {loading ? (
          <div className="text-sm text-[rgb(var(--muted2))]">Loading…</div>
        ) : (
          <>
            <style jsx global>{`
              .rbc-calendar {
                color: rgb(var(--fg));
              }
              .rbc-toolbar {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 12px;
                position: relative;
                z-index: 5;
              }
              .rbc-toolbar .rbc-toolbar-label {
                font-weight: 900;
                color: rgb(var(--fg));
                letter-spacing: 0.01em;
              }
              .rbc-btn-group button {
                border: 1px solid rgb(var(--border));
                background: rgb(var(--card2));
                color: rgb(var(--fg));
                padding: 8px 10px;
                border-radius: 10px;
                font-size: 12px;
                font-weight: 800;
                transition: all 160ms ease;
              }
              .rbc-btn-group button:hover {
                transform: translateY(-1px);
                box-shadow: 0 10px 26px rgb(var(--shadow) / 0.18);
              }
              .rbc-btn-group button.rbc-active {
                background: rgb(var(--primary) / 0.16);
                border-color: rgb(var(--primary) / 0.35);
                color: rgb(var(--primary));
              }

              .rbc-time-view,
              .rbc-month-view {
                border: 1px solid rgb(var(--border));
                border-radius: 18px;
                overflow: hidden;
                background: rgb(var(--card));
              }
              .rbc-time-header,
              .rbc-header {
                background: rgb(var(--card2));
                border-bottom: 1px solid rgb(var(--border));
                color: rgb(var(--muted));
                font-size: 12px;
                font-weight: 900;
              }
              .rbc-time-content {
                border-top: 1px solid rgb(var(--border));
              }
              .rbc-timeslot-group {
                border-bottom: 1px solid rgb(var(--border));
              }
              .rbc-time-gutter,
              .rbc-label {
                color: rgb(var(--muted2));
                font-size: 11px;
                font-weight: 800;
              }

              .rbc-event {
                transition: transform 160ms ease, box-shadow 160ms ease;
              }
              .rbc-event:hover {
                transform: translateY(-1px);
                box-shadow: 0 14px 34px rgb(var(--shadow) / 0.22);
              }

              .rbc-agenda-view table.rbc-agenda-table {
                border: 1px solid rgb(var(--border));
                border-radius: 14px;
                overflow: hidden;
                background: rgb(var(--card));
              }
              .rbc-agenda-view .rbc-agenda-table thead {
                background: rgb(var(--card2));
              }
              .rbc-agenda-view .rbc-agenda-table th,
              .rbc-agenda-view .rbc-agenda-table td {
                border-bottom: 1px solid rgb(var(--border));
                color: rgb(var(--fg));
                font-size: 12px;
              }

              /* ================= DARK MODE CALENDAR ================= */
              .dark .rbc-calendar {
                background: rgb(var(--card));
              }
              .dark .rbc-time-view,
              .dark .rbc-month-view {
                background: rgb(var(--card));
                border: 1px solid rgb(60 75 100 / 0.55) !important;
              }
              .dark .rbc-header,
              .dark .rbc-time-header {
                background: rgb(var(--card2));
                color: rgb(var(--muted));
                border-bottom: 1px solid rgb(60 75 100 / 0.55) !important;
              }
              .dark .rbc-time-content {
                border-top: 1px solid rgb(60 75 100 / 0.55) !important;
                border-left: 0 !important;
              }
              .dark .rbc-timeslot-group {
                border-bottom: 1px solid rgb(60 75 100 / 0.45) !important;
              }
              .dark .rbc-time-slot {
                border-top: 1px solid rgb(60 75 100 / 0.35) !important;
              }
              .dark .rbc-day-bg + .rbc-day-bg {
                border-left: 1px solid rgb(60 75 100 / 0.45) !important;
              }
              .dark .rbc-time-content > * + * > * {
                border-left: 1px solid rgb(60 75 100 / 0.45) !important;
              }
              .dark .rbc-time-header-content > * + * {
                border-left: 1px solid rgb(60 75 100 / 0.45) !important;
              }
              .dark .rbc-time-gutter,
              .dark .rbc-time-header-gutter {
                border-right: 1px solid rgb(60 75 100 / 0.45) !important;
                border-left: 0 !important;
              }
              .dark .rbc-time-header-content {
                border-left: 1px solid rgb(60 75 100 / 0.45) !important;
                border-top: 0 !important;
              }
              .dark .rbc-time-header,
              .dark .rbc-time-header-gutter {
                border-top: 0 !important;
              }
              .dark .rbc-time-header-gutter + .rbc-time-header-content,
              .dark .rbc-time-gutter + .rbc-day-slot {
                border-left: 1px solid rgb(60 75 100 / 0.45) !important;
              }
              .dark .rbc-off-range-bg {
                background: rgb(30 40 60 / 0.35);
              }
              .dark .rbc-today {
                background: rgb(var(--primary) / 0.08);
              }
              .dark .rbc-time-gutter,
              .dark .rbc-label {
                color: rgb(var(--muted2));
              }
              .dark .rbc-time-view,
              .dark .rbc-time-view .rbc-time-header,
              .dark .rbc-time-view .rbc-time-header-content,
              .dark .rbc-time-view .rbc-time-header-gutter,
              .dark .rbc-time-view .rbc-time-content,
              .dark .rbc-time-view .rbc-header,
              .dark .rbc-time-view .rbc-timeslot-group,
              .dark .rbc-time-view .rbc-day-bg,
              .dark .rbc-time-view .rbc-day-slot,
              .dark .rbc-time-view .rbc-time-gutter {
                border-color: rgb(60 75 100 / 0.45) !important;
              }
              .dark .rbc-time-view .rbc-time-header-content,
              .dark .rbc-time-view .rbc-time-content {
                box-shadow: inset -1px 0 0 rgb(60 75 100 / 0.45) !important;
              }
              .dark .rbc-time-header-content .rbc-header:last-child {
                border-right: 0 !important;
                box-shadow: inset -1px 0 0 rgb(60 75 100 / 0.45) !important;
              }
              .dark .rbc-agenda-view table,
              .dark .rbc-agenda-view th,
              .dark .rbc-agenda-view td {
                border-color: rgb(60 75 100 / 0.45) !important;
              }
              .dark .rbc-agenda-view th + th,
              .dark .rbc-agenda-view td + td {
                border-left: 1px solid rgb(60 75 100 / 0.45) !important;
              }
              .dark .rbc-agenda-view table {
                background: rgb(var(--card)) !important;
              }
            `}</style>

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

            {checking && (
              <div className="mt-3 text-xs text-[rgb(var(--muted2))]">Checking conflicts…</div>
            )}

            {conflict && (conflict.student || conflict.tutor) && (
              <div className="mt-3 rounded-2xl border p-3 border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400">
                Conflict detected:{" "}
                {conflict.student ? "you have another booking. " : ""}
                {conflict.tutor ? "tutor is busy. " : ""}
              </div>
            )}
          </>
        )}
      </div>

      {/* ✅ Confirm modal */}
      {pendingDrop && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onMouseDown={cancelReschedule}
        >
          <div
            className="w-full max-w-md rounded-3xl border p-5 border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-[0_30px_120px_rgb(var(--shadow)/0.35)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">Confirm reschedule</div>

            <div className="mt-3 text-xs text-[rgb(var(--muted))]">Move this session to:</div>

            <div className="mt-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                {prettyTime(pendingDrop.start)}
              </div>
              <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                Ends: {prettyTime(pendingDrop.end)}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={cancelReschedule}
                disabled={saving}
                className="flex-1 rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmReschedule}
                disabled={saving}
                className="flex-1 rounded-md px-3 py-2 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
            </div>

            <div className="mt-3 text-[11px] text-[rgb(var(--muted2))]">
              Note: if the tutor or you have a time conflict, it will be rejected.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
