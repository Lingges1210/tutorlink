// src/lib/tutorAvailability.ts
//
// Single source of truth for availability helpers.
// Reads from the APPROVED tutorApplication — same source as
// src/app/api/tutor/availability/route.ts

import { prisma } from "@/lib/prisma";

/* ── Types ──────────────────────────────────────────────────────────────── */

export type DayKey = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
export type TimeSlot = { start: string; end: string };
export type DayAvailability = { day: DayKey; off: boolean; slots: TimeSlot[] };

/* ── Malaysia timezone (UTC+8) ──────────────────────────────────────────── */

const MY_TZ_OFFSET_MIN = 8 * 60;

export function getMalaysiaParts(d: Date) {
  const shifted = new Date(d.getTime() + MY_TZ_OFFSET_MIN * 60_000);
  return {
    year:    shifted.getUTCFullYear(),
    month:   shifted.getUTCMonth(),
    date:    shifted.getUTCDate(),
    day:     shifted.getUTCDay(),   // 0 = Sun
    hours:   shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

export function sameMalaysiaYMD(a: Date, b: Date): boolean {
  const pa = getMalaysiaParts(a);
  const pb = getMalaysiaParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.date === pb.date;
}

export function toMinutes(hhmm: string): number {
  if (!hhmm) return 0;
  if (hhmm === "24:00") return 24 * 60;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m ?? 0);
}

export function dayKeyFromDate(d: Date): DayKey {
  const keys: DayKey[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return keys[getMalaysiaParts(d).day];
}

export function withinSlots(
  day: DayAvailability,
  startMin: number,
  endMin: number
): boolean {
  if (day.off) return false;
  if (!Array.isArray(day.slots) || day.slots.length === 0) return false;
  return day.slots.some((s) => {
    const a = toMinutes(s.start);
    const b = toMinutes(s.end);
    return startMin >= a && endMin <= b;
  });
}

/* ── Core: parse raw JSON string from tutorApplication.availability ─────── */

export function parseAvailabilityJson(
  raw: unknown
): DayAvailability[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const cleaned: DayAvailability[] = (parsed as unknown[])
      .filter(Boolean)
      .map((x) => {
        const entry = x as Record<string, unknown>;
        return {
          day:   entry.day as DayKey,
          off:   !!entry.off,
          slots: Array.isArray(entry.slots) ? (entry.slots as TimeSlot[]) : [],
        };
      })
      .filter((x) => typeof x.day === "string");
    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

/* ── DB fetch: mirrors the GET in /api/tutor/availability/route.ts ───────── */

export async function getTutorAvailability(
  tutorId: string
): Promise<DayAvailability[] | null> {
  const app = await prisma.tutorApplication
    .findFirst({
      where: { userId: tutorId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: { availability: true },
    })
    .catch(() => null);

  return parseAvailabilityJson(app?.availability ?? null);
}

/* ── High-level check ───────────────────────────────────────────────────── */

/**
 * Returns:
 *   true  — confirmed available in declared slots
 *   false — confirmed NOT available (block the action)
 *   null  — no availability data on record (caller decides; usually allow)
 */
export async function tutorDeclaredAvailable(
  tutorId: string,
  start: Date,
  end: Date
): Promise<true | false | null> {
  // Session spans midnight in MYT → always block
  if (!sameMalaysiaYMD(start, end)) return false;

  const avail = await getTutorAvailability(tutorId);
  if (!avail) return null; // tutor never configured availability

  const dayKey = dayKeyFromDate(start);
  const day = avail.find((d) => d.day === dayKey);
  if (!day) return false;

  const sp = getMalaysiaParts(start);
  const ep = getMalaysiaParts(end);

  return withinSlots(
    day,
    sp.hours * 60 + sp.minutes,
    ep.hours * 60 + ep.minutes
  )
    ? true
    : false;
}