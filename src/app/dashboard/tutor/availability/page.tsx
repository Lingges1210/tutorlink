"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AvailabilityHeatmap from "@/components/AvailabilityHeatmap";

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
    const ok = parsed.every(
      (d: any) =>
        d &&
        typeof d.day === "string" &&
        typeof d.off === "boolean" &&
        Array.isArray(d.slots)
    );
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

      setMsg("Availability updated.");
    } catch (e: any) {
      setMsg(e?.message ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Edit Availability</h1>
          <p className="mt-1 text-xs text-[rgb(var(--muted))]">
            Set when students can book you. (Drag to paint)
          </p>
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
          {/* bigger, centered heatmap card */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
            <AvailabilityHeatmap value={availability} onChange={setAvailability} stepMin={30} />
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
