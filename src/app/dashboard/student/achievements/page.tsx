// src/app/dashboard/student/achievements/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  Trophy,
  History,
  Sparkles,
  RefreshCcw,
  Medal,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
  Star,
} from "lucide-react";
import { GAMIFICATION_RULES } from "@/lib/gamification/rules";

type Scope = "ALL" | "STUDENTS" | "TUTORS";

type MeRes = {
  ok: boolean;
  me: { id: string; name: string | null; role: string } | null;
  wallet: { total: number } | null;
  history: Array<{
    id: string;
    type: "EARN" | "REDEEM" | "BONUS" | "PENALTY";
    amount: number;
    description: string;
    sessionId: string | null;
    createdAt: string;
  }>;
  badges: Array<{
    id: string;
    awardedAt: string;
    badge: {
      id: string;
      key: string;
      name: string;
      description: string;
      icon: string;
    };
  }>;
};

type LeaderboardRes = {
  ok: boolean;
  rows: Array<{
    rank: number;
    userId: string;
    points: number;
    user: { id: string; name: string | null; email: string; role: string };
  }>;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function amountBadge(amount: number) {
  if (amount > 0) return "text-emerald-500";
  if (amount < 0) return "text-rose-500";
  return "text-[rgb(var(--muted2))]";
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function ScopePill({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition border",
        "border-[rgb(var(--border))]",
        active
          ? "bg-[rgb(var(--primary)/0.14)] text-[rgb(var(--primary))]"
          : "bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

/* =======================================================
   RULES CARD (your provided component)
   ======================================================= */

function RulesCard({
  studentPointsPerCompletion,
  tutorPointsPerCompletion,
  weeklyBonus,
}: {
  studentPointsPerCompletion: number;
  tutorPointsPerCompletion: number;
  weeklyBonus?: { first: number; second: number; third: number };
}) {
  const [open, setOpen] = useState(false);

  const bonus = weeklyBonus ?? { first: 100, second: 60, third: 30 };

  return (
    <div className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex items-start gap-2">
          <div className="mt-0.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-2">
            <Info className="h-4 w-4 text-[rgb(var(--primary))]" />
          </div>

          <div>
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              Rules: How Points & Leaderboard works
            </div>
            <div className="mt-0.5 text-xs text-[rgb(var(--muted))]">
              Clear rules so users know exactly how to earn points.
            </div>
          </div>
        </div>

        <div className="mt-1 inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] transition">
          {open ? (
            <>
              Hide <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              Show <ChevronDown className="h-4 w-4" />
            </>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="rules"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            {/* Points rules */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[rgb(var(--muted2))]">
                <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
                Points
              </div>

              <div className="mt-2 space-y-2 text-sm text-[rgb(var(--fg))]">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] px-3 py-2">
                  <span className="text-xs text-[rgb(var(--muted))]">
                    Student: session completed
                  </span>
                  <span className="text-xs font-semibold text-emerald-500">
                    +{studentPointsPerCompletion}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] px-3 py-2">
                  <span className="text-xs text-[rgb(var(--muted))]">
                    Tutor: tutored a session
                  </span>
                  <span className="text-xs font-semibold text-emerald-500">
                    +{tutorPointsPerCompletion}
                  </span>
                </div>

                <div className="text-[11px] text-[rgb(var(--muted2))]">
                  Points are stored in your wallet and shown in “Points History”.
                </div>
              </div>
            </div>

            {/* Leaderboard rules */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[rgb(var(--muted2))]">
                <Trophy className="h-4 w-4 text-[rgb(var(--primary))]" />
                Weekly Leaderboard
              </div>

              <div className="mt-2 space-y-2">
                <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--muted))]">
                      Top 1 bonus
                    </span>
                    <span className="text-xs font-semibold text-emerald-500">
                      +{bonus.first}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--muted))]">
                      Top 2 bonus
                    </span>
                    <span className="text-xs font-semibold text-emerald-500">
                      +{bonus.second}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-[rgb(var(--muted))]">
                      Top 3 bonus
                    </span>
                    <span className="text-xs font-semibold text-emerald-500">
                      +{bonus.third}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[rgb(var(--muted2))]">
                  Leaderboard resets every week (Monday start).
                </div>
              </div>
            </div>

            {/* Badges rules */}
            <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[rgb(var(--muted2))]">
                <Medal className="h-4 w-4 text-[rgb(var(--primary))]" />
                Badges
              </div>

              <div className="mt-2 space-y-2">
                <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-[rgb(var(--fg))]">
                    <Star className="h-4 w-4 text-[rgb(var(--primary))]" />
                    Badges unlock automatically when you hit milestones.
                  </div>
                  <div className="mt-1 text-[11px] text-[rgb(var(--muted2))]">
                    Example: sessions completed, total points, streaks, tutor milestones.
                  </div>
                </div>

                <div className="text-[11px] text-[rgb(var(--muted2))]">
                  Your latest earned badges appear in “My Badges”.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =======================================================
   LEVEL + NEXT BADGE (client-side rules)
   ======================================================= */

type LevelDef = {
  level: number;
  minPoints: number;
  name: string;
};

const LEVELS: LevelDef[] = [
  { level: 1, minPoints: 0, name: "Rookie" },
  { level: 2, minPoints: 150, name: "Learner" },
  { level: 3, minPoints: 350, name: "Focused" },
  { level: 4, minPoints: 700, name: "Achiever" },
  { level: 5, minPoints: 1200, name: "Elite" },
  { level: 6, minPoints: 2000, name: "Legend" },
];

const POINT_BADGE_STEPS = [
  { points: 100, name: "100 Club" },
  { points: 250, name: "250 Club" },
  { points: 500, name: "500 Club" },
  { points: 1000, name: "1K Club" },
  { points: 2500, name: "Elite" },
  { points: 5000, name: "Legend" },
] as const;

function computeLevel(totalPoints: number) {
  const p = Math.max(0, totalPoints || 0);

  let current: LevelDef = LEVELS[0];
  for (const L of LEVELS) {
    if (p >= L.minPoints) current = L;
  }

  const currentIdx = LEVELS.findIndex((x) => x.level === current.level);
  const next: LevelDef | null =
    currentIdx >= 0 && currentIdx < LEVELS.length - 1
      ? LEVELS[currentIdx + 1]
      : null;

  const start = current.minPoints;
  const end = next?.minPoints ?? Math.max(start + 1, p);
  const pct = next ? clampPct(((p - start) / (end - start)) * 100) : 100;

  return {
    current,
    next,
    pct,
    toNext: next ? Math.max(0, next.minPoints - p) : 0,
  };
}

function computeNextPointsBadge(totalPoints: number) {
  const p = Math.max(0, totalPoints || 0);
  const next = POINT_BADGE_STEPS.find((b) => p < b.points) ?? null;
  const prev =
    [...POINT_BADGE_STEPS].reverse().find((b) => p >= b.points) ?? null;

  if (!next) {
    return {
      done: true,
      label: "All point badges unlocked",
      pct: 100,
      currentPoints: p,
      nextPoints: null as number | null,
      toNext: 0,
      prevPoints: prev?.points ?? 0,
      nextName: null as string | null,
    };
  }

  const prevPts = prev?.points ?? 0;
  const pct =
    next.points <= prevPts
      ? 0
      : clampPct(((p - prevPts) / (next.points - prevPts)) * 100);

  return {
    done: false,
    label: `Next badge: ${next.name} (${next.points} pts)`,
    pct,
    currentPoints: p,
    nextPoints: next.points,
    toNext: Math.max(0, next.points - p),
    prevPoints: prevPts,
    nextName: next.name,
  };
}

/* =======================================================
   SUBTLE CONFETTI (on new badge)
   ======================================================= */

function ConfettiBurst({ show }: { show: boolean }) {
  const pieces = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: (i * 97) % 100,
      delay: (i % 6) * 0.03,
      drift: ((i % 7) - 3) * 14,
      rotate: (i * 31) % 360,
    }));
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden
        >
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute top-0 h-2 w-2 rounded-sm bg-[rgb(var(--primary))] opacity-80"
              style={{ left: `${p.left}%` }}
              initial={{ y: -10, x: 0, rotate: p.rotate, scale: 0.9 }}
              animate={{
                y: 220,
                x: p.drift,
                rotate: p.rotate + 260,
                scale: 1,
                opacity: [0.9, 0.9, 0],
              }}
              transition={{
                duration: 1.15,
                delay: p.delay,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AchievementsPage() {
  const [meData, setMeData] = useState<MeRes | null>(null);
  const [lbData, setLbData] = useState<LeaderboardRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<Scope>("ALL");

  const totalPoints = meData?.wallet?.total ?? 0;
  const badgesCount = meData?.badges?.length ?? 0;

  // Confetti when badge count increases
  const prevBadgesRef = useRef<number>(0);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    const prev = prevBadgesRef.current;
    if (!loading && badgesCount > prev) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 1300);
      prevBadgesRef.current = badgesCount;
      return () => clearTimeout(t);
    }
    prevBadgesRef.current = badgesCount;
  }, [badgesCount, loading]);

  const earnedThisWeek = useMemo(() => {
    if (!meData?.history?.length) return 0;
    const now = new Date();
    const start = new Date(now);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);

    return meData.history
      .filter((h) => new Date(h.createdAt) >= start)
      .reduce((sum, h) => sum + Math.max(0, h.amount ?? 0), 0);
  }, [meData]);

  const myRank = useMemo(() => {
    const myId = meData?.me?.id;
    if (!myId || !lbData?.rows?.length) return null;
    const found = lbData.rows.find((r) => r.userId === myId);
    return found?.rank ?? null;
  }, [meData, lbData]);

  const levelInfo = useMemo(() => computeLevel(totalPoints), [totalPoints]);
  const nextBadgeInfo = useMemo(
    () => computeNextPointsBadge(totalPoints),
    [totalPoints]
  );

  async function fetchAll(isManual = false, nextScope: Scope = scope) {
    try {
      if (isManual) setRefreshing(true);

      const lbUrl = `/api/achievements/leaderboard/weekly?limit=10&mode=${encodeURIComponent(
        nextScope
      )}`;

      const [meRes, lbRes] = await Promise.all([
        fetch("/api/achievements/me", { cache: "no-store" }),
        fetch(lbUrl, { cache: "no-store" }),
      ]);

      const meJson = (await meRes.json()) as MeRes;
      const lbJson = (await lbRes.json()) as LeaderboardRes;

      setMeData(meJson);
      setLbData(lbJson);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchAll(false, scope);

    const t = setInterval(() => {
      fetchAll(false, scope);
    }, 15000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  // weekly bonus (optional): if you later store in GAMIFICATION_RULES, wire it here.
  const weeklyBonus =
    (GAMIFICATION_RULES as any)?.weekly?.leaderboardBonus ??
    (GAMIFICATION_RULES as any)?.leaderboardBonus ??
    undefined;

  return (
    <>
      <ConfettiBurst show={confetti} />

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
              Achievements
            </h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Track your points, badges, and weekly ranking.
            </p>
          </div>

          <button
            onClick={() => fetchAll(true, scope)}
            className="
              inline-flex items-center gap-2
              rounded-md px-3 py-2 text-xs font-semibold
              border border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
              text-[rgb(var(--fg))]
              hover:bg-[rgb(var(--card)/0.6)]
              transition
            "
            disabled={refreshing}
          >
            <RefreshCcw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* ✅ Use your RulesCard exactly */}
        <RulesCard
          studentPointsPerCompletion={GAMIFICATION_RULES?.student?.sessionCompleted ?? 0}
          tutorPointsPerCompletion={GAMIFICATION_RULES?.tutor?.sessionCompleted ?? 0}
          weeklyBonus={weeklyBonus}
        />

        {/* Overview cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
              <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
              Total Points
            </div>
            <div className="mt-2 text-2xl font-bold text-[rgb(var(--fg))]">
              {loading ? "—" : totalPoints}
            </div>
            <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
              Lifetime total
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
              <Award className="h-4 w-4 text-[rgb(var(--primary))]" />
              Badges Earned
            </div>
            <div className="mt-2 text-2xl font-bold text-[rgb(var(--fg))]">
              {loading ? "—" : badgesCount}
            </div>
            <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
              Achievements unlocked
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
              <History className="h-4 w-4 text-[rgb(var(--primary))]" />
              This Week
            </div>
            <div className="mt-2 text-2xl font-bold text-[rgb(var(--fg))]">
              {loading ? "—" : earnedThisWeek}
            </div>
            <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
              Points earned this week
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
              <Trophy className="h-4 w-4 text-[rgb(var(--primary))]" />
              Weekly Rank
            </div>
            <div className="mt-2 text-2xl font-bold text-[rgb(var(--fg))]">
              {loading ? "—" : myRank ? `#${myRank}` : "—"}
            </div>
            <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
              In {scope.toLowerCase()} leaderboard
            </div>
          </motion.div>
        </div>

        {/* Level + Next Badge Progress */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Level card */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                  Level
                </div>
                <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                  {loading
                    ? "—"
                    : `Level ${levelInfo.current.level} • ${levelInfo.current.name}`}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-[rgb(var(--muted2))]">
                  Next level
                </div>
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                  {loading
                    ? "—"
                    : levelInfo.next
                    ? `Lvl ${levelInfo.next.level}`
                    : "Max"}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--card2))] border border-[rgb(var(--border))]">
                <div
                  className="h-full bg-[rgb(var(--primary))]"
                  style={{ width: `${loading ? 0 : levelInfo.pct}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-[rgb(var(--muted2))]">
                <div>{loading ? "—" : `${Math.round(levelInfo.pct)}%`}</div>
                <div>
                  {loading
                    ? "—"
                    : levelInfo.next
                    ? `${levelInfo.toNext} pts to next`
                    : "You reached max level"}
                </div>
              </div>
            </div>
          </div>

          {/* Next badge progress */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                  Next Badge Progress
                </div>
                <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
                  {loading ? "—" : nextBadgeInfo.label}
                </div>
              </div>

              {!loading && !nextBadgeInfo.done && (
                <div className="text-right">
                  <div className="text-xs text-[rgb(var(--muted2))]">
                    Remaining
                  </div>
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                    {nextBadgeInfo.toNext} pts
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--card2))] border border-[rgb(var(--border))]">
                <div
                  className="h-full bg-[rgb(var(--primary))]"
                  style={{ width: `${loading ? 0 : nextBadgeInfo.pct}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-[rgb(var(--muted2))]">
                <div>
                  {loading ? "—" : `${Math.round(nextBadgeInfo.pct)}%`}
                </div>
                <div>
                  {loading
                    ? "—"
                    : nextBadgeInfo.done
                    ? "Badge ladder completed"
                    : `${nextBadgeInfo.currentPoints}/${nextBadgeInfo.nextPoints} pts`}
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-[rgb(var(--muted2))]">
              Tip: This is points-based for now (fast + reliable). You can later
              add “session badges” progress when your API returns session counts.
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Badges */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
                <Medal className="h-4 w-4 text-[rgb(var(--primary))]" />
                My Badges
              </div>
              <div className="text-xs text-[rgb(var(--muted2))]">
                {badgesCount} total
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <AnimatePresence>
                {(meData?.badges ?? []).slice(0, 8).map((b) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3"
                  >
                    <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                      {b.badge.name}
                    </div>
                    <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                      {b.badge.description}
                    </div>
                    <div className="mt-2 text-[11px] text-[rgb(var(--muted2))]">
                      Earned: {formatDateTime(b.awardedAt)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {!loading && (meData?.badges?.length ?? 0) === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 text-sm text-[rgb(var(--muted))]">
                  No badges yet — complete sessions to start unlocking
                  achievements.
                </div>
              )}
            </div>
          </div>

          {/* Weekly leaderboard */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
                <Trophy className="h-4 w-4 text-[rgb(var(--primary))]" />
                Weekly Leaderboard
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ScopePill
                  active={scope === "ALL"}
                  label="All"
                  onClick={() => setScope("ALL")}
                  icon={<Users className="h-4 w-4" />}
                />
                <ScopePill
                  active={scope === "STUDENTS"}
                  label="Students"
                  onClick={() => setScope("STUDENTS")}
                  icon={<Award className="h-4 w-4" />}
                />
                <ScopePill
                  active={scope === "TUTORS"}
                  label="Tutors"
                  onClick={() => setScope("TUTORS")}
                  icon={<Trophy className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Top 3 highlight */}
            <div className="mt-3 space-y-2">
              {(lbData?.rows ?? []).map((r) => {
                const top = r.rank <= 3;

                const topRing =
                  r.rank === 1
                    ? "border-yellow-400/40 bg-yellow-400/10"
                    : r.rank === 2
                    ? "border-slate-300/50 bg-slate-300/10"
                    : r.rank === 3
                    ? "border-amber-500/30 bg-amber-500/10"
                    : "";

                const rankText =
                  r.rank === 1
                    ? "text-yellow-500"
                    : r.rank === 2
                    ? "text-[rgb(var(--muted))]"
                    : r.rank === 3
                    ? "text-amber-500"
                    : "text-[rgb(var(--muted2))]";

                return (
                  <div
                    key={r.userId}
                    className={[
                      "flex items-center justify-between rounded-xl border px-3 py-2",
                      "border-[rgb(var(--border))] bg-[rgb(var(--card2))]",
                      top ? topRing : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "w-8 text-center text-sm font-bold",
                          rankText,
                        ].join(" ")}
                      >
                        {r.rank}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                          {r.user?.name ?? r.user?.email ?? "Unknown"}
                        </div>
                        <div className="text-xs text-[rgb(var(--muted2))]">
                          {r.user?.role ?? ""}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm font-bold text-[rgb(var(--fg))]">
                      {r.points}
                    </div>
                  </div>
                );
              })}

              {!loading && (lbData?.rows?.length ?? 0) === 0 && (
                <div className="rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 text-sm text-[rgb(var(--muted))]">
                  No leaderboard data yet for this week.
                </div>
              )}
            </div>

            <div className="mt-3 text-[11px] text-[rgb(var(--muted2))]">
              Top 3 is highlighted (gold/silver/bronze) for instant “competitive
              feel”.
            </div>
          </div>
        </div>

        {/* Points history */}
        <div className="mt-6 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
              <History className="h-4 w-4 text-[rgb(var(--primary))]" />
              Points History
            </div>
            <div className="text-xs text-[rgb(var(--muted2))]">Latest 50</div>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-[rgb(var(--border))]">
            <div className="grid grid-cols-12 bg-[rgb(var(--card2))] px-3 py-2 text-[11px] font-semibold text-[rgb(var(--muted2))]">
              <div className="col-span-4">When</div>
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>

            {(meData?.history ?? []).map((h) => (
              <div
                key={h.id}
                className="grid grid-cols-12 border-t border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-xs"
              >
                <div className="col-span-4 text-[rgb(var(--muted))]">
                  {formatDateTime(h.createdAt)}
                </div>
                <div className="col-span-6 text-[rgb(var(--fg))]">
                  {h.description}
                </div>
                <div
                  className={`col-span-2 text-right font-semibold ${amountBadge(
                    h.amount
                  )}`}
                >
                  {h.amount > 0 ? `+${h.amount}` : h.amount}
                </div>
              </div>
            ))}

            {!loading && (meData?.history?.length ?? 0) === 0 && (
              <div className="p-4 text-sm text-[rgb(var(--muted))]">
                No points transactions yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}