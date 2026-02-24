"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Trophy, History, Sparkles, RefreshCcw, Medal, Users } from "lucide-react";

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

export default function AchievementsPage() {
  const [meData, setMeData] = useState<MeRes | null>(null);
  const [lbData, setLbData] = useState<LeaderboardRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<Scope>("ALL");

  const totalPoints = meData?.wallet?.total ?? 0;
  const badgesCount = meData?.badges?.length ?? 0;

  const earnedThisWeek = useMemo(() => {
    if (!meData?.history?.length) return 0;
    const now = new Date();
    // Monday start
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

  async function fetchAll(isManual = false, nextScope: Scope = scope) {
    try {
      if (isManual) setRefreshing(true);

      const lbUrl = `/api/achievements/leaderboard/weekly?limit=10&mode=${encodeURIComponent(nextScope)}`;

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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Achievements</h1>
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
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

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
          <div className="mt-1 text-xs text-[rgb(var(--muted2))]">Lifetime total</div>
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
          <div className="mt-1 text-xs text-[rgb(var(--muted2))]">Achievements unlocked</div>
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
          <div className="mt-1 text-xs text-[rgb(var(--muted2))]">Points earned this week</div>
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
          <div className="mt-1 text-xs text-[rgb(var(--muted2))]">In {scope.toLowerCase()} leaderboard</div>
        </motion.div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Badges */}
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
              <Medal className="h-4 w-4 text-[rgb(var(--primary))]" />
              My Badges
            </div>
            <div className="text-xs text-[rgb(var(--muted2))]">{badgesCount} total</div>
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
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">{b.badge.name}</div>
                  <div className="mt-1 text-xs text-[rgb(var(--muted))]">{b.badge.description}</div>
                  <div className="mt-2 text-[11px] text-[rgb(var(--muted2))]">
                    Earned: {formatDateTime(b.awardedAt)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!loading && (meData?.badges?.length ?? 0) === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 text-sm text-[rgb(var(--muted))]">
                No badges yet — complete sessions to start unlocking achievements.
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

          <div className="mt-3 space-y-2">
            {(lbData?.rows ?? []).map((r) => (
              <div
                key={r.userId}
                className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 text-center text-sm font-bold text-[rgb(var(--muted2))]">
                    {r.rank}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                      {r.user?.name ?? r.user?.email ?? "Unknown"}
                    </div>
                    <div className="text-xs text-[rgb(var(--muted2))]">{r.user?.role ?? ""}</div>
                  </div>
                </div>

                <div className="text-sm font-bold text-[rgb(var(--fg))]">{r.points}</div>
              </div>
            ))}

            {!loading && (lbData?.rows?.length ?? 0) === 0 && (
              <div className="rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 text-sm text-[rgb(var(--muted))]">
                No leaderboard data yet for this week.
              </div>
            )}
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
              <div className="col-span-4 text-[rgb(var(--muted))]">{formatDateTime(h.createdAt)}</div>
              <div className="col-span-6 text-[rgb(var(--fg))]">{h.description}</div>
              <div className={`col-span-2 text-right font-semibold ${amountBadge(h.amount)}`}>
                {h.amount > 0 ? `+${h.amount}` : h.amount}
              </div>
            </div>
          ))}

          {!loading && (meData?.history?.length ?? 0) === 0 && (
            <div className="p-4 text-sm text-[rgb(var(--muted))]">No points transactions yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}