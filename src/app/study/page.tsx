"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles, Wand2, CalendarClock, BookOpen, Brain,
  ArrowRight, Plus, Zap, Target, ListChecks, Send, Bot, GraduationCap,
  AlertCircle, FileText, FlipHorizontal2, Upload,
} from "lucide-react";

// ── Global Animations ──────────────────────────────────────────────────────
const GLOBAL_ANIM = `
@keyframes stepFadeIn {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes labelFadeIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes msgSlideIn {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
  40%           { transform: scale(1); opacity: 1; }
}
@keyframes studentEnter {
  0%   { transform: translateX(-160px) rotate(-4deg); opacity: 0; }
  60%  { opacity: 1; }
  85%  { transform: translateX(4px) rotate(1deg); }
  100% { transform: translateX(0px) rotate(0deg); opacity: 1; }
}
@keyframes robotEnter {
  0%   { transform: translateX(160px) rotate(4deg); opacity: 0; }
  60%  { opacity: 1; }
  85%  { transform: translateX(-4px) rotate(-1deg); }
  100% { transform: translateX(0px) rotate(0deg); opacity: 1; }
}
@keyframes legSwingL {
  0%,100% { transform: rotate(-22deg); }
  50%     { transform: rotate(22deg); }
}
@keyframes legSwingR {
  0%,100% { transform: rotate(22deg); }
  50%     { transform: rotate(-22deg); }
}
@keyframes robotLegL {
  0%,100% { transform: rotate(-18deg); }
  50%     { transform: rotate(18deg); }
}
@keyframes robotLegR {
  0%,100% { transform: rotate(18deg); }
  50%     { transform: rotate(-18deg); }
}
@keyframes armSwingL {
  0%,100% { transform: rotate(18deg); }
  50%     { transform: rotate(-18deg); }
}
@keyframes armSwingR {
  0%,100% { transform: rotate(-18deg); }
  50%     { transform: rotate(18deg); }
}
@keyframes bodyBob {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-3px); }
}
@keyframes floatIdle {
  0%,100% { transform: translateY(0px) rotate(-1deg); }
  50%     { transform: translateY(-8px) rotate(1deg); }
}
@keyframes idleSway {
  0%,100% { transform: rotate(-1deg) translateY(0px); }
  50%     { transform: rotate(1deg) translateY(-2px); }
}
@keyframes bubblePop {
  0%   { opacity: 0; transform: scale(0.72) translateY(8px); }
  65%  { transform: scale(1.06) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes eyeBlink {
  0%,88%,100% { transform: scaleY(1); }
  92%,95%     { transform: scaleY(0.06); }
}
@keyframes glowPulse {
  0%,100% { opacity: 0.55; }
  50%     { opacity: 1; }
}
@keyframes pathDotIn {
  from { opacity: 0; transform: scaleX(0); }
  to   { opacity: 1; transform: scaleX(1); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes borderSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes cardPop {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes heroBadgePop {
  0%   { opacity: 0; transform: scale(0.8) translateY(-8px); }
  70%  { transform: scale(1.04); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes titleReveal {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes subtleFloat {
  0%,100% { transform: translateY(0px) rotate(0deg); }
  33%     { transform: translateY(-4px) rotate(0.5deg); }
  66%     { transform: translateY(-2px) rotate(-0.5deg); }
}
@keyframes orb1 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(40px,-30px) scale(1.08); }
  66%     { transform: translate(-20px,20px) scale(0.95); }
}
@keyframes orb2 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(-50px,25px) scale(0.92); }
  66%     { transform: translate(30px,-40px) scale(1.06); }
}
@keyframes orb3 {
  0%,100% { transform: translate(0,0) scale(1); }
  50%     { transform: translate(20px,30px) scale(1.04); }
}
@keyframes scanLine {
  from { transform: translateY(-100%); }
  to   { transform: translateY(100vh); }
}
@keyframes statCountUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes chipPop {
  from { opacity: 0; transform: scale(0.85) translateY(4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes heroGradient {
  0%,100% { background-position: 0% 50%; }
  50%     { background-position: 100% 50%; }
}
`;

// ── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text: string;
  links?: { label: string; href: string; icon: "hub" | "plan" | "upload" }[];
}

// ── AI Responses ───────────────────────────────────────────────────────────
const AI_RESPONSES = {
  stressed:   {
    text: "Take a breath — you've got this! 3 days is plenty if you're strategic. Focus on short daily sessions using active recall rather than cramming. Start with the hardest topics first while your mind is fresh, then revisit easier material to build confidence.",
    links: [
      { label: "Generate a Study Plan", href: "/study/plan",       icon: "plan"   as const },
      { label: "Open Study Hub",        href: "/study/hub",        icon: "hub"    as const },
    ],
  },
  plan:       {
    text: "Smart move going with a study plan! Break your time into daily blocks: morning for new material, afternoon for active recall, evening for light review. Assign each day a specific topic and tick it off as you go — consistency beats marathon sessions every time.",
    links: [
      { label: "Generate a Study Plan", href: "/study/plan",       icon: "plan"   as const },
    ],
  },
  flashcards: {
    text: "Active recall is one of the most research-backed study methods out there — it improves long-term retention by up to 50% compared to passive re-reading. The key is to test yourself before you feel ready. Struggle a little, then check. That's where the learning happens.",
    links: [
      { label: "Open Study Hub",        href: "/study/hub",        icon: "hub"    as const },
      { label: "Upload Notes",          href: "/study/hub/upload", icon: "upload" as const },
    ],
  },
  notes:      {
    text: "Once your notes are uploaded, the AI generates a summary, pulls out key concepts, and builds flashcards and a quiz automatically. Start with the summary to get the big picture, then drill the flashcards until you can answer without peeking.",
    links: [
      { label: "Upload Notes",          href: "/study/hub/upload", icon: "upload" as const },
      { label: "Open Study Hub",        href: "/study/hub",        icon: "hub"    as const },
    ],
  },
  hub:        {
    text: "Study Hub is your all-in-one command centre. Upload a PDF or paste your notes and within seconds you'll get an AI summary, key concept breakdown, auto-generated flashcards, and a practice quiz — no manual setup needed. It's like having a study buddy who never gets tired.",
    links: [
      { label: "Open Study Hub",        href: "/study/hub",        icon: "hub"    as const },
      { label: "Upload Notes",          href: "/study/hub/upload", icon: "upload" as const },
    ],
  },
  default_a:  {
    text: "The best combo is notes + active recall. Upload your material, let the AI generate flashcards, then quiz yourself daily. Pair that with a structured study plan so you always know what to cover next — together they handle both what to study and when.",
    links: [
      { label: "Upload Notes",          href: "/study/hub/upload", icon: "upload" as const },
      { label: "Generate a Study Plan", href: "/study/plan",       icon: "plan"   as const },
    ],
  },
  default_b:  {
    text: "Turn your notes into practice tests and work through them every day. Spacing your reviews out (instead of cramming) locks in memory far more effectively. Even 20 focused minutes daily beats a 3-hour session the night before.",
    links: [
      { label: "Open Study Hub",        href: "/study/hub",        icon: "hub"    as const },
      { label: "Generate a Study Plan", href: "/study/plan",       icon: "plan"   as const },
    ],
  },
  default_c:  {
    text: "The most effective approach is testing yourself rather than re-reading. After each study session, close your notes and try to recall the key points from memory. Anything you can't recall is exactly what needs more attention — that's where to focus next.",
    links: [
      { label: "Open Study Hub",        href: "/study/hub",        icon: "hub"    as const },
      { label: "Upload Notes",          href: "/study/hub/upload", icon: "upload" as const },
    ],
  },
};

