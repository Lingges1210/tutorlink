import { supabaseBrowser } from "@/lib/supabaseBrowser";
/**
 * studypalReward.ts
 * ─────────────────────────────────────────────────────────────────
 * Client-side helper that queues treat rewards into the `sp_v6`
 * localStorage key AND syncs to Supabase via /api/studypal/state.
 *
 * Sync strategy:
 * - Every write goes to localStorage first (instant, offline-safe)
 * - Then fires a debounced POST to /api/studypal/state (300 ms)
 * - On mount, page.tsx calls studypalLoadFromServer() which does a
 *   GET, compares updatedAt timestamps, and uses whichever is newer
 */

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

const ACTIVITY_NAMES: Record<SPActivityId, string> = {
  quiz:    "Completed a quiz",
  streak:  "Daily study streak",
  booking: "Booked a tutor",
  session: "Completed a session",
  sos:     "SOS resolved",
  badge:   "Earned an achievement",
};

const LS_KEY             = "sp_v6";
const LS_UPDATED_AT_KEY  = "sp_v6_updatedAt"; // separate key tracking last write time
const DECAY_INTERVAL_MS  = 8 * 60 * 60 * 1000;
const DECAY_AMOUNT       = 1;
const TREATS_MAX         = 15;
const TWO_DAYS_MS        = 2 * 24 * 60 * 60 * 1000;

export interface SPLogEntry {
  activityId: SPActivityId;
  activityName: string;
  xp: number;
  treats: number;
  timestamp: number;
}

export interface SPStoredState {
  xp: number;
  treats: number;
  points: number;
  pending: number;
  lastFedAt?: number;
  lastDecayedAt?: number;
  streakCount: number;
  lastStreakDate?: string;
  activityLog: SPLogEntry[];
  [key: string]: unknown;
}

export interface SPStatus {
  hungry: boolean;
  msSinceLastFed: number | null;
  pending: number;
  treats: number;
  xp: number;
  points: number;
  streakCount: number;
  level: number;
  levelName: string;
  activityLog: SPLogEntry[];
}

const LEVEL_THRESHOLDS = [
  { name: "Beginner", xp: 0   },
  { name: "Learner",  xp: 50  },
  { name: "Scholar",  xp: 150 },
  { name: "Ace",      xp: 300 },
  { name: "Legend",   xp: 500 },
];

const DROPPABLE_ACCS = [
  "bow", "headband", "glasses", "hat", "cap",
  "scarf", "ribbon", "sunglasses", "earring",
  "monocle", "halo", "bandana", "wizard", "crown",
] as const;

type AccId = typeof DROPPABLE_ACCS[number] | "none";

/* ── Storage helpers ─────────────────────────────────────────── */

function readState(): SPStoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SPStoredState>;
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
    localStorage.setItem(LS_UPDATED_AT_KEY, String(Date.now()));
  } catch { /* storage full or SSR */ }
}

/** Get the last localStorage write timestamp (ms). */
function getLocalUpdatedAt(): number {
  try {
    return Number(localStorage.getItem(LS_UPDATED_AT_KEY) ?? "0");
  } catch { return 0; }
}

/* ── Debounced server sync ───────────────────────────────────── */

let _syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced — schedule a POST /api/studypal/state with current
 * localStorage state. Fires 300 ms after the last call.
 */
export function studypalScheduleSync(): void {
  if (typeof window === "undefined") return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    studypalSyncToServer().catch(() => {/* silently ignore offline */});
  }, 300);
}

/**
 * Fire POST immediately (no debounce).
 * Resolves to `true` if server accepted, `false` on error.
 */
export async function studypalSyncToServer(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  if (!session) return false;

  const state = readState();
  if (!state) return false;

  try {
    const res = await fetch("/api/studypal/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...state,
        clientUpdatedAt: getLocalUpdatedAt(),
      }),
    });

    if (!res.ok) return false;

    const json = await res.json();

    if (json.stale) {
      await studypalLoadFromServer();
    }

    return true;
  } catch {
    return false;
  }
}

export async function studypalLoadFromServer(): Promise<SPStoredState | null> {
  if (typeof window === "undefined") return null;

  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  if (!session) return null;

  try {
    const res = await fetch("/api/studypal/state");
    if (!res.ok) return null;

    const json = await res.json();
    if (!json.ok || !json.state) return null;

    const serverState = json.state as SPStoredState & { updatedAt: number };
    const localUpdatedAt = getLocalUpdatedAt();

    if (serverState.updatedAt > localUpdatedAt) {
      writeState(serverState);
      return serverState;
    }

    studypalScheduleSync();
    return readState();
  } catch {
    return null;
  }
}

/* ── Internal helpers ────────────────────────────────────────── */

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayISO(): string {
  const d = new Date(Date.now() - 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getLevelIndex(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) return i;
  }
  return 0;
}

