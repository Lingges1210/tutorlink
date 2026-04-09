"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ConstellationSky from "@/components/ConstellationSky";

type Mood = "grateful" | "motivated" | "meh" | "tired" | "stressed" | "anxious" | "low";
type RitualKey = "burn" | "freeze" | "shred" | "dragon" | "ocean" | "space";
type Tab = "journal" | "release" | "past";

interface JournalEntry {
  id: string;
  body: string;
  mood: string | null;
  tags: string[];
  createdAt: string;
}

const MOODS: {
  key: Mood;
  label: string;
  emoji: string;
  activeLight: React.CSSProperties;
  activeDark: React.CSSProperties;
}[] = [
  {
    key: "grateful", label: "Grateful", emoji: "🌱",
    activeLight: { background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" },
    activeDark:  { background: "rgba(6,78,59,0.4)", color: "#6ee7b7", borderColor: "#065f46" },
  },
  {
    key: "motivated", label: "Motivated", emoji: "⚡",
    activeLight: { background: "#fffbeb", color: "#92400e", borderColor: "#fcd34d" },
    activeDark:  { background: "rgba(120,53,15,0.4)", color: "#fcd34d", borderColor: "#92400e" },
  },
  {
    key: "meh", label: "Meh", emoji: "☁️",
    activeLight: { background: "#f8fafc", color: "#475569", borderColor: "#cbd5e1" },
    activeDark:  { background: "rgba(30,41,59,0.8)", color: "#cbd5e1", borderColor: "#475569" },
  },
  {
    key: "tired", label: "Tired", emoji: "🌙",
    activeLight: { background: "#eef2ff", color: "#3730a3", borderColor: "#a5b4fc" },
    activeDark:  { background: "rgba(49,46,129,0.4)", color: "#a5b4fc", borderColor: "#3730a3" },
  },
  {
    key: "stressed", label: "Stressed", emoji: "🌀",
    activeLight: { background: "#fff7ed", color: "#9a3412", borderColor: "#fdba74" },
    activeDark:  { background: "rgba(154,52,18,0.3)", color: "#fdba74", borderColor: "#9a3412" },
  },
  {
    key: "anxious", label: "Anxious", emoji: "💭",
    activeLight: { background: "#faf5ff", color: "#6b21a8", borderColor: "#d8b4fe" },
    activeDark:  { background: "rgba(107,33,168,0.3)", color: "#d8b4fe", borderColor: "#6b21a8" },
  },
  {
    key: "low", label: "Low", emoji: "🌧️",
    activeLight: { background: "#eff6ff", color: "#1e40af", borderColor: "#93c5fd" },
    activeDark:  { background: "rgba(30,64,175,0.3)", color: "#93c5fd", borderColor: "#1e40af" },
  },
];

const TAGS = ["Studies", "Social", "Health", "Family", "Win", "Tough day", "Relationship", "FYP"];

const RITUALS: {
  key: RitualKey; label: string; icon: string; desc: string;
  animLabel: string; msg: string; sub: string; affirm: string;
}[] = [
  { key: "burn",   label: "Burn it",      icon: "🔥", desc: "Watch it turn to ash",               animLabel: "Burning your letter...",            msg: "You don't have to carry this anymore.",  sub: "The fire is taking it.",                    affirm: "The flames have consumed every word. Whatever was weighing on you — burned away. The ashes are gone. You are lighter now." },
  { key: "freeze", label: "Freeze it",    icon: "🧊", desc: "Ice it cold, seal it away",           animLabel: "Freezing it solid...",              msg: "Frozen. Still. Unmoving.",               sub: "Cold and still — it can no longer touch you.", affirm: "Sealed in ice. The feeling still exists, but it cannot move, cannot hurt you. You are in control." },
  { key: "shred",  label: "Shred it",     icon: "✂️", desc: "Cut into pieces",                     animLabel: "Shredding every word...",           msg: "Scraps of paper, not your burden.",      sub: "Cut into pieces too small to matter.",      affirm: "Every small piece carried one feeling. And now they're scattered — free from their shape, free from their power." },
  { key: "dragon", label: "Dragon bury",  icon: "🐉", desc: "Let the dragon guard it underground",  animLabel: "The dragon takes it underground...", msg: "Buried deep, guarded by the dragon.",   sub: "Deep underground where it cannot return.",  affirm: "The dragon has carried your burden to the depths of the earth. Buried deep, locked away. You are safe. You are free." },
  { key: "ocean",  label: "Ocean wave",   icon: "🌊", desc: "Let the tide carry it away",           animLabel: "Releasing to the sea...",           msg: "The waves carry it away.",               sub: "Far out to sea, dissolved.",                affirm: "Wave after wave carries away every word. The vast ocean swallows it all — and the water returns clear, just like you." },
  { key: "space",  label: "Into space",   icon: "🚀", desc: "Launch it beyond reach",               animLabel: "Launching to space...",             msg: "Far. Further still.",                    sub: "Into the infinite — far beyond reach.",     affirm: "Launched out of the atmosphere, past the stars, lost in the infinite expanse. It no longer exists in your world." },
];

function runCanvasAnim(canvas: HTMLCanvasElement, ritual: RitualKey, onDone: () => void) {
  const ctx = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  let frame = 0;
  let rafId: number;
  const DUR = 260;

  const getIsDark = () =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const getColors = () => {
    const d = getIsDark();
    return {
      canvasBg: d ? "#09090b" : "#f8fafc",
      paper: d ? "#fdf6e3" : "#fffdf7",
      line: d ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)",
      border: d ? "rgba(180,160,120,0.35)" : "rgba(160,140,100,0.28)",
    };
  };

  const stop = () => cancelAnimationFrame(rafId);

  if (ritual === "burn") {
    const particles: { x: number; y: number; vx: number; vy: number; life: number; decay: number; r: number; hue: number }[] = [];
    for (let i = 0; i < 130; i++) {
      particles.push({ x: W / 2 + (Math.random() - 0.5) * 200, y: H * 0.78 + Math.random() * 30, vx: (Math.random() - 0.5) * 1.5, vy: -(1 + Math.random() * 3), life: 1, decay: 0.007 + Math.random() * 0.01, r: 5 + Math.random() * 16, hue: Math.random() * 45 });
    }
    const tick = () => {
      const colors = getColors();
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = colors.canvasBg;
      ctx.fillRect(0, 0, W, H);
      const burnPct = Math.min(1, frame / DUR);
      const paperH = H * 0.65 * (1 - burnPct * 0.9);
      const paperY = H * 0.12;
      ctx.save();
      ctx.shadowColor = "rgba(255,100,0,0.6)";
      ctx.shadowBlur = burnPct * 25;
      ctx.fillStyle = colors.paper;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 115, paperY);
      for (let xi = 0; xi <= 230; xi += 6) {
        const wave = burnPct > 0.08 ? Math.sin(xi * 0.25 + frame * 0.18) * 4 * burnPct : 0;
        ctx.lineTo(W / 2 - 115 + xi, paperY + wave);
      }
      ctx.lineTo(W / 2 + 115, paperY + paperH);
      ctx.lineTo(W / 2 - 115, paperY + paperH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const burnEdge = paperY + paperH;
      const eg = ctx.createLinearGradient(0, burnEdge - 22, 0, burnEdge + 12);
      eg.addColorStop(0, "rgba(255,50,0,0)");
      eg.addColorStop(0.5, "rgba(255,90,0,0.95)");
      eg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = eg;
      ctx.fillRect(W / 2 - 125, burnEdge - 22, 250, 34);
      particles.forEach((p) => {
        if (p.life <= 0) return;
        p.x += p.vx + (Math.random() - 0.5) * 0.4;
        p.y += p.vy;
        p.vy *= 0.985;
        p.vx *= 0.99;
        p.life -= p.decay;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `hsla(${p.hue + 20},100%,82%,${p.life})`);
        g.addColorStop(0.4, `hsla(${p.hue},100%,55%,${p.life * 0.6})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });
      frame++;
      if (frame < DUR + 50) { rafId = requestAnimationFrame(tick); }
      else {
        const colors2 = getColors();
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = colors2.canvasBg;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = getIsDark() ? "rgba(80,70,60,0.25)" : "rgba(120,110,90,0.18)";
        for (let a = 0; a < 28; a++) {
          ctx.beginPath();
          ctx.arc(W / 2 + (Math.random() - 0.5) * 180, H / 2 + (Math.random() - 0.5) * 90, Math.random() * 9, 0, Math.PI * 2);
          ctx.fill();
        }
        onDone();
      }
    };
    rafId = requestAnimationFrame(tick);

  } else if (ritual === "freeze") {
    const crystals: { x: number; y: number; size: number; maxSize: number; speed: number; angle: number; alpha: number }[] = [];
    for (let i = 0; i < 90; i++) crystals.push({ x: Math.random() * W, y: Math.random() * H, size: 0, maxSize: 6 + Math.random() * 22, speed: 0.25 + Math.random() * 0.7, angle: Math.random() * Math.PI, alpha: 0 });
    const tick = () => {
      const isDark = getIsDark();
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      if (isDark) { bg.addColorStop(0, "#040d1a"); bg.addColorStop(1, "#0b1e3a"); }
      else { bg.addColorStop(0, "#eef6ff"); bg.addColorStop(1, "#dbeafe"); }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      const prog = Math.min(1, frame / DUR);
      crystals.forEach((c) => {
        if (c.size < c.maxSize) c.size += c.speed;
        c.alpha = Math.min(0.9, c.alpha + 0.014);
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle);
        ctx.strokeStyle = isDark ? `rgba(160,215,255,${c.alpha})` : `rgba(80,140,220,${c.alpha})`;
        ctx.lineWidth = 0.9;
        for (let arm = 0; arm < 6; arm++) {
          ctx.save();
          ctx.rotate((arm * Math.PI) / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -c.size);
          ctx.stroke();
          if (c.size > 9) {
            ctx.beginPath(); ctx.moveTo(0, -c.size * 0.5); ctx.lineTo(c.size * 0.28, -c.size * 0.5 + c.size * 0.22); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -c.size * 0.5); ctx.lineTo(-c.size * 0.28, -c.size * 0.5 + c.size * 0.22); ctx.stroke();
          }
          ctx.restore();
        }
        ctx.restore();
      });
      if (prog > 0.45) {
        const iG = ctx.createLinearGradient(0, 0, W, H);
        if (isDark) { iG.addColorStop(0, `rgba(100,185,255,${(prog - 0.45) * 0.35})`); iG.addColorStop(1, `rgba(60,140,220,${(prog - 0.45) * 0.25})`); }
        else { iG.addColorStop(0, `rgba(191,219,254,${(prog - 0.45) * 0.45})`); iG.addColorStop(1, `rgba(147,197,253,${(prog - 0.45) * 0.3})`); }
        ctx.fillStyle = iG;
        ctx.fillRect(0, 0, W, H);
      }
      frame++;
      if (frame < DUR + 30) rafId = requestAnimationFrame(tick);
      else onDone();
    };
    rafId = requestAnimationFrame(tick);

  } else if (ritual === "shred") {
    const numStrips = 26;
    const strips = Array.from({ length: numStrips }, (_, i) => ({ x: W / 2 - 115 + i * (230 / numStrips), y: H * 0.18, w: 230 / numStrips - 1, h: H * 0.62, vy: 0, ay: 0.14 + Math.random() * 0.18, vx: (i - numStrips / 2) * 0.1, rot: 0, rotV: (Math.random() - 0.5) * 0.045, cutAt: 18 + i * 5, alpha: 1 }));
    const tick = () => {
      const isDark = getIsDark();
      const colors = getColors();
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = colors.canvasBg;
      ctx.fillRect(0, 0, W, H);
      strips.forEach((s) => {
        if (frame >= s.cutAt) { s.vy += s.ay; s.y += s.vy; s.x += s.vx; s.rot += s.rotV; s.alpha = Math.max(0, s.alpha - 0.007); }
        ctx.save();
        ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
        ctx.rotate(s.rot);
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = colors.paper;
        ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h);
        ctx.restore();
        ctx.globalAlpha = 1;
        if (frame >= s.cutAt && frame < s.cutAt + 3) {
          ctx.strokeStyle = isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x + s.w / 2, s.y);
          ctx.lineTo(s.x + s.w / 2, s.y + s.h);
          ctx.stroke();
        }
      });
      frame++;
      if (frame < DUR) rafId = requestAnimationFrame(tick);
      else onDone();
    };
    rafId = requestAnimationFrame(tick);

  } else if (ritual === "dragon") {
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; r: number }[] = [];
    let paperOpacity = 1;
    const tick = () => {
      const isDark = getIsDark();
      const colors = getColors();
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      if (isDark) { bg.addColorStop(0, "#0a0603"); bg.addColorStop(0.65, "#160e04"); bg.addColorStop(1, "#271602"); }
      else { bg.addColorStop(0, "#fff7ed"); bg.addColorStop(0.65, "#fed7aa"); bg.addColorStop(1, "#fdba74"); }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      const groundY = H * 0.76;
      ctx.fillStyle = isDark ? "#1e1005" : "#9a3412";
      ctx.fillRect(0, groundY, W, H - groundY);
      const crackP = Math.min(1, Math.max(0, (frame - 55) / 75));
      if (crackP > 0) {
        ctx.strokeStyle = `rgba(255,90,0,${crackP * 0.85})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W / 2, groundY);
        [[W / 2 - 35, groundY + 22], [W / 2 + 28, groundY + 42], [W / 2 - 8, groundY + 62], [W / 2 + 18, groundY + 82]].forEach(([cx, cy]) => ctx.lineTo(cx, cy));
        ctx.stroke();
        const glowG = ctx.createRadialGradient(W / 2, groundY + 40, 0, W / 2, groundY + 40, 60);
        glowG.addColorStop(0, `rgba(255,80,0,${crackP * 0.3})`);
        glowG.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glowG;
        ctx.fillRect(W / 2 - 80, groundY, 160, 100);
      }
      if (paperOpacity > 0) {
        const paperSink = Math.min(1, frame / (DUR * 0.55));
        paperOpacity = Math.max(0, 1 - (frame - 80) / 60);
        const py = H * 0.2 + paperSink * H * 0.5;
        ctx.save();
        ctx.globalAlpha = paperOpacity;
        ctx.fillStyle = colors.paper;
        ctx.beginPath();
        ctx.roundRect?.(W / 2 - 75, py, 150, 100, 6);
        ctx.fill();
        for (let ln = 0; ln < 5; ln++) {
          ctx.fillStyle = isDark ? "rgba(180,155,100,0.28)" : "rgba(160,140,100,0.22)";
          ctx.fillRect(W / 2 - 58, py + 18 + ln * 14, 116, 1);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      const dragonVisible = Math.min(1, (frame - 25) / 30);
      if (dragonVisible > 0) {
        // Dragon floats and bobs above ground
        const bobY = Math.sin(frame * 0.045) * 10;
        const bobX = Math.sin(frame * 0.028) * 18;
        const cx = W / 2 + bobX;
        const cy = groundY - 80 + bobY;

        ctx.save();
        ctx.globalAlpha = dragonVisible;

        // ── Tail (drawn first, behind body) ──
        const tailWag = Math.sin(frame * 0.07) * 18;
        ctx.strokeStyle = "#2d6e1a";
        ctx.lineWidth = 8;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(cx + 55, cy + 10);
        ctx.bezierCurveTo(cx + 85, cy + 20, cx + 105, cy + tailWag, cx + 120, cy - 10 + tailWag);
        ctx.bezierCurveTo(cx + 130, cy - 25 + tailWag, cx + 118, cy - 38 + tailWag, cx + 108, cy - 28 + tailWag);
        ctx.stroke();
        // tail tip spike
        ctx.fillStyle = "#1a4a0e";
        ctx.beginPath();
        ctx.moveTo(cx + 108, cy - 28 + tailWag);
        ctx.lineTo(cx + 122, cy - 48 + tailWag);
        ctx.lineTo(cx + 112, cy - 24 + tailWag);
        ctx.closePath();
        ctx.fill();

        // ── Body ──
        const bodyGrad = ctx.createRadialGradient(cx + 10, cy, 5, cx + 10, cy, 45);
        bodyGrad.addColorStop(0, "#3a8a22");
        bodyGrad.addColorStop(1, "#1e5010");
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(cx + 10, cy + 8, 52, 32, 0, 0, Math.PI * 2);
        ctx.fill();
        // belly (lighter)
        ctx.fillStyle = "#a8d878";
        ctx.beginPath();
        ctx.ellipse(cx + 10, cy + 16, 32, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // ── Spine spikes ──
        ctx.fillStyle = "#1a4a0e";
        const spikeXs = [cx - 10, cx + 5, cx + 20, cx + 35, cx + 48];
        const spikeH  = [22, 28, 24, 20, 14];
        spikeXs.forEach((sx, si) => {
          const sway = Math.sin(frame * 0.07 + si * 0.6) * 3;
          ctx.beginPath();
          ctx.moveTo(sx - 6, cy - 18);
          ctx.lineTo(sx, cy - 18 - spikeH[si] + sway);
          ctx.lineTo(sx + 6, cy - 18);
          ctx.closePath();
          ctx.fill();
        });

        // ── Wings ──
        const wingFlap = Math.sin(frame * 0.09) * 18;
        // left wing (back)
        ctx.fillStyle = "rgba(20,70,10,0.55)";
        ctx.beginPath();
        ctx.moveTo(cx, cy - 10);
        ctx.bezierCurveTo(cx - 30, cy - 50 - wingFlap, cx - 75, cy - 60 - wingFlap, cx - 85, cy - 20 - wingFlap);
        ctx.bezierCurveTo(cx - 70, cy - 5, cx - 35, cy + 5, cx, cy - 10);
        ctx.fill();
        // wing membrane ribs
        ctx.strokeStyle = "rgba(10,50,5,0.5)";
        ctx.lineWidth = 1;
        [[cx - 20, cy - 35 - wingFlap * 0.8], [cx - 45, cy - 48 - wingFlap], [cx - 65, cy - 42 - wingFlap * 0.9]].forEach(([wx, wy]) => {
          ctx.beginPath();
          ctx.moveTo(cx, cy - 10);
          ctx.lineTo(wx, wy);
          ctx.stroke();
        });
        // right wing (front)
        ctx.fillStyle = "rgba(45,110,20,0.75)";
        ctx.beginPath();
        ctx.moveTo(cx + 15, cy - 15);
        ctx.bezierCurveTo(cx + 45, cy - 55 - wingFlap, cx + 90, cy - 65 - wingFlap, cx + 98, cy - 22 - wingFlap);
        ctx.bezierCurveTo(cx + 82, cy - 5, cx + 45, cy + 8, cx + 15, cy - 15);
        ctx.fill();
        ctx.strokeStyle = "rgba(10,60,5,0.5)";
        ctx.lineWidth = 1;
        [[cx + 35, cy - 40 - wingFlap * 0.8], [cx + 60, cy - 52 - wingFlap], [cx + 80, cy - 44 - wingFlap * 0.9]].forEach(([wx, wy]) => {
          ctx.beginPath();
          ctx.moveTo(cx + 15, cy - 15);
          ctx.lineTo(wx, wy);
          ctx.stroke();
        });

        // ── Legs ──
        ctx.strokeStyle = "#1e5010";
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        const legSwing = Math.sin(frame * 0.07) * 6;
        // front leg
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy + 28);
        ctx.lineTo(cx - 20, cy + 52 + legSwing);
        ctx.lineTo(cx - 10, cy + 60 + legSwing);
        ctx.stroke();
        // back leg
        ctx.beginPath();
        ctx.moveTo(cx + 30, cy + 28);
        ctx.lineTo(cx + 38, cy + 52 - legSwing);
        ctx.lineTo(cx + 48, cy + 58 - legSwing);
        ctx.stroke();
        // claws
        ctx.strokeStyle = "#0d2e08";
        ctx.lineWidth = 2;
        [[-10, 60 + legSwing], [48, 58 - legSwing]].forEach(([lx, ly]) => {
          for (let c = -1; c <= 1; c++) {
            ctx.beginPath();
            ctx.moveTo(cx + lx, cy + ly);
            ctx.lineTo(cx + lx + c * 6, cy + ly + 8);
            ctx.stroke();
          }
        });

        // ── Neck ──
        const neckGrad = ctx.createLinearGradient(cx - 30, cy - 10, cx - 55, cy - 30);
        neckGrad.addColorStop(0, "#3a8a22");
        neckGrad.addColorStop(1, "#2d6e1a");
        ctx.fillStyle = neckGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 28, cy - 5);
        ctx.bezierCurveTo(cx - 42, cy - 20, cx - 52, cy - 35, cx - 58, cy - 48);
        ctx.bezierCurveTo(cx - 48, cy - 52, cx - 36, cy - 38, cx - 18, cy - 18);
        ctx.closePath();
        ctx.fill();

        // ── Head ──
        const headX = cx - 62;
        const headY = cy - 58;
        const headNod = Math.sin(frame * 0.055) * 5;
        ctx.save();
        ctx.translate(headX, headY + headNod);

        // skull
        const headGrad = ctx.createRadialGradient(-2, -4, 2, 0, 0, 22);
        headGrad.addColorStop(0, "#4aa028");
        headGrad.addColorStop(1, "#1e5010");
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 16, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // snout
        ctx.fillStyle = "#2d6e1a";
        ctx.beginPath();
        ctx.ellipse(-18, 4, 14, 9, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // upper jaw
        ctx.fillStyle = "#1e5010";
        ctx.beginPath();
        ctx.moveTo(-6, 6);
        ctx.lineTo(-30, 8);
        ctx.lineTo(-30, 13);
        ctx.lineTo(-6, 11);
        ctx.closePath();
        ctx.fill();

        // lower jaw (slightly open, animated)
        const jawOpen = 4 + Math.abs(Math.sin(frame * 0.09)) * 6;
        ctx.fillStyle = "#163a0a";
        ctx.beginPath();
        ctx.moveTo(-8, 10);
        ctx.lineTo(-28, 10 + jawOpen);
        ctx.lineTo(-28, 15 + jawOpen);
        ctx.lineTo(-8, 14);
        ctx.closePath();
        ctx.fill();

        // teeth
        ctx.fillStyle = "#f0ead0";
        for (let t = 0; t < 4; t++) {
          ctx.beginPath();
          ctx.moveTo(-12 - t * 4, 10);
          ctx.lineTo(-14 - t * 4, 15);
          ctx.lineTo(-10 - t * 4, 10);
          ctx.fill();
        }

        // tongue flicker
        const tongueFl = Math.sin(frame * 0.18) * 3;
        ctx.strokeStyle = "#cc2244";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-26, 12 + jawOpen * 0.6);
        ctx.lineTo(-34, 14 + jawOpen * 0.6 + tongueFl);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-34, 14 + jawOpen * 0.6 + tongueFl);
        ctx.lineTo(-38, 12 + jawOpen * 0.6 + tongueFl - 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-34, 14 + jawOpen * 0.6 + tongueFl);
        ctx.lineTo(-38, 16 + jawOpen * 0.6 + tongueFl + 2);
        ctx.stroke();

        // nostril
        ctx.fillStyle = "#0d2e08";
        ctx.beginPath();
        ctx.ellipse(-22, 0, 2.5, 1.5, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // eye
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.ellipse(8, -6, 7, 6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // pupil (slit)
        ctx.fillStyle = "#1a0000";
        ctx.beginPath();
        ctx.ellipse(8, -6, 2, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // eye shine
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.arc(10, -8, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // horns
        ctx.fillStyle = "#8B4513";
        ctx.beginPath();
        ctx.moveTo(12, -12); ctx.lineTo(6, -32); ctx.lineTo(17, -14); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, -13); ctx.lineTo(-2, -30); ctx.lineTo(9, -15); ctx.fill();

        // brow ridge
        ctx.fillStyle = "#1a4a0e";
        ctx.beginPath();
        ctx.ellipse(8, -11, 9, 3, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // end head transform

        ctx.restore(); // end main dragon save
        ctx.globalAlpha = 1;

        // ── Fire breath sparks ──
        if (Math.random() < 0.5 && frame > 30) {
          const fireX = cx - 62 + Math.cos(-0.2) * (-38) - 30;
          const fireY = cy - 58 + headNod + Math.sin(-0.2) * (-38) + 14;
          sparks.push({
            x: fireX + (Math.random() - 0.5) * 10,
            y: fireY + (Math.random() - 0.5) * 8,
            vx: -(1.5 + Math.random() * 3),
            vy: (Math.random() - 0.5) * 1.5,
            life: 1,
            r: 3 + Math.random() * 7,
          });
        }
        sparks.forEach((s) => {
          s.x += s.vx; s.y += s.vy; s.vy += 0.04; s.life -= 0.032;
          if (s.life <= 0) return;
          const radius = Math.max(0, s.r * s.life);
          if (radius === 0) return;
          const hue = Math.floor(20 + (1 - s.life) * 40);
          ctx.beginPath();
          ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,${hue + Math.floor(Math.random() * 40)},0,${Math.max(0, s.life * 0.9)})`;
          ctx.fill();
        });
        sparks.splice(0, sparks.length, ...sparks.filter((s) => s.life > 0));
      }
      frame++;
      if (frame < DUR + 20) rafId = requestAnimationFrame(tick);
      else onDone();
    };
    rafId = requestAnimationFrame(tick);

  } else if (ritual === "ocean") {
    const letter = { x: W / 2, y: H * 0.28, vy: 0, opacity: 1, scale: 1 };
    const tick = () => {
      const isDark = getIsDark();
      const colors = getColors();
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
      if (isDark) { sky.addColorStop(0, "#040a14"); sky.addColorStop(1, "#081c30"); }
      else { sky.addColorStop(0, "#e0f2fe"); sky.addColorStop(1, "#bfdbfe"); }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      for (let s = 0; s < 55; s++) {
        ctx.fillStyle = isDark
          ? `rgba(255,255,255,${(0.3 + Math.sin(s * 432) * 0.4) * Math.abs(Math.sin(frame * 0.018 + s))})`
          : `rgba(255,255,255,${(0.18 + Math.sin(s * 432) * 0.18) * Math.abs(Math.sin(frame * 0.018 + s))})`;
        ctx.beginPath();
        ctx.arc((s * 137) % W, (s * 89) % (H * 0.45), 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      const moonX = W * 0.8, moonY = H * 0.12;
      const moonG = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 28);
      if (isDark) { moonG.addColorStop(0, "rgba(255,245,215,0.92)"); moonG.addColorStop(1, "rgba(200,185,145,0)"); }
      else { moonG.addColorStop(0, "rgba(255,255,255,0.95)"); moonG.addColorStop(1, "rgba(255,255,255,0)"); }
      ctx.fillStyle = moonG;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 28, 0, Math.PI * 2);
      ctx.fill();
      const waveBase = H * 0.62;
      const drawWave = (yBase: number, amp: number, freq: number, phase: number, color: string, alpha: number) => {
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 4) ctx.lineTo(x, yBase + Math.sin(x * freq + phase) * amp);
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      };
      if (isDark) {
        drawWave(waveBase + 30, 20, 0.016, frame * 0.04, "#082f5a", 0.9);
        drawWave(waveBase + 18, 15, 0.021, frame * 0.055 + 1, "#0a3d70", 0.85);
        drawWave(waveBase + 6, 11, 0.027, frame * 0.048 + 2, "#0d4880", 0.8);
        drawWave(waveBase, 9, 0.033, frame * 0.06 + 3, "#104e88", 0.75);
      } else {
        drawWave(waveBase + 30, 20, 0.016, frame * 0.04, "#93c5fd", 0.9);
        drawWave(waveBase + 18, 15, 0.021, frame * 0.055 + 1, "#60a5fa", 0.85);
        drawWave(waveBase + 6, 11, 0.027, frame * 0.048 + 2, "#3b82f6", 0.8);
        drawWave(waveBase, 9, 0.033, frame * 0.06 + 3, "#2563eb", 0.75);
      }
      if (letter.y + 65 > waveBase && frame > 35) { letter.vy += 0.12; letter.opacity = Math.max(0, letter.opacity - 0.016); letter.scale = Math.max(0.1, letter.scale - 0.007); }
      if (letter.opacity > 0) {
        letter.x += Math.sin(frame * 0.04) * 0.45;
        letter.y += letter.vy;
        ctx.save();
        ctx.translate(letter.x, letter.y);
        ctx.scale(letter.scale, letter.scale);
        ctx.globalAlpha = letter.opacity;
        ctx.shadowColor = isDark ? "rgba(255,245,200,0.3)" : "rgba(255,255,255,0.7)";
        ctx.shadowBlur = 12;
        ctx.fillStyle = colors.paper;
        ctx.beginPath();
        ctx.roundRect?.(-55, -38, 110, 76, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = isDark ? "rgba(200,180,140,0.45)" : "rgba(160,140,100,0.25)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
        for (let ln = 0; ln < 4; ln++) {
          ctx.fillStyle = isDark ? "rgba(170,150,100,0.25)" : "rgba(150,130,80,0.18)";
          ctx.fillRect(-42, -22 + ln * 14, 84, 1);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      for (let r = 0; r < 9; r++) {
        ctx.fillStyle = isDark
          ? `rgba(255,245,190,${0.14 - r * 0.013})`
          : `rgba(255,255,255,${0.2 - r * 0.015})`;
        ctx.fillRect(moonX + Math.sin(frame * 0.05 + r) * 5 - 22, waveBase + 20 + r * 7, 44 - r * 3, 2);
      }
      frame++;
      if (frame < DUR + 20) rafId = requestAnimationFrame(tick);
      else onDone();
    };
    rafId = requestAnimationFrame(tick);

  } else if (ritual === "space") {
    const stars: { x: number; y: number; r: number; t: number }[] = [];
    for (let i = 0; i < 220; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.6, t: Math.random() * Math.PI * 2 });
    const rocket = { x: W / 2, y: H * 0.78, vy: 0 };
    const trail: { x: number; y: number; life: number }[] = [];
    const tick = () => {
      const isDark = getIsDark();
      const colors = getColors();
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      if (isDark) { bg.addColorStop(0, "#000004"); bg.addColorStop(0.6, "#04001c"); bg.addColorStop(1, "#08003a"); }
      else { bg.addColorStop(0, "#eff6ff"); bg.addColorStop(0.6, "#dbeafe"); bg.addColorStop(1, "#bfdbfe"); }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      stars.forEach((s) => {
        s.t += 0.025;
        ctx.fillStyle = isDark
          ? `rgba(255,255,255,${0.35 + Math.sin(s.t) * 0.45})`
          : `rgba(255,255,255,${0.2 + Math.sin(s.t) * 0.2})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      const accel = Math.min(3.5, frame * 0.036);
      rocket.vy -= accel * 0.055;
      rocket.y += rocket.vy;
      rocket.x += Math.sin(frame * 0.022) * 0.9;
      trail.push({ x: rocket.x, y: rocket.y, life: 1 });
      trail.forEach((p) => {
        p.life -= 0.028;
        if (p.life <= 0) return;
        const radius = Math.max(0, 7 * p.life);
        if (radius === 0) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y + 16, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,${Math.floor(80 + 120 * Math.max(0, p.life))},0,${Math.max(0, p.life)})`;
        ctx.fill();
      });
      trail.splice(0, trail.length, ...trail.filter((p) => p.life > 0));
      if (rocket.y > -60) {
        ctx.save();
        ctx.translate(rocket.x, rocket.y);
        ctx.fillStyle = "#e8e8f2";
        ctx.beginPath();
        ctx.moveTo(0, -30); ctx.lineTo(11, 12); ctx.lineTo(-11, 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#c0392b";
        ctx.beginPath();
        ctx.ellipse(0, -20, 8, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(90,90,255,0.55)";
        ctx.fillRect(-11, 6, 22, 6);
        ctx.fillStyle = "rgba(255,175,45,0.85)";
        ctx.beginPath();
        ctx.ellipse(0, 22, 9, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (rocket.y < H * 0.6 && rocket.y > -180) {
          const opa = Math.max(0, (rocket.y + 150) / (H * 0.6));
          ctx.save();
          ctx.translate(rocket.x + 20, rocket.y - 5);
          ctx.rotate(0.28);
          ctx.globalAlpha = opa * 0.9;
          ctx.fillStyle = colors.paper;
          ctx.fillRect(-18, -14, 36, 26);
          ctx.strokeStyle = isDark ? "rgba(180,155,100,0.4)" : "rgba(160,140,100,0.22)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-18, -14, 36, 26);
          for (let ln = 0; ln < 3; ln++) {
            ctx.fillStyle = isDark ? "rgba(150,130,80,0.3)" : "rgba(150,130,80,0.18)";
            ctx.fillRect(-12, -6 + ln * 7, 24, 1);
          }
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      }
      frame++;
      if (frame < DUR) rafId = requestAnimationFrame(tick);
      else onDone();
    };
    rafId = requestAnimationFrame(tick);
  }

  return stop;
}

function getStreak(entries: JournalEntry[]) {
  if (!entries.length) return 0;
  const days = [...new Set(entries.map((e) => e.createdAt.slice(0, 10)))].sort().reverse();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (const day of days) {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    const diff = (cursor.getTime() - d.getTime()) / 86400000;
    if (diff > 1) break;
    streak++;
    cursor = d;
  }
  return streak;
}

export default function JournalPage() {
  const [tab, setTab] = useState<Tab>("journal");
  const [mood, setMood] = useState<Mood | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [journalText, setJournalText] = useState("");
  const [saving, setSaving] = useState(false);
  const [releaseText, setReleaseText] = useState("");
  const [ritual, setRitual] = useState<RitualKey | null>(null);
  const [animPhase, setAnimPhase] = useState<"idle" | "running" | "done">("idle");
  const [affirm, setAffirm] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [filterMood, setFilterMood] = useState<string>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopAnimRef = useRef<(() => void) | null>(null);
  const themeObserverRef = useRef<MutationObserver | null>(null);

  // Track dark mode via MutationObserver so inline styles react to theme toggle
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true);
    try {
      const res = await fetch("/api/journal");
      const data = await res.json();
      setEntries(data.entries || []);
    } catch { /* silent */ }
    finally { setLoadingEntries(false); }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    return () => { themeObserverRef.current?.disconnect(); };
  }, []);

  const saveEntry = async () => {
    if (!journalText.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: journalText, mood, tags }),
      });
      setJournalText("");
      setMood(null);
      setTags([]);
      fetchEntries();
      setTab("past");
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const deleteEntry = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/journal/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch { /* silent */ }
    finally { setDeleting(null); }
  };

  const triggerRelease = () => {
    if (!releaseText.trim() || !ritual) return;
    const r = RITUALS.find((x) => x.key === ritual)!;
    setAffirm(r.affirm);
    setAnimPhase("running");

    setTimeout(() => {
      if (!canvasRef.current) return;

      const startAnim = () => {
        stopAnimRef.current?.();
        if (!canvasRef.current) return;
        stopAnimRef.current = runCanvasAnim(canvasRef.current, ritual!, () => {
          setAnimPhase("done");
          themeObserverRef.current?.disconnect();
        });
      };

      startAnim();

      themeObserverRef.current?.disconnect();
      themeObserverRef.current = new MutationObserver(() => {
        setAnimPhase((phase) => {
          if (phase === "running") startAnim();
          return phase;
        });
      });
      themeObserverRef.current.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }, 50);
  };

  const resetRelease = () => {
    stopAnimRef.current?.();
    themeObserverRef.current?.disconnect();
    setAnimPhase("idle");
    setReleaseText("");
    setRitual(null);
    setAffirm("");
  };

  const wordCount = journalText.trim() ? journalText.trim().split(/\s+/).length : 0;
  const streak = getStreak(entries);
  const filteredEntries = filterMood === "all" ? entries : entries.filter((e) => e.mood === filterMood);

  const todayStr = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
  const todayDow = new Date().getDay();

  // Helper: returns the correct inline style for a mood button
  const getMoodButtonStyle = (m: typeof MOODS[0], isActive: boolean): React.CSSProperties => {
    if (!isActive) return {};
    return isDark ? m.activeDark : m.activeLight;
  };

  // Helper: CSS var-based colours that work without a Tailwind compiler
  const css = {
    // Surfaces
    card:        { background: "rgb(var(--card)/0.85)", border: "1px solid rgb(var(--border))" } as React.CSSProperties,
    cardSubtle:  { background: "rgb(var(--card2))",     border: "1px solid rgb(var(--border))" } as React.CSSProperties,
    // Text
    fg:     { color: "rgb(var(--fg))" }    as React.CSSProperties,
    muted:  { color: "rgb(var(--muted))" } as React.CSSProperties,
    muted2: { color: "rgb(var(--muted2))" } as React.CSSProperties,
    // Border only
    border: { borderColor: "rgb(var(--border))" } as React.CSSProperties,
    // Interactive – default (unselected) pill
    pillDefault: {
      background: "rgb(var(--card))",
      border: "1px solid rgb(var(--border))",
      color: "rgb(var(--muted))",
    } as React.CSSProperties,
    // Tag selected
    tagActive: {
      background: isDark ? "rgba(37,99,235,0.2)"  : "#eff6ff",
      border:     isDark ? "1px solid #1e40af"     : "1px solid #93c5fd",
      color:      isDark ? "#93c5fd"               : "#1e40af",
    } as React.CSSProperties,
    // Primary action button
    primaryBtn: {
      background: isDark ? "#ffffff" : "#111827",
      color:      isDark ? "#111827" : "#ffffff",
    } as React.CSSProperties,
    // Secondary/ghost button
    ghostBtn: {
      background: "transparent",
      border: "1px solid rgb(var(--border))",
      color: "rgb(var(--muted))",
    } as React.CSSProperties,
    // Streak day – filled
    streakFilled: {
      background: isDark ? "rgba(6,78,59,0.6)"  : "#d1fae5",
      color:      isDark ? "#6ee7b7"             : "#065f46",
    } as React.CSSProperties,
    // Streak day – empty
    streakEmpty: {
      background: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6",
      color:      isDark ? "rgba(255,255,255,0.2)"  : "#9ca3af",
    } as React.CSSProperties,
    // Release ritual card selected
    ritualActive: {
      background: isDark ? "rgba(255,255,255,0.1)" : "#f9fafb",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.3)" : "#9ca3af"}`,
    } as React.CSSProperties,
    ritualIdle: {
      background: isDark ? "transparent" : "#ffffff",
      border: "1px solid rgb(var(--border))",
    } as React.CSSProperties,

    // Amber release banner
    releaseBanner: {
      background: isDark ? "linear-gradient(135deg,#1b1710,#18110c)" : "linear-gradient(135deg,#fffbeb,#fff7ed)",
      border: isDark ? "1px solid rgba(180,120,30,0.3)" : "1px solid rgba(251,191,36,0.5)",
    } as React.CSSProperties,
    // Select element
    select: {
      background: isDark ? "#111318" : "#ffffff",
      border: "1px solid rgb(var(--border))",
      color: "rgb(var(--fg))",
    } as React.CSSProperties,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isDark
          ? "linear-gradient(to bottom,#09090b,#0f1115,#09090b)"
          : "linear-gradient(to bottom,#ffffff,rgba(248,250,252,0.7),#ffffff)",
        transition: "background 0.2s",
      }}
    >
      <div style={{ maxWidth: 768, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* ── Header ── */}
        <div style={{ ...css.card, borderRadius: 24, padding: "1.5rem", marginBottom: "2rem", backdropFilter: "blur(20px)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                borderRadius: 9999, border: "1px solid rgb(var(--border))",
                background: "rgb(var(--card2))", padding: "4px 12px",
                fontSize: 12, color: "rgb(var(--muted))", marginBottom: 12,
              }}>
                <span>✨</span>
                <span>Your Private Space</span>
              </div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.02em", ...css.fg, margin: 0 }}>My Space</h1>
              <p style={{ marginTop: 8, fontSize: 14, ...css.muted, maxWidth: 480, lineHeight: 1.6 }}>
                A private corner for your thoughts — write, reflect, and let go.
              </p>
            </div>

            <div style={{ ...css.cardSubtle, borderRadius: 16, padding: "12px 16px", minWidth: 150 }}>
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", ...css.muted2, margin: "0 0 4px" }}>Current streak</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 600, ...css.fg }}>{streak}</span>
                <span style={{ fontSize: 14, ...css.muted }}>days</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Constellation Sky ── ADD THIS HERE ── */}
        {entries.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <p style={{ fontSize: 12, ...css.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              ✦ Your constellation sky
            </p>
            <ConstellationSky entries={entries} />
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{
            display: "flex", width: "100%", borderRadius: 16,
            border: "1px solid rgb(var(--border))",
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
            backdropFilter: "blur(12px)", padding: 6,
          }}>
            {(["journal", "release", "past"] as Tab[]).map((t) => {
              const active = tab === t;
              const label = t === "journal" ? "Daily Journal" : t === "release" ? "Release & Let Go" : "Past Entries";
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, borderRadius: 12, padding: "10px 16px",
                    fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer",
                    transition: "all 0.15s",
                    background: active ? (isDark ? "#ffffff" : "#111827") : "transparent",
                    color: active ? (isDark ? "#111827" : "#ffffff") : "rgb(var(--muted))",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── JOURNAL TAB ── */}
        {tab === "journal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Date + streak row */}
            <div style={{ ...css.card, borderRadius: 24, padding: "20px 24px", backdropFilter: "blur(20px)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 600, ...css.fg, margin: 0 }}>{todayStr}</p>
                  <p style={{ fontSize: 14, ...css.muted, marginTop: 4 }}>How was your day?</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, ...css.cardSubtle, borderRadius: 16, padding: "8px 12px" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {weekDays.map((d, i) => {
                      const filled = i <= todayDow && streak > todayDow - i;
                      return (
                        <div
                          key={i}
                          style={{
                            width: 28, height: 28, borderRadius: 8,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 600,
                            ...(filled ? css.streakFilled : css.streakEmpty),
                          }}
                        >
                          {d}
                        </div>
                      );
                    })}
                  </div>
                  <span style={{ fontSize: 12, ...css.muted, marginLeft: 4 }}>{streak}d</span>
                </div>
              </div>
            </div>

            {/* Mood selector */}
            <div style={{ ...css.card, borderRadius: 24, padding: "20px 24px", backdropFilter: "blur(20px)" }}>
              <p style={{ fontSize: 14, fontWeight: 500, ...css.fg, margin: "0 0 12px" }}>How are you feeling?</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {MOODS.map((m) => {
                  const isActive = mood === m.key;
                  const activeStyle = getMoodButtonStyle(m, isActive);
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMood(mood === m.key ? null : m.key)}
                      style={{
                        padding: "8px 14px", borderRadius: 9999,
                        fontSize: 14, cursor: "pointer",
                        border: "1px solid",
                        transition: "all 0.15s",
                        ...(isActive ? activeStyle : {
                          background: "transparent",
                          borderColor: "rgb(var(--border))",
                          color: "rgb(var(--muted))",
                        }),
                      }}
                    >
                      <span style={{ marginRight: 6 }}>{m.emoji}</span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Journal textarea */}
            <div style={{ ...css.card, borderRadius: 28, backdropFilter: "blur(20px)", overflow: "hidden" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 24px", borderBottom: "1px solid rgb(var(--border))",
              }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, ...css.fg, margin: 0 }}>Today&apos;s page</p>
                  <p style={{ fontSize: 12, ...css.muted, marginTop: 2 }}>Write freely. Nothing has to be perfect.</p>
                </div>
                <div style={{ ...css.cardSubtle, borderRadius: 9999, padding: "4px 12px", fontSize: 12, ...css.muted }}>
                  {wordCount} words
                </div>
              </div>
              <div style={{
                backgroundImage: isDark ? "linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)" : "linear-gradient(to bottom,rgba(0,0,0,0.04) 1px,transparent 1px)",
                backgroundSize: "100% 2rem",
                backgroundColor: isDark ? "#1b1915" : "#fdfaf4",
                padding: "20px 24px",
              }}>
                <textarea
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder="Write anything — your thoughts, your wins, your frustrations. No one else sees this."
                  style={{
                    width: "100%", minHeight: 320, background: "transparent",
                    border: "none", outline: "none", resize: "none",
                    color: isDark ? "#e5e7eb" : "#1f2937",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: 15, lineHeight: "2rem", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Tags */}
            <div style={{ ...css.card, borderRadius: 24, padding: "20px 24px", backdropFilter: "blur(20px)" }}>
              <p style={{ fontSize: 14, fontWeight: 500, ...css.fg, margin: "0 0 12px" }}>Tag your day</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {TAGS.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                      style={{
                        padding: "6px 12px", borderRadius: 9999,
                        fontSize: 12, fontWeight: 500, cursor: "pointer",
                        border: "1px solid", transition: "all 0.15s",
                        ...(active ? css.tagActive : {
                          background: "transparent",
                          borderColor: "rgb(var(--border))",
                          color: "rgb(var(--muted))",
                        }),
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={saveEntry}
                disabled={!journalText.trim() || saving}
                style={{
                  padding: "12px 20px", borderRadius: 16, fontSize: 14, fontWeight: 600,
                  border: "none", cursor: journalText.trim() ? "pointer" : "not-allowed",
                  opacity: !journalText.trim() || saving ? 0.4 : 1,
                  transition: "opacity 0.15s",
                  ...css.primaryBtn,
                }}
              >
                {saving ? "Saving..." : "Save entry"}
              </button>
              <button
                onClick={() => setTab("release")}
                style={{ padding: "12px 20px", borderRadius: 16, fontSize: 14, fontWeight: 500, cursor: "pointer", ...css.ghostBtn }}
              >
                Need to vent instead?
              </button>
            </div>
          </div>
        )}

        {/* ── RELEASE TAB ── */}
        {tab === "release" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {animPhase === "idle" && (
              <>
                <div style={{ ...css.releaseBanner, borderRadius: 24, padding: "20px 24px" }}>
                  <p style={{ fontSize: 14, ...css.fg, lineHeight: 1.6, margin: 0 }}>
                    Sometimes you just need to get it out. Write what&apos;s weighing on you — no filter, no judgement. Then choose a ritual to release it.{" "}
                    <strong style={{ ...css.fg }}>Whatever you write here is never saved.</strong>
                  </p>
                </div>

                {/* Release textarea */}
                <div style={{ ...css.card, borderRadius: 28, backdropFilter: "blur(20px)", overflow: "hidden" }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 24px", borderBottom: "1px solid rgb(var(--border))",
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, ...css.fg, margin: 0 }}>Let it out</p>
                      <p style={{ fontSize: 12, ...css.muted, marginTop: 2 }}>This space is for release, not for keeping.</p>
                    </div>
                  </div>
                  <div style={{
                    backgroundImage: isDark ? "linear-gradient(to bottom,rgba(255,255,255,0.04) 1px,transparent 1px)" : "linear-gradient(to bottom,rgba(0,0,0,0.04) 1px,transparent 1px)",
                    backgroundSize: "100% 2rem",
                    backgroundColor: isDark ? "#1b1915" : "#fdfaf4",
                    padding: "20px 24px",
                  }}>
                    <p style={{ fontSize: 14, marginBottom: 12, ...css.muted, fontFamily: "Georgia, serif" }}>
                      Dear [situation / feeling / name],
                    </p>
                    <textarea
                      value={releaseText}
                      onChange={(e) => setReleaseText(e.target.value)}
                      placeholder="Write whatever you feel... anger, exhaustion, disappointment. Let it all out."
                      style={{
                        width: "100%", minHeight: 280, background: "transparent",
                        border: "none", outline: "none", resize: "none",
                        color: isDark ? "#e5e7eb" : "#1f2937",
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: 15, lineHeight: "2rem", boxSizing: "border-box",
                      }}
                    />
                    <p style={{
                      textAlign: "right", fontSize: 14, marginTop: 12,
                      color: isDark ? "#8a7a58" : "#b0a080",
                      fontFamily: "Georgia, serif",
                    }}>
                      — Me, learning to let go.
                    </p>
                  </div>
                </div>

                {/* Ritual picker */}
                <div style={{ ...css.card, borderRadius: 24, padding: "20px 24px", backdropFilter: "blur(20px)" }}>
                  <p style={{ fontSize: 14, fontWeight: 500, ...css.fg, margin: "0 0 16px" }}>Choose your release ritual</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                    {RITUALS.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => setRitual(ritual === r.key ? null : r.key)}
                        style={{
                          padding: 16, borderRadius: 16, textAlign: "center", cursor: "pointer",
                          transition: "all 0.15s",
                          ...(ritual === r.key ? css.ritualActive : css.ritualIdle),
                        }}
                      >
                        <span style={{ fontSize: 30, display: "block", marginBottom: 8 }}>{r.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, display: "block", ...css.fg }}>{r.label}</span>
                        <span style={{ fontSize: 11, display: "block", marginTop: 4, lineHeight: 1.4, ...css.muted }}>{r.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={triggerRelease}
                  disabled={!releaseText.trim() || !ritual}
                  style={{
                    width: "100%", padding: "14px 0", borderRadius: 16, fontSize: 14, fontWeight: 600,
                    border: "none", cursor: releaseText.trim() && ritual ? "pointer" : "not-allowed",
                    opacity: !releaseText.trim() || !ritual ? 0.4 : 1,
                    transition: "opacity 0.15s",
                    ...css.primaryBtn,
                  }}
                >
                  Release it →
                </button>
              </>
            )}

            {(animPhase === "running" || animPhase === "done") && (
              <div style={{ ...css.card, borderRadius: 28, padding: "20px 24px", backdropFilter: "blur(20px)", textAlign: "center" }}>
                {ritual && (
                  <p style={{ fontSize: 14, ...css.muted, marginBottom: 16 }}>
                    {RITUALS.find((r) => r.key === ritual)?.animLabel}
                  </p>
                )}
                <div style={{
                  borderRadius: 16, overflow: "hidden",
                  border: "1px solid rgb(var(--border))",
                  background: "#000",
                }}>
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={300}
                    style={{ width: "100%", display: "block", maxHeight: 300 }}
                  />
                </div>

                {animPhase === "running" && ritual && (
                  <>
                    <p style={{ fontSize: 18, fontWeight: 600, ...css.fg, marginTop: 20 }}>
                      {RITUALS.find((r) => r.key === ritual)?.msg}
                    </p>
                    <p style={{ fontSize: 14, ...css.muted, marginTop: 4 }}>
                      {RITUALS.find((r) => r.key === ritual)?.sub}
                    </p>
                  </>
                )}

                {animPhase === "done" && (
                  <>
                    <div style={{
                      marginTop: 24, padding: "20px 24px", textAlign: "left",
                      ...css.cardSubtle, borderRadius: 16,
                    }}>
                      <p style={{ fontSize: 14, lineHeight: 1.8, ...css.fg, fontStyle: "italic", fontFamily: "Georgia, serif", margin: 0 }}>
                        {affirm}
                      </p>
                    </div>
                    <button
                      onClick={resetRelease}
                      style={{ marginTop: 20, padding: "12px 24px", borderRadius: 16, fontSize: 14, fontWeight: 500, cursor: "pointer", ...css.ghostBtn }}
                    >
                      Write another →
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PAST ENTRIES TAB ── */}
        {tab === "past" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...css.card, borderRadius: 24, padding: "20px 24px", backdropFilter: "blur(20px)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, ...css.fg, margin: 0 }}>Your journal archive</p>
                  <p style={{ fontSize: 14, ...css.muted, marginTop: 4 }}>
                    {entries.length} {entries.length === 1 ? "entry" : "entries"} · {streak} day streak
                  </p>
                </div>
                <select
                  value={filterMood}
                  onChange={(e) => setFilterMood(e.target.value)}
                  style={{ fontSize: 14, padding: "10px 14px", borderRadius: 12, outline: "none", cursor: "pointer", ...css.select }}
                >
                  <option value="all">All moods</option>
                  {MOODS.map((m) => (
                    <option key={m.key} value={m.key}>{m.emoji} {m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingEntries ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 112, borderRadius: 24, background: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", animation: "pulse 1.5s infinite" }} />
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div style={{
                borderRadius: 24, border: "1px dashed rgb(var(--border))",
                background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)",
                padding: "3rem", textAlign: "center",
              }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>📖</p>
                <p style={{ fontSize: 16, fontWeight: 500, ...css.fg }}>No entries yet</p>
                <p style={{ fontSize: 14, ...css.muted, marginTop: 8 }}>Start writing today.</p>
                <button
                  onClick={() => setTab("journal")}
                  style={{ marginTop: 20, fontSize: 14, fontWeight: 500, background: "none", border: "none", cursor: "pointer", color: isDark ? "#60a5fa" : "#2563eb", textDecoration: "underline" }}
                >
                  Write your first entry →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {filteredEntries.map((entry) => {
                  const moodObj = MOODS.find((m) => m.key === entry.mood);
                  const date = new Date(entry.createdAt).toLocaleDateString("en-GB", {
                    weekday: "long", day: "numeric", month: "long",
                  });

                  return (
                    <div
                      key={entry.id}
                      style={{ ...css.card, borderRadius: 24, padding: "20px 24px", backdropFilter: "blur(20px)" }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                            <p style={{ fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.14em", ...css.muted2, margin: 0 }}>
                              {date}
                            </p>
                            {moodObj && (
                              <span style={{
                                padding: "3px 10px", borderRadius: 9999,
                                fontSize: 11, fontWeight: 500, border: "1px solid",
                                ...(isDark ? moodObj.activeDark : moodObj.activeLight),
                              }}>
                                {moodObj.emoji} {moodObj.label}
                              </span>
                            )}
                          </div>
                          <p style={{
                            fontSize: 14, lineHeight: 1.75, ...css.fg,
                            fontFamily: "Georgia, serif", margin: 0,
                            display: "-webkit-box", WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical" as const, overflow: "hidden",
                          }}>
                            {entry.body}
                          </p>
                          {entry.tags.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
                              {entry.tags.map((tag) => (
                                <span
                                  key={tag}
                                  style={{
                                    padding: "4px 10px", borderRadius: 9999, fontSize: 11,
                                    border: "1px solid rgb(var(--border))",
                                    background: isDark ? "rgba(255,255,255,0.05)" : "#f9fafb",
                                    ...css.muted,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          disabled={deleting === entry.id}
                          style={{
                            fontSize: 12, fontWeight: 500, background: "none", border: "none",
                            cursor: "pointer", flexShrink: 0, padding: "4px 0",
                            color: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = isDark ? "rgba(255,255,255,0.3)" : "#9ca3af")}
                        >
                          {deleting === entry.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}