"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Gift, Coins, Timer, Zap, Crown, Star, Package } from "lucide-react";

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

  return { h, m, s };
}

function getRewardIcon(key: string) {
  if (key.includes("DOUBLE")) return <Zap className="h-[18px] w-[18px]" />;
  if (key.includes("BOOST")) return <Crown className="h-[18px] w-[18px]" />;
  if (key.includes("COSMETIC") || key.includes("BADGE")) return <Star className="h-[18px] w-[18px]" />;
  return <Package className="h-[18px] w-[18px]" />;
}

type Accent = "gold" | "violet" | "blue" | "teal";

function getRewardAccent(key: string): Accent {
  if (key.includes("DOUBLE")) return "gold";
  if (key.includes("BOOST") && key.includes("7D")) return "violet";
  if (key.includes("BOOST")) return "blue";
  return "teal";
}

type AccentStyle = {
  icon: CSSProperties;
  glow: CSSProperties;
  activeCard: CSSProperties;
};

const ACCENT_STYLES: Record<Accent, AccentStyle> = {
  gold: {
    icon:       { color: "rgb(251 191 36)", background: "rgb(251 191 36 / .1)", borderColor: "rgb(251 191 36 / .25)" },
    glow:       { background: "rgb(251 191 36 / .22)" },
    activeCard: { borderColor: "rgb(251 191 36 / .4)", background: "rgb(251 191 36 / .04)" },
  },
  violet: {
    icon:       { color: "rgb(167 139 250)", background: "rgb(167 139 250 / .1)", borderColor: "rgb(167 139 250 / .25)" },
    glow:       { background: "rgb(167 139 250 / .22)" },
    activeCard: { borderColor: "rgb(167 139 250 / .4)", background: "rgb(167 139 250 / .04)" },
  },
  blue: {
    icon:       { color: "rgb(96 165 250)", background: "rgb(96 165 250 / .1)", borderColor: "rgb(96 165 250 / .25)" },
    glow:       { background: "rgb(96 165 250 / .22)" },
    activeCard: { borderColor: "rgb(96 165 250 / .4)", background: "rgb(96 165 250 / .04)" },
  },
  teal: {
    icon:       { color: "rgb(45 212 191)", background: "rgb(45 212 191 / .1)", borderColor: "rgb(45 212 191 / .25)" },
    glow:       { background: "rgb(45 212 191 / .22)" },
    activeCard: { borderColor: "rgb(45 212 191 / .4)", background: "rgb(45 212 191 / .04)" },
  },
};

function CountdownDigits({ remaining }: { remaining: { h: number; m: number; s: number } }) {
  const { h, m, s } = remaining;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 2, fontVariantNumeric: "tabular-nums" }}>
      <span className="rw-cd-seg">{pad(h)}<span className="rw-cd-u">h</span></span>
      <span className="rw-cd-sep">:</span>
      <span className="rw-cd-seg">{pad(m)}<span className="rw-cd-u">m</span></span>
      <span className="rw-cd-sep">:</span>
      <span className="rw-cd-seg">{pad(s)}<span className="rw-cd-u">s</span></span>
    </span>
  );
}

