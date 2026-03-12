"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Medal,
  Sparkles,
  ArrowLeft,
  Star,
  Trophy,
  Crown,
  Flame,
  Swords,
  Shield,
  Gem,
  Compass,
  Brain,
  Book,
  Users,
  Award,
  Sun,
  Moon,
  Calendar,
  Zap,
  MessageCircle,
  Clock,
  Rocket,
  Key,
  Lock,
} from "lucide-react";

type AllBadgesRes = {
  ok: boolean;
  totalPoints: number;
  badges: Array<{
    id: string;
    key: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    awardedAt: string | null;
  }>;
};

type FilterTab = "ALL" | "EARNED" | "LOCKED";

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function parsePointsTarget(badgeKey: string): number | null {
  if (!badgeKey.startsWith("POINTS_")) return null;
  const n = Number(badgeKey.replace("POINTS_", ""));
  return Number.isFinite(n) ? n : null;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

const ICONS: Record<string, any> = {
  medal: Medal,
  sparkles: Sparkles,
  star: Star,
  trophy: Trophy,
  crown: Crown,
  flame: Flame,
  fire: Flame,
  swords: Swords,
  shield: Shield,
  gem: Gem,
  compass: Compass,
  brain: Brain,
  book: Book,
  users: Users,
  award: Award,
  sun: Sun,
  moon: Moon,
  calendar: Calendar,
  zap: Zap,
  "message-circle": MessageCircle,
  messagecircle: MessageCircle,
  clock: Clock,
  rocket: Rocket,
  key: Key,
};

// Badge color accent based on icon type (adds personality per badge)
const ICON_ACCENTS: Record<string, string> = {
  trophy:  "from-amber-400 to-yellow-500",
  crown:   "from-yellow-400 to-amber-500",
  flame:   "from-orange-400 to-red-500",
  fire:    "from-orange-400 to-red-500",
  rocket:  "from-blue-400 to-violet-500",
  gem:     "from-cyan-400 to-blue-500",
  star:    "from-yellow-300 to-amber-400",
  zap:     "from-yellow-400 to-orange-400",
  brain:   "from-purple-400 to-fuchsia-500",
  shield:  "from-emerald-400 to-teal-500",
  swords:  "from-red-400 to-rose-500",
  sparkles:"from-violet-400 to-purple-500",
  medal:   "from-[rgb(var(--primary))] to-[rgb(var(--primary))]",
  compass: "from-teal-400 to-cyan-500",
  book:    "from-indigo-400 to-blue-500",
  users:   "from-pink-400 to-rose-500",
  award:   "from-amber-400 to-yellow-500",
  sun:     "from-yellow-300 to-orange-400",
  moon:    "from-indigo-400 to-violet-500",
  calendar:"from-sky-400 to-blue-500",
  "message-circle": "from-green-400 to-emerald-500",
  messagecircle: "from-green-400 to-emerald-500",
  clock:   "from-slate-400 to-gray-500",
  key:     "from-amber-400 to-yellow-500",
};

function getBadgeGradient(icon: string | null | undefined) {
  const key = (icon ?? "medal").toLowerCase();
  return ICON_ACCENTS[key] ?? "from-[rgb(var(--primary))] to-[rgb(var(--primary))]";
}

function BadgeIcon({
  icon,
  earned,
}: {
  icon: string | null | undefined;
  earned: boolean;
}) {
  const I = (icon ? ICONS[icon.toLowerCase()] : null) ?? Medal;
  const gradient = getBadgeGradient(icon);

  if (earned) {
    return (
      <div
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
        aria-hidden
      >
        <I className="h-7 w-7 text-white drop-shadow" />
        {/* glow ring */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-30 blur-md -z-10 scale-110`} />
      </div>
    );
  }

  return (
    <div
      className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))]"
      aria-hidden
    >
      <I className="h-7 w-7 text-[rgb(var(--muted2))]" />
      <Lock className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[rgb(var(--card2))] p-0.5 text-[rgb(var(--muted2))] border border-[rgb(var(--border))]" />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  loading,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub: string;
  accent: string;
  loading: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.8)] p-5 shadow-[0_8px_32px_rgb(var(--shadow)/0.12)] backdrop-blur-sm transition-all hover:shadow-[0_12px_40px_rgb(var(--shadow)/0.18)] hover:-translate-y-0.5">
      {/* Subtle background accent */}
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-xl transition-all group-hover:opacity-20`} />

      <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[rgb(var(--muted))]">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${accent}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        {label}
      </div>
      <div className="relative mt-3 text-3xl font-bold tabular-nums text-[rgb(var(--fg))]">
        {loading ? (
          <div className="h-8 w-16 animate-pulse rounded-lg bg-[rgb(var(--card2))]" />
        ) : (
          value
        )}
      </div>
      <div className="relative mt-1 text-xs text-[rgb(var(--muted2))]">{sub}</div>
    </div>
  );
}

function TabButton({
  active,
  label,
  count,
  loading,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 border",
        active
          ? "border-[rgb(var(--primary)/0.4)] bg-[rgb(var(--primary))] text-white shadow-[0_4px_14px_rgb(var(--primary)/0.35)]"
          : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:border-[rgb(var(--primary)/0.3)] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.8)]",
      ].join(" ")}
    >
      {label}
      {!loading && (
        <span
          className={[
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
            active
              ? "bg-white/20 text-white"
              : "bg-[rgb(var(--card))] text-[rgb(var(--muted2))]",
          ].join(" ")}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ProgressBar({ pct, loading }: { pct: number; loading: boolean }) {
  return (
    <div className="relative h-1.5 overflow-hidden rounded-full bg-[rgb(var(--card2))]">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary)/0.7)] transition-all duration-700"
        style={{ width: `${loading ? 0 : pct}%` }}
      />
    </div>
  );
}

