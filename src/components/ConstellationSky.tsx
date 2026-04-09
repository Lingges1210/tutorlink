// src/components/ConstellationSky.tsx
"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface Entry {
  id: string;
  mood: string | null;
  tags: string[];
  body: string;
  createdAt: string;
}

const MOOD_COLORS: Record<string, { color: string; glow: string; label: string }> = {
  grateful:  { color: "#6ee7b7", glow: "#059669", label: "Grateful 🌱" },
  motivated: { color: "#fcd34d", glow: "#d97706", label: "Motivated ⚡" },
  meh:       { color: "#cbd5e1", glow: "#64748b", label: "Meh ☁️" },
  tired:     { color: "#a5b4fc", glow: "#4f46e5", label: "Tired 🌙" },
  stressed:  { color: "#fdba74", glow: "#ea580c", label: "Stressed 🌀" },
  anxious:   { color: "#d8b4fe", glow: "#9333ea", label: "Anxious 💭" },
  low:       { color: "#93c5fd", glow: "#2563eb", label: "Low 🌧️" },
  default:   { color: "#e2e8f0", glow: "#94a3b8", label: "No mood" },
};

const CONSTELLATIONS = [
  {
    name: "Orion", emoji: "🏹", minEntries: 7,
    points: [[50,10],[72,18],[40,28],[30,48],[54,42],[62,40],[70,38],[46,62],[68,58]] as [number,number][],
    edges: [[0,1],[0,4],[1,6],[4,5],[5,6],[4,7],[6,8],[0,2],[2,3]] as [number,number][],
  },
  {
    name: "Ursa Major", emoji: "🐻", minEntries: 7,
    points: [[20,55],[32,50],[44,48],[52,40],[62,38],[68,28],[55,26]] as [number,number][],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]] as [number,number][],
  },
  {
    name: "Cassiopeia", emoji: "👑", minEntries: 5,
    points: [[10,50],[28,30],[50,48],[72,22],[90,42]] as [number,number][],
    edges: [[0,1],[1,2],[2,3],[3,4]] as [number,number][],
  },
  {
    name: "Leo", emoji: "🦁", minEntries: 6,
    points: [[20,60],[35,50],[50,30],[40,18],[28,22],[20,35],[55,45],[70,55]] as [number,number][],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,2],[2,6],[6,7],[1,6]] as [number,number][],
  },
  {
    name: "Scorpius", emoji: "🦂", minEntries: 8,
    points: [[50,10],[38,20],[28,15],[62,20],[50,35],[48,50],[44,65],[40,78],[48,88],[58,82]] as [number,number][],
    edges: [[0,1],[1,2],[0,3],[0,4],[4,5],[5,6],[6,7],[7,8],[8,9]] as [number,number][],
  },
  {
    name: "Lyra", emoji: "🎵", minEntries: 4,
    points: [[50,10],[35,35],[42,55],[58,55],[65,35]] as [number,number][],
    edges: [[0,1],[0,4],[1,2],[2,3],[3,4]] as [number,number][],
  },
  {
    name: "Cygnus", emoji: "🦢", minEntries: 5,
    points: [[50,10],[50,30],[50,55],[50,72],[20,30],[80,30]] as [number,number][],
    edges: [[0,1],[1,2],[2,3],[4,1],[1,5]] as [number,number][],
  },
  {
    name: "Gemini", emoji: "♊", minEntries: 6,
    points: [[30,10],[60,12],[28,28],[62,30],[26,48],[64,50],[22,70],[68,72]] as [number,number][],
    edges: [[0,2],[1,3],[2,3],[2,4],[3,5],[4,6],[5,7],[4,5]] as [number,number][],
  },
  {
    name: "Perseus", emoji: "⚔️", minEntries: 6,
    points: [[50,12],[50,28],[32,22],[22,18],[68,25],[78,18],[48,50],[42,70],[58,70]] as [number,number][],
    edges: [[0,1],[1,2],[2,3],[1,4],[4,5],[1,6],[6,7],[6,8]] as [number,number][],
  },
  {
    name: "Aquila", emoji: "🦅", minEntries: 5,
    points: [[50,20],[30,15],[38,20],[62,20],[70,15],[50,45],[50,65]] as [number,number][],
    edges: [[1,2],[2,0],[0,3],[3,4],[0,5],[5,6]] as [number,number][],
  },
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type PlacedStar = {
  entry: Entry;
  x: number; y: number; r: number;
  color: string; glow: string;
  constIndex: number;
  pointIndex: number;
  t: number; speed: number;
  hovered: boolean;
};