function getAIResponse(msg: string): { text: string; links?: { label: string; href: string; icon: "hub" | "plan" | "upload" }[] } {
  const m = msg.toLowerCase();
  if (m.includes("stress") || m.includes("3 day") || m.includes("tomorrow") || m.includes("panic") || m.includes("worried")) return AI_RESPONSES.stressed;
  if (m.includes("plan") || m.includes("schedul") || m.includes("organiz") || m.includes("timetable")) return AI_RESPONSES.plan;
  if (m.includes("flash") || m.includes("recall") || m.includes("quiz") || m.includes("memoriz") || m.includes("remember")) return AI_RESPONSES.flashcards;
  if (m.includes("upload") || m.includes("just upload") || m.includes("pdf")) return AI_RESPONSES.notes;
  if (m.includes("hub") || m.includes("summary") || m.includes("concept") || m.includes("notes")) return AI_RESPONSES.hub;
  const defs = [AI_RESPONSES.default_a, AI_RESPONSES.default_b, AI_RESPONSES.default_c];
  return defs[Math.floor(Math.random() * defs.length)];
}

// ── Floating Particles Canvas ──────────────────────────────────────────────
function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const particles: {
      x: number; y: number; vx: number; vy: number;
      r: number; alpha: number; pulse: number; pulseSpeed: number;
      shape: "circle" | "ring" | "dot" | "cross" | "star";
      hue: number;
    }[] = [];

    const rockets: {
      x: number; y: number; angle: number; speed: number; size: number;
      alpha: number; trailPoints: { x: number; y: number }[];
      wobble: number; wobbleSpeed: number; hue: number;
    }[] = [];

    const astronauts: {
      cx: number; cy: number;
      orbitRx: number; orbitRy: number;
      phase: number;
      orbitSpeed: number;
      bobPhase: number;
      bobSpeed: number;
      size: number;
      alpha: number;
      rotation: number;
      rotSpeed: number;
    }[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const hues = [220, 260, 190, 160, 330];
    for (let i = 0; i < 65; i++) {
      const shapes = ["circle", "ring", "dot", "cross", "star"] as const;
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 3 + 1,
        alpha: Math.random() * 0.28 + 0.06,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.018,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        hue: hues[Math.floor(Math.random() * hues.length)],
      });
    }

    function spawnRocket() {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0, angle = 0;
      if (side === 0) { x = -60; y = Math.random() * canvas!.height; angle = (Math.random() * 0.5 - 0.25); }
      else if (side === 1) { x = canvas!.width + 60; y = Math.random() * canvas!.height; angle = Math.PI + (Math.random() * 0.5 - 0.25); }
      else if (side === 2) { x = Math.random() * canvas!.width; y = -60; angle = Math.PI / 2 + (Math.random() * 0.5 - 0.25); }
      else { x = Math.random() * canvas!.width; y = canvas!.height + 60; angle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25); }
      rockets.push({ x, y, angle, speed: 0.9 + Math.random() * 1.0, size: 30 + Math.random() * 24, alpha: 0.3 + Math.random() * 0.25, trailPoints: [], wobble: 0, wobbleSpeed: 0.016 + Math.random() * 0.012, hue: hues[Math.floor(Math.random() * hues.length)] });
    }
    for (let i = 0; i < 3; i++) spawnRocket();

    const astroSeeds = [
      { cx: 0.08, cy: 0.18 },
      { cx: 0.91, cy: 0.25 },
      { cx: 0.85, cy: 0.72 },
      { cx: 0.12, cy: 0.78 },
    ];
    for (const s of astroSeeds) {
      astronauts.push({
        cx: s.cx, cy: s.cy,
        orbitRx: 0.032 + Math.random() * 0.02,
        orbitRy: 0.018 + Math.random() * 0.015,
        phase: Math.random() * Math.PI * 2,
        orbitSpeed: 0.003 + Math.random() * 0.003,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 0.007 + Math.random() * 0.005,
        size: 28 + Math.random() * 14,
        alpha: 0.22 + Math.random() * 0.18,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.005,
      });
    }

    function isDark() { return document.documentElement.classList.contains("dark"); }

    function drawStar(x: number, y: number, r: number, col: string, alpha: number) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = col;
      ctx!.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const ra = (i * 4 * Math.PI) / 5 - Math.PI / 2 + (2 * Math.PI) / 10;
        if (i === 0) ctx!.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx!.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx!.lineTo(Math.cos(ra) * r * 0.45, Math.sin(ra) * r * 0.45);
      }
      ctx!.closePath();
      ctx!.fill();
      ctx!.restore();
    }

    function drawRocket(x: number, y: number, angle: number, size: number, alpha: number, hue: number, dark: boolean) {
      const col = dark
        ? `hsla(${hue},80%,75%,${alpha})`
        : `hsla(${hue},70%,50%,${alpha})`;
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(angle + Math.PI / 2);
      ctx!.globalAlpha = alpha;

      const aura = ctx!.createRadialGradient(0, 0, 0, 0, 0, size * 2);
      aura.addColorStop(0, `hsla(${hue},80%,65%,0.1)`);
      aura.addColorStop(1, `hsla(${hue},80%,65%,0)`);
      ctx!.beginPath(); ctx!.arc(0, 0, size * 2, 0, Math.PI * 2);
      ctx!.fillStyle = aura; ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(0, -size);
      ctx!.bezierCurveTo(size * 0.42, -size * 0.5, size * 0.42, size * 0.28, 0, size * 0.52);
      ctx!.bezierCurveTo(-size * 0.42, size * 0.28, -size * 0.42, -size * 0.5, 0, -size);
      ctx!.fillStyle = col;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(0, -size * 0.22, size * 0.24, 0, Math.PI * 2);
      ctx!.fillStyle = dark ? `hsla(${hue},90%,85%,${alpha * 1.4})` : `hsla(${hue},70%,85%,${alpha * 1.4})`;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(-size * 0.38, size * 0.18);
      ctx!.lineTo(-size * 0.78, size * 0.65);
      ctx!.lineTo(-size * 0.12, size * 0.48);
      ctx!.closePath();
      ctx!.fillStyle = `hsla(${hue},60%,55%,${alpha * 0.55})`;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(size * 0.38, size * 0.18);
      ctx!.lineTo(size * 0.78, size * 0.65);
      ctx!.lineTo(size * 0.12, size * 0.48);
      ctx!.closePath();
      ctx!.fillStyle = `hsla(${hue},60%,55%,${alpha * 0.55})`;
      ctx!.fill();

      const fl = ctx!.createRadialGradient(0, size * 0.62, 0, 0, size * 1.0, size * 0.55);
      fl.addColorStop(0, `rgba(255,225,50,${alpha * 1.2})`);
      fl.addColorStop(0.4, `rgba(255,110,20,${alpha * 0.8})`);
      fl.addColorStop(1, `rgba(255,50,0,0)`);
      ctx!.beginPath();
      ctx!.ellipse(0, size * 0.82, size * 0.24, size * 0.52, 0, 0, Math.PI * 2);
      ctx!.fillStyle = fl; ctx!.fill();

      ctx!.restore();
    }

    function drawAstronaut(x: number, y: number, size: number, alpha: number, rotation: number, hue: number, dark: boolean) {
      const col = `hsla(${hue},70%,${dark ? 72 : 48}%,${alpha})`;
      const col2 = `hsla(${hue},60%,${dark ? 60 : 38}%,${alpha})`;
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(rotation);
      ctx!.globalAlpha = alpha;
      const s = size;

      ctx!.beginPath();
      ctx!.ellipse(0, s * 0.12, s * 0.38, s * 0.44, 0, 0, Math.PI * 2);
      ctx!.fillStyle = col;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.arc(0, -s * 0.35, s * 0.3, 0, Math.PI * 2);
      ctx!.fillStyle = col;
      ctx!.fill();
      ctx!.strokeStyle = col2;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.ellipse(0, -s * 0.35, s * 0.18, s * 0.14, 0, 0, Math.PI * 2);
      ctx!.fillStyle = `hsla(${hue},80%,${dark ? 82 : 62}%,${alpha * 0.95})`;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.ellipse(-s * 0.06, -s * 0.4, s * 0.05, s * 0.035, -0.5, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(-s * 0.35, -s * 0.05);
      ctx!.bezierCurveTo(-s * 0.65, s * 0.0, -s * 0.7, s * 0.3, -s * 0.5, s * 0.42);
      ctx!.lineWidth = s * 0.16;
      ctx!.strokeStyle = col;
      ctx!.lineCap = "round";
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.moveTo(s * 0.35, -s * 0.05);
      ctx!.bezierCurveTo(s * 0.65, s * 0.0, s * 0.7, s * 0.3, s * 0.5, s * 0.42);
      ctx!.lineWidth = s * 0.16;
      ctx!.strokeStyle = col;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.moveTo(-s * 0.2, s * 0.52);
      ctx!.bezierCurveTo(-s * 0.25, s * 0.75, -s * 0.35, s * 0.85, -s * 0.3, s * 0.95);
      ctx!.lineWidth = s * 0.15;
      ctx!.strokeStyle = col2;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.moveTo(s * 0.2, s * 0.52);
      ctx!.bezierCurveTo(s * 0.25, s * 0.75, s * 0.35, s * 0.85, s * 0.3, s * 0.95);
      ctx!.lineWidth = s * 0.15;
      ctx!.strokeStyle = col2;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.roundRect(-s * 0.14, -s * 0.05, s * 0.28, s * 0.22, s * 0.04);
      ctx!.fillStyle = `hsla(${hue},70%,${dark ? 78 : 55}%,${alpha * 0.75})`;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(s * 0.38, s * 0.12);
      ctx!.bezierCurveTo(s * 0.6, -s * 0.1, s * 0.8, s * 0.2, s * 0.9, s * 0.05);
      ctx!.strokeStyle = col;
      ctx!.lineWidth = 0.8;
      ctx!.lineCap = "round";
      ctx!.setLineDash([2, 3]);
      ctx!.stroke();
      ctx!.setLineDash([]);

      ctx!.restore();
    }

    let rocketSpawnTimer = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t++;
      const dark = isDark();

      for (const p of particles) {
        p.pulse += p.pulseSpeed;
        const ga = p.alpha * (0.55 + 0.45 * Math.sin(p.pulse));
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        const col = dark
          ? `hsla(${p.hue},75%,75%,${ga})`
          : `hsla(${p.hue},65%,48%,${ga})`;

        ctx.save();
        if (p.shape === "star") {
          drawStar(p.x, p.y, p.r * 2.2, col, ga * 1.4);
        } else if (p.shape === "dot") {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.fill();
        } else if (p.shape === "ring") {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = col; ctx.lineWidth = 0.9; ctx.stroke();
        } else if (p.shape === "cross") {
          const ss = p.r * 2;
          ctx.strokeStyle = col; ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.moveTo(p.x - ss, p.y); ctx.lineTo(p.x + ss, p.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p.x, p.y - ss); ctx.lineTo(p.x, p.y + ss); ctx.stroke();
        } else {
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          gr.addColorStop(0, col);
          gr.addColorStop(1, `hsla(${p.hue},75%,75%,0)`);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
          ctx.fillStyle = gr; ctx.fill();
        }
        ctx.restore();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            const hue = (particles[i].hue + particles[j].hue) / 2;
            ctx.strokeStyle = dark
              ? `hsla(${hue},70%,70%,${(1 - dist / 100) * 0.06})`
              : `hsla(${hue},60%,45%,${(1 - dist / 100) * 0.04})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }

      rocketSpawnTimer++;
      if (rocketSpawnTimer > 280 && rockets.length < 4) { spawnRocket(); rocketSpawnTimer = 0; }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.wobble += r.wobbleSpeed;
        const wa = r.angle + Math.sin(r.wobble) * 0.05;
        r.x += Math.cos(wa) * r.speed;
        r.y += Math.sin(wa) * r.speed;
        r.trailPoints.unshift({ x: r.x, y: r.y });
        if (r.trailPoints.length > 55) r.trailPoints.pop();

        for (let tt = 0; tt < r.trailPoints.length - 1; tt++) {
          const prog = 1 - tt / r.trailPoints.length;
          ctx.beginPath();
          ctx.moveTo(r.trailPoints[tt].x, r.trailPoints[tt].y);
          ctx.lineTo(r.trailPoints[tt + 1].x, r.trailPoints[tt + 1].y);
          ctx.strokeStyle = dark
            ? `hsla(${r.hue},80%,72%,${prog * r.alpha * 0.32})`
            : `hsla(${r.hue},70%,48%,${prog * r.alpha * 0.28})`;
          ctx.lineWidth = prog * 2.8;
          ctx.stroke();
        }

        drawRocket(r.x, r.y, wa, r.size, r.alpha, r.hue, dark);

        const margin = 160;
        if (r.x < -margin || r.x > canvas.width + margin || r.y < -margin || r.y > canvas.height + margin) {
          rockets.splice(i, 1); rocketSpawnTimer = 320;
        }
      }

      for (const a of astronauts) {
        a.phase += a.orbitSpeed;
        a.bobPhase += a.bobSpeed;
        a.rotation += a.rotSpeed;
        const px = (a.cx + Math.cos(a.phase) * a.orbitRx) * canvas.width;
        const py = (a.cy + Math.sin(a.phase) * a.orbitRy + Math.sin(a.bobPhase) * 0.008) * canvas.height;
        drawAstronaut(px, py, a.size, a.alpha, a.rotation, 220, dark);
      }

      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" />;
}

// ── Student SVG Character ──────────────────────────────────────────────────
function StudentCharacter({ walking, speaking }: { walking: boolean; speaking: boolean }) {
  const dur = "0.44s";
  const legL: React.CSSProperties = walking
    ? { transformOrigin: "28px 62px", animation: `legSwingL ${dur} ease-in-out infinite` } : {};
  const legR: React.CSSProperties = walking
    ? { transformOrigin: "36px 62px", animation: `legSwingR ${dur} ease-in-out infinite` } : {};
  const armL: React.CSSProperties = walking
    ? { transformOrigin: "20px 38px", animation: `armSwingL ${dur} ease-in-out infinite` } : {};
  const armR: React.CSSProperties = walking
    ? { transformOrigin: "44px 38px", animation: `armSwingR ${dur} ease-in-out infinite` } : {};
  const bodyAnim: React.CSSProperties = walking
    ? { animation: `bodyBob ${dur} ease-in-out infinite` }
    : { animation: "idleSway 3s ease-in-out infinite" };

  return (
    <svg width="64" height="98" viewBox="0 0 64 98" style={{ overflow: "visible" }}>
      <g style={legL}>
        <rect x="24" y="62" width="8" height="23" rx="4" fill="#2c2c2a"/>
        <ellipse cx="28" cy="87" rx="8" ry="3.5" fill="#1a1a18"/>
      </g>
      <g style={bodyAnim}>
        <path d="M18 14 Q20 3 32 3 Q44 3 46 14" fill="#2c2c2a"/>
        <circle cx="32" cy="18" r="14" fill="#F4C563"/>
        <g style={{ transformOrigin:"26px 16px", animation:"eyeBlink 3.8s ease-in-out infinite" }}>
          <circle cx="26" cy="16" r="2.5" fill="#2c2c2a"/>
        </g>
        <g style={{ transformOrigin:"38px 16px", animation:"eyeBlink 3.8s ease-in-out infinite 0.14s" }}>
          <circle cx="38" cy="16" r="2.5" fill="#2c2c2a"/>
        </g>
        <path d="M23 10.5 Q26 9 29 10.5" stroke="#2c2c2a" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
        <path d="M35 10.5 Q38 9 41 10.5" stroke="#2c2c2a" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
        <path d={speaking ? "M24 24 Q32 32 40 24" : "M27 23.5 Q32 27.5 37 23.5"} stroke="#2c2c2a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <rect x="20" y="32" width="24" height="30" rx="5" fill="#4A8FE8"/>
        <path d="M28 32 L32 39 L36 32" fill="#3a7fd4"/>
        <rect x="9" y="34" width="12" height="20" rx="3" fill="#E05A4E"/>
        <rect x="11" y="32" width="8" height="5" rx="2" fill="#C94A40"/>
        <rect x="12" y="40" width="6" height="1.5" rx="1" fill="#C94A40" opacity="0.6"/>
        <rect x="12" y="44" width="6" height="1.5" rx="1" fill="#C94A40" opacity="0.6"/>
      </g>
      <g style={armL}>
        <path d="M20 38 Q12 44 10 53" stroke="#F4C563" strokeWidth="7" strokeLinecap="round" fill="none"/>
      </g>
      <g style={armR}>
        <path d="M44 38 Q52 44 54 53" stroke="#F4C563" strokeWidth="7" strokeLinecap="round" fill="none"/>
        <rect x="51" y="48" width="12" height="15" rx="2" fill="#E8C055"/>
        <rect x="52" y="49" width="2" height="13" rx="1" fill="#D4A843"/>
      </g>
      <g style={legR}>
        <rect x="32" y="62" width="8" height="23" rx="4" fill="#2c2c2a"/>
        <ellipse cx="36" cy="87" rx="8" ry="3.5" fill="#1a1a18"/>
      </g>
    </svg>
  );
}

// ── Robot SVG Character ────────────────────────────────────────────────────
function RobotCharacter({ walking, thinking }: { walking: boolean; thinking: boolean }) {
  const dur = "0.42s";
  const legL: React.CSSProperties = walking
    ? { transformOrigin: "24px 76px", animation: `robotLegL ${dur} ease-in-out infinite` } : {};
  const legR: React.CSSProperties = walking
    ? { transformOrigin: "40px 76px", animation: `robotLegR ${dur} ease-in-out infinite` } : {};
  const armL: React.CSSProperties = walking
    ? { transformOrigin: "10px 50px", animation: `armSwingL ${dur} ease-in-out infinite` } : {};
  const armR: React.CSSProperties = walking
    ? { transformOrigin: "54px 50px", animation: `armSwingR ${dur} ease-in-out infinite` } : {};
  const rootAnim: React.CSSProperties = walking
    ? { animation: `bodyBob ${dur} ease-in-out infinite` }
    : { animation: "floatIdle 3s ease-in-out infinite" };

  return (
    <svg width="64" height="98" viewBox="0 0 64 98" style={{ overflow:"visible", ...rootAnim }}>
      <line x1="32" y1="2" x2="32" y2="11" stroke="#3B8BD4" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="32" cy="2" r={thinking ? 6 : 4}
        fill={thinking ? "#FCDE5A" : "#3B8BD4"}
        style={{ transition:"all 0.3s ease", animation: thinking ? "glowPulse 0.65s ease-in-out infinite" : "glowPulse 2.5s ease-in-out infinite" }}/>
      {thinking && <circle cx="32" cy="2" r="10" fill="#FCDE5A" opacity="0.18" style={{ animation:"glowPulse 0.65s ease-in-out infinite" }}/>}

      <rect x="12" y="10" width="40" height="32" rx="9" fill="#3B8BD4"/>
      <rect x="17" y="15" width="30" height="22" rx="5"
        fill={thinking ? "#FFF9E6" : "#E6F1FB"}
        style={{ transition:"fill 0.4s ease" }}/>

      <g style={{ transformOrigin:"26px 26px", animation:"eyeBlink 4.2s ease-in-out infinite" }}>
        <circle cx="26" cy="26" r="5" fill={thinking ? "#BA7517" : "#185FA5"} style={{ transition:"fill 0.3s" }}/>
      </g>
      <g style={{ transformOrigin:"38px 26px", animation:"eyeBlink 4.2s ease-in-out infinite 0.18s" }}>
        <circle cx="38" cy="26" r="5" fill={thinking ? "#BA7517" : "#185FA5"} style={{ transition:"fill 0.3s" }}/>
      </g>
      <circle cx="27.5" cy="24.5" r="2" fill="white"/>
      <circle cx="39.5" cy="24.5" r="2" fill="white"/>

      {thinking
        ? <path d="M26 33 Q32 30 38 33" stroke="#BA7517" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        : <path d="M25 34 Q32 38 39 34" stroke="#185FA5" strokeWidth="1.5" fill="none" strokeLinecap="round"/>}

      <rect x="27" y="42" width="10" height="6" rx="3" fill="#185FA5"/>
      <rect x="14" y="48" width="36" height="28" rx="7" fill="#185FA5"/>
      <rect x="19" y="54" width="26" height="14" rx="4" fill="#3B8BD4"/>
      <circle cx="26" cy="61" r="3" fill="#FCDE5A"/>
      <circle cx="32" cy="61" r="3" fill="#5DCAA5"/>
      <circle cx="38" cy="61" r="3" fill="#E05A4E"/>

      <g style={legL}>
        <rect x="19" y="76" width="11" height="15" rx="5" fill="#3B8BD4"/>
        <ellipse cx="24" cy="93" rx="8" ry="3.5" fill="#185FA5"/>
      </g>
      <g style={armL}>
        <rect x="5" y="50" width="10" height="22" rx="5" fill="#3B8BD4"/>
        <circle cx="10" cy="74" r="6" fill="#185FA5"/>
      </g>
      <g style={armR}>
        <rect x="49" y="50" width="10" height="22" rx="5" fill="#3B8BD4"/>
        <circle cx="54" cy="74" r="6" fill="#185FA5"/>
      </g>
      <g style={legR}>
        <rect x="34" y="76" width="11" height="15" rx="5" fill="#3B8BD4"/>
        <ellipse cx="40" cy="93" rx="8" ry="3.5" fill="#185FA5"/>
      </g>
    </svg>
  );
}

// ── Typing Dots ────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1.5">
      {[0,1,2].map(i=>(
        <span key={i} className="h-2 w-2 rounded-full bg-sky-400 inline-block"
          style={{ animation:`dotBounce 1.2s ease-in-out ${i*0.16}s infinite` }}/>
      ))}
    </div>
  );
}

// ── AI Chat Widget ─────────────────────────────────────────────────────────
function AIChatWidget() {
  const [messages, setMessages]               = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue]           = useState("");
  const [isTyping, setIsTyping]               = useState(false);
  const [studentWalking, setStudentWalking]   = useState(true);
  const [robotWalking, setRobotWalking]       = useState(true);
  const [studentSpeaking, setStudentSpeaking] = useState(false);
  const [robotThinking, setRobotThinking]     = useState(false);
  const [studentBubble, setStudentBubble]     = useState("I need help with my exam!");
  const [aiBubble, setAiBubble]               = useState("Hey! Ask me anything about studying.");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const msgIdRef         = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => { setStudentWalking(false); setRobotWalking(false); }, 1050);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = useCallback((text?: string) => {
    const msg = (text ?? inputValue).trim();
    if (!msg || isTyping) return;
    setInputValue("");
    setMessages(prev => [...prev, { id: ++msgIdRef.current, role: "user", text: msg }]);
    setStudentBubble(msg.length > 80 ? msg.slice(0,77)+"…" : msg);
    setStudentSpeaking(true);
    setStudentWalking(true);
    setRobotThinking(true);
    setIsTyping(true);
    setTimeout(() => { setStudentWalking(false); setStudentSpeaking(false); }, 720);
    const delay = 1300 + Math.random() * 500;
    setTimeout(() => {
      const resp = getAIResponse(msg);
      setMessages(prev => [...prev, { id: ++msgIdRef.current, role: "ai", text: resp.text, links: resp.links }]);
      setAiBubble(resp.text.length > 90 ? resp.text.slice(0,87)+"…" : resp.text);
      setIsTyping(false);
      setRobotThinking(false);
    }, delay);
  }, [inputValue, isTyping]);

  const CHIPS = [
    { label: "Exam in 3 days",      icon: AlertCircle,      msg: "I have an exam in 3 days and I'm really stressed" },
    { label: "Need a study plan",   icon: CalendarClock,    msg: "I need a study plan for my upcoming exam" },
    { label: "Active recall",       icon: Brain,            msg: "Help me understand flashcards and active recall" },
    { label: "Just uploaded notes", icon: Upload,           msg: "I just uploaded my notes, what should I do next?" },
  ];

  return (
    <section className="relative rounded-3xl overflow-hidden"
      style={{
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--card2)/0.5)",
        backdropFilter: "blur(20px)",
      }}>

      {/* Animated gradient stripe at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, #6366f1, #38bdf8, #34d399, #f59e0b, #6366f1)",
          backgroundSize: "300% 100%",
          animation: "heroGradient 4s ease infinite",
        }}/>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-[rgb(var(--border))]">
        <div className="inline-flex items-center gap-2.5 text-sm font-bold text-[rgb(var(--fg))]">
          <div className="relative h-7 w-7 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #38bdf8)" }}>
            <Bot className="h-3.5 w-3.5 text-white"/>
          </div>
          Ask the AI Tutor
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-40"
              style={{ animation: "glowPulse 1.5s ease-in-out infinite" }}/>
            <span className="relative block h-2 w-2 rounded-full bg-emerald-400"/>
          </div>
          <span className="text-[11px] text-[rgb(var(--muted2))] font-medium">Online · Always available</span>
        </div>
      </div>

      {/* Scene */}
      <div className="relative px-6 pt-6 pb-4 border-b border-[rgb(var(--border))] overflow-hidden"
        style={{ background: "rgb(var(--card)/0.25)" }}>

        {/* Dotted ground path */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-72 flex justify-between items-center"
          style={{ animation: "pathDotIn 0.6s ease-out 0.8s both" }}>
          {Array.from({length:20}).map((_,i)=>(
            <span key={i} className="h-1.5 w-1.5 rounded-full"
              style={{
                background: `rgb(var(--border))`,
                opacity: 0.15 + (i % 4) * 0.1,
                transform: `scale(${0.6 + (i % 3) * 0.15})`,
              }}/>
          ))}
        </div>

        {/* Glow backdrop behind characters */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 left-1/4 w-32 h-24 rounded-full blur-3xl opacity-20"
            style={{ background: "#4A8FE8" }}/>
          <div className="absolute bottom-0 right-1/4 w-32 h-24 rounded-full blur-3xl opacity-20"
            style={{ background: "#3B8BD4" }}/>
        </div>

        {/* Characters row */}
        <div className="relative flex items-end justify-center gap-14 max-w-sm mx-auto">

          {/* Student */}
          <div className="flex flex-col items-center gap-2 z-10"
            style={{ animation: "studentEnter 0.8s cubic-bezier(0.22,1,0.36,1) both" }}>

            <div key={studentBubble}
              className="relative rounded-2xl rounded-bl-sm px-3 py-2 max-w-[180px] min-w-[88px] text-[11px] leading-relaxed font-semibold shadow-md"
              style={{
                background: "rgb(var(--card))",
                border: "1.5px solid rgb(var(--border))",
                color: "rgb(var(--fg))",
                animation: "bubblePop 0.38s cubic-bezier(0.175,0.885,0.32,1.275) both",
                boxShadow: "0 4px 20px rgb(var(--shadow)/0.12)",
              }}>
              {studentBubble}
              <span className="absolute -bottom-[8px] left-5 w-4 h-4 rotate-45"
                style={{
                  background: "rgb(var(--card))",
                  borderRight: "1.5px solid rgb(var(--border))",
                  borderBottom: "1.5px solid rgb(var(--border))",
                }}/>
            </div>

            <StudentCharacter walking={studentWalking} speaking={studentSpeaking}/>

            <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] flex items-center gap-1"
              style={{ color: "rgb(var(--muted2))" }}>
              <GraduationCap className="h-2.5 w-2.5"/> You
            </span>
          </div>

          {/* Middle arrows */}
          <div className="flex flex-col items-center gap-0 pb-14 flex-shrink-0">
            {[0,1,2].map(i=>(
              <span key={i} className="text-2xl leading-tight select-none"
                style={{
                  color: "rgb(var(--border))",
                  opacity: 0.2 + i * 0.22,
                  animation: `glowPulse ${1.1 + i*0.3}s ease-in-out ${i*0.22}s infinite`,
                }}>›</span>
            ))}
          </div>

          {/* Robot */}
          <div className="flex flex-col items-center gap-2 z-10"
            style={{ animation: "robotEnter 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}>

            <div key={aiBubble}
              className="relative rounded-2xl rounded-br-sm px-3 py-2 max-w-[180px] min-w-[88px] text-[11px] leading-relaxed font-semibold shadow-md"
              style={{
                background: "rgba(56,189,248,0.08)",
                border: "1.5px solid rgba(56,189,248,0.25)",
                color: "rgb(var(--fg))",
                animation: "bubblePop 0.38s cubic-bezier(0.175,0.885,0.32,1.275) both",
                boxShadow: "0 4px 20px rgba(56,189,248,0.1)",
              }}>
              {isTyping
                ? <span className="flex items-center gap-1">
                    {[0,1,2].map(i=>(
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-sky-400 inline-block"
                        style={{ animation:`dotBounce 1.2s ease-in-out ${i*0.16}s infinite` }}/>
                    ))}
                  </span>
                : aiBubble}
              <span className="absolute -bottom-[8px] right-5 w-4 h-4 rotate-45"
                style={{
                  background: "rgba(56,189,248,0.08)",
                  borderRight: "1.5px solid rgba(56,189,248,0.25)",
                  borderBottom: "1.5px solid rgba(56,189,248,0.25)",
                }}/>
            </div>

            <RobotCharacter walking={robotWalking} thinking={robotThinking}/>

            <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] flex items-center gap-1 text-sky-500">
              <Bot className="h-2.5 w-2.5"/> AI Tutor
            </span>
          </div>
        </div>
      </div>

      {/* Chat log */}
      <div ref={chatContainerRef} className="px-6 py-4 max-h-64 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3 text-amber-400" style={{ animation:"glowPulse 2s ease-in-out infinite" }}/>
              <p className="text-xs leading-relaxed" style={{ color:"rgb(var(--muted2))" }}>
                Tap a suggestion below or type your question
              </p>
            </div>
            <p className="text-[11px]" style={{ color:"rgb(var(--muted2))", opacity:0.6 }}>
              I'll point you to exactly the right tool
            </p>
          </div>
        )}
        {messages.map((msg,idx)=>(
          <div key={msg.id}
            className={`flex gap-2.5 ${msg.role==="user" ? "justify-end" : "justify-start"}`}
            style={{ animation:`msgSlideIn 0.28s ease-out ${idx===0?0:0}ms both` }}>

            {msg.role==="ai" && (
              <div className="h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(56,189,248,0.15))", border:"1px solid rgba(56,189,248,0.2)" }}>
                <Bot className="h-3.5 w-3.5 text-sky-500"/>
              </div>
            )}

            <div className="flex flex-col gap-1 max-w-[78%]">
              <div className={[
                "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed font-medium",
                msg.role==="user"
                  ? "rounded-tr-sm text-[rgb(var(--bg))]"
                  : "rounded-tl-sm text-[rgb(var(--fg))]",
              ].join(" ")}
              style={msg.role==="user"
                ? { background:"rgb(var(--fg))" }
                : { background:"rgba(56,189,248,0.07)", border:"1px solid rgba(56,189,248,0.15)" }}>
                {msg.text}
              </div>

              {/* Action links for AI messages */}
              {msg.role==="ai" && msg.links && msg.links.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {msg.links.map(link => (
                    <Link key={link.href} href={link.href}
                      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150 hover:-translate-y-0.5 active:scale-95"
                      style={{
                        background: link.icon === "plan"
                          ? "rgba(99,102,241,0.1)"
                          : link.icon === "upload"
                          ? "rgba(244,63,94,0.1)"
                          : "rgba(56,189,248,0.1)",
                        border: link.icon === "plan"
                          ? "1px solid rgba(99,102,241,0.25)"
                          : link.icon === "upload"
                          ? "1px solid rgba(244,63,94,0.25)"
                          : "1px solid rgba(56,189,248,0.25)",
                        color: link.icon === "plan"
                          ? "#6366f1"
                          : link.icon === "upload"
                          ? "#f43f5e"
                          : "#38bdf8",
                      }}>
                      {link.icon === "plan"   && <CalendarClock className="h-3 w-3 flex-shrink-0"/>}
                      {link.icon === "hub"    && <BookOpen       className="h-3 w-3 flex-shrink-0"/>}
                      {link.icon === "upload" && <Upload         className="h-3 w-3 flex-shrink-0"/>}
                      {link.label}
                      <ArrowRight className="h-2.5 w-2.5 flex-shrink-0"/>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {msg.role==="user" && (
              <div className="h-7 w-7 rounded-xl bg-[rgb(var(--card2))] border border-[rgb(var(--border))] flex items-center justify-center flex-shrink-0 mt-0.5">
                <GraduationCap className="h-3.5 w-3.5 text-[rgb(var(--muted))]"/>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5 justify-start" style={{ animation:"msgSlideIn 0.2s ease-out both" }}>
            <div className="h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:"rgba(56,189,248,0.12)", border:"1px solid rgba(56,189,248,0.2)" }}>
              <Bot className="h-3.5 w-3.5 text-sky-500"/>
            </div>
            <div className="rounded-2xl rounded-tl-sm px-2"
              style={{ background:"rgba(56,189,248,0.07)", border:"1px solid rgba(56,189,248,0.15)" }}>
              <TypingDots/>
            </div>
          </div>
        )}

      </div>

      {/* Chips */}
      <div className="px-6 pb-3 flex flex-wrap gap-1.5">
        {CHIPS.map((chip,i)=>(
          <button key={chip.msg} onClick={()=>handleSend(chip.msg)} disabled={isTyping}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            style={{
              border:"1px solid rgb(var(--border))",
              background:"rgb(var(--card)/0.7)",
              color:"rgb(var(--muted))",
              animation:`chipPop 0.35s ease-out ${i*60}ms both`,
            }}
            onMouseEnter={e=>{
              (e.currentTarget as HTMLButtonElement).style.background="rgb(var(--card))";
              (e.currentTarget as HTMLButtonElement).style.color="rgb(var(--fg))";
            }}
            onMouseLeave={e=>{
              (e.currentTarget as HTMLButtonElement).style.background="rgb(var(--card)/0.7)";
              (e.currentTarget as HTMLButtonElement).style.color="rgb(var(--muted))";
            }}>
            <chip.icon className="h-3 w-3 flex-shrink-0"/>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 pb-6">
        <div className="flex gap-2.5 items-center rounded-2xl px-4 py-1 transition-all duration-200"
          style={{
            border: "1.5px solid rgb(var(--border))",
            background: "rgb(var(--card)/0.8)",
          }}
          onFocus={e=>(e.currentTarget.style.borderColor="rgba(56,189,248,0.5)")}
          onBlur={e=>(e.currentTarget.style.borderColor="rgb(var(--border))")}>
          <input
            type="text"
            value={inputValue}
            onChange={e=>setInputValue(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); handleSend(); } }}
            disabled={isTyping}
            placeholder="Ask about studying, exam prep, or the tools…"
            autoComplete="off"
            className="flex-1 bg-transparent text-xs outline-none py-2.5 disabled:opacity-50"
            style={{ color:"rgb(var(--fg))" }}
          />
          <button onClick={()=>handleSend()} disabled={isTyping||!inputValue.trim()}
            className="h-7 w-7 rounded-xl flex items-center justify-center transition-all duration-150 flex-shrink-0 active:scale-95 disabled:cursor-not-allowed"
            style={{
              background: (isTyping||!inputValue.trim()) ? "rgb(var(--border))" : "linear-gradient(135deg,#6366f1,#38bdf8)",
            }}>
            <Send className="h-3.5 w-3.5 text-white"/>
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Tab Button ─────────────────────────────────────────────────────────────
function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200"
      style={active ? {
        background: "rgb(var(--fg))",
        color: "rgb(var(--bg))",
        boxShadow: "0 4px 16px rgb(var(--shadow)/0.2)",
        transform: "scale(1.02)",
      } : {
        background: "transparent",
        color: "rgb(var(--muted))",
        border: "1px solid rgb(var(--border))",
      }}>
      {children}
    </button>
  );
}

// ── Step Card ──────────────────────────────────────────────────────────────
function StepCard({ num, title, desc, icon: Icon, accentClass, lineClass, gradFrom, gradTo }: {
  num: number; title: string; desc: string; icon: any;
  accentClass: string; lineClass: string; gradFrom: string; gradTo: string;
}) {
  return (
    <div className="group relative rounded-2xl border overflow-hidden transition-all duration-300 ease-out hover:-translate-y-2 cursor-default"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--card)/0.6)",
        backdropFilter: "blur(12px)",
      }}
      onMouseEnter={e=>{
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 50px rgb(var(--shadow)/0.2)`;
        (e.currentTarget as HTMLDivElement).style.background = "rgb(var(--card)/0.9)";
      }}
      onMouseLeave={e=>{
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.background = "rgb(var(--card)/0.6)";
      }}>

      {/* Top accent bar */}
      <div className="h-[2px] w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})` }}/>

      <div className="p-5">
        {/* Step badge */}
        <div className="flex items-center justify-between mb-4">
          <div className={["h-9 w-9 rounded-xl inline-flex items-center justify-center border border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.8)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6", accentClass].join(" ")}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.18em] px-2 py-1 rounded-lg"
            style={{ background:"rgb(var(--card2)/0.8)", color:"rgb(var(--muted2))", border:"1px solid rgb(var(--border))" }}>
            Step {num}
          </span>
        </div>

        <div className="text-sm font-bold leading-snug" style={{ color:"rgb(var(--fg))" }}>{title}</div>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color:"rgb(var(--muted))" }}>{desc}</p>

        <div className="mt-4 h-[1.5px] w-full overflow-hidden rounded-full" style={{ background:"rgb(var(--border))" }}>
          <div className={`h-full w-0 group-hover:w-2/3 transition-all duration-500 ease-out rounded-full ${lineClass}`}/>
        </div>
      </div>

      {/* Ghost number */}
      <span className="absolute -right-1 -top-2 text-[5rem] font-black leading-none select-none pointer-events-none transition-colors duration-300"
        style={{ color:"rgb(var(--fg)/0.04)" }}>
        {num}
      </span>
    </div>
  );
}

