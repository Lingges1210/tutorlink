"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  RefreshCcw,
  Trophy,
  Users,
  Award,
  Crown,
  Flame,
  Zap,
  Star,
  TrendingUp,
} from "lucide-react";

type Scope = "ALL" | "STUDENTS" | "TUTORS";

type LeaderboardRes = {
  ok: boolean;
  mode?: Scope;
  meUserId?: string;
  rows: Array<{
    rank: number;
    userId: string;
    points: number;
    user: {
      id: string;
      name: string | null;
      email: string;
      role: string;
      avatarUrl: string | null;
    };
  }>;
};

/* =========================
   AVATAR
   ========================= */

function getInitials(name: string | null | undefined, email: string) {
  const base = (name?.trim() || "").split(/\s+/).filter(Boolean);
  if (base.length >= 2) return (base[0][0] + base[1][0]).toUpperCase();
  if (base.length === 1) return base[0].slice(0, 2).toUpperCase();
  return (email || "U").slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-blue-600",
];

function getGradient(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function Avatar({
  name,
  email,
  src,
  size = 44,
  ringClass,
}: {
  name: string | null;
  email: string;
  src?: string | null;
  size?: number;
  ringClass?: string;
}) {
  const initials = getInitials(name, email);
  const gradient = getGradient(email || name || "U");

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${ringClass ?? "ring-2 ring-[rgb(var(--border))]"}`}
      style={{ width: size, height: size }}
      title={name ?? email}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? email} className="h-full w-full object-cover" />
      ) : (
        <div
          className={`bg-gradient-to-br ${gradient} grid h-full w-full place-items-center text-white font-bold`}
          style={{ fontSize: size * 0.32 }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

/* =========================
   PULSE DOT
   ========================= */
function PulseDot({ color = "bg-emerald-400" }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

/* =========================
   SCOPE TABS
   ========================= */
function ScopeTab({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200",
        active
          ? "bg-[rgb(var(--primary))] text-white shadow-md shadow-[rgb(var(--primary)/0.30)]"
          : "text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

/* =========================
   STAT CHIP
   ========================= */
function StatChip({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.9)] px-4 py-3 shadow-sm"
    >
      <div className={`rounded-xl p-2.5 ${accent ?? "bg-[rgb(var(--primary)/0.12)]"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--muted2))]">
          {label}
        </div>
        <div className="truncate text-base font-extrabold text-[rgb(var(--fg))]">{value}</div>
      </div>
    </motion.div>
  );
}

/* =========================
   PODIUM CARD
   ========================= */
const podiumConfig = {
  1: {
    badge: "bg-gradient-to-br from-yellow-300 to-amber-400 text-amber-900",
    glow: "shadow-[0_0_40px_rgb(251,191,36,0.22)]",
    ringClass: "ring-2 ring-yellow-400/60",
    border: "border-yellow-400/25",
    gradient: "from-yellow-400/20 via-amber-300/8 to-transparent",
    icon: <Crown className="h-3.5 w-3.5" />,
    label: "1st",
    barColor: "from-yellow-400 to-amber-500",
  },
  2: {
    badge: "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800",
    glow: "shadow-[0_0_30px_rgb(148,163,184,0.15)]",
    ringClass: "ring-2 ring-slate-400/40",
    border: "border-slate-300/20",
    gradient: "from-slate-300/12 via-blue-200/6 to-transparent",
    icon: <Trophy className="h-3.5 w-3.5" />,
    label: "2nd",
    barColor: "from-slate-400 to-slate-500",
  },
  3: {
    badge: "bg-gradient-to-br from-amber-500 to-orange-500 text-white",
    glow: "shadow-[0_0_30px_rgb(245,158,11,0.15)]",
    ringClass: "ring-2 ring-amber-500/40",
    border: "border-amber-500/20",
    gradient: "from-amber-400/12 via-orange-300/6 to-transparent",
    icon: <Award className="h-3.5 w-3.5" />,
    label: "3rd",
    barColor: "from-amber-500 to-orange-500",
  },
};

