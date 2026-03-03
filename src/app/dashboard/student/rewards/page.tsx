"use client";

import { useEffect, useState } from "react";
import { Gift, Coins, Timer, Sparkles } from "lucide-react";

type Reward = {
  id: string;
  key: string;
  name: string;
  description: string;
  pointsCost: number;
  stock: number | null;
  durationHrs: number | null;
};

function formatDuration(hours: number) {
  if (hours % 168 === 0) return `${hours / 168}w`;
  if (hours % 24 === 0) return `${hours / 24}d`;
  return `${hours}h`;
}

function isFutureISO(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d > new Date();
}

function formatRemaining(iso: string | null) {
  if (!iso) return null;
  const now = new Date();
  const end = new Date(iso);
  const diff = end.getTime() - now.getTime();
  if (Number.isNaN(end.getTime()) || diff <= 0) return null;

  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return `${String(h).padStart(2, "0")}h ${String(m).padStart(
    2,
    "0"
  )}m ${String(s).padStart(2, "0")}s`;
}

export default function RewardsShopPage() {
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [wallet, setWallet] = useState<number>(0);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // used to disable redeem if already active
  const [doubleUntil, setDoubleUntil] = useState<string | null>(null);
  const [boostUntil, setBoostUntil] = useState<string | null>(null);

  //  countdown display state
  const [doubleLeft, setDoubleLeft] = useState<string | null>(null);
  const [boostLeft, setBoostLeft] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/rewards/catalog", { cache: "no-store" });
    const json = await res.json();
    if (!json.ok) {
      setErr("Failed to load rewards.");
      setLoading(false);
      return;
    }
    setRewards(json.rewards ?? []);
    setWallet(json.wallet ?? 0);

    // expects these fields from /api/rewards/catalog
    setDoubleUntil(json.doubleUntil ?? null);
    setBoostUntil(json.boostUntil ?? null);

    setLoading(false);
  }

  async function redeem(rewardKey: string) {
    setBusyKey(rewardKey);
    setErr(null);
    const res = await fetch("/api/rewards/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardKey }),
    });
    const json = await res.json();
    if (!json.ok) {
      setErr(json.error ?? "Redeem failed.");
      setBusyKey(null);
      return;
    }
    setWallet(json.wallet ?? wallet);
    setBusyKey(null);
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  //  Premium countdown + auto-expire cleanup
  useEffect(() => {
    const interval = window.setInterval(() => {
      const dLeft = formatRemaining(doubleUntil);
      const bLeft = formatRemaining(boostUntil);

      setDoubleLeft(dLeft);
      setBoostLeft(bLeft);

      // 🔥 auto-expire cleanup (UI refresh + button becomes available again)
      if (doubleUntil && !dLeft) {
        setDoubleUntil(null);
        load();
      }
      if (boostUntil && !bLeft) {
        setBoostUntil(null);
        load();
      }
    }, 1000);

    return () => window.clearInterval(interval);
    // only depend on these two so countdown updates correctly
  }, [doubleUntil, boostUntil]);

  if (loading) {
    return <div className="p-6 text-[rgb(var(--muted))]">Loading rewards…</div>;
  }

  return (
    <div className="p-5 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="
              relative inline-flex h-11 w-11 items-center justify-center rounded-2xl
              border border-[rgb(var(--border))]
              bg-[rgb(var(--card))]
            "
          >
            <div className="absolute inset-0 rounded-2xl bg-[rgb(var(--primary)/0.15)] blur-xl" />
            <Gift className="relative h-5 w-5 text-[rgb(var(--primary))]" />
          </div>

          <div>
            <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
              Rewards Shop
            </h1>
            <div className="text-xs text-[rgb(var(--muted))]">
              Redeem your points for boosts and cosmetics.
            </div>
          </div>
        </div>

        <div
          className="
            inline-flex items-center gap-2 rounded-2xl border
            border-[rgb(var(--border))]
            bg-[rgb(var(--card))]
            px-4 py-2 text-sm
          "
        >
          <Coins className="h-4 w-4 text-[rgb(var(--primary))]" />
          <span className="text-[rgb(var(--muted))]">Points</span>
          <span className="font-semibold text-[rgb(var(--fg))]">{wallet}</span>
        </div>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {err}
        </div>
      )}

      {/*  Active buffs banner (premium feel) */}
      {(doubleLeft || boostLeft) && (
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 flex flex-col gap-2">
          {doubleLeft && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-[rgb(var(--fg))] font-semibold">
                <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
                Double Points active
              </div>
              <div className="text-[rgb(var(--muted))]">
                ⏳ <span className="font-mono">{doubleLeft}</span> left
              </div>
            </div>
          )}

          {boostLeft && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-[rgb(var(--fg))] font-semibold">
                <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
                Priority Boost active
              </div>
              <div className="text-[rgb(var(--muted))]">
                ⏳ <span className="font-mono">{boostLeft}</span> left
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rewards.map((r) => {
          const isBusy = busyKey === r.key;
          const outOfStock = r.stock !== null && r.stock <= 0;
          const notEnough = wallet < r.pointsCost;

          //  ALWAYS boolean
          const alreadyActive = Boolean(
            (r.key === "DOUBLE_POINTS_24H" && isFutureISO(doubleUntil)) ||
              ((r.key === "PRIORITY_BOOST_24H" || r.key === "PRIORITY_BOOST_7D") &&
                isFutureISO(boostUntil))
          );

          const disabled = isBusy || outOfStock || notEnough || alreadyActive;

          //  show countdown inside card if it's the active one
          const cardCountdown =
            r.key === "DOUBLE_POINTS_24H"
              ? doubleLeft
              : r.key === "PRIORITY_BOOST_24H" || r.key === "PRIORITY_BOOST_7D"
              ? boostLeft
              : null;

          return (
            <div
              key={r.id}
              className="
                group relative overflow-hidden rounded-3xl border
                border-[rgb(var(--border))]
                bg-[rgb(var(--card))]
                p-5 transition
                hover:border-[rgb(var(--primary)/0.4)]
                hover:shadow-[0_20px_60px_rgb(var(--shadow)/0.12)]
              "
            >
              {/* subtle hover glow */}
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[rgb(var(--primary)/0.10)] blur-3xl opacity-0 transition group-hover:opacity-100" />

              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 shrink-0 text-[rgb(var(--primary))] drop-shadow-sm" />
                    <span className="font-semibold text-[rgb(var(--fg))]">
                      {r.name}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-[rgb(var(--muted))] leading-relaxed">
                    {r.description}
                  </p>
                </div>

                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1 text-xs font-semibold text-[rgb(var(--fg))]">
                  {r.pointsCost} pts
                </div>
              </div>

              <div className="relative mt-4 flex items-center justify-between text-xs text-[rgb(var(--muted2))]">
                <div className="flex items-center gap-2">
                  <Timer className="h-3.5 w-3.5 text-[rgb(var(--muted))]" />
                  {r.durationHrs
                    ? `Duration: ${formatDuration(r.durationHrs)}`
                    : "Instant/Stored"}
                </div>

                <div>{r.stock === null ? "∞ stock" : `Stock: ${r.stock}`}</div>
              </div>

              {/*  countdown inside the card when active */}
              {cardCountdown && (
                <div className="mt-3 text-xs text-[rgb(var(--muted))] flex items-center justify-between rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2">
                  <span className="font-semibold text-[rgb(var(--fg))]">
                    Active
                  </span>
                  <span>
                    ⏳ <span className="font-mono">{cardCountdown}</span> left
                  </span>
                </div>
              )}

              <button
                onClick={() => redeem(r.key)}
                disabled={disabled}
                className={[
                  "mt-5 w-full rounded-2xl px-4 py-2 text-sm font-medium transition",
                  disabled
                    ? "cursor-not-allowed border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted2))] opacity-60"
                    : "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] hover:opacity-95",
                ].join(" ")}
              >
                {alreadyActive
                  ? "Already Active"
                  : isBusy
                  ? "Redeeming..."
                  : outOfStock
                  ? "Out of stock"
                  : notEnough
                  ? "Not enough points"
                  : "Redeem"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}