function applyDecay(state: SPStoredState): SPStoredState {
  const now = Date.now();
  const last = state.lastDecayedAt ?? state.lastFedAt ?? now;
  const ticks = Math.floor((now - last) / DECAY_INTERVAL_MS);
  if (ticks <= 0) return state;
  return {
    ...state,
    treats: Math.max(0, state.treats - ticks * DECAY_AMOUNT),
    lastDecayedAt: last + ticks * DECAY_INTERVAL_MS,
  };
}

function updateStreak(state: SPStoredState): SPStoredState {
  const today     = todayISO();
  const yesterday = yesterdayISO();
  const last      = state.lastStreakDate;
  if (last === today)     return state;
  if (last === yesterday) return { ...state, streakCount: (state.streakCount ?? 0) + 1, lastStreakDate: today };
  return { ...state, streakCount: 1, lastStreakDate: today };
}

function pickLevelUpDrop(ownedRaw: unknown): AccId | null {
  const owned: string[] = Array.isArray(ownedRaw) ? (ownedRaw as string[]) : ["none"];
  const available = DROPPABLE_ACCS.filter(id => !owned.includes(id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

/* ── Public API ──────────────────────────────────────────────── */

/**
 * Queue treat & XP rewards for a completed study activity.
 * Writes to localStorage immediately, then schedules a server sync.
 */
export function studypalReward(activityId: SPActivityId): void {
  if (typeof window === "undefined") return;
  const reward = ACTIVITY_REWARDS[activityId];
  if (!reward) return;

  const raw = readState();

  if (!raw) {
    writeState({
      xp:            reward.xp,
      treats:        0,
      points:        reward.xp,
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
    studypalScheduleSync();
    return;
  }

  let state = applyDecay(raw);
  state     = updateStreak(state);

  const prevLevel = getLevelIndex(state.xp);
  const newXP     = (state.xp ?? 0) + reward.xp;
  const newLevel  = getLevelIndex(newXP);
  const leveledUp = newLevel > prevLevel;

  const projectedTreats = (state.treats ?? 0) + (state.pending ?? 0) + reward.treats;
  const treatCapReached = projectedTreats > TREATS_MAX;

  let owned: string[] = Array.isArray(state.owned) ? (state.owned as string[]) : ["none"];
  let pendingDrop: AccId | null = null;
  if (leveledUp) {
    pendingDrop = pickLevelUpDrop(owned);
    if (pendingDrop) owned = [...owned, pendingDrop];
  }

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
    points:         (state.points ?? 0) + reward.xp,
    pending:        (state.pending ?? 0) + reward.treats,
    owned,
    activityLog,
    pendingDrop:    pendingDrop ?? state.pendingDrop,
    leveledUp:      leveledUp || Boolean(state.leveledUp),
    treatCapReached,
  });

  // Schedule debounced server sync
  studypalScheduleSync();
}

/** Mark the pet as fed. Writes to localStorage + schedules sync. */
export function studypalMarkFed(): void {
  if (typeof window === "undefined") return;
  const state = readState();
  if (!state) return;
  writeState({
    ...state,
    lastFedAt:       Date.now(),
    lastDecayedAt:   Date.now(),
    treatCapReached: false,
  });
  studypalScheduleSync();
}

/**
 * Apply passive decay on mount and persist.
 * Also triggers a server load+merge.
 * Returns treats lost count.
 */
export function studypalApplyDecayOnMount(): number {
  if (typeof window === "undefined") return 0;
  const state = readState();
  if (!state) return 0;
  const decayed = applyDecay(state);
  const lost    = (state.treats ?? 0) - decayed.treats;
  if (lost > 0) {
    writeState(decayed);
    studypalScheduleSync();
  }
  return lost;
}

export function studypalTimeSinceLastFed(): number | null {
  const state = readState();
  if (!state?.lastFedAt) return null;
  return Date.now() - (state.lastFedAt as number);
}

export function studypalGetStatus(): SPStatus | null {
  const state = readState();
  if (!state) return null;
  const decayed = applyDecay(state);
  const li      = getLevelIndex(decayed.xp);
  const msSince = state.lastFedAt ? Date.now() - state.lastFedAt : null;
  return {
    hungry:         decayed.treats < 3 || (msSince !== null && msSince > TWO_DAYS_MS),
    msSinceLastFed: msSince,
    pending:        decayed.pending ?? 0,
    treats:         decayed.treats,
    xp:             decayed.xp,
    points:         decayed.points ?? 0,
    streakCount:    decayed.streakCount ?? 0,
    level:          li,
    levelName:      LEVEL_THRESHOLDS[li].name,
    activityLog:    decayed.activityLog ?? [],
  };
}

export function studypalClearPendingDrop(): void {
  if (typeof window === "undefined") return;
  const state = readState();
  if (!state) return;
  writeState({ ...state, pendingDrop: null, leveledUp: false });
  studypalScheduleSync();
}

export function studypalClearTreatCap(): void {
  if (typeof window === "undefined") return;
  const state = readState();
  if (!state) return;
  writeState({ ...state, treatCapReached: false });
}