// ── Quick Card ─────────────────────────────────────────────────────────────
function QuickCard({ title, desc, icon: Icon, href, tag, accentClass, tagBg, tagText, gradFrom, gradTo }: {
  title: string; desc: string; icon: any; href: string; tag: string;
  accentClass: string; tagBg: string; tagText: string; gradFrom: string; gradTo: string;
}) {
  return (
    <Link href={href}
      className="group relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-300 ease-out hover:-translate-y-2"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--card)/0.6)",
        backdropFilter: "blur(12px)",
      }}
      onMouseEnter={e=>{
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 24px 56px rgb(var(--shadow)/0.22)`;
        (e.currentTarget as HTMLAnchorElement).style.background = "rgb(var(--card)/0.92)";
      }}
      onMouseLeave={e=>{
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
        (e.currentTarget as HTMLAnchorElement).style.background = "rgb(var(--card)/0.6)";
      }}>

      {/* Top gradient bar */}
      <div className="h-[2px] w-full opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background:`linear-gradient(90deg,${gradFrom},${gradTo})` }}/>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className={["h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0 border border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.8)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3", accentClass].join(" ")}>
            <Icon className="h-4 w-4" />
          </div>
          <span className={["text-[10px] font-extrabold uppercase tracking-wider rounded-lg px-2 py-1", tagBg, tagText].join(" ")}>{tag}</span>
        </div>

        <div className="mt-4 text-sm font-bold leading-snug" style={{ color:"rgb(var(--fg))" }}>{title}</div>
        <p className="mt-1.5 text-xs leading-relaxed flex-1" style={{ color:"rgb(var(--muted))" }}>{desc}</p>

        <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold" style={{ color:"rgb(var(--primary))" }}>
          Get started
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1.5 transition-transform duration-200" />
        </div>
      </div>
    </Link>
  );
}

// ── Stat Pill ──────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color, gradFrom, gradTo }: {
  icon: any; label: string; value: string; color: string; gradFrom?: string; gradTo?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-all duration-200 hover:scale-105 cursor-default"
      style={{
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--card)/0.7)",
        backdropFilter: "blur(10px)",
      }}>
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span style={{ color:"rgb(var(--muted))" }}>{label}</span>
      <span className="font-bold" style={{ color:"rgb(var(--fg))" }}>{value}</span>
    </div>
  );
}

// ── How-it-works data per tab ──────────────────────────────────────────────
const HOW_HUB = [
  { num:1, title:"Upload Content",        desc:"Upload a PDF or paste notes. Best for text PDFs (slides exported).",        icon:Plus,         accentClass:"text-sky-500 dark:text-sky-400",        lineClass:"bg-sky-400",     gradFrom:"#38bdf8", gradTo:"#6366f1" },
  { num:2, title:"AI Processing",         desc:"AI extracts & organises: summary, key concepts, flashcards, and quizzes.",  icon:Brain,        accentClass:"text-violet-500 dark:text-violet-400",  lineClass:"bg-violet-400",  gradFrom:"#6366f1", gradTo:"#38bdf8" },
  { num:3, title:"Study Materials Ready", desc:"Your full study pack appears instantly — browse inside the Study Hub.",     icon:BookOpen,     accentClass:"text-emerald-500 dark:text-emerald-400",lineClass:"bg-emerald-400", gradFrom:"#34d399", gradTo:"#38bdf8" },
  { num:4, title:"Active Recall",         desc:"Quiz yourself with flashcards and practice tests to lock in the material.", icon:Target,       accentClass:"text-rose-500 dark:text-rose-400",      lineClass:"bg-rose-400",    gradFrom:"#f43f5e", gradTo:"#fb923c" },
];

const HOW_PLAN = [
  { num:1, title:"Set Your Exam Date",   desc:"Tell the AI your exam date, subject, and difficulty level.",         icon:CalendarClock, accentClass:"text-sky-500 dark:text-sky-400",        lineClass:"bg-sky-400",     gradFrom:"#38bdf8", gradTo:"#6366f1" },
  { num:2, title:"Enter Available Time", desc:"Share how many hours per day you can dedicate to studying.",         icon:Zap,           accentClass:"text-violet-500 dark:text-violet-400",  lineClass:"bg-violet-400",  gradFrom:"#6366f1", gradTo:"#f59e0b" },
  { num:3, title:"AI Builds Your Plan",  desc:"Get a personalised weekly schedule with daily goals and topics.",   icon:Brain,         accentClass:"text-emerald-500 dark:text-emerald-400",lineClass:"bg-emerald-400", gradFrom:"#34d399", gradTo:"#38bdf8" },
  { num:4, title:"Follow & Master",      desc:"Tick off daily tasks and stay on track all the way to exam day.",   icon:ListChecks,    accentClass:"text-rose-500 dark:text-rose-400",      lineClass:"bg-rose-400",    gradFrom:"#f43f5e", gradTo:"#fb923c" },
];

// ── Main Page ──────────────────────────────────────────────────────────────
export default function StudyMain() {
  const router = useRouter();
  const sp = useSearchParams();

  const urlTab = (sp.get("tab") ?? "hub") as "hub" | "plan";
  const [tab, setTabState] = useState<"hub" | "plan">(urlTab);

  useEffect(() => { setTabState(urlTab); }, [urlTab]);

  function setTab(next: "hub" | "plan") {
    if (next === tab) return;
    setTabState(next);
    router.replace(`/study?tab=${next}`);
  }

  const howItWorks = tab === "hub" ? HOW_HUB : HOW_PLAN;
  const modeLabel = tab === "hub" ? "Active Recall Engine" : "AI Study Plan Generator";

  return (
    <div className="min-h-screen" style={{ background:"rgb(var(--bg))", color:"rgb(var(--fg))" }}>
      <style>{GLOBAL_ANIM}</style>
      <FloatingParticles />

      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Animated orbs */}
        <div className="absolute -top-40 left-1/3 h-[420px] w-[420px] rounded-full blur-[120px] opacity-[0.08] dark:opacity-[0.12]"
          style={{ background:"#6366f1", animation:"orb1 18s ease-in-out infinite" }}/>
        <div className="absolute top-1/2 right-[-100px] h-[340px] w-[340px] rounded-full blur-[100px] opacity-[0.07] dark:opacity-[0.1]"
          style={{ background:"#38bdf8", animation:"orb2 22s ease-in-out infinite" }}/>
        <div className="absolute bottom-[-80px] left-[-80px] h-[300px] w-[300px] rounded-full blur-[90px] opacity-[0.06] dark:opacity-[0.09]"
          style={{ background:"#34d399", animation:"orb3 16s ease-in-out infinite" }}/>
        <div className="absolute top-1/4 left-1/4 h-[200px] w-[200px] rounded-full blur-[80px] opacity-[0.05] dark:opacity-[0.08]"
          style={{ background:"#f59e0b", animation:"orb1 25s ease-in-out 8s infinite" }}/>

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.018] dark:opacity-[0.032]"
          style={{
            backgroundImage:`linear-gradient(rgb(var(--fg)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--fg)) 1px, transparent 1px)`,
            backgroundSize:"56px 56px",
          }}/>

        {/* Subtle noise overlay */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundRepeat:"repeat",
            backgroundSize:"128px 128px",
          }}/>
      </div>

      <div className="relative z-10 pt-10 pb-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-5">

          {/* ── Header ── */}
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                style={{
                  border:"1px solid rgb(var(--border))",
                  background:"rgb(var(--card)/0.7)",
                  color:"rgb(var(--muted))",
                  backdropFilter:"blur(10px)",
                  animation:"heroBadgePop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both",
                }}>
                <Sparkles className="h-3.5 w-3.5 text-amber-400" style={{ animation:"glowPulse 1.8s ease-in-out infinite" }}/>
                AI Learning Suite
              </div>

              <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight leading-tight"
                style={{ animation:"titleReveal 0.6s ease-out 0.1s both", opacity:0 }}>
                Simple.{" "}
                <span style={{ color:"rgb(var(--muted))" }}>Powerful.</span>{" "}
                <span className="relative inline-block">
                  <span style={{
                    background:"linear-gradient(135deg, #6366f1, #38bdf8, #34d399)",
                    backgroundClip:"text",
                    WebkitBackgroundClip:"text",
                    WebkitTextFillColor:"transparent",
                    backgroundSize:"200% 200%",
                    animation:"heroGradient 3s ease infinite",
                  }}>
                    Intelligent.
                  </span>
                  <span className="absolute -bottom-1 left-0 h-[2.5px] w-full rounded-full"
                    style={{
                      background:"linear-gradient(90deg,#6366f1,#38bdf8,#34d399)",
                      backgroundSize:"200% 100%",
                      animation:"heroGradient 3s ease infinite",
                      opacity:0.6,
                    }}/>
                </span>
              </h1>

              {/* Stat pills */}
              <div className="mt-4 flex flex-wrap gap-2" style={{ animation:"titleReveal 0.6s ease-out 0.2s both", opacity:0 }}>
                <StatPill icon={Zap}          label="AI-powered"    value="Instant"  color="text-amber-400"  gradFrom="#f59e0b" gradTo="#fbbf24"/>
                <StatPill icon={Brain}         label="Recall Engine" value="Active"   color="text-violet-500 dark:text-violet-400" gradFrom="#6366f1" gradTo="#38bdf8"/>
                <StatPill icon={CalendarClock} label="Plans"         value="Adaptive" color="text-sky-500 dark:text-sky-400" gradFrom="#38bdf8" gradTo="#6366f1"/>
              </div>

            </div>

            {/* CTA */}
            <div style={{ animation:"heroBadgePop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) 0.15s both", opacity:0 }}>
              <Link href="/study/hub/upload"
                className="shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white active:scale-95 transition-all duration-200"
                style={{
                  background:"linear-gradient(135deg,#6366f1,#38bdf8)",
                  boxShadow:"0 8px 24px rgba(99,102,241,0.3), 0 2px 8px rgba(56,189,248,0.2)",
                }}>
                <Plus className="h-3.5 w-3.5"/>
                Add Material
              </Link>
            </div>
          </header>

          {/* ── AI Chat Widget ── */}
          <div style={{ animation:"cardPop 0.5s ease-out 0.35s both", opacity:0 }}>
            <AIChatWidget />
          </div>

          {/* ── Tabs ── */}
          <div className="flex flex-wrap items-center gap-2" style={{ animation:"cardPop 0.5s ease-out 0.4s both", opacity:0 }}>
            <div className="inline-flex items-center gap-1.5 rounded-xl p-1"
              style={{
                border:"1px solid rgb(var(--border))",
                background:"rgb(var(--card)/0.7)",
                backdropFilter:"blur(10px)",
              }}>
              <TabButton active={tab==="hub"}  onClick={()=>setTab("hub")}>
                <BookOpen className="h-3.5 w-3.5"/>
                Study Hub
              </TabButton>
              <TabButton active={tab==="plan"} onClick={()=>setTab("plan")}>
                <CalendarClock className="h-3.5 w-3.5"/>
                Study Plan
              </TabButton>
            </div>

            <span key={modeLabel} className="text-[11px] pl-1"
              style={{ color:"rgb(var(--muted2))", animation:"labelFadeIn 0.22s ease-out both" }}>
              — {modeLabel}
            </span>
          </div>

          {/* ── How it Works ── */}
          <div style={{ animation:"cardPop 0.5s ease-out 0.45s both", opacity:0 }}>
            <section className="rounded-3xl border p-6"
              style={{
                borderColor:"rgb(var(--border))",
                background:"rgb(var(--card2)/0.45)",
                backdropFilter:"blur(16px)",
              }}>

              {/* Section header */}
              <div className="flex items-center justify-between gap-3 pb-5"
                style={{ borderBottom:"1px solid rgb(var(--border))" }}>
                <div key={`title-${tab}`}
                  className="inline-flex items-center gap-2.5 text-sm font-bold"
                  style={{ color:"rgb(var(--fg))", animation:"labelFadeIn 0.22s ease-out both" }}>
                  <div className="relative h-7 w-7 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{ background:"linear-gradient(135deg,#6366f1,#38bdf8)" }}>
                    <Wand2 className="h-3.5 w-3.5 text-white"/>
                  </div>
                  How {tab==="hub" ? "Study Hub" : "Study Plan"} Works
                </div>
                <div key={`meta-${tab}`} className="text-[11px] font-semibold"
                  style={{ color:"rgb(var(--muted2))", animation:"labelFadeIn 0.25s ease-out both" }}>
                  {modeLabel} · 4 steps
                </div>
              </div>

              <div key={tab} className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3"
                style={{ animation:"stepFadeIn 0.3s ease-out both" }}>
                {howItWorks.map((s,i)=>(
                  <div key={s.num} style={{ animation:`stepFadeIn 0.35s ease-out ${i*65}ms both`, opacity:0 }}>
                    <StepCard {...s}/>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── Quick Actions ── */}
          <div style={{ animation:"cardPop 0.5s ease-out 0.55s both", opacity:0 }}>
            <section className="rounded-3xl border p-6"
              style={{
                borderColor:"rgb(var(--border))",
                background:"rgb(var(--card2)/0.45)",
                backdropFilter:"blur(16px)",
              }}>

              <div className="flex items-center justify-between gap-3 pb-5"
                style={{ borderBottom:"1px solid rgb(var(--border))" }}>
                <div className="text-sm font-bold" style={{ color:"rgb(var(--fg))" }}>Quick Actions</div>
                <div className="text-[11px] font-semibold" style={{ color:"rgb(var(--muted2))" }}>Pick a workflow</div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <QuickCard
                  title="Active Recall Study Hub"
                  desc="Browse your materials, generate study packs, and quiz yourself."
                  icon={BookOpen} href="/study/hub" tag="Essential"
                  accentClass="text-emerald-500 dark:text-emerald-400"
                  tagBg="bg-emerald-500/10" tagText="text-emerald-600 dark:text-emerald-400"
                  gradFrom="#34d399" gradTo="#38bdf8"/>
                <QuickCard
                  title="AI Study Plan Generator"
                  desc="Generate a weekly plan based on exam date + available time."
                  icon={CalendarClock} href="/study/plan" tag="New"
                  accentClass="text-sky-500 dark:text-sky-400"
                  tagBg="bg-sky-500/10" tagText="text-sky-600 dark:text-sky-400"
                  gradFrom="#38bdf8" gradTo="#6366f1"/>
                <QuickCard
                  title="Upload New Material"
                  desc="Add lecture notes or a PDF to create a study pack instantly."
                  icon={Plus} href="/study/hub/upload" tag="Fast"
                  accentClass="text-rose-500 dark:text-rose-400"
                  tagBg="bg-rose-500/10" tagText="text-rose-600 dark:text-rose-400"
                  gradFrom="#f43f5e" gradTo="#fb923c"/>
              </div>
            </section>
          </div>

          {/* ── Pro Tip Banner ── */}
          <div style={{ animation:"cardPop 0.5s ease-out 0.65s both", opacity:0 }}>
            <div className="relative rounded-3xl border overflow-hidden p-5"
              style={{
                borderColor:"rgba(99,102,241,0.2)",
                background:"linear-gradient(135deg,rgba(99,102,241,0.06),rgba(56,189,248,0.04),rgba(52,211,153,0.05))",
                backdropFilter:"blur(16px)",
              }}>

              {/* Animated gradient bg */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.35]"
                style={{
                  backgroundImage:"radial-gradient(circle at 20% 50%,rgba(99,102,241,0.25) 0%,transparent 50%), radial-gradient(circle at 80% 50%,rgba(56,189,248,0.25) 0%,transparent 50%)",
                }}/>

              {/* Left stripe */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl"
                style={{
                  background:"linear-gradient(180deg,#6366f1,#38bdf8,#34d399)",
                  backgroundSize:"100% 300%",
                  animation:"heroGradient 3s ease infinite",
                }}/>

              <div className="relative flex items-start gap-3 pl-2">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background:"linear-gradient(135deg,#6366f1,#38bdf8)",
                    boxShadow:"0 4px 16px rgba(99,102,241,0.35)",
                    animation:"subtleFloat 4s ease-in-out infinite",
                  }}>
                  <Sparkles className="h-4 w-4 text-white"/>
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color:"rgb(var(--fg))" }}>
                    Pro tip: Use the Active Recall method
                  </p>
                  <p className="text-[11px] mt-1 leading-relaxed" style={{ color:"rgb(var(--muted))" }}>
                    Studies show active recall improves long-term retention by up to 50% vs passive re-reading. Upload your notes and start quizzing yourself today.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}