"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: "PENDING" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | string;
  cancelReason: string | null;
  subject: { code: string; title: string };
  tutor: { id: string; name: string | null; programme: string | null; avatarUrl: string | null };
};

function formatLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function prettyDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function MyBookingsClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"RESCHEDULE" | "CANCEL" | null>(null);

  const [newTime, setNewTime] = useState(() => formatLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [reason, setReason] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sessions/my");
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
  const t = setInterval(() => {
    refresh();
  }, 10_000);

  return () => clearInterval(t);
}, []); // run once

  async function doReschedule() {
    if (!activeId) return;
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/sessions/${activeId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: new Date(newTime).toISOString() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(data?.message ?? "Reschedule failed.");
      else {
        setMsg("✅ Rescheduled!");
        setMode(null);
        setActiveId(null);
        await refresh();
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function doCancel() {
    if (!activeId) return;
    setActionLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/sessions/${activeId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(data?.message ?? "Cancel failed.");
      else {
        setMsg("✅ Cancelled.");
        setMode(null);
        setActiveId(null);
        setReason("");
        await refresh();
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
     <div
  className="
    rounded-3xl border p-6
    border-[rgb(var(--border))]
    bg-[rgb(var(--card) / 0.7)]
    shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]
  "
>
  <div className="flex items-center justify-between gap-4">
    <div>
      <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
        My Bookings
      </h1>
      <p className="mt-1 text-sm text-[rgb(var(--muted))]">
        Track your session requests and manage reschedules/cancellations.
      </p>
    </div>

    <a
      href="/dashboard/student/sessions/calendar"
      className="
        inline-flex items-center justify-center
        rounded-md px-4 py-2 text-xs font-semibold
        text-white bg-[rgb(var(--primary))]
        transition-all duration-200
        hover:-translate-y-0.5
        hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]
      "
    >
      📅 Open Calendar
    </a>
  </div>
</div>

      {msg && (
        <div className="rounded-2xl border p-4 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] text-sm text-[rgb(var(--fg))]">
          {msg}
        </div>
      )}

      <div
        className="
          rounded-3xl border p-5
          border-[rgb(var(--border))]
          bg-[rgb(var(--card) / 0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]
        "
      >
        {loading ? (
          <div className="text-sm text-[rgb(var(--muted2))]">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-[rgb(var(--muted2))]">No bookings yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((s) => {
              const closed = s.status === "CANCELLED" || s.status === "COMPLETED";
              return (
                <div
                  key={s.id}
                  className="
                    rounded-2xl border p-4
                    border-[rgb(var(--border))]
                    bg-[rgb(var(--card2))]
                  "
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                        {s.subject.code} — {s.subject.title}
                      </div>
                      <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                        Tutor: {s.tutor.name ?? "Tutor"} {s.tutor.programme ? `· ${s.tutor.programme}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                        {prettyDate(s.scheduledAt)} · {s.durationMin} min
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="
                          rounded-full px-3 py-1 text-xs font-semibold
                          border border-[rgb(var(--border))]
                          bg-[rgb(var(--card))]
                          text-[rgb(var(--fg))]
                        "
                      >
                        {s.status}
                      </span>

                      <button
                        type="button"
                        disabled={closed}
                        onClick={() => {
                          setActiveId(s.id);
                          setMode("RESCHEDULE");
                          setNewTime(formatLocalInputValue(new Date(s.scheduledAt)));
                          setMsg(null);
                        }}
                        className={[
                          "rounded-md px-3 py-2 text-xs font-semibold border",
                          "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]",
                          closed ? "opacity-60 cursor-not-allowed" : "hover:bg-[rgb(var(--card)/0.6)]",
                        ].join(" ")}
                      >
                        Reschedule
                      </button>

                      <button
                        type="button"
                        disabled={closed}
                        onClick={() => {
                          setActiveId(s.id);
                          setMode("CANCEL");
                          setReason("");
                          setMsg(null);
                        }}
                        className={[
                          "rounded-md px-3 py-2 text-xs font-semibold border",
                          "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]",
                          closed ? "opacity-60 cursor-not-allowed" : "hover:bg-[rgb(var(--card)/0.6)]",
                        ].join(" ")}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {s.status === "CANCELLED" && s.cancelReason && (
                    <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted2))]">
                      Reason: {s.cancelReason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {mode && activeId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onMouseDown={() => setMode(null)}>
          <div
            className="
              w-full max-w-md rounded-3xl border p-5
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
              shadow-[0_30px_120px_rgb(var(--shadow)/0.35)]
            "
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              {mode === "RESCHEDULE" ? "Reschedule booking" : "Cancel booking"}
            </div>

            {mode === "RESCHEDULE" ? (
              <div className="mt-4">
                <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
                  New date & time
                </label>
                <input
                  type="datetime-local"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="
                    w-full rounded-md border px-3 py-2 text-sm outline-none
                    border-[rgb(var(--border))]
                    bg-[rgb(var(--card))]
                    text-[rgb(var(--fg))]
                    focus:border-[rgb(var(--primary))]
                  "
                />
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
                  Reason (optional)
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. timetable clash"
                  className="
                    w-full rounded-md border px-3 py-2 text-sm outline-none
                    border-[rgb(var(--border))]
                    bg-[rgb(var(--card))]
                    text-[rgb(var(--fg))]
                    focus:border-[rgb(var(--primary))]
                  "
                />
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="
                  flex-1 rounded-md px-3 py-2 text-xs font-semibold
                  border border-[rgb(var(--border))]
                  bg-[rgb(var(--card))]
                  text-[rgb(var(--fg))]
                  hover:bg-[rgb(var(--card)/0.6)]
                "
              >
                Close
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={mode === "RESCHEDULE" ? doReschedule : doCancel}
                className={[
                  "flex-1 rounded-md px-3 py-2 text-xs font-semibold text-white",
                  "bg-[rgb(var(--primary))] transition-all duration-200",
                  actionLoading ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]",
                ].join(" ")}
              >
                {actionLoading ? "Working…" : mode === "RESCHEDULE" ? "Reschedule" : "Cancel booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
