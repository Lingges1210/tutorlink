"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award, Trophy, History, Sparkles, RefreshCcw, Medal, Users,
  ChevronDown, Info, Star, Zap, TrendingUp, Crown,
  Flame, Swords, Shield, Gem, Compass, Brain, Book,
  Sun, Moon, Calendar, MessageCircle, Clock, Rocket, Key, Lock,
} from "lucide-react";
import { GAMIFICATION_RULES } from "@/lib/gamification/rules";
import { LevelUpModal } from "@/lib/gamification/LevelUpModal";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

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
    badge: { id: string; key: string; name: string; description: string; icon: string };
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

type RecoRes = {
  ok: boolean;
  totalPoints: number;
  recommendations: Array<{
    id: string; key: string; name: string; description: string; icon: string;
    supported: boolean; pct: number; remaining: number; remainingText: string; target: number | null;
  }>;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
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

/* =======================================================
   BADGE ICON SYSTEM
   ======================================================= */

const ICONS: Record<string, any> = {
  medal: Medal, sparkles: Sparkles, star: Star, trophy: Trophy,
  crown: Crown, flame: Flame, fire: Flame, swords: Swords,
  shield: Shield, gem: Gem, compass: Compass, brain: Brain,
  book: Book, users: Users, award: Award, sun: Sun, moon: Moon,
  calendar: Calendar, zap: Zap, "message-circle": MessageCircle,
  messagecircle: MessageCircle, clock: Clock, rocket: Rocket, key: Key,
};

const ICON_ACCENTS: Record<string, string> = {
  trophy:           "from-amber-400 to-yellow-500",
  crown:            "from-yellow-400 to-amber-500",
  flame:            "from-orange-400 to-red-500",
  fire:             "from-orange-400 to-red-500",
  rocket:           "from-blue-400 to-violet-500",
  gem:              "from-cyan-400 to-blue-500",
  star:             "from-yellow-300 to-amber-400",
  zap:              "from-yellow-400 to-orange-400",
  brain:            "from-purple-400 to-fuchsia-500",
  shield:           "from-emerald-400 to-teal-500",
  swords:           "from-red-400 to-rose-500",
  sparkles:         "from-violet-400 to-purple-500",
  medal:            "from-blue-400 to-blue-600",
  compass:          "from-teal-400 to-cyan-500",
  book:             "from-indigo-400 to-blue-500",
  users:            "from-pink-400 to-rose-500",
  award:            "from-amber-400 to-yellow-500",
  sun:              "from-yellow-300 to-orange-400",
  moon:             "from-indigo-400 to-violet-500",
  calendar:         "from-sky-400 to-blue-500",
  "message-circle": "from-green-400 to-emerald-500",
  messagecircle:    "from-green-400 to-emerald-500",
  clock:            "from-slate-400 to-gray-500",
  key:              "from-amber-400 to-yellow-500",
};

const BADGE_KEY_COLORS: Record<string, string> = {
  SESSIONS_1:         "from-violet-400 to-violet-600",
  SESSIONS_5:         "from-orange-400 to-orange-600",
  SESSIONS_10:        "from-red-400 to-red-700",
  SESSIONS_25:        "from-emerald-400 to-emerald-600",
  SESSIONS_50:        "from-amber-400 to-amber-600",
  SESSIONS_100:       "from-fuchsia-400 to-purple-600",
  POINTS_100:         "from-yellow-300 to-yellow-500",
  POINTS_250:         "from-yellow-400 to-amber-500",
  POINTS_500:         "from-blue-400 to-blue-600",
  POINTS_1000:        "from-amber-500 to-amber-800",
  POINTS_2500:        "from-cyan-400 to-cyan-600",
  POINTS_5000:        "from-fuchsia-400 to-purple-700",
  STREAK_3:           "from-orange-300 to-orange-500",
  STREAK_7:           "from-orange-500 to-red-500",
  STREAK_14:          "from-red-500 to-red-700",
  STREAK_30:          "from-red-600 to-red-950",
  TOPICS_5:           "from-teal-300 to-teal-600",
  TOPICS_15:          "from-purple-400 to-purple-600",
  TOPICS_30:          "from-indigo-400 to-indigo-700",
  TUTOR_5:            "from-pink-300 to-pink-600",
  TUTOR_25:           "from-yellow-300 to-yellow-600",
  TUTOR_75:           "from-emerald-400 to-green-700",
  TUTOR_150:          "from-indigo-400 to-indigo-700",
  EARLY_BIRD:         "from-yellow-200 to-amber-500",
  NIGHT_OWL:          "from-indigo-400 to-indigo-900",
  WEEKEND_WARRIOR:    "from-sky-300 to-sky-600",
  CONFIDENCE_BOOSTER: "from-yellow-300 to-orange-500",
  FEEDBACK_GIVER:     "from-emerald-300 to-emerald-600",
  FIRST_WEEK:         "from-cyan-300 to-cyan-600",
  POWER_USER:         "from-violet-400 to-violet-700",
  SECRET_MASTER:      "from-yellow-400 to-amber-800",
};

function getBadgeGradient(icon: string | null | undefined, badgeKey?: string) {
  if (badgeKey && BADGE_KEY_COLORS[badgeKey]) return BADGE_KEY_COLORS[badgeKey];
  const key = (icon ?? "medal").toLowerCase();
  return ICON_ACCENTS[key] ?? "from-violet-400 to-purple-500";
}

function BadgeIconSmall({
  icon,
  badgeKey,
  locked = false,
  size = "md",
}: {
  icon: string;
  badgeKey?: string;
  locked?: boolean;
  size?: "md" | "lg";
}) {
  const key = (icon || "").toLowerCase();
  const I = ICONS[key] ?? Star;
  const gradient = getBadgeGradient(icon, badgeKey);
  const dim = size === "lg" ? "h-10 w-10" : "h-9 w-9";
  const iconDim = size === "lg" ? "h-5 w-5" : "h-4 w-4";

  if (locked) {
    return (
      <div className={`relative flex ${dim} shrink-0 items-center justify-center rounded-xl`}>
        <div className={`flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br ${gradient} opacity-30`}>
          <I className={`${iconDim} text-white`} />
        </div>
        <Lock className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[rgb(var(--card2))] p-0.5 text-[rgb(var(--muted2))] border border-[rgb(var(--border))]" />
      </div>
    );
  }
  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}>
      <I className={`${iconDim} text-white drop-shadow`} />
    </div>
  );
}

