/**
 * studypalReward.ts
 * ─────────────────────────────────────────────────────────────────
 * Client-side helper that queues treat rewards into the `sp_v6`
 * localStorage key consumed by studypal/page.tsx.
 *
 * Usage:
 *   import { studypalReward } from "@/lib/studypalReward";
 *   studypalReward("session");  // after rating a tutor
 *   studypalReward("quiz");     // after passing a quiz
 *   studypalReward("streak");   // after marking a study task DONE
 *   studypalReward("sos");      // after SOS transitions to RESOLVED
 *   studypalReward("booking");  // after booking a tutor
 *   studypalReward("badge");    // after earning an achievement
 */

// ── Must match ACTIVITIES in studypal/page.tsx ──────────────────
export type SPActivityId =
  | "quiz"
  | "streak"
  | "booking"
  | "session"
  | "sos"
  | "badge";

const ACTIVITY_REWARDS: Record<SPActivityId, { xp: number; treats: number }> = {
  quiz:    { xp: 9,  treats: 3  },
  streak:  { xp: 6,  treats: 2  },
  booking: { xp: 15, treats: 5  },
  session: { xp: 24, treats: 8  },
  sos:     { xp: 12, treats: 4  },
  badge:   { xp: 30, treats: 10 },
};

// ── Activity names for the log ──────────────────────────────────
const ACTIVITY_NAMES: Record<SPActivityId, string> = {
  quiz:    "Completed a quiz",
  streak:  "Daily study streak",
  booking: "Booked a tutor",
  session: "Completed a session",
  sos:     "SOS resolved",
  badge:   "Earned an achievement",
};

const LS_KEY = "sp_v6";

// ── How often passive decay ticks ──────────────────────────────
const DECAY_INTERVAL_MS  = 8 * 60 * 60 * 1000;   // 8 hours
const DECAY_AMOUNT        = 1;                      // treats lost per tick
const TREATS_MAX          = 15;
const TWO_DAYS_MS         = 2 * 24 * 60 * 60 * 1000;

// ── Activity log entry ─────────────────────────────────────────
export interface SPLogEntry {
  activityId: SPActivityId;
  activityName: string;
  xp: number;
  treats: number;
  timestamp: number;
}

// ── Full stored shape (only fields we manage) ──────────────────
export interface SPStoredState {
  xp: number;
  treats: number;
  points: number;
  pending: number;
  lastFedAt?: number;
  lastDecayedAt?: number;   // NEW: timestamp of last passive decay tick
  streakCount: number;      // NEW: consecutive daily activity days
  lastStreakDate?: string;   // NEW: ISO date string "YYYY-MM-DD"
  activityLog: SPLogEntry[]; // NEW: last 10 completed activities
  [key: string]: unknown;
}

// ── Public status shape ────────────────────────────────────────
export interface SPStatus {
  hungry: boolean;
  msSinceLastFed: number | null;
  pending: number;
  treats: number;
  xp: number;
  points: number;
  streakCount: number;
  level: number;        // 0–4 matching LEVELS in page.tsx
  levelName: string;
  activityLog: SPLogEntry[];
}

// ── Level thresholds (mirrors LEVELS in page.tsx) ──────────────
const LEVEL_THRESHOLDS = [
  { name: "Beginner", xp: 0   },
  { name: "Learner",  xp: 50  },
  { name: "Scholar",  xp: 150 },
  { name: "Ace",      xp: 300 },
  { name: "Legend",   xp: 500 },
];

// ── Accessory IDs available for level-up drops ─────────────────
// Mirrors unlock-able ACCS (cost > 0) in page.tsx
const DROPPABLE_ACCS = [
  "bow", "headband", "glasses", "hat", "cap",
  "scarf", "ribbon", "sunglasses", "earring",
  "monocle", "halo", "bandana", "wizard", "crown",
] as const;

type AccId = typeof DROPPABLE_ACCS[number] | "none";