export default function RewardsShopPage() {
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [wallet, setWallet] = useState<number>(0);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState<string | null>(null);

  const [doubleUntil, setDoubleUntil] = useState<string | null>(null);
  const [boostUntil, setBoostUntil] = useState<string | null>(null);
  const [doubleLeft, setDoubleLeft] = useState<{ h: number; m: number; s: number } | null>(null);
  const [boostLeft, setBoostLeft] = useState<{ h: number; m: number; s: number } | null>(null);

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
    setSuccessKey(rewardKey);
    setTimeout(() => setSuccessKey(null), 2200);
    setBusyKey(null);
    await load();
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const dLeft = formatRemaining(doubleUntil);
      const bLeft = formatRemaining(boostUntil);
      setDoubleLeft(dLeft);
      setBoostLeft(bLeft);
      if (doubleUntil && !dLeft) { setDoubleUntil(null); load(); }
      if (boostUntil && !bLeft) { setBoostUntil(null); load(); }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [doubleUntil, boostUntil]);

  const hasActiveBuff = !!(doubleLeft || boostLeft);

  return (
    <>
      {/* ── Scoped styles ── */}
      <style>{`
        /* ----------- keyframes ----------- */
        @keyframes rw-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes rw-float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
        @keyframes rw-fade-up {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes rw-pulse-ring {
          0%   { transform:scale(.9); opacity:.6; }
          70%  { transform:scale(1.15); opacity:0; }
          100% { transform:scale(.9); opacity:0; }
        }
        @keyframes rw-glow-card {
          0%,100% { opacity:.55; }
          50%      { opacity:1; }
        }

        /* ----------- page ----------- */
        .rw-page {
          padding: 22px 24px 44px;
          display: flex;
          flex-direction: column;
          gap: 26px;
          font-family: inherit;
        }

        /* ----------- header ----------- */
        .rw-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          animation: rw-fade-up .4s ease both;
        }
        .rw-hgroup {
          display: flex;
          align-items: center;
          gap: 13px;
        }
        .rw-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 46px; height: 46px;
          border-radius: 15px;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card));
          flex-shrink: 0;
          animation: rw-float 3.8s ease-in-out infinite;
        }
        .rw-icon-halo {
          position: absolute;
          inset: -8px;
          border-radius: 20px;
          background: radial-gradient(circle, rgb(var(--primary)/.30) 0%, transparent 70%);
          filter: blur(10px);
        }
        .rw-icon-wrap svg { position:relative; z-index:1; color:rgb(var(--primary)); width:20px; height:20px; }
        .rw-h1 {
          font-size: 1.1875rem;
          font-weight: 700;
          color: rgb(var(--fg));
          letter-spacing: -0.025em;
          line-height: 1.2;
        }
        .rw-sub {
          font-size: 0.72rem;
          color: rgb(var(--muted));
          margin-top: 1px;
        }

        /* ----------- wallet pill ----------- */
        .rw-wallet {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 16px;
          border-radius: 100px;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card));
          font-size: .85rem;
          position: relative;
          overflow: hidden;
          transition: box-shadow .2s;
        }
        .rw-wallet:hover { box-shadow: 0 0 0 2px rgb(var(--primary)/.18); }
        .rw-wallet-shine {
          position: absolute; inset:0;
          background: linear-gradient(105deg, transparent 38%, rgb(var(--primary)/.09) 50%, transparent 62%);
          background-size: 200% 100%;
          animation: rw-shimmer 3.2s linear infinite;
        }
        .rw-wallet svg { color:rgb(var(--primary)); width:15px; height:15px; position:relative; }
        .rw-wallet-lbl { color:rgb(var(--muted)); font-size:.8rem; position:relative; }
        .rw-wallet-amt { font-weight:700; color:rgb(var(--fg)); position:relative; font-variant-numeric:tabular-nums; }

        /* ----------- error ----------- */
        .rw-error {
          border-radius: 13px;
          border: 1px solid rgb(239 68 68 /.28);
          background: rgb(239 68 68 /.07);
          padding: 11px 15px;
          font-size: .8rem;
          color: rgb(252 165 165);
          animation: rw-fade-up .3s ease both;
        }

        /* ----------- buff bar ----------- */
        .rw-buffbar {
          border-radius: 18px;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card));
          padding: 13px 16px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          position: relative;
          overflow: hidden;
          animation: rw-fade-up .4s ease both;
        }
        .rw-buffbar-bg {
          position: absolute; inset:0;
          background: linear-gradient(135deg, rgb(var(--primary)/.07) 0%, transparent 55%);
          pointer-events:none;
        }
        .rw-buff-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          position: relative;
        }
        .rw-buff-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: .84rem;
          font-weight: 600;
          color: rgb(var(--fg));
        }
        .rw-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: rgb(var(--primary));
          position: relative;
          flex-shrink: 0;
        }
        .rw-dot::after {
          content:"";
          position:absolute; inset:-4px;
          border-radius:50%;
          border:2px solid rgb(var(--primary)/.4);
          animation: rw-pulse-ring 2s ease-out infinite;
        }

        /* ----------- countdown ----------- */
        .rw-cd-seg {
          font-size: .78rem;
          font-weight: 700;
          color: rgb(var(--fg));
          font-variant-numeric: tabular-nums;
          display: inline-flex;
          align-items: baseline;
          gap: 1px;
        }
        .rw-cd-u {
          font-size: .62rem;
          font-weight: 500;
          color: rgb(var(--muted));
        }
        .rw-cd-sep {
          font-size: .78rem;
          font-weight: 700;
          color: rgb(var(--muted));
          line-height:1;
          margin:0 1px;
        }

        /* ----------- grid ----------- */
        .rw-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr;
        }
        @media(min-width:560px) { .rw-grid { grid-template-columns:repeat(2,1fr); } }
        @media(min-width:900px) { .rw-grid { grid-template-columns:repeat(3,1fr); } }

        /* ----------- card ----------- */
        .rw-card {
          position: relative;
          border-radius: 20px;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card));
          padding: 19px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: border-color .25s, box-shadow .25s, transform .2s;
          animation: rw-fade-up .5s ease both;
        }
        .rw-card:hover {
          transform: translateY(-3px) scale(1.005);
          border-color: rgb(var(--primary)/.35);
          box-shadow: 0 14px 40px -8px rgb(var(--shadow)/.16), 0 0 0 1px rgb(var(--primary)/.08);
        }
        .rw-card--active {
          box-shadow: 0 0 0 1px rgb(var(--primary)/.2), inset 0 0 24px rgb(var(--primary)/.04);
        }
        /* stagger */
        .rw-card:nth-child(1){animation-delay:.04s}
        .rw-card:nth-child(2){animation-delay:.09s}
        .rw-card:nth-child(3){animation-delay:.14s}
        .rw-card:nth-child(4){animation-delay:.19s}
        .rw-card:nth-child(5){animation-delay:.24s}
        .rw-card:nth-child(6){animation-delay:.29s}

        /* glow orb */
        .rw-card-glow {
          position: absolute;
          top: -28px; right: -28px;
          width: 90px; height: 90px;
          border-radius: 50%;
          filter: blur(28px);
          opacity: 0;
          transition: opacity .3s ease;
          pointer-events: none;
        }
        .rw-card:hover .rw-card-glow { opacity:1; }

        /* icon badge */
        .rw-icon-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          border-radius: 11px;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card));
          flex-shrink: 0;
          transition: transform .2s ease;
        }
        .rw-card:hover .rw-icon-badge { transform: scale(1.1) rotate(-5deg); }

        /* card header */
        .rw-card-hdr {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          position: relative;
        }
        .rw-card-title-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .rw-card-name {
          font-size: .9rem;
          font-weight: 650;
          color: rgb(var(--fg));
          letter-spacing: -.015em;
          line-height: 1.25;
          margin-top: 3px;
        }

        /* cost badge */
        .rw-cost {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 9px;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card2, var(--card)));
          padding: 3px 9px;
          font-size: .71rem;
          font-weight: 700;
          color: rgb(var(--fg));
          white-space: nowrap;
          flex-shrink: 0;
        }
        .rw-cost-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: rgb(var(--primary));
        }

        /* desc */
        .rw-card-desc {
          font-size: .78rem;
          color: rgb(var(--muted));
          line-height: 1.6;
          margin-top: 10px;
          position: relative;
        }

        /* meta */
        .rw-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 13px;
          font-size: .7rem;
          color: rgb(var(--muted));
          position: relative;
        }
        .rw-meta-left { display:flex; align-items:center; gap:4px; }
        .rw-stock {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 2px 7px;
          border-radius: 7px;
          font-size: .67rem;
          font-weight: 600;
          border: 1px solid rgb(var(--border));
          background: rgb(var(--card2,var(--card)));
        }

        /* active row */
        .rw-active-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 11px;
          padding: 7px 11px;
          border-radius: 11px;
          border: 1px solid rgb(var(--primary)/.28);
          background: rgb(var(--primary)/.07);
          position: relative;
          overflow: hidden;
        }
        .rw-active-shine {
          position: absolute; inset:0;
          background: linear-gradient(90deg, transparent, rgb(var(--primary)/.1), transparent);
          background-size:200% 100%;
          animation: rw-shimmer 2.5s linear infinite;
        }
        .rw-active-lbl {
          font-size: .72rem;
          font-weight: 700;
          color: rgb(var(--primary));
          letter-spacing: .05em;
          text-transform: uppercase;
          position: relative;
        }

        /* button */
        .rw-btn {
          margin-top: 15px;
          width: 100%;
          border-radius: 13px;
          padding: 9px 14px;
          font-size: .8rem;
          font-weight: 600;
          font-family: inherit;
          border: none;
          cursor: pointer;
          transition: opacity .18s, transform .14s, box-shadow .18s;
          position: relative;
          overflow: hidden;
          letter-spacing: -.008em;
        }
        .rw-btn:not(:disabled):active { transform:scale(.97); }

        .rw-btn--ready {
          background: rgb(var(--primary));
          color: rgb(var(--primary-foreground));
          box-shadow: 0 4px 14px rgb(var(--primary)/.32);
        }
        .rw-btn--ready:hover {
          opacity:.92;
          box-shadow: 0 6px 20px rgb(var(--primary)/.42);
          transform: translateY(-1px);
        }
        .rw-btn-shine {
          position:absolute; top:0; left:-100%; width:55%; height:100%;
          background:linear-gradient(105deg, transparent 20%, rgb(255 255 255/.18) 50%, transparent 80%);
          transition:left .5s ease;
        }
        .rw-btn--ready:hover .rw-btn-shine { left:150%; }

        .rw-btn--off {
          background: rgb(var(--card2,var(--card)));
          border: 1px solid rgb(var(--border));
          color: rgb(var(--muted2,var(--muted)));
          opacity: .55;
          cursor: not-allowed;
        }
        .rw-btn--active-state {
          background: rgb(var(--primary)/.09);
          border: 1px solid rgb(var(--primary)/.3);
          color: rgb(var(--primary));
          cursor: not-allowed;
        }
        .rw-btn--success {
          background: rgb(34 197 94/.14);
          border: 1px solid rgb(34 197 94/.38);
          color: rgb(74 222 128);
        }

        /* skeleton */
        .rw-skel {
          border-radius: 10px;
          background-image: linear-gradient(90deg, rgb(var(--border)) 0%, rgb(var(--card)) 50%, rgb(var(--border)) 100%);
          background-size: 200% 100%;
          animation: rw-shimmer 1.6s linear infinite;
        }
      `}</style>

      <div className="rw-page">

        {/* ── Header ── */}
        <div className="rw-header">
          <div className="rw-hgroup">
            <div className="rw-icon-wrap">
              <div className="rw-icon-halo" />
              <Gift />
            </div>
            <div>
              <div className="rw-h1">Rewards Shop</div>
              <div className="rw-sub">Spend your points on boosts &amp; cosmetics</div>
            </div>
          </div>

          <div className="rw-wallet">
            <div className="rw-wallet-shine" />
            <Coins />
            <span className="rw-wallet-lbl">Points</span>
            <span className="rw-wallet-amt">{wallet.toLocaleString()}</span>
          </div>
        </div>

        {/* ── Error ── */}
        {err && <div className="rw-error">⚠ {err}</div>}

        {/* ── Active buff banner ── */}
        {hasActiveBuff && (
          <div className="rw-buffbar">
            <div className="rw-buffbar-bg" />
            {doubleLeft && (
              <div className="rw-buff-row">
                <div className="rw-buff-name">
                  <div className="rw-dot" />
                  <Zap style={{ width:13, height:13, color:"rgb(251 191 36)" }} />
                  Double Points active
                </div>
                <CountdownDigits remaining={doubleLeft} />
              </div>
            )}
            {boostLeft && (
              <div className="rw-buff-row">
                <div className="rw-buff-name">
                  <div className="rw-dot" />
                  <Crown style={{ width:13, height:13, color:"rgb(167 139 250)" }} />
                  Priority Boost active
                </div>
                <CountdownDigits remaining={boostLeft} />
              </div>
            )}
          </div>
        )}

        {/* ── Cards ── */}
        <div className="rw-grid">
          {loading
            ? [0,1,2].map(i => (
                <div key={i} className="rw-card" style={{ minHeight:195 }}>
                  <div className="rw-skel" style={{ height:14, width:"55%", marginBottom:12 }} />
                  <div className="rw-skel" style={{ height:11, width:"88%", marginBottom:7 }} />
                  <div className="rw-skel" style={{ height:11, width:"70%", marginBottom:20 }} />
                  <div className="rw-skel" style={{ height:34, marginTop:"auto" }} />
                </div>
              ))
            : rewards.map(r => {
                const isBusy       = busyKey === r.key;
                const outOfStock   = r.stock !== null && r.stock <= 0;
                const notEnough    = wallet < r.pointsCost;
                const isSuccess    = successKey === r.key;
                const accent       = getRewardAccent(r.key);
                const ac           = ACCENT_STYLES[accent];

                const alreadyActive = Boolean(
                  (r.key === "DOUBLE_POINTS_24H" && isFutureISO(doubleUntil)) ||
                  ((r.key === "PRIORITY_BOOST_24H" || r.key === "PRIORITY_BOOST_7D") && isFutureISO(boostUntil))
                );

                const cardCountdown =
                  r.key === "DOUBLE_POINTS_24H" ? doubleLeft
                  : (r.key === "PRIORITY_BOOST_24H" || r.key === "PRIORITY_BOOST_7D") ? boostLeft
                  : null;

                const disabled = isBusy || outOfStock || notEnough || alreadyActive;

                let btnClass = "rw-btn ";
                let btnLabel = "Redeem";
                if (isSuccess)       { btnClass += "rw-btn--success";      btnLabel = "✓ Redeemed!"; }
                else if (alreadyActive) { btnClass += "rw-btn--active-state"; btnLabel = "Already Active"; }
                else if (disabled)   { btnClass += "rw-btn--off"; }
                else                 { btnClass += "rw-btn--ready"; }

                if (!isSuccess && !alreadyActive) {
                  if (isBusy)      btnLabel = "Redeeming…";
                  else if (outOfStock) btnLabel = "Out of stock";
                  else if (notEnough)  btnLabel = "Not enough points";
                }

                return (
                  <div
                    key={r.id}
                    className={`rw-card ${alreadyActive ? "rw-card--active" : ""}`}
                    style={alreadyActive ? ac.activeCard : undefined}
                  >
                    {/* glow orb */}
                    <div className="rw-card-glow" style={ac.glow} />

                    {/* header */}
                    <div className="rw-card-hdr">
                      <div className="rw-card-title-row">
                        <div className="rw-icon-badge" style={ac.icon}>
                          {getRewardIcon(r.key)}
                        </div>
                        <div className="rw-card-name">{r.name}</div>
                      </div>

                      <div className="rw-cost">
                        <div className="rw-cost-dot" />
                        {r.pointsCost.toLocaleString()} pts
                      </div>
                    </div>

                    <p className="rw-card-desc">{r.description}</p>

                    <div className="rw-meta">
                      <div className="rw-meta-left">
                        <Timer style={{ width:11, height:11 }} />
                        {r.durationHrs ? formatDuration(r.durationHrs) : "Instant"}
                      </div>
                      <div className="rw-stock">
                        {r.stock === null ? "∞ stock" : r.stock > 0 ? `${r.stock} left` : "Sold out"}
                      </div>
                    </div>

                    {cardCountdown && (
                      <div className="rw-active-row">
                        <div className="rw-active-shine" />
                        <span className="rw-active-lbl">● Active</span>
                        <CountdownDigits remaining={cardCountdown} />
                      </div>
                    )}

                    <button
                      onClick={() => !disabled && !isSuccess && redeem(r.key)}
                      disabled={disabled || isSuccess}
                      className={btnClass}
                    >
                      {btnClass.includes("rw-btn--ready") && <span className="rw-btn-shine" />}
                      {btnLabel}
                    </button>
                  </div>
                );
              })
          }
        </div>
      </div>
    </>
  );
}