function ChampionCard({
  r,
  place,
}: {
  r: LeaderboardRes["rows"][number];
  place: 1 | 2 | 3;
}) {
  const cfg = podiumConfig[place];
  const name = r.user?.name ?? r.user?.email ?? "Unknown";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 22, delay: (place - 1) * 0.07 }}
      whileHover={{ y: -5, transition: { type: "spring", stiffness: 400, damping: 18 } }}
      className={[
        "relative rounded-3xl border p-5 overflow-hidden cursor-default",
        `border-[rgb(var(--border))] ${cfg.border}`,
        "bg-[rgb(var(--card)/0.85)]",
        cfg.glow,
      ].join(" ")}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cfg.gradient} opacity-80`} />

      <div className="relative flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold ${cfg.badge}`}>
          {cfg.icon}
          {cfg.label}
        </span>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--muted2))]">pts</div>
          <div className="text-3xl font-black tabular-nums text-[rgb(var(--fg))] leading-none">
            {r.points.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="relative mt-5 flex items-center gap-3">
        <Avatar
          name={r.user?.name ?? null}
          email={r.user?.email ?? ""}
          src={r.user?.avatarUrl ?? null}
          size={50}
          ringClass={cfg.ringClass}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-[rgb(var(--fg))]">{name}</div>
          <div className="text-[11px] text-[rgb(var(--muted2))] font-medium capitalize">
            {r.user?.role ?? ""}
          </div>
        </div>
      </div>

      <div className="relative mt-4 h-1.5 rounded-full overflow-hidden bg-[rgb(var(--border))]">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${cfg.barColor}`}
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 0.45, duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

/* =========================
   RANK ROW
   ========================= */
function RankRow({
  r,
  meUserId,
  index,
}: {
  r: LeaderboardRes["rows"][number];
  meUserId: string | null;
  index: number;
}) {
  const isMe = r.userId === meUserId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.025 }}
      className={[
        "group grid grid-cols-12 border-t px-4 py-3 items-center transition-colors",
        isMe
          ? "border-[rgb(var(--primary)/0.22)] bg-[rgb(var(--primary)/0.06)]"
          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:bg-[rgb(var(--card2))]",
      ].join(" ")}
    >
      <div className="col-span-2">
        <span
          className={`inline-block w-9 text-center rounded-lg py-0.5 text-xs font-black tabular-nums
            ${r.rank <= 10 ? "bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))]" : "text-[rgb(var(--muted2))]"}`}
        >
          #{r.rank}
        </span>
      </div>

      <div className="col-span-7 flex items-center gap-3 min-w-0">
        <Avatar
          name={r.user?.name ?? null}
          email={r.user?.email ?? ""}
          src={r.user?.avatarUrl ?? null}
          size={34}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-sm font-bold text-[rgb(var(--fg))]">
              {r.user?.name ?? r.user?.email ?? "Unknown"}
            </span>
            {isMe && (
              <span className="shrink-0 rounded-full bg-[rgb(var(--primary))] px-2 py-0.5 text-[10px] font-extrabold text-white">
                You
              </span>
            )}
          </div>
          <div className="text-[11px] font-medium text-[rgb(var(--muted2))] capitalize">
            {r.user?.role ?? ""}
          </div>
        </div>
      </div>

      <div className="col-span-3 text-right">
        <span className="text-sm font-black tabular-nums text-[rgb(var(--fg))]">
          {r.points.toLocaleString()}
        </span>
        <div className="text-[10px] font-semibold text-[rgb(var(--muted2))]">pts</div>
      </div>
    </motion.div>
  );
}

/* =========================
   PAGE
   ========================= */
export default function StudentLeaderboardPage() {
  const [scope, setScope] = useState<Scope>("ALL");
  const [data, setData] = useState<LeaderboardRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchLB(isManual = false, nextScope: Scope = scope) {
    try {
      if (isManual) setRefreshing(true);
      const url = `/api/achievements/leaderboard/weekly?limit=50&mode=${encodeURIComponent(nextScope)}`;
      const r = await fetch(url, { cache: "no-store" });
      const j = (await r.json()) as LeaderboardRes;
      setData(j);
      setLastUpdated(new Date());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchLB(false, scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const rows = useMemo(() => (data?.ok ? data.rows : []), [data]);
  const top3 = useMemo(() => rows.filter((r) => r.rank <= 3), [rows]);
  const rest = useMemo(() => rows.filter((r) => r.rank > 3), [rows]);
  const meUserId = data?.meUserId ?? null;
  const myRow = useMemo(() => rows.find((r) => r.userId === meUserId) ?? null, [rows, meUserId]);
  const nextRow = useMemo(
    () => (myRow ? rows.find((r) => r.rank === myRow.rank - 1) ?? null : null),
    [rows, myRow]
  );
  const pointsToNext = useMemo(
    () => (myRow && nextRow ? Math.max(0, nextRow.points - myRow.points + 1) : null),
    [myRow, nextRow]
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/student/achievements"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Achievements
          </Link>

          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-[rgb(var(--fg))]">
              Leaderboard
            </h1>
            <div className="flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[11px] font-bold text-[rgb(var(--muted))]">
              <PulseDot color="bg-emerald-400" />
              Live
            </div>
          </div>

          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Weekly rankings · resets every Monday
            {lastUpdated && (
              <span className="ml-2 text-[rgb(var(--muted2))]">
                · updated{" "}
                {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => fetchLB(true, scope)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-2.5 text-xs font-bold text-[rgb(var(--fg))] shadow-sm hover:border-[rgb(var(--primary)/0.35)] transition-all disabled:opacity-55"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </motion.button>
      </div>

      {/* ── Champions ── */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] p-5 shadow-[0_8px_40px_rgb(var(--shadow)/0.07)]">

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 p-2 shadow-md shadow-amber-400/30">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-[rgb(var(--fg))]">Weekly Champions</div>
              <div className="text-[11px] text-[rgb(var(--muted2))]">Top performers this week</div>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-1">
            <ScopeTab active={scope === "ALL"} label="All" icon={<Star className="h-3 w-3" />} onClick={() => setScope("ALL")} />
            <ScopeTab active={scope === "STUDENTS"} label="Students" icon={<Users className="h-3 w-3" />} onClick={() => setScope("STUDENTS")} />
            <ScopeTab active={scope === "TUTORS"} label="Tutors" icon={<Flame className="h-3 w-3" />} onClick={() => setScope("TUTORS")} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
          <AnimatePresence mode="wait">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-44 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] animate-pulse" />
              ))
            ) : top3.length === 0 ? (
              <motion.div
                key="empty"
                className="col-span-full rounded-2xl border border-dashed border-[rgb(var(--border))] p-10 text-center text-sm text-[rgb(var(--muted))]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Trophy className="mx-auto mb-3 h-8 w-8 opacity-20" />
                No leaderboard data yet this week. Start earning points!
              </motion.div>
            ) : (
              <>
                <div className="md:order-1">
                  {top3.find((x) => x.rank === 2) && <ChampionCard r={top3.find((x) => x.rank === 2)!} place={2} />}
                </div>
                <div className="md:order-2 md:-translate-y-3">
                  {top3.find((x) => x.rank === 1) && <ChampionCard r={top3.find((x) => x.rank === 1)!} place={1} />}
                </div>
                <div className="md:order-3">
                  {top3.find((x) => x.rank === 3) && <ChampionCard r={top3.find((x) => x.rank === 3)!} place={3} />}
                </div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatChip label="Your Rank" value={myRow ? `#${myRow.rank}` : "—"} icon={<Award className="h-4 w-4 text-violet-500" />} accent="bg-violet-500/10" />
          <StatChip label="Your Points" value={myRow ? myRow.points.toLocaleString() : 0} icon={<Zap className="h-4 w-4 text-amber-500" />} accent="bg-amber-500/10" />
          <StatChip label="To Next Rank" value={pointsToNext !== null ? `+${pointsToNext}` : "—"} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} accent="bg-emerald-500/10" />
          <StatChip label="Scope" value={scope === "ALL" ? "Everyone" : scope === "STUDENTS" ? "Students" : "Tutors"} icon={<Flame className="h-4 w-4 text-rose-500" />} accent="bg-rose-500/10" />
        </div>
      </div>

      {/* ── Full Rankings ── */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] p-5 shadow-[0_8px_40px_rgb(var(--shadow)/0.05)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-[rgb(var(--primary)/0.1)] p-2">
              <Users className="h-4 w-4 text-[rgb(var(--primary))]" />
            </div>
            <span className="text-sm font-extrabold text-[rgb(var(--fg))]">Full Rankings</span>
          </div>
          <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[11px] font-bold text-[rgb(var(--muted2))]">
            Top 50
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[rgb(var(--border))]">
          <div className="grid grid-cols-12 bg-[rgb(var(--card2))] px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest text-[rgb(var(--muted2))]">
            <div className="col-span-2">Rank</div>
            <div className="col-span-7">Player</div>
            <div className="col-span-3 text-right">Points</div>
          </div>

          <AnimatePresence initial={false}>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-14 border-t border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 flex items-center gap-3">
                  <div className="h-3 w-8 rounded bg-[rgb(var(--card2))] animate-pulse" />
                  <div className="h-8 w-8 rounded-full bg-[rgb(var(--card2))] animate-pulse" />
                  <div className="h-3 w-28 rounded bg-[rgb(var(--card2))] animate-pulse" />
                </div>
              ))
            ) : rest.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[rgb(var(--muted))]">
                No additional rankings yet — more users appear after the top 3.
              </div>
            ) : (
              rest.map((r, i) => <RankRow key={r.userId} r={r} meUserId={meUserId} index={i} />)
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}