/* =======================================================
   OTHER COMPONENTS (unchanged)
   ======================================================= */

function AnimatedNumber({ value, loading }: { value: number; loading: boolean }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    if (loading) return;
    const start = prevRef.current;
    const end = value;
    if (start === end) return;
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prevRef.current = end;
    };
    requestAnimationFrame(tick);
  }, [value, loading]);
  if (loading) return <span>—</span>;
  return <span>{display}</span>;
}

function ScopePill({ active, label, onClick, icon }: {
  active: boolean; label: string; onClick: () => void; icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 border overflow-hidden border-[rgb(var(--border))]",
        active
          ? "bg-[rgb(var(--primary))] text-white border-transparent shadow-[0_0_12px_rgb(var(--primary)/0.4)]"
          : "bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.8)]",
      ].join(" ")}
    >
      {icon}{label}
    </button>
  );
}

function ProgressBar({ pct, loading, color = "primary", glow = false }: {
  pct: number; loading: boolean; color?: "primary" | "emerald" | "amber"; glow?: boolean;
}) {
  const colorClass = color === "emerald" ? "bg-emerald-500" : color === "amber" ? "bg-amber-400" : "bg-[rgb(var(--primary))]";
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--card2))] border border-[rgb(var(--border))]">
      <motion.div
        className={["h-full rounded-full", colorClass].join(" ")}
        style={{ boxShadow: glow ? color === "emerald" ? "0 0 8px rgba(16,185,129,0.5)" : "0 0 8px rgb(var(--primary)/0.5)" : "none" }}
        initial={{ width: "0%" }}
        animate={{ width: loading ? "0%" : `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
    </div>
  );
}

function StatCard({ icon, label, value, sub, loading, delay = 0, accent = false }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub: string;
  loading: boolean; delay?: number; accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={[
        "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300",
        "hover:shadow-[0_8px_32px_rgb(var(--shadow)/0.18)] hover:-translate-y-0.5",
        accent ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary)/0.06)]" : "border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgb(var(--fg)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--fg)) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={["flex items-center gap-2 text-xs font-semibold uppercase tracking-wider", accent ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--muted2))]"].join(" ")}>
            {icon}{label}
          </div>
          {accent && <div className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))] animate-pulse" />}
        </div>
        <div className="mt-3 text-3xl font-bold tracking-tight text-[rgb(var(--fg))]">
          {loading ? <div className="h-8 w-16 animate-pulse rounded-lg bg-[rgb(var(--card2))]" /> : value}
        </div>
        <div className="mt-1 text-xs text-[rgb(var(--muted))]">{sub}</div>
      </div>
    </motion.div>
  );
}

function RulesCard({ studentPointsPerCompletion, tutorPointsPerCompletion, weeklyBonus }: {
  studentPointsPerCompletion: number; tutorPointsPerCompletion: number;
  weeklyBonus?: { first: number; second: number; third: number };
}) {
  const [open, setOpen] = useState(false);
  const bonus = weeklyBonus ?? { first: 100, second: 60, third: 30 };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[rgb(var(--card2)/0.5)] transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.12)] border border-[rgb(var(--primary)/0.2)]">
            <Info className="h-4 w-4 text-[rgb(var(--primary))]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">How Points & Leaderboard Works</div>
            <div className="text-xs text-[rgb(var(--muted))]">Clear rules for earning points, climbing ranks, and unlocking badges</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--muted))]">
          {open ? "Hide" : "Show"}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="rules" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: "easeInOut" }} className="overflow-hidden">
            <div className="grid grid-cols-1 gap-3 p-5 pt-0 md:grid-cols-3">
              {[
                {
                  icon: <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />,
                  title: "Points",
                  content: (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg bg-[rgb(var(--card)/0.6)] px-3 py-2 border border-[rgb(var(--border))]">
                        <span className="text-xs text-[rgb(var(--muted))]">Student • session completed</span>
                        <span className="text-xs font-bold text-emerald-500">+{studentPointsPerCompletion}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-[rgb(var(--card)/0.6)] px-3 py-2 border border-[rgb(var(--border))]">
                        <span className="text-xs text-[rgb(var(--muted))]">Tutor • tutored a session</span>
                        <span className="text-xs font-bold text-emerald-500">+{tutorPointsPerCompletion}</span>
                      </div>
                      <p className="text-[11px] text-[rgb(var(--muted2))]">Points accumulate in your wallet and appear in Points History.</p>
                    </div>
                  ),
                },
                {
                  icon: <Trophy className="h-4 w-4 text-amber-500" />,
                  title: "Weekly Leaderboard",
                  content: (
                    <div className="space-y-2">
                      {[{ rank: "🥇 1st place", pts: bonus.first, color: "text-yellow-500" }, { rank: "🥈 2nd place", pts: bonus.second, color: "text-slate-400" }, { rank: "🥉 3rd place", pts: bonus.third, color: "text-amber-500" }].map((b) => (
                        <div key={b.rank} className="flex items-center justify-between rounded-lg bg-[rgb(var(--card)/0.6)] px-3 py-2 border border-[rgb(var(--border))]">
                          <span className="text-xs text-[rgb(var(--muted))]">{b.rank}</span>
                          <span className={`text-xs font-bold ${b.color}`}>+{b.pts}</span>
                        </div>
                      ))}
                      <p className="text-[11px] text-[rgb(var(--muted2))]">Resets every Monday at midnight.</p>
                    </div>
                  ),
                },
                {
                  icon: <Medal className="h-4 w-4 text-[rgb(var(--primary))]" />,
                  title: "Badges",
                  content: (
                    <div className="space-y-2">
                      <div className="rounded-lg bg-[rgb(var(--card)/0.6)] px-3 py-2 border border-[rgb(var(--border))]">
                        <p className="text-xs text-[rgb(var(--fg))]">Badges unlock automatically when you hit milestones — sessions completed, total points, streaks.</p>
                      </div>
                      <p className="text-[11px] text-[rgb(var(--muted2))]">Your latest earned badges appear in &quot;My Badges&quot; below.</p>
                    </div>
                  ),
                },
              ].map((section) => (
                <div key={section.title} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[rgb(var(--fg))]">{section.icon}{section.title}</div>
                  {section.content}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type LevelDef = { level: number; minPoints: number; name: string };
const LEVELS: LevelDef[] = [
  { level: 1, minPoints: 0, name: "Rookie" }, { level: 2, minPoints: 150, name: "Learner" },
  { level: 3, minPoints: 350, name: "Focused" }, { level: 4, minPoints: 700, name: "Achiever" },
  { level: 5, minPoints: 1200, name: "Elite" }, { level: 6, minPoints: 2000, name: "Legend" },
];
const POINT_BADGE_STEPS = [
  { points: 100, name: "100 Club" }, { points: 250, name: "250 Club" },
  { points: 500, name: "500 Club" }, { points: 1000, name: "1K Club" },
  { points: 2500, name: "Elite" }, { points: 5000, name: "Legend" },
] as const;

function computeLevel(totalPoints: number) {
  const p = Math.max(0, totalPoints || 0);
  let current: LevelDef = LEVELS[0];
  for (const L of LEVELS) { if (p >= L.minPoints) current = L; }
  const currentIdx = LEVELS.findIndex((x) => x.level === current.level);
  const next: LevelDef | null = currentIdx >= 0 && currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;
  const start = current.minPoints;
  const end = next?.minPoints ?? Math.max(start + 1, p);
  const pct = next ? clampPct(((p - start) / (end - start)) * 100) : 100;
  return { current, next, pct, toNext: next ? Math.max(0, next.minPoints - p) : 0 };
}

function computeNextPointsBadge(totalPoints: number) {
  const p = Math.max(0, totalPoints || 0);
  const next = POINT_BADGE_STEPS.find((b) => p < b.points) ?? null;
  const prev = [...POINT_BADGE_STEPS].reverse().find((b) => p >= b.points) ?? null;
  if (!next) return { done: true, label: "All point badges unlocked", pct: 100, currentPoints: p, nextPoints: null as number | null, toNext: 0, prevPoints: prev?.points ?? 0, nextName: null as string | null };
  const prevPts = prev?.points ?? 0;
  const pct = next.points <= prevPts ? 0 : clampPct(((p - prevPts) / (next.points - prevPts)) * 100);
  return { done: false, label: `Next badge: ${next.name} (${next.points} pts)`, pct, currentPoints: p, nextPoints: next.points, toNext: Math.max(0, next.points - p), prevPoints: prevPts, nextName: next.name };
}

function ConfettiBurst({ show }: { show: boolean }) {
  const pieces = useMemo(() => {
    const colors = ["rgb(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
    return Array.from({ length: 28 }).map((_, i) => ({
      id: i, left: (i * 97 + 11) % 100, delay: (i % 8) * 0.025,
      drift: ((i % 9) - 4) * 16, rotate: (i * 31) % 360,
      color: colors[i % colors.length], size: 4 + (i % 4) * 2,
    }));
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="pointer-events-none fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden>
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute top-0 rounded-sm"
              style={{ left: `${p.left}%`, width: p.size, height: p.size, backgroundColor: p.color }}
              initial={{ y: -10, x: 0, rotate: p.rotate, scale: 0.9 }}
              animate={{ y: 280, x: p.drift, rotate: p.rotate + 320, scale: 1, opacity: [0.9, 0.9, 0] }}
              transition={{ duration: 1.3, delay: p.delay, ease: "easeOut" }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AchievementsPage() {
  const [scope, setScope] = useState<Scope>("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(1);
  const prevBadgesRef = useRef<number>(0);
  const [confetti, setConfetti] = useState(false);

  const { data: meData, isLoading: loadingMe, mutate: mutateMe } = useSWR<MeRes>(
    "/api/achievements/me",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 15_000 }
  );

  const { data: lbData, isLoading: loadingLb, mutate: mutateLb } = useSWR<LeaderboardRes>(
    `/api/achievements/leaderboard/weekly?limit=10&mode=${encodeURIComponent(scope)}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 15_000 }
  );

  const { data: recoData } = useSWR<RecoRes>(
    "/api/achievements/recommendations",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const loading = loadingMe || loadingLb;

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([mutateMe(), mutateLb()]);
    setRefreshing(false);
  }

  const totalPoints = meData?.wallet?.total ?? 0;
  const badgesCount = meData?.badges?.length ?? 0;

  // Confetti on new badge
  useEffect(() => {
    const prev = prevBadgesRef.current;
    if (!loading && badgesCount > prev) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 1500);
      prevBadgesRef.current = badgesCount;
      return () => clearTimeout(t);
    }
    prevBadgesRef.current = badgesCount;
  }, [badgesCount, loading]);

  // Level up modal
  useEffect(() => {
    if (loading) return;
    const userId = meData?.me?.id;
    if (!userId) return;
    const currentLevel = levelInfo.current.level;
    const storageKey = `tutorlink:lastLevelShown:${userId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      const lastShown = raw ? Number(raw) : null;
      if (lastShown == null || !Number.isFinite(lastShown)) { localStorage.setItem(storageKey, String(currentLevel)); return; }
      if (currentLevel > lastShown) { localStorage.setItem(storageKey, String(currentLevel)); setLevelUpLevel(currentLevel); setLevelUpOpen(true); }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, meData?.me?.id]);

  const earnedThisWeek = useMemo(() => {
    if (!meData?.history?.length) return 0;
    const now = new Date();
    const start = new Date(now);
    const day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return meData.history.filter((h) => new Date(h.createdAt) >= start).reduce((sum, h) => sum + Math.max(0, h.amount ?? 0), 0);
  }, [meData]);

  const myRank = useMemo(() => {
    const myId = meData?.me?.id;
    if (!myId || !lbData?.rows?.length) return null;
    return lbData.rows.find((r) => r.userId === myId)?.rank ?? null;
  }, [meData, lbData]);

  const levelInfo = useMemo(() => computeLevel(totalPoints), [totalPoints]);
  const nextBadgeInfo = useMemo(() => computeNextPointsBadge(totalPoints), [totalPoints]);
  const recommendations = useMemo(() => (recoData?.ok ? recoData.recommendations : []).slice(0, 3), [recoData]);

  const weeklyBonus =
    (GAMIFICATION_RULES as any)?.weekly?.leaderboardBonus ??
    (GAMIFICATION_RULES as any)?.leaderboardBonus ??
    undefined;

  return (
    <>
      <ConfettiBurst show={confetti} />
      <LevelUpModal open={levelUpOpen} newLevel={levelUpLevel} onClose={() => setLevelUpOpen(false)} />

      <div className="mx-auto w-full max-w-6xl px-4 py-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--primary)/0.12)] border border-[rgb(var(--primary)/0.25)]">
                <Trophy className="h-5 w-5 text-[rgb(var(--primary))]" />
              </div>
              <h1 className="text-xl font-bold text-[rgb(var(--fg))]">Achievements</h1>
            </div>
            <p className="mt-1.5 ml-11 text-sm text-[rgb(var(--muted))]">Track your points, badges, and weekly ranking.</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3.5 py-2 text-xs font-semibold text-[rgb(var(--fg))] transition-all hover:bg-[rgb(var(--card)/0.8)] hover:shadow-sm disabled:opacity-60"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </motion.div>

        {/* Rules */}
        <RulesCard
          studentPointsPerCompletion={GAMIFICATION_RULES?.student?.sessionCompleted ?? 0}
          tutorPointsPerCompletion={GAMIFICATION_RULES?.tutor?.sessionCompleted ?? 0}
          weeklyBonus={weeklyBonus}
        />

        {/* Stat Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={<Sparkles className="h-3.5 w-3.5" />} label="Total Points" value={<AnimatedNumber value={totalPoints} loading={loading} />} sub="Lifetime total" loading={loading} delay={0} accent />
          <StatCard icon={<Award className="h-3.5 w-3.5" />} label="Badges" value={<AnimatedNumber value={badgesCount} loading={loading} />} sub="Unlocked" loading={loading} delay={0.06} />
          <StatCard icon={<Zap className="h-3.5 w-3.5" />} label="This Week" value={<AnimatedNumber value={earnedThisWeek} loading={loading} />} sub="Points earned" loading={loading} delay={0.12} />
          <StatCard icon={<Crown className="h-3.5 w-3.5" />} label="Weekly Rank" value={loading ? <span>—</span> : myRank ? <span>#{myRank}</span> : <span>—</span>} sub={`In ${scope.toLowerCase()} board`} loading={loading} delay={0.18} />
        </div>

        {/* Level + Next Badge */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[rgb(var(--primary)/0.08)]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[rgb(var(--primary))]" />
                  <span className="text-sm font-semibold text-[rgb(var(--fg))]">Level Progress</span>
                </div>
                {loading ? (
                  <div className="mt-1 h-4 w-28 animate-pulse rounded bg-[rgb(var(--card2))]" />
                ) : (
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-[rgb(var(--fg))]">Lvl {levelInfo.current.level}</span>
                    <span className="text-sm font-medium text-[rgb(var(--primary))]">{levelInfo.current.name}</span>
                  </div>
                )}
              </div>
              {!loading && levelInfo.next && (
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-[rgb(var(--muted2))]">Next</div>
                  <div className="text-sm font-bold text-[rgb(var(--fg))]">Lvl {levelInfo.next.level}</div>
                  <div className="text-[10px] text-[rgb(var(--primary))]">{levelInfo.next.name}</div>
                </div>
              )}
            </div>
            <div className="mt-4">
              <ProgressBar pct={loading ? 0 : levelInfo.pct} loading={loading} glow />
              <div className="mt-2 flex items-center justify-between text-xs text-[rgb(var(--muted))]">
                <span>{loading ? "—" : `${Math.round(levelInfo.pct)}% complete`}</span>
                <span>{loading ? "—" : levelInfo.next ? `${levelInfo.toNext} pts to ${levelInfo.next.name}` : "🏆 Max level reached"}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[rgb(var(--primary)/0.06)]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-[rgb(var(--primary))]" />
                  <span className="text-sm font-semibold text-[rgb(var(--fg))]">Next Badge</span>
                </div>
                {loading ? (
                  <div className="mt-1 h-4 w-36 animate-pulse rounded bg-[rgb(var(--card2))]" />
                ) : (
                  <div className="mt-1 flex items-baseline gap-1.5">
                    {nextBadgeInfo.done ? (
                      <span className="text-sm font-medium text-emerald-500">All badges unlocked ✓</span>
                    ) : (
                      <><span className="text-2xl font-bold text-[rgb(var(--fg))]">{nextBadgeInfo.nextName}</span><span className="text-sm text-[rgb(var(--muted))]">badge</span></>
                    )}
                  </div>
                )}
              </div>
              {!loading && !nextBadgeInfo.done && (
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-[rgb(var(--muted2))]">Left</div>
                  <div className="text-sm font-bold text-[rgb(var(--fg))]">{nextBadgeInfo.toNext}</div>
                  <div className="text-[10px] text-[rgb(var(--muted2))]">pts</div>
                </div>
              )}
            </div>
            <div className="mt-4">
              <ProgressBar pct={loading ? 0 : nextBadgeInfo.pct} loading={loading} color="emerald" glow />
              <div className="mt-2 flex items-center justify-between text-xs text-[rgb(var(--muted))]">
                <span>{loading ? "—" : `${Math.round(nextBadgeInfo.pct)}%`}</span>
                <span>{loading ? "—" : nextBadgeInfo.done ? "Ladder complete" : `${nextBadgeInfo.currentPoints} / ${nextBadgeInfo.nextPoints} pts`}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recommended Badges */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
              <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
              Recommended Next Badges
            </div>
            <Link href="/dashboard/student/badges" className="flex items-center gap-1 text-xs font-semibold text-[rgb(var(--primary))] hover:underline">View all →</Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {recommendations.map((b, i) => (
              <motion.div key={b.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.06 }} className="group rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 transition-all hover:border-[rgb(var(--primary)/0.3)] hover:shadow-[0_4px_16px_rgb(var(--primary)/0.08)]">
                <div className="flex items-center gap-3">
                  <BadgeIconSmall icon={b.icon} badgeKey={b.key} size="lg" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[rgb(var(--fg))]">{b.name}</div>
                    <div className="mt-0.5 line-clamp-1 text-xs text-[rgb(var(--muted))]">{b.description}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar pct={loading ? 0 : b.pct} loading={loading} />
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[rgb(var(--muted2))]">
                    <span>{loading ? "—" : `${Math.round(b.pct)}%`}</span>
                    <span>{loading ? "—" : b.remainingText}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            {!loading && recommendations.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-6 text-center text-sm text-[rgb(var(--muted))]">
                <Sparkles className="mx-auto h-6 w-6 text-[rgb(var(--muted2))]" />
                <p className="mt-2">All recommended badges completed!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Badges + Leaderboard */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* My Badges */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
                <Medal className="h-4 w-4 text-[rgb(var(--primary))]" />My Badges
              </div>
              {badgesCount > 0 && (
                <div className="rounded-full border border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--primary)/0.1)] px-2 py-0.5 text-xs font-semibold text-[rgb(var(--primary))]">{badgesCount}</div>
              )}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <AnimatePresence>
                {(meData?.badges ?? []).slice(0, 8).map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.04 }} className="group flex items-start gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-3 transition-all hover:border-[rgb(var(--primary)/0.3)]">
                    <BadgeIconSmall icon={b.badge.icon} badgeKey={b.badge.key} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[rgb(var(--fg))]">{b.badge.name}</div>
                      <div className="mt-0.5 text-xs text-[rgb(var(--muted))] line-clamp-1">{b.badge.description}</div>
                      <div className="mt-1 text-[10px] text-[rgb(var(--muted2))]">{formatDateTime(b.awardedAt)}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!loading && (meData?.badges?.length ?? 0) === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-6 text-center text-sm text-[rgb(var(--muted))]">
                  <Medal className="mx-auto h-6 w-6 text-[rgb(var(--muted2))]" />
                  <p className="mt-2">No badges yet — complete sessions to start unlocking achievements.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Weekly Leaderboard */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
                <Trophy className="h-4 w-4 text-amber-500" />Weekly Leaderboard
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/dashboard/student/leaderboard" className="text-xs font-semibold text-[rgb(var(--primary))] hover:underline">View full →</Link>
                <div className="flex items-center gap-1.5">
                  <ScopePill active={scope === "ALL"} label="All" onClick={() => setScope("ALL")} icon={<Users className="h-3 w-3" />} />
                  <ScopePill active={scope === "STUDENTS"} label="Students" onClick={() => setScope("STUDENTS")} icon={<Award className="h-3 w-3" />} />
                  <ScopePill active={scope === "TUTORS"} label="Tutors" onClick={() => setScope("TUTORS")} icon={<Trophy className="h-3 w-3" />} />
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {(lbData?.rows ?? []).map((r, i) => {
                const rankMeta =
                  r.rank === 1 ? { ring: "border-yellow-400/30 bg-gradient-to-r from-yellow-400/10 to-transparent", rankColor: "text-yellow-500", emoji: "🥇" }
                  : r.rank === 2 ? { ring: "border-slate-300/30 bg-gradient-to-r from-slate-300/10 to-transparent", rankColor: "text-slate-400", emoji: "🥈" }
                  : r.rank === 3 ? { ring: "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent", rankColor: "text-amber-500", emoji: "🥉" }
                  : { ring: "", rankColor: "text-[rgb(var(--muted2))]", emoji: null };
                const isMe = r.userId === meData?.me?.id;
                return (
                  <motion.div
                    key={r.userId}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.44 + i * 0.04 }}
                    className={["flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-all", rankMeta.ring || "border-[rgb(var(--border))] bg-[rgb(var(--card2))]", isMe ? "ring-1 ring-[rgb(var(--primary)/0.4)] ring-offset-1 ring-offset-transparent" : ""].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={["w-7 text-center font-bold", rankMeta.rankColor].join(" ")}>
                        {rankMeta.emoji ?? <span className="text-sm">{r.rank}</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--fg))]">
                          {r.user?.name ?? r.user?.email ?? "Unknown"}
                          {isMe && <span className="rounded-full bg-[rgb(var(--primary)/0.15)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[rgb(var(--primary))]">You</span>}
                        </div>
                        <div className="text-[10px] capitalize text-[rgb(var(--muted2))]">{r.user?.role ?? ""}</div>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-[rgb(var(--fg))]">{r.points}</span>
                      <span className="text-[10px] text-[rgb(var(--muted2))]">pts</span>
                    </div>
                  </motion.div>
                );
              })}
              {!loading && (lbData?.rows?.length ?? 0) === 0 && (
                <div className="rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-6 text-center text-sm text-[rgb(var(--muted))]">
                  No leaderboard data for this week yet.
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Points History */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }} className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
              <History className="h-4 w-4 text-[rgb(var(--primary))]" />Points History
            </div>
            <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-0.5 text-xs text-[rgb(var(--muted2))]">Latest 50</span>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-[rgb(var(--border))]">
            <div className="grid grid-cols-12 border-b border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))]">
              <div className="col-span-4">When</div>
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
            <div className="divide-y divide-[rgb(var(--border))]">
              {(meData?.history ?? []).map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  className="grid grid-cols-12 bg-[rgb(var(--card)/0.5)] px-4 py-2.5 text-xs hover:bg-[rgb(var(--card2)/0.7)] transition-colors"
                >
                  <div className="col-span-4 text-[rgb(var(--muted))]">{formatDateTime(h.createdAt)}</div>
                  <div className="col-span-6 text-[rgb(var(--fg))]">{h.description}</div>
                  <div className={`col-span-2 text-right font-bold ${amountBadge(h.amount)}`}>
                    {h.amount > 0 ? `+${h.amount}` : h.amount}
                  </div>
                </motion.div>
              ))}
            </div>
            {!loading && (meData?.history?.length ?? 0) === 0 && (
              <div className="p-6 text-center text-sm text-[rgb(var(--muted))]">No points transactions yet.</div>
            )}
          </div>
        </motion.div>

      </div>
    </>
  );
}