// ── Storage helpers ────────────────────────────────────────────
function readState(): SPStoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SPStoredState>;
    // Back-fill new fields so old saves are safe
    return {
      xp:             parsed.xp             ?? 0,
      treats:         parsed.treats         ?? 8,
      points:         parsed.points         ?? 0,
      pending:        parsed.pending        ?? 0,
      lastFedAt:      parsed.lastFedAt,
      lastDecayedAt:  parsed.lastDecayedAt,
      streakCount:    parsed.streakCount    ?? 0,
      lastStreakDate: parsed.lastStreakDate,
      activityLog:    parsed.activityLog    ?? [],
      ...parsed,
    };
  } catch {
    return null;
  }
}

function writeState(state: SPStoredState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // storage full or SSR — silently no-op
  }
}

// ── Helpers ────────────────────────────────────────────────────

/** Today as "YYYY-MM-DD" in local time. */
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Yesterday as "YYYY-MM-DD" in local time. */
function yesterdayISO(): string {
  const d = new Date(Date.now() - 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Resolve current level index (0–4) from XP. */
function getLevelIndex(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) return i;
  }
  return 0;
}

/**
 * Apply any pending passive treat decay ticks.
 * Returns a (possibly mutated) copy of state — does NOT write to storage.
 */
function applyDecay(state: SPStoredState): SPStoredState {
  const now = Date.now();
  const last = state.lastDecayedAt ?? state.lastFedAt ?? now;
  const ticks = Math.floor((now - last) / DECAY_INTERVAL_MS);
  if (ticks <= 0) return state;

  const decayed = Math.max(0, state.treats - ticks * DECAY_AMOUNT);
  return {
    ...state,
    treats: decayed,
    lastDecayedAt: last + ticks * DECAY_INTERVAL_MS,
  };
}

/**
 * Update streak counter based on today's date.
 * - Same day  → no change (already counted today)
 * - Yesterday → increment streak
 * - Older     → reset to 1
 * Returns mutated copy — does NOT write to storage.
 */
function updateStreak(state: SPStoredState): SPStoredState {
  const today     = todayISO();
  const yesterday = yesterdayISO();
  const last      = state.lastStreakDate;

  if (last === today) return state;                            // already counted
  if (last === yesterday) return { ...state, streakCount: (state.streakCount ?? 0) + 1, lastStreakDate: today };
  return { ...state, streakCount: 1, lastStreakDate: today };  // streak broken
}

/**
 * Pick a random unowned accessory for a level-up drop.
 * Returns null if the pet already owns everything.
 */