export default function AllBadgesPage() {
  const [data, setData] = useState<AllBadgesRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("ALL");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/achievements/badges/all", {
          cache: "no-store",
        });
        const json = (await res.json()) as AllBadgesRes;
        setData(json);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalPoints = data?.totalPoints ?? 0;

  const earnedCount = useMemo(
    () => (data?.badges ?? []).filter((b) => b.earned).length,
    [data]
  );

  const lockedCount = useMemo(
    () => (data?.badges ?? []).filter((b) => !b.earned).length,
    [data]
  );

  const sorted = useMemo(() => {
    const badges = data?.badges ?? [];
    return [...badges].sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
      const ta = parsePointsTarget(a.key);
      const tb = parsePointsTarget(b.key);
      if (ta != null && tb != null) {
        const ra = Math.max(0, ta - totalPoints);
        const rb = Math.max(0, tb - totalPoints);
        if (ra !== rb) return ra - rb;
        return ta - tb;
      }
      if (ta != null && tb == null) return -1;
      if (ta == null && tb != null) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [data, totalPoints]);

  const filtered = useMemo(() => {
    if (tab === "ALL") return sorted;
    if (tab === "EARNED") return sorted.filter((b) => b.earned);
    return sorted.filter((b) => !b.earned);
  }, [sorted, tab]);

  const completionPct = data?.badges?.length
    ? Math.round((earnedCount / data.badges.length) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--primary)/0.6)] shadow-[0_4px_12px_rgb(var(--primary)/0.3)]">
              <Medal className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--fg))]">
              Badge Collection
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-[rgb(var(--muted))]">
            Track your achievements and unlock new milestones.
          </p>
        </div>

        <Link
          href="/dashboard/student/achievements"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] transition hover:bg-[rgb(var(--card)/0.8)] hover:border-[rgb(var(--primary)/0.3)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>

      {/* ── Overall completion banner ───────────────────────── */}
      {!loading && data && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-[rgb(var(--primary)/0.2)] bg-gradient-to-r from-[rgb(var(--primary)/0.08)] to-[rgb(var(--primary)/0.03)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-[rgb(var(--primary))]" />
              <div>
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                  Overall Progress
                </div>
                <div className="text-xs text-[rgb(var(--muted))]">
                  {earnedCount} of {data.badges.length} badges unlocked
                </div>
              </div>
            </div>
            <div className="text-2xl font-bold tabular-nums text-[rgb(var(--primary))]">
              {completionPct}%
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgb(var(--card2))]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary)/0.65)] transition-all duration-1000"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={Sparkles}
          label="Total Points"
          value={totalPoints.toLocaleString()}
          sub="Accumulated across all activity"
          accent="from-violet-400 to-purple-500"
          loading={loading}
        />
        <StatCard
          icon={Medal}
          label="Earned"
          value={earnedCount}
          sub="Badges unlocked so far"
          accent="from-emerald-400 to-teal-500"
          loading={loading}
        />
        <StatCard
          icon={Lock}
          label="Remaining"
          value={lockedCount}
          sub="Still to be unlocked"
          accent="from-amber-400 to-orange-500"
          loading={loading}
        />
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <TabButton
          active={tab === "ALL"}
          label="All"
          count={data?.badges?.length ?? 0}
          loading={loading}
          onClick={() => setTab("ALL")}
        />
        <TabButton
          active={tab === "EARNED"}
          label="Earned"
          count={earnedCount}
          loading={loading}
          onClick={() => setTab("EARNED")}
        />
        <TabButton
          active={tab === "LOCKED"}
          label="Locked"
          count={lockedCount}
          loading={loading}
          onClick={() => setTab("LOCKED")}
        />
      </div>

      {/* ── Badge grid ─────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 h-36"
              />
            ))
          : filtered.map((b) => {
              const target = parsePointsTarget(b.key);
              const pct =
                target == null
                  ? b.earned ? 100 : 0
                  : b.earned ? 100 : clampPct((totalPoints / target) * 100);
              const remaining =
                target == null ? null : Math.max(0, target - totalPoints);
              const gradient = getBadgeGradient(b.icon);

              return (
                <div
                  key={b.id}
                  className={[
                    "group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200",
                    "shadow-[0_4px_20px_rgb(var(--shadow)/0.08)]",
                    "hover:shadow-[0_8px_32px_rgb(var(--shadow)/0.15)] hover:-translate-y-0.5",
                    b.earned
                      ? "border-[rgb(var(--primary)/0.25)] bg-[rgb(var(--card)/0.9)]"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)]",
                  ].join(" ")}
                >
                  {/* earned glow bg */}
                  {b.earned && (
                    <div
                      className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.12]`}
                    />
                  )}

                  <div className="relative flex items-start gap-3">
                    <BadgeIcon icon={b.icon} earned={b.earned} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold leading-snug text-[rgb(var(--fg))]">
                          {b.name}
                        </div>
                        {b.earned ? (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Unlocked
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))]">
                            Locked
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))]">
                        {b.description}
                      </div>

                      {b.earned && b.awardedAt && (
                        <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[rgb(var(--muted2))]">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(b.awardedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress section */}
                  <div className="relative mt-4 space-y-1.5">
                    <ProgressBar pct={pct} loading={loading} />

                    <div className="flex items-center justify-between text-[11px] text-[rgb(var(--muted2))]">
                      <span className="font-medium tabular-nums">
                        {Math.round(pct)}%
                      </span>
                      <span>
                        {target == null
                          ? b.earned
                            ? "Achievement unlocked"
                            : "Criteria-based"
                          : b.earned
                          ? `${target.toLocaleString()} pts reached`
                          : `${remaining?.toLocaleString()} pts to go`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.5)] py-14 text-center">
            <Medal className="h-10 w-10 text-[rgb(var(--muted2))]" />
            <div>
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                No badges here
              </div>
              <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                Nothing matches this filter yet.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}