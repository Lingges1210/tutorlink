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

function Avatar({
  name,
  email,
  src,
  size = 44,
}: {
  name: string | null;
  email: string;
  src?: string | null;
  size?: number;
}) {
  const initials = getInitials(name, email);

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))]"
      style={{ width: size, height: size }}
      title={name ?? email}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? email}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-xs font-bold text-[rgb(var(--muted2))]">
          {initials}
        </div>
      )}
    </div>
  );
}

function ScopeTab({
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
        "relative rounded-full px-4 py-2 text-xs font-semibold transition",
        "border border-[rgb(var(--border))]",
        active
          ? "bg-[rgb(var(--primary)/0.14)] text-[rgb(var(--primary))] shadow-[0_0_0_1px_rgb(var(--primary)/0.12)]"
          : "bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--card)/0.6)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function StatChip({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] px-3 py-2 shadow-[0_18px_50px_rgb(var(--shadow)/0.08)]">
      <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-2">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-[rgb(var(--muted2))]">
          {label}
        </div>
        <div className="truncate text-sm font-bold text-[rgb(var(--fg))]">
          {value}
        </div>
      </div>
    </div>
  );
}

function ChampionCard({
  r,
  place,
}: {
  r: LeaderboardRes["rows"][number];
  place: 1 | 2 | 3;
}) {
  const ring =
    place === 1
      ? "border-yellow-400/40 bg-yellow-400/10"
      : place === 2
      ? "border-slate-300/55 bg-slate-300/10"
      : "border-amber-500/35 bg-amber-500/10";

  const placeText =
    place === 1
      ? "text-yellow-500"
      : place === 2
      ? "text-[rgb(var(--muted))]"
      : "text-amber-500";

  const name = r.user?.name ?? r.user?.email ?? "Unknown";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={[
        "relative rounded-3xl border p-4",
        "border-[rgb(var(--border))] bg-[rgb(var(--card)/0.75)]",
        "shadow-[0_22px_80px_rgb(var(--shadow)/0.12)]",
        ring,
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-60"
        style={{
          background:
            place === 1
              ? "linear-gradient(135deg, rgba(250,204,21,0.25), rgba(34,197,94,0.10), rgba(59,130,246,0.10))"
              : place === 2
              ? "linear-gradient(135deg, rgba(148,163,184,0.22), rgba(59,130,246,0.10))"
              : "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(236,72,153,0.10))",
        }}
      />

      <div className="relative">
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-3">
            <div
              className={[
                "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold",
                "border-[rgb(var(--border))] bg-[rgb(var(--card2))]",
                placeText,
              ].join(" ")}
            >
              {place === 1 ? (
                <Crown className="h-3.5 w-3.5" />
              ) : (
                <Trophy className="h-3.5 w-3.5" />
              )}
              {place} {place === 1 ? "st" : place === 2 ? "nd" : "rd"}
            </div>

            <div className="text-right shrink-0">
              <div className="text-[11px] font-semibold text-[rgb(var(--muted2))]">
                Points
              </div>
              <div className="text-2xl font-extrabold text-[rgb(var(--fg))]">
                {r.points}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Avatar
              name={r.user?.name ?? null}
              email={r.user?.email ?? ""}
              src={r.user?.avatarUrl ?? null}
              size={48}
            />
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-[rgb(var(--fg))]">
                {name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function StudentLeaderboardPage() {
  const [scope, setScope] = useState<Scope>("ALL");
  const [data, setData] = useState<LeaderboardRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchLB(isManual = false, nextScope: Scope = scope) {
    try {
      if (isManual) setRefreshing(true);
      const url = `/api/achievements/leaderboard/weekly?limit=50&mode=${encodeURIComponent(
        nextScope
      )}`;
      const r = await fetch(url, { cache: "no-store" });
      const j = (await r.json()) as LeaderboardRes;
      setData(j);
    } catch {
      // ignore
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

  const myRow = useMemo(
    () => rows.find((r) => r.userId === meUserId) ?? null,
    [rows, meUserId]
  );

  const nextRow = useMemo(() => {
    if (!myRow) return null;
    return rows.find((r) => r.rank === myRow.rank - 1) ?? null;
  }, [rows, myRow]);

  const pointsToNext = useMemo(() => {
    if (!myRow || !nextRow) return null;
    return Math.max(0, nextRow.points - myRow.points + 1);
  }, [myRow, nextRow]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/dashboard/student/achievements"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Achievements
          </Link>

          <h1 className="mt-2 text-xl font-semibold text-[rgb(var(--fg))]">
            Leaderboard
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Weekly rankings. Resets every Monday.
          </p>
        </div>

        <button
          onClick={() => fetchLB(true, scope)}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] transition"
          disabled={refreshing}
        >
          <RefreshCcw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mt-5 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_22px_80px_rgb(var(--shadow)/0.10)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
            <Trophy className="h-4 w-4 text-[rgb(var(--primary))]" />
            Weekly Champions
          </div>

          <div className="flex items-center gap-2">
            <ScopeTab
              active={scope === "ALL"}
              label="All"
              onClick={() => setScope("ALL")}
            />
            <ScopeTab
              active={scope === "STUDENTS"}
              label="Students"
              onClick={() => setScope("STUDENTS")}
            />
            <ScopeTab
              active={scope === "TUTORS"}
              label="Tutors"
              onClick={() => setScope("TUTORS")}
            />
          </div>
        </div>

        <div className="relative mt-6">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="select-none text-5xl font-extrabold tracking-tight text-[rgb(var(--fg))] opacity-[0.06]">
              Champions
            </div>
          </div>

          <div className="relative grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
            <div className="md:order-1">
              {top3.find((x) => x.rank === 2) && (
                <ChampionCard r={top3.find((x) => x.rank === 2)!} place={2} />
              )}
            </div>

            <div className="md:order-2">
              {top3.find((x) => x.rank === 1) && (
                <div className="md:scale-[1.03]">
                  <ChampionCard r={top3.find((x) => x.rank === 1)!} place={1} />
                </div>
              )}
            </div>

            <div className="md:order-3">
              {top3.find((x) => x.rank === 3) && (
                <ChampionCard r={top3.find((x) => x.rank === 3)!} place={3} />
              )}
            </div>

            {!loading && top3.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-6 text-sm text-[rgb(var(--muted))]">
                No leaderboard data yet for this week.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
          <StatChip
            label="Your Rank"
            value={myRow ? `#${myRow.rank}` : "—"}
            icon={<Award className="h-4 w-4 text-[rgb(var(--primary))]" />}
          />
          <StatChip
            label="Your Points"
            value={myRow?.points ?? 0}
            icon={<Trophy className="h-4 w-4 text-[rgb(var(--primary))]" />}
          />
          <StatChip
            label="To Next Rank"
            value={pointsToNext ?? "—"}
            icon={<Users className="h-4 w-4 text-[rgb(var(--primary))]" />}
          />
          <StatChip
            label="Scope"
            value={scope}
            icon={<Award className="h-4 w-4 text-[rgb(var(--primary))]" />}
          />
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-4 shadow-[0_22px_80px_rgb(var(--shadow)/0.10)]">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[rgb(var(--fg))]">
            Rankings
          </div>
          <div className="text-xs text-[rgb(var(--muted2))]">Top 50</div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-[rgb(var(--border))]">
          <div className="grid grid-cols-12 bg-[rgb(var(--card2))] px-3 py-2 text-[11px] font-semibold text-[rgb(var(--muted2))]">
            <div className="col-span-2">Rank</div>
            <div className="col-span-7">Name</div>
            <div className="col-span-3 text-right">Points</div>
          </div>

          <AnimatePresence initial={false}>
            {rest.map((r) => {
              const isMe = r.userId === meUserId;

              return (
                <motion.div
                  key={r.userId}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={[
                    "grid grid-cols-12 border-t px-3 py-2 text-sm",
                    isMe
                      ? "border-[rgb(var(--primary)/0.22)] bg-[rgb(var(--primary)/0.08)]"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--card))]",
                  ].join(" ")}
                >
                  <div className="col-span-2 font-bold text-[rgb(var(--muted2))]">
                    #{r.rank}
                  </div>

                  <div className="col-span-7 min-w-0 flex items-center gap-3">
                    <Avatar
                      name={r.user?.name ?? null}
                      email={r.user?.email ?? ""}
                      src={r.user?.avatarUrl ?? null}
                      size={34}
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="truncate font-semibold text-[rgb(var(--fg))]">
                          {r.user?.name ?? r.user?.email ?? "Unknown"}
                        </div>
                        {isMe && (
                          <span className="shrink-0 rounded-full border border-[rgb(var(--primary)/0.25)] bg-[rgb(var(--primary)/0.12)] px-2 py-0.5 text-[10px] font-semibold text-[rgb(var(--primary))]">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[rgb(var(--muted2))]">
                        {r.user?.role ?? ""}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 text-right font-extrabold text-[rgb(var(--fg))]">
                    {r.points}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {loading && (
            <div className="px-3 py-4 text-sm text-[rgb(var(--muted))]">
              Loading leaderboard…
            </div>
          )}

          {!loading && rest.length === 0 && (
            <div className="px-3 py-4 text-sm text-[rgb(var(--muted))]">
              No additional rankings yet. More users will appear here after the
              top 3.
            </div>
          )}
        </div>

        <div className="mt-3 text-[11px] text-[rgb(var(--muted2))]">
          Avatars are now shown using <code>user.avatarUrl</code> (fallback to
          initials if missing).
        </div>
      </div>
    </div>
  );
}