type BgStar = { x: number; y: number; r: number; t: number; speed: number };
type ConstellationZone = { cx: number; cy: number; scaleX: number; scaleY: number };

export default function ConstellationSky({ entries }: { entries: Entry[] }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const starsRef   = useRef<PlacedStar[]>([]);
  const bgRef      = useRef<BgStar[]>([]);
  const zonesRef   = useRef<ConstellationZone[]>([]);
  const rafRef     = useRef<number>(0);
  const dimsRef    = useRef({ W: 0, H: 420 });
  const dragRef    = useRef<{ star: PlacedStar | null; offsetX: number; offsetY: number }>({
    star: null, offsetX: 0, offsetY: 0,
  });
  const completedRef = useRef<Set<string>>(new Set());
  const isDarkRef    = useRef<boolean>(false);

  const [completedNames, setCompletedNames] = useState<Set<string>>(new Set());
  const [starCounts, setStarCounts]         = useState<Record<number, number>>({});
  const [newUnlock, setNewUnlock]           = useState<{ name: string; emoji: string } | null>(null);

  // Track dark mode via ref so draw loop reads it without re-renders
  useEffect(() => {
    const check = () => {
      isDarkRef.current = document.documentElement.classList.contains("dark");
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const buildZones = useCallback((W: number, H: number): ConstellationZone[] => {
    const positions = [
      { cx: 0.15, cy: 0.22 }, // Orion        — top left
      { cx: 0.50, cy: 0.18 }, // Ursa Major   — top center
      { cx: 0.82, cy: 0.20 }, // Cassiopeia   — top right
      { cx: 0.25, cy: 0.50 }, // Leo          — mid left
      { cx: 0.62, cy: 0.45 }, // Scorpius     — mid right
      { cx: 0.88, cy: 0.55 }, // Lyra         — right
      { cx: 0.10, cy: 0.75 }, // Cygnus       — bottom left
      { cx: 0.42, cy: 0.78 }, // Gemini       — bottom center
      { cx: 0.72, cy: 0.75 }, // Perseus      — bottom right
      { cx: 0.55, cy: 0.60 }, // Aquila       — center
    ];
    return CONSTELLATIONS.map((_, i) => ({
      cx:     (positions[i]?.cx ?? 0.5) * W,
      cy:     (positions[i]?.cy ?? 0.5) * H,
      scaleX: W * 0.16,
      scaleY: H * 0.18,
    }));
  }, []);

  // Pure scene build — zero setState calls
  const buildScene = useCallback((W: number, H: number) => {
    const bgStars: BgStar[] = [];
    const rng = (s: number) => (hashStr("bg" + s) % 1000) / 1000;
    for (let i = 0; i < 240; i++) {
      bgStars.push({
        x:     rng(i * 3)     * W,
        y:     rng(i * 3 + 1) * H,
        r:     0.3 + rng(i * 3 + 2) * 1.1,
        t:     rng(i * 7)     * Math.PI * 2,
        speed: 0.005 + rng(i * 11) * 0.012,
      });
    }
    bgRef.current = bgStars;

    const zones = buildZones(W, H);
    zonesRef.current = zones;

    const stars: PlacedStar[] = [];
    let entryIdx = 0;

    CONSTELLATIONS.forEach((constDef, ci) => {
      const zone = zones[ci];
      constDef.points.forEach((pt, pi) => {
        if (entryIdx >= entries.length) return;
        const entry    = entries[entryIdx++];
        const [px, py] = pt;
        const x = zone.cx + ((px - 50) / 100) * zone.scaleX * 2;
        const y = zone.cy + ((py - 50) / 100) * zone.scaleY * 2;
        const mc   = MOOD_COLORS[entry.mood ?? "default"] ?? MOOD_COLORS.default;
        const seed = entry.id + ci + pi;
        stars.push({
          entry,
          x: Math.max(20, Math.min(W - 20, x)),
          y: Math.max(20, Math.min(H - 20, y)),
          r: 3.8,
          color: mc.color,
          glow:  mc.glow,
          constIndex: ci,
          pointIndex: pi,
          t:     (hashStr(seed + "t")  % 628) / 100,
          speed: 0.013 + (hashStr(seed + "sp") % 100) / 7000,
          hovered: false,
        });
      });
    });

    starsRef.current = stars;
  }, [entries, buildZones]);

  // Compute completed state — separate effect, only fires when entries changes
  useEffect(() => {
    const newCompleted = new Set<string>();
    const counts: Record<number, number> = {};

    CONSTELLATIONS.forEach((constDef, ci) => {
      const count = starsRef.current.filter(s => s.constIndex === ci).length;
      counts[ci]  = count;
      if (count >= constDef.points.length) newCompleted.add(constDef.name);
    });

    const brandNew = [...newCompleted].find(n => !completedRef.current.has(n));
    if (brandNew) {
      const c = CONSTELLATIONS.find(c => c.name === brandNew)!;
      setNewUnlock({ name: c.name, emoji: c.emoji });
      setTimeout(() => setNewUnlock(null), 4000);
    }

    completedRef.current = newCompleted;
    setCompletedNames(new Set(newCompleted));
    setStarCounts(counts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.clearRect(0, 0, W, H);
    const dark = isDarkRef.current;

    // Sky
    const skyG = ctx.createLinearGradient(0, 0, 0, H);
    skyG.addColorStop(0, "#010810");
    skyG.addColorStop(0.5, "#060f1e");
    skyG.addColorStop(1, "#0a1628");
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, H);

    // Nebula blobs
    [
      [W*0.15, H*0.18, 140, "rgba(99,91,255,0.045)"],
      [W*0.78, H*0.45, 110, "rgba(34,211,238,0.03)"],
      [W*0.50, H*0.72, 120, "rgba(167,139,250,0.04)"],
      [W*0.88, H*0.12, 80,  "rgba(251,191,36,0.025)"],
      [W*0.32, H*0.88, 90,  "rgba(52,211,153,0.028)"],
    ].forEach(([nx, ny, nr, nc]) => {
      const g = ctx.createRadialGradient(
        nx as number, ny as number, 0,
        nx as number, ny as number, nr as number
      );
      g.addColorStop(0, nc as string);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });

    // Background twinkle stars
    bgRef.current.forEach(s => {
      s.t += s.speed;
      const a = Math.max(0, 0.1 + Math.sin(s.t) * 0.28);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    });

    // Draw constellations
    CONSTELLATIONS.forEach((constDef, ci) => {
      const constStars = starsRef.current.filter(s => s.constIndex === ci);
      if (constStars.length === 0) return;

      const isComplete = completedRef.current.has(constDef.name);

      // Edges
      constDef.edges.forEach(([ai, bi]) => {
        const sa = constStars.find(s => s.pointIndex === ai);
        const sb = constStars.find(s => s.pointIndex === bi);
        if (!sa || !sb) return;
        ctx.save();
        ctx.lineWidth   = isComplete ? 1.1 : 0.8;
        ctx.strokeStyle = isComplete
          ? "rgba(200,210,255,0.38)"
          : "rgba(255,255,255,0.12)";
        ctx.setLineDash(isComplete ? [] : [3, 6]);
        ctx.beginPath();
        ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });

      // Name label — only when complete, always readable against dark sky
      if (isComplete) {
        const xs     = constStars.map(s => s.x);
        const ys     = constStars.map(s => s.y);
        const labelX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const labelY =  Math.max(...ys) + 22;

        // Dark backdrop behind text so it's readable in any mode
        const label  = `${constDef.emoji} ${constDef.name}`;
        ctx.save();
        ctx.font     = "500 11px sans-serif";
        ctx.textAlign = "center";

        // Measure text width for backdrop
        const metrics  = ctx.measureText(label);
        const padX     = 8;
        const padY     = 4;
        const rectW    = metrics.width + padX * 2;
        const rectH    = 18;
        const rectX    = labelX - rectW / 2;
        const rectY    = labelY - 13;

        // Semi-transparent pill behind the text
        ctx.fillStyle    = "rgba(1,8,22,0.65)";
        ctx.beginPath();
        ctx.roundRect(rectX, rectY, rectW, rectH, 6);
        ctx.fill();

        // Text always white — readable on the dark pill regardless of page theme
        ctx.fillStyle = "rgba(220,228,255,0.92)";
        ctx.fillText(label, labelX, labelY);
        ctx.restore();
      }
    });

    // Stars on top of lines
    starsRef.current.forEach(s => {
      s.t += s.speed;
      const pulse      = 0.78 + Math.sin(s.t) * 0.22;
      const isComplete = completedRef.current.has(CONSTELLATIONS[s.constIndex]?.name ?? "");
      const r          = s.r * (s.hovered ? 1.7 : 1) * (0.94 + pulse * 0.06);
      const glowR      = r * (s.hovered ? 6 : isComplete ? 5 : 4);
      const starColor  = isComplete ? "#e0e8ff" : s.color;
      const glowColor  = isComplete ? "#818cf8" : s.glow;

      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
      g.addColorStop(0,    starColor + "ee");
      g.addColorStop(0.35, glowColor + "55");
      g.addColorStop(1,    glowColor + "00");
      ctx.beginPath();
      ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = starColor;
      ctx.fill();

      if (s.hovered) {
        ctx.save();
        ctx.strokeStyle = starColor + "99";
        ctx.lineWidth   = 0.7;
        const gl = r * 3;
        ctx.beginPath(); ctx.moveTo(s.x - gl, s.y); ctx.lineTo(s.x + gl, s.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s.x, s.y - gl); ctx.lineTo(s.x, s.y + gl); ctx.stroke();
        ctx.restore();
      }
    });

    // Suppress unused warning — dark var used for future expansions
    void dark;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const W   = wrap.clientWidth;
      const H   = 420;
      canvas.width        = W * dpr;
      canvas.height       = H * dpr;
      canvas.style.width  = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimsRef.current = { W, H };
      buildScene(W, H);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const loop = () => {
      const { W, H } = dimsRef.current;
      draw(ctx, W, H);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [buildScene, draw]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { mx: e.clientX - rect.left, my: e.clientY - rect.top };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mx, my } = getPos(e);
    const hit = starsRef.current.find(s => Math.hypot(s.x - mx, s.y - my) < s.r * 4);
    if (hit) {
      dragRef.current = { star: hit, offsetX: mx - hit.x, offsetY: my - hit.y };
      if (tooltipRef.current) tooltipRef.current.style.display = "none";
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mx, my } = getPos(e);
    const { star }   = dragRef.current;

    if (star) {
      star.x = Math.max(16, Math.min(dimsRef.current.W - 16, mx - dragRef.current.offsetX));
      star.y = Math.max(16, Math.min(dimsRef.current.H - 16, my - dragRef.current.offsetY));
      if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
      return;
    }

    let hit: PlacedStar | null = null;
    starsRef.current.forEach(s => {
      s.hovered = Math.hypot(s.x - mx, s.y - my) < s.r * 3.5;
      if (s.hovered) hit = s;
    });
    if (canvasRef.current) canvasRef.current.style.cursor = hit ? "grab" : "crosshair";

    const tip = tooltipRef.current;
    if (!tip) return;
    if (hit) {
      const h     = hit as PlacedStar;
      const mc    = MOOD_COLORS[h.entry.mood ?? "default"] ?? MOOD_COLORS.default;
      const cDef  = CONSTELLATIONS[h.constIndex];
      const count = starsRef.current.filter(s => s.constIndex === h.constIndex).length;
      const date  = new Date(h.entry.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const tags  = h.entry.tags?.join(", ") || "";
      const snip  = h.entry.body?.slice(0, 65) + ((h.entry.body?.length ?? 0) > 65 ? "…" : "");
      tip.style.display = "block";
      tip.style.left    = Math.min(mx + 14, dimsRef.current.W - 220) + "px";
      tip.style.top     = Math.max(8, my - 110) + "px";
      tip.innerHTML = `
        <div style="font-weight:600;color:#a5b4fc;font-size:11px;letter-spacing:0.08em;margin-bottom:3px">
          ${cDef.emoji} ${cDef.name} · ${count}/${cDef.points.length} stars
        </div>
        <div style="font-weight:500;color:${mc.color};margin-bottom:3px">${mc.label}</div>
        <div style="color:rgba(255,255,255,0.38);font-size:10px;margin-bottom:5px">${date}${tags ? " · " + tags : ""}</div>
        <div style="color:rgba(255,255,255,0.7);font-style:italic;line-height:1.5">"${snip}"</div>
      `;
    } else {
      tip.style.display = "none";
    }
  };

  const onMouseUp = () => {
    dragRef.current.star = null;
    if (canvasRef.current) canvasRef.current.style.cursor = "crosshair";
  };

  const onMouseLeave = () => {
    dragRef.current.star = null;
    starsRef.current.forEach(s => (s.hovered = false));
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
    if (canvasRef.current) canvasRef.current.style.cursor = "crosshair";
  };

  const totalStars = CONSTELLATIONS.reduce((a, c) => a + c.points.length, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {newUnlock && (
        <div style={{
          padding: "10px 16px", borderRadius: 12,
          background: "linear-gradient(135deg,rgba(99,91,255,0.18),rgba(165,180,252,0.12))",
          border: "1px solid rgba(165,180,252,0.3)",
          color: "#c7d2fe", fontSize: 13, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>✦</span>
          {newUnlock.emoji} {newUnlock.name} constellation complete!
        </div>
      )}

      <div ref={wrapRef} style={{
        position: "relative", borderRadius: 20, overflow: "hidden",
        background: "#010810", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          style={{ display: "block", cursor: "crosshair" }}
        />

        <div ref={tooltipRef} style={{
          position: "absolute", pointerEvents: "none", display: "none",
          padding: "9px 13px", background: "rgba(1,8,16,0.95)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
          fontSize: 12, color: "#e2e8f0", maxWidth: 210, lineHeight: 1.5,
        }} />

        <div style={{
          position: "absolute", top: 12, left: 16, fontSize: 11,
          color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em",
          textTransform: "uppercase", pointerEvents: "none",
        }}>✦ your sky</div>

        <div style={{
          position: "absolute", top: 12, right: 14, fontSize: 11,
          color: "rgba(255,255,255,0.28)", pointerEvents: "none",
        }}>
          {entries.length} / {totalStars} stars · {completedNames.size} constellations
        </div>

        {entries.length === 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.2)", fontSize: 13, gap: 8, pointerEvents: "none",
          }}>
            <span style={{ fontSize: 28 }}>✦</span>
            <span>Write your first entry to light a star</span>
          </div>
        )}
      </div>

      {/* Progress pills */}
<div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "2px 0" }}>
  {CONSTELLATIONS.map((c, i) => {
    const count      = starCounts[i] ?? 0;
    const isComplete = completedNames.has(c.name);
    const hasAny     = count > 0;
    return (
      <span key={c.name} style={{
        display: "flex", alignItems: "center", gap: 4,
        fontSize: 11, padding: "4px 10px", borderRadius: 20,
        border: `1px solid ${isComplete
          ? "rgba(99,91,255,0.35)"
          : "rgba(var(--border), 1)"}`,
        background: isComplete
          ? "rgba(99,91,255,0.1)"
          : "rgb(var(--card2, 248 250 252))",
        color: isComplete
          ? "#6d5fd4"
          : hasAny
            ? "rgb(var(--fg))"
            : "rgb(var(--muted))",
        transition: "all 0.3s",
      }}>
        <span style={{ fontSize: 13 }}>{c.emoji}</span>
        <span>{c.name}</span>
        {isComplete
          ? <span style={{ color: "#16a34a", fontSize: 9, marginLeft: 2 }}>✓</span>
          : <span style={{
              fontSize: 9, marginLeft: 2,
              color: hasAny ? "rgb(var(--muted))" : "rgb(var(--muted2))",
            }}>{count}/{c.points.length}</span>
        }
      </span>
    );
  })}
</div>
    </div>
  );
}