function pickLevelUpDrop(ownedRaw: unknown): AccId | null {
  const owned: string[] = Array.isArray(ownedRaw) ? (ownedRaw as string[]) : ["none"];
  const available = DROPPABLE_ACCS.filter(id => !owned.includes(id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Queue treat & XP rewards for a completed study activity.
 *
 * Also handles:
 * - Passive decay before applying reward
 * - Streak counter update
 * - Activity log (capped at 10 entries)
 * - points sync (was missing before — now fixed)
 * - Treat-cap guard: if treats+pending >= MAX, sets a `treatCapReached`
 *   flag so page.tsx can surface the "companion is full" notice.
 * - Level-up drop: if this reward crosses a level boundary, a random
 *   unowned accessory is added to `owned` and `pendingDrop` is set
 *   so page.tsx can show the celebration modal.
 */
export function studypalReward(activityId: SPActivityId): void {
  if (typeof window === "undefined") return;
  const reward = ACTIVITY_REWARDS[activityId];
  if (!reward) return;

  const raw = readState();

  // ── First-ever open: write minimal pending state ─────────────
  if (!raw) {
    writeState({
      xp:            reward.xp,
      treats:        0,
      points:        reward.xp,   // points mirror XP
      pending:       reward.treats,
      lastDecayedAt: Date.now(),
      streakCount:   1,
      lastStreakDate: todayISO(),
      activityLog:   [{
        activityId,
        activityName: ACTIVITY_NAMES[activityId],
        xp:           reward.xp,
        treats:       reward.treats,
        timestamp:    Date.now(),
      }],
    });
    return;
  }

  // ── Apply decay first, then reward ───────────────────────────
  let state = applyDecay(raw);
  state     = updateStreak(state);

  const prevLevel = getLevelIndex(state.xp);
  const newXP     = (state.xp ?? 0) + reward.xp;
  const newLevel  = getLevelIndex(newXP);
  const leveledUp = newLevel > prevLevel;

  // Treat-cap guard
  const projectedTreats = (state.treats ?? 0) + (state.pending ?? 0) + reward.treats;
  const treatCapReached = projectedTreats > TREATS_MAX;

  // Level-up drop
  let owned: string[] = Array.isArray(state.owned) ? (state.owned as string[]) : ["none"];
  let pendingDrop: AccId | null = null;
  if (leveledUp) {
    pendingDrop = pickLevelUpDrop(owned);
    if (pendingDrop) owned = [...owned, pendingDrop];
  }

  // Activity log — newest first, capped at 10
  const newEntry: SPLogEntry = {
    activityId,
    activityName: ACTIVITY_NAMES[activityId],
    xp:           reward.xp,
    treats:       reward.treats,
    timestamp:    Date.now(),
  };
  const activityLog: SPLogEntry[] = [newEntry, ...(state.activityLog ?? [])].slice(0, 10);

  writeState({
    ...state,
    xp:             newXP,
    points:         (state.points ?? 0) + reward.xp,   // FIX: was missing
    pending:        (state.pending ?? 0) + reward.treats,
    owned,
    activityLog,
    pendingDrop:    pendingDrop ?? state.pendingDrop,   // page.tsx clears this after showing modal
    leveledUp:      leveledUp || Boolean(state.leveledUp),
    treatCapReached,
  });
}

/**
 * Stamp the current time as the last-fed moment and clear decay clock.
 * Called automatically by page.tsx whenever feedNow() completes.
 * Exported so external code can call it if needed.
 */
export function studypalMarkFed(): void {
  if (typeof window === "undefined") return;
  const state = readState();
  if (!state) return;
  writeState({
    ...state,
    lastFedAt:      Date.now(),
    lastDecayedAt:  Date.now(),  // reset decay clock on feed
    treatCapReached: false,
  });
}

/**
 * Apply passive decay and persist. Call this on StudyPal page mount
 * so the treat bar reflects real elapsed time before the user sees it.
 * Returns the number of treat ticks lost (0 if none).
 */
export function studypalApplyDecayOnMount(): number {
  if (typeof window === "undefined") return 0;
  const state = readState();
  if (!state) return 0;

  const decayed = applyDecay(state);
  const lost    = (state.treats ?? 0) - decayed.treats;
  if (lost > 0) writeState(decayed);
  return lost;
}

/**
 * Returns milliseconds since the pet was last fed, or null if never fed.
 */
export function studypalTimeSinceLastFed(): number | null {
  const state = readState();
  if (!state?.lastFedAt) return null;
  return Date.now() - (state.lastFedAt as number);
}

/**
 * Read-only status snapshot — safe to call from any component,
 * e.g. to show a hungry indicator in the navbar or a notification badge.
 * Returns null if StudyPal has never been opened.
 */
export function studypalGetStatus(): SPStatus | null {
  const state = readState();
  if (!state) return null;

  // Apply decay in memory only (don't write here — let mount do it)
  const decayed  = applyDecay(state);
  const li       = getLevelIndex(decayed.xp);
  const msSince  = state.lastFedAt ? Date.now() - state.lastFedAt : null;

  return {
    hungry:        decayed.treats < 3 || (msSince !== null && msSince > TWO_DAYS_MS),
    msSinceLastFed: msSince,
    pending:       decayed.pending ?? 0,
    treats:        decayed.treats,
    xp:            decayed.xp,
    points:        decayed.points ?? 0,
    streakCount:   decayed.streakCount ?? 0,
    level:         li,
    levelName:     LEVEL_THRESHOLDS[li].name,
    activityLog:   decayed.activityLog ?? [],
  };
}

/**
 * Clear the `pendingDrop` flag after page.tsx has shown the level-up modal.
 */
export function studypalClearPendingDrop(): void {
  if (typeof window === "undefined") return;
  const state = readState();
  if (!state) return;
  writeState({ ...state, pendingDrop: null, leveledUp: false });
}

/**
 * Clear the `treatCapReached` flag after page.tsx has shown the notice.
 */
export function studypalClearTreatCap(): void {
  if (typeof window === "undefined") return;
  const state = readState();
  if (!state) return;
  writeState({ ...state, treatCapReached: false });
}