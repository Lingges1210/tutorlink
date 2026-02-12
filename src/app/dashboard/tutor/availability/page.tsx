"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type DayKey = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
const DAY_LABEL: Record<DayKey, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

type TimeSlot = { start: string; end: string };
type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };
type AvailabilityState = DayAvailability[];

function makeDefaultAvailability(): AvailabilityState {
  return (Object.keys(DAY_LABEL) as DayKey[]).map((day) => ({
    day,
    off: false,
    slots: [{ start: "20:00", end: "22:00" }],
  }));
}

function isValidSlot(slot: TimeSlot) {
  if (!slot.start || !slot.end) return false;
  return slot.start < slot.end;
}

function validateAvailability(av: AvailabilityState): { ok: boolean; message?: string } {
  const anyDayOpen = av.some((d) => !d.off);
  if (!anyDayOpen) return { ok: false, message: "Please keep at least one day available (not Off)." };

  const anyValid = av.some((d) => !d.off && d.slots.some(isValidSlot));
  if (!anyValid) return { ok: false, message: "Please add at least one valid time slot (start < end)." };

  return { ok: true };
}

function tryParseAvailability(value: string): AvailabilityState | null {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const ok = parsed.every((d: any) => d && typeof d.day === "string" && typeof d.off === "boolean" && Array.isArray(d.slots));
    return ok ? (parsed as AvailabilityState) : null;
  } catch {
    return null;
  }
}

function availabilityToPrettyText(av: AvailabilityState) {
  return av
    .map((d) => {
      if (d.off) return `${DAY_LABEL[d.day]}: Off`;
      const slots = d.slots
        .filter((s) => s.start && s.end)
        .map((s) => `${s.start}–${s.end}`)
        .join(", ");
      return `${DAY_LABEL[d.day]}: ${slots || "—"}`;
    })
    .join(" • ");
}

function AvailabilityPicker({
  value,
  onChange,
}: {
  value: AvailabilityState;
  onChange: (next: AvailabilityState) => void;
}) {
  function setDayOff(day: DayKey, off: boolean) {
    onChange(value.map((d) => (d.day === day ? { ...d, off } : d)));
  }

  function setSlot(day: DayKey, idx: number, patch: Partial<TimeSlot>) {
    onChange(
      value.map((d) => {
        if (d.day !== day) return d;
        const slots = d.slots.map((s, i) => (i === idx ? { ...s, ...patch } : s));
        return { ...d, slots };
      })
    );
  }

  function addSlot(day: DayKey) {
    onChange(
      value.map((d) => (d.day === day ? { ...d, slots: [...d.slots, { start: "", end: "" }] } : d))
    );
  }

  function removeSlot(day: DayKey, idx: number) {
    onChange(
      value.map((d) => {
        if (d.day !== day) return d;
        const slots = d.slots.filter((_, i) => i !== idx);
        return { ...d, slots: slots.length ? slots : [{ start: "", end: "" }] };
      })
    );
  }

  return (
    <div className="space-y-3">
      {(Object.keys(DAY_LABEL) as DayKey[]).map((day) => {
        const d = value.find((x) => x.day === day)!;

        return (
          <div key={day} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">{DAY_LABEL[day]}</div>

              <label className="flex items-center gap-2 text-xs text-[rgb(var(--muted))]">
                <input type="checkbox" checked={d.off} onChange={(e) => setDayOff(day, e.target.checked)} />
                Off day
              </label>
            </div>

            <div className="mt-3 space-y-2">
              {d.off ? (
                <div className="text-xs text-[rgb(var(--muted))]">Marked as Off.</div>
              ) : (
                d.slots.map((slot, idx) => {
                  const invalid = slot.start && slot.end ? slot.start >= slot.end : false;

                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <div className="mb-1 text-[11px] text-[rgb(var(--muted))]">Start</div>
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => setSlot(day, idx, { start: e.target.value })}
                            className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 text-xs text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]"
                          />
                        </div>
                        <div>
                          <div className="mb-1 text-[11px] text-[rgb(var(--muted))]">End</div>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => setSlot(day, idx, { end: e.target.value })}
                            className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 text-xs text-[rgb(var(--fg))] outline-none focus:border-[rgb(var(--primary))]"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSlot(day, idx)}
                        className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 text-xs text-[rgb(var(--fg))] hover:opacity-80"
                        title="Remove slot"
                      >
                        ✕
                      </button>

                      {invalid && <div className="text-[11px] text-rose-500/90">End must be after start</div>}
                    </div>
                  );
                })
              )}

              {!d.off && (
                <button
                  type="button"
                  onClick={() => addSlot(day)}
                  className="mt-1 inline-flex items-center justify-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:opacity-90"
                >
                  + Add time slot
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TutorAvailabilityPage() {
  const [availability, setAvailability] = useState<AvailabilityState>(makeDefaultAvailability());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const pretty = useMemo(() => availabilityToPrettyText(availability), [availability]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const res = await fetch("/api/tutor/availability", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        const raw = typeof data?.availability === "string" ? data.availability : "";
        const parsed = raw ? tryParseAvailability(raw) : null;
        if (parsed) setAvailability(parsed);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setMsg(null);

    const v = validateAvailability(availability);
    if (!v.ok) {
      setMsg(v.message || "Availability invalid");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tutor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: JSON.stringify(availability) }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to save");

      setMsg("✅ Availability updated.");
    } catch (e: any) {
      setMsg(e?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Edit Availability</h1>
          <p className="mt-1 text-xs text-[rgb(var(--muted))]">Set when students can book you.</p>
        </div>

        <Link href="/dashboard/tutor" className="text-xs text-[rgb(var(--primary))] hover:underline">
          Back
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 text-sm text-[rgb(var(--muted))]">
          Loading…
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
            <AvailabilityPicker value={availability} onChange={setAvailability} />
          </div>

          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 text-xs text-[rgb(var(--muted))]">
            <div className="font-semibold text-[rgb(var(--fg))]">Preview:</div>
            <div className="mt-1">{pretty}</div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving || !validateAvailability(availability).ok}
            className="w-full rounded-md bg-[rgb(var(--primary))] py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Availability"}
          </button>

          {msg && (
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs text-[rgb(var(--fg))]">
              {msg}
            </div>
          )}
        </>
      )}
    </div>
  );
}
