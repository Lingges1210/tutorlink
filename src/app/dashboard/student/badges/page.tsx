// src/app/dashboard/student/badges/page.tsx
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
} from "lucide-react";

type AllBadgesRes = {
  ok: boolean;
  totalPoints: number;
  badges: Array<{
    id: string;
    key: string;
    name: string;
    description: string;
    icon: string; // e.g. "trophy"
    earned: boolean;
    awardedAt: string | null;
  }>;
};

type FilterTab = "ALL" | "EARNED" | "LOCKED";

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// points-only progress (fast, reliable)
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

/** Map badge.icon string -> lucide icon */
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

function BadgeIcon({
  icon,
  earned,
}: {
  icon: string | null | undefined;
  earned: boolean;
}) {
  const I = (icon ? ICONS[icon.toLowerCase()] : null) ?? Medal;

  return (
    <div
      className={[
        "flex h-12 w-12 items-center justify-center rounded-2xl border",
        "border-[rgb(var(--border))] bg-[rgb(var(--card2))]",
        earned ? "" : "opacity-70 grayscale",
      ].join(" ")}
      aria-hidden
    >
      <I
        className={[
          "h-6 w-6",
          earned ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--muted2))]",
        ].join(" ")}
      />
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold transition border",
        "border-[rgb(var(--border))]",
        active
          ? "bg-[rgb(var(--primary))] text-white shadow-md"
          : "bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
      ].join(" ")}
    >
      {label}
    </button>
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

  // ✅ Smart sort:
  // 1) earned first
  // 2) then points badges by closest remaining points
  // 3) then everything else alphabetically
  const sorted = useMemo(() => {
    const badges = data?.badges ?? [];

    return [...badges].sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;

      const ta = parsePointsTarget(a.key);
      const tb = parsePointsTarget(b.key);

      // both points badges: sort by remaining (closest first)
      if (ta != null && tb != null) {
        const ra = Math.max(0, ta - totalPoints);
        const rb = Math.max(0, tb - totalPoints);
        if (ra !== rb) return ra - rb;
        return ta - tb;
      }

      // points badge comes before non-points badge
      if (ta != null && tb == null) return -1;
      if (ta == null && tb != null) return 1;

      // otherwise name sort
      return a.name.localeCompare(b.name);
    });
  }, [data, totalPoints]);

  const filtered = useMemo(() => {
    if (tab === "ALL") return sorted;
    if (tab === "EARNED") return sorted.filter((b) => b.earned);
    return sorted.filter((b) => !b.earned);
  }, [sorted, tab]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
            All Badges
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Your full badge collection and progress.
          </p>
        </div>

        <Link
          href="/dashboard/student/achievements"
          className="
            inline-flex items-center gap-2
            rounded-md px-3 py-2 text-xs font-semibold
            border border-[rgb(var(--border))]
            bg-[rgb(var(--card2))]
            text-[rgb(var(--fg))]
            hover:bg-[rgb(var(--card)/0.6)]
            transition
          "
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <TabButton
          active={tab === "ALL"}
          label={`All (${loading ? "—" : data?.badges?.length ?? 0})`}
          onClick={() => setTab("ALL")}
        />
        <TabButton
          active={tab === "EARNED"}
          label={`Earned (${loading ? "—" : earnedCount})`}
          onClick={() => setTab("EARNED")}
        />
        <TabButton
          active={tab === "LOCKED"}
          label={`Locked (${loading ? "—" : lockedCount})`}
          onClick={() => setTab("LOCKED")}
        />
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
            <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
            Total Points
          </div>
          <div className="mt-2 text-2xl font-bold text-[rgb(var(--fg))]">
            {loading ? "—" : totalPoints}
          </div>
          <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
            Used for points badges
          </div>
        </div>

        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
            <Medal className="h-4 w-4 text-[rgb(var(--primary))]" />
            Earned
          </div>
          <div className="mt-2 text-2xl font-bold text-[rgb(var(--fg))]">
            {loading ? "—" : earnedCount}
          </div>
          <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
            Unlocked so far
          </div>
        </div>

        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
            <Medal className="h-4 w-4 text-[rgb(var(--primary))]" />
            Total Badges
          </div>
          <div className="mt-2 text-2xl font-bold text-[rgb(var(--fg))]">
            {loading ? "—" : data?.badges?.length ?? 0}
          </div>
          <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
            In your collection
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => {
          const target = parsePointsTarget(b.key);

          const pct =
            target == null
              ? b.earned
                ? 100
                : 0
              : b.earned
              ? 100
              : clampPct((totalPoints / target) * 100);

          const remaining =
            target == null ? null : Math.max(0, target - totalPoints);

          return (
            <div
              key={b.id}
              className={[
                "rounded-2xl border p-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)] transition",
                b.earned
                  ? "border-[rgb(var(--primary)/0.35)] bg-[rgb(var(--primary)/0.06)]"
                  : "border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <BadgeIcon icon={b.icon} earned={b.earned} />

                  <div>
                    <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                      {b.name}
                    </div>
                    <div className="mt-1 text-xs text-[rgb(var(--muted))]">
                      {b.description}
                    </div>

                    {b.earned && b.awardedAt && (
                      <div className="mt-1 text-[11px] text-[rgb(var(--muted2))]">
                        Earned: {formatDateTime(b.awardedAt)}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={[
                    "text-xs font-semibold",
                    b.earned
                      ? "text-emerald-600"
                      : "text-[rgb(var(--muted2))]",
                  ].join(" ")}
                >
                  {b.earned ? "UNLOCKED" : "LOCKED"}
                </div>
              </div>

              {/* Progress bar (points badges only) */}
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--card2))] border border-[rgb(var(--border))]">
                  <div
                    className="h-full bg-[rgb(var(--primary))]"
                    style={{ width: `${loading ? 0 : pct}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[rgb(var(--muted2))]">
                  <div>{loading ? "—" : `${Math.round(pct)}%`}</div>
                  <div>
                    {target == null
                      ? b.earned
                        ? "Unlocked"
                        : "Progress coming soon"
                      : b.earned
                      ? `Reached ${target} pts`
                      : `${remaining} pts left`}
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-[rgb(var(--muted2))]">
                  Key: {b.key}
                </div>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-6 text-sm text-[rgb(var(--muted))]">
            No badges found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}