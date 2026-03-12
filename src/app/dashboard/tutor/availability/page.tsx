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

// Count open days for stat display
function countStats(av: AvailabilityState) {
  const openDays = av.filter((d) => !d.off);
  const totalSlots = openDays.reduce((acc, d) => acc + d.slots.filter(isValidSlot).length, 0);
  return { openDays: openDays.length, totalSlots };
}

export default function TutorAvailabilityPage() {
  const [availability, setAvailability] = useState<AvailabilityState>(makeDefaultAvailability());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const pretty = useMemo(() => availabilityToPrettyText(availability), [availability]);
  const stats = useMemo(() => countStats(availability), [availability]);
  const isValid = validateAvailability(availability).ok;

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
    setSaved(false);
    const v = validateAvailability(availability);
    if (!v.ok) {
      setMsg({ text: v.message || "Availability invalid", type: "error" });
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
      setMsg({ text: "Availability saved successfully!", type: "success" });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setMsg({ text: e?.message ?? "Something went wrong", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(var(--primary), 0.35); }
          70%  { box-shadow: 0 0 0 8px rgba(var(--primary), 0); }
          100% { box-shadow: 0 0 0 0 rgba(var(--primary), 0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes checkPop {
          0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0.7); opacity: 0; }
          80%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); }
        }

        .avail-page { animation: fadeSlideIn 0.45s cubic-bezier(.22,.68,0,1.2) both; }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px 5px 8px;
          border-radius: 999px;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card2));
          font-size: 12px;
          font-weight: 600;
          color: rgb(var(--fg));
          animation: badgePop 0.4s cubic-bezier(.22,.68,0,1.2) both;
          transition: border-color 0.2s, background 0.2s;
        }
        .stat-pill:hover {
          border-color: rgb(var(--primary) / 0.5);
          background: rgb(var(--primary) / 0.06);
        }
        .stat-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgb(var(--primary));
          flex-shrink: 0;
        }

        .heatmap-card {
          border-radius: 20px;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card) / 0.75);
          backdrop-filter: blur(12px);
          padding: 20px;
          animation: fadeSlideIn 0.5s 0.1s cubic-bezier(.22,.68,0,1.2) both;
          transition: box-shadow 0.25s;
        }
        .heatmap-card:hover {
          box-shadow: 0 4px 32px rgb(var(--primary) / 0.08);
        }

        .preview-card {
          border-radius: 16px;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card2));
          padding: 14px 16px;
          animation: fadeSlideIn 0.5s 0.2s cubic-bezier(.22,.68,0,1.2) both;
        }
        .preview-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgb(var(--muted));
          margin-bottom: 6px;
        }
        .preview-text {
          font-size: 12px;
          color: rgb(var(--fg));
          line-height: 1.6;
        }

        .save-btn {
          width: 100%;
          padding: 11px 0;
          border-radius: 12px;
          background: rgb(var(--primary));
          color: white;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.02em;
          border: none;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          animation: fadeSlideIn 0.5s 0.3s cubic-bezier(.22,.68,0,1.2) both;
        }
        .save-btn:not(:disabled):hover {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgb(var(--primary) / 0.35);
        }
        .save-btn:not(:disabled):active {
          transform: translateY(0px);
          box-shadow: none;
        }
        .save-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .save-btn.saving {
          background: linear-gradient(90deg,
            rgb(var(--primary)) 0%,
            rgb(var(--primary) / 0.7) 50%,
            rgb(var(--primary)) 100%);
          background-size: 200% auto;
          animation: shimmer 1.4s linear infinite;
        }
        .save-btn.saved { animation: pulseRing 0.6s ease-out; }

        .btn-inner {
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .check-icon {
          animation: checkPop 0.4s cubic-bezier(.22,.68,0,1.2) both;
        }

        .toast {
          border-radius: 14px;
          border: 1px solid rgb(var(--border));
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 500;
          display: flex; align-items: center; gap: 8px;
          animation: fadeSlideIn 0.35s cubic-bezier(.22,.68,0,1.2) both;
        }
        .toast.success {
          background: rgb(34 197 94 / 0.1);
          border-color: rgb(34 197 94 / 0.3);
          color: rgb(21 128 61);
        }
        .toast.error {
          background: rgb(239 68 68 / 0.08);
          border-color: rgb(239 68 68 / 0.3);
          color: rgb(185 28 28);
        }
        :is(.dark, [data-theme="dark"]) .toast.success { color: rgb(134 239 172); }
        :is(.dark, [data-theme="dark"]) .toast.error  { color: rgb(252 165 165); }

        .back-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 12px; font-weight: 600;
          color: rgb(var(--muted));
          text-decoration: none;
          padding: 5px 10px;
          border-radius: 8px;
          border: 1px solid transparent;
          transition: color 0.2s, border-color 0.2s, background 0.2s;
        }
        .back-link:hover {
          color: rgb(var(--fg));
          border-color: rgb(var(--border));
          background: rgb(var(--card2));
        }

        .section-divider {
          height: 1px;
          background: linear-gradient(90deg,
            transparent, rgb(var(--border)), transparent);
          border: none;
          margin: 0;
        }

        .loading-skeleton {
          border-radius: 20px;
          border: 1px solid rgb(var(--border));
          background: linear-gradient(90deg,
            rgb(var(--card2)) 0%,
            rgb(var(--border) / 0.5) 50%,
            rgb(var(--card2)) 100%);
          background-size: 200% auto;
          animation: shimmer 1.5s linear infinite;
          height: 260px;
        }
      `}</style>

      <div className="avail-page mx-auto w-full max-w-5xl space-y-4">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {/* Calendar icon */}
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "rgb(var(--primary) / 0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="rgb(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="3"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8"  y1="2" x2="8"  y2="6"/>
                  <line x1="3"  y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "rgb(var(--fg))", lineHeight: 1 }}>
                Edit Availability
              </h1>
            </div>
            <p style={{ fontSize: 12, color: "rgb(var(--muted))", paddingLeft: 44 }}>
              Paint the grid to set when students can book you.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Stats pills */}
            {!loading && (
              <>
                <div className="stat-pill" style={{ animationDelay: "0.1s" }}>
                  <span className="stat-dot" />
                  {stats.openDays} day{stats.openDays !== 1 ? "s" : ""}
                </div>
                <div className="stat-pill" style={{ animationDelay: "0.18s" }}>
                  <span className="stat-dot" style={{ background: "rgb(99 102 241)" }} />
                  {stats.totalSlots} slot{stats.totalSlots !== 1 ? "s" : ""}
                </div>
              </>
            )}
            
          </div>
        </div>

        <hr className="section-divider" />

        {/* ── Body ── */}
        {loading ? (
          <div className="loading-skeleton" />
        ) : (
          <>
            {/* Heatmap card */}
            <div className="heatmap-card">
              <AvailabilityHeatmap value={availability} onChange={setAvailability} stepMin={30} />
            </div>

            {/* Preview */}
            <div className="preview-card">
              <div className="preview-label">Preview</div>
              <div className="preview-text">{pretty}</div>
            </div>

            {/* Save button */}
            <button
              type="button"
              onClick={save}
              disabled={saving || !isValid}
              className={`save-btn${saving ? " saving" : ""}${saved ? " saved" : ""}`}
            >
              <span className="btn-inner">
                {saving ? (
                  <>
                    <span className="spinner" />
                    Saving…
                  </>
                ) : saved ? (
                  <>
                    <svg className="check-icon" width="15" height="15" viewBox="0 0 24 24"
                      fill="none" stroke="white" strokeWidth="3"
                      strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Saved!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Save Availability
                  </>
                )}
              </span>
            </button>

            {/* Toast message */}
            {msg && (
              <div className={`toast ${msg.type}`}>
                {msg.type === "success" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
                {msg.text}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}