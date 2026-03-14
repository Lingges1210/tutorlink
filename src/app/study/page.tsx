"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles, Wand2, CalendarClock, BookOpen, Brain,
  ArrowRight, Plus, Zap, Target, ListChecks, Send, Bot, GraduationCap,
} from "lucide-react";

// ── Global Animations ──────────────────────────────────────────────────────
const GLOBAL_ANIM = `
@keyframes stepFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes labelFadeIn {
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes msgSlideIn {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dotBounce {
  0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
  40%           { transform: scale(1); opacity: 1; }
}
@keyframes studentEnter {
  0%   { transform: translateX(-140px); opacity: 0; }
  55%  { opacity: 1; }
  100% { transform: translateX(0px); opacity: 1; }
}
@keyframes robotEnter {
  0%   { transform: translateX(140px); opacity: 0; }
  55%  { opacity: 1; }
  100% { transform: translateX(0px); opacity: 1; }
}
@keyframes legSwingL {
  0%,100% { transform: rotate(-20deg); }
  50%     { transform: rotate(20deg); }
}
@keyframes legSwingR {
  0%,100% { transform: rotate(20deg); }
  50%     { transform: rotate(-20deg); }
}
@keyframes robotLegL {
  0%,100% { transform: rotate(-16deg); }
  50%     { transform: rotate(16deg); }
}
@keyframes robotLegR {
  0%,100% { transform: rotate(16deg); }
  50%     { transform: rotate(-16deg); }
}
@keyframes armSwingL {
  0%,100% { transform: rotate(16deg); }
  50%     { transform: rotate(-16deg); }
}
@keyframes armSwingR {
  0%,100% { transform: rotate(-16deg); }
  50%     { transform: rotate(16deg); }
}
@keyframes bodyBob {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-2.5px); }
}
@keyframes floatIdle {
  0%,100% { transform: translateY(0px); }
  50%     { transform: translateY(-6px); }
}
@keyframes idleSway {
  0%,100% { transform: rotate(-0.7deg); }
  50%     { transform: rotate(0.7deg); }
}
@keyframes bubblePop {
  0%   { opacity: 0; transform: scale(0.78) translateY(5px); }
  65%  { transform: scale(1.05) translateY(-1px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes eyeBlink {
  0%,88%,100% { transform: scaleY(1); }
  92%,95%     { transform: scaleY(0.07); }
}
@keyframes glowPulse {
  0%,100% { opacity: 0.55; }
  50%     { opacity: 1; }
}
@keyframes dustPuff {
  0%   { opacity: 0.5; transform: scale(0.5) translateY(0); }
  100% { opacity: 0; transform: scale(1.8) translateY(-8px); }
}
@keyframes pathDotIn {
  from { opacity: 0; transform: scaleX(0); }
  to   { opacity: 1; transform: scaleX(1); }
}
`;

// ── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: number;
  role: "user" | "ai";
  text: string;
}

// ── AI Responses ───────────────────────────────────────────────────────────
const AI_RESPONSES = {
  stressed:   { text: "Take a breath — you've got this! 3 days is plenty if you're strategic. Focus on short daily sessions using active recall rather than cramming. Start with the hardest topics first while your mind is fresh, then revisit easier material to build confidence." },
  plan:       { text: "Smart move going with a study plan! Break your time into daily blocks: morning for new material, afternoon for active recall, evening for light review. Assign each day a specific topic and tick it off as you go — consistency beats marathon sessions every time." },
  flashcards: { text: "Active recall is one of the most research-backed study methods out there — it improves long-term retention by up to 50% compared to passive re-reading. The key is to test yourself before you feel ready. Struggle a little, then check. That's where the learning happens." },
  notes:      { text: "Once your notes are uploaded, the AI generates a summary, pulls out key concepts, and builds flashcards and a quiz automatically. Start with the summary to get the big picture, then drill the flashcards until you can answer without peeking." },
  hub:        { text: "Study Hub is your all-in-one command centre. Upload a PDF or paste your notes and within seconds you'll get an AI summary, key concept breakdown, auto-generated flashcards, and a practice quiz — no manual setup needed. It's like having a study buddy who never gets tired." },
  default_a:  { text: "The best combo is notes + active recall. Upload your material, let the AI generate flashcards, then quiz yourself daily. Pair that with a structured study plan so you always know what to cover next — together they handle both what to study and when." },
  default_b:  { text: "Turn your notes into practice tests and work through them every day. Spacing your reviews out (instead of cramming) locks in memory far more effectively. Even 20 focused minutes daily beats a 3-hour session the night before." },
  default_c:  { text: "The most effective approach is testing yourself rather than re-reading. After each study session, close your notes and try to recall the key points from memory. Anything you can't recall is exactly what needs more attention — that's where to focus next." },
};

function getAIResponse(msg: string): { text: string } {
  const m = msg.toLowerCase();
  if (m.includes("stress") || m.includes("3 day") || m.includes("tomorrow") || m.includes("panic") || m.includes("worried")) return AI_RESPONSES.stressed;
  if (m.includes("plan") || m.includes("schedul") || m.includes("organiz") || m.includes("timetable")) return AI_RESPONSES.plan;
  if (m.includes("flash") || m.includes("recall") || m.includes("quiz") || m.includes("memoriz") || m.includes("remember")) return AI_RESPONSES.flashcards;
  if (m.includes("upload") || m.includes("just upload") || m.includes("pdf")) return AI_RESPONSES.notes;
  if (m.includes("hub") || m.includes("summary") || m.includes("concept") || m.includes("notes")) return AI_RESPONSES.hub;
  const defs = [AI_RESPONSES.default_a, AI_RESPONSES.default_b, AI_RESPONSES.default_c];
  return defs[Math.floor(Math.random() * defs.length)];
}

// ── Floating Particles + Rockets (with fins) + Astronauts Canvas ───────────
// Restored from original high-quality version
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
      shape: "circle" | "ring" | "dot" | "cross";
    }[] = [];

    const rockets: {
      x: number; y: number; angle: number; speed: number; size: number;
      alpha: number; trailPoints: { x: number; y: number }[];
      wobble: number; wobbleSpeed: number;
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

    for (let i = 0; i < 55; i++) {
      const shapes = ["circle", "ring", "dot", "cross"] as const;
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 3.5 + 1,
        alpha: Math.random() * 0.3 + 0.07,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }

    function spawnRocket() {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0, angle = 0;
      if (side === 0) { x = -60; y = Math.random() * canvas!.height; angle = (Math.random() * 0.5 - 0.25); }
      else if (side === 1) { x = canvas!.width + 60; y = Math.random() * canvas!.height; angle = Math.PI + (Math.random() * 0.5 - 0.25); }
      else if (side === 2) { x = Math.random() * canvas!.width; y = -60; angle = Math.PI / 2 + (Math.random() * 0.5 - 0.25); }
      else { x = Math.random() * canvas!.width; y = canvas!.height + 60; angle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25); }
      rockets.push({ x, y, angle, speed: 0.8 + Math.random() * 1.0, size: 32 + Math.random() * 26, alpha: 0.32 + Math.random() * 0.28, trailPoints: [], wobble: 0, wobbleSpeed: 0.016 + Math.random() * 0.012 });
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
        alpha: 0.28 + Math.random() * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.005,
      });
    }

    function isDark() { return document.documentElement.classList.contains("dark"); }

    // Full rocket with fins — restored from original
    function drawRocket(x: number, y: number, angle: number, size: number, alpha: number, col: string) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(angle + Math.PI / 2);
      ctx!.globalAlpha = alpha;

      // Aura glow
      const aura = ctx!.createRadialGradient(0, 0, 0, 0, 0, size * 1.8);
      aura.addColorStop(0, `rgba(${col},0.12)`);
      aura.addColorStop(1, `rgba(${col},0)`);
      ctx!.beginPath(); ctx!.arc(0, 0, size * 1.8, 0, Math.PI * 2);
      ctx!.fillStyle = aura; ctx!.fill();

      // Body
      ctx!.beginPath();
      ctx!.moveTo(0, -size);
      ctx!.bezierCurveTo(size * 0.42, -size * 0.5, size * 0.42, size * 0.28, 0, size * 0.52);
      ctx!.bezierCurveTo(-size * 0.42, size * 0.28, -size * 0.42, -size * 0.5, 0, -size);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.85})`;
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Window
      ctx!.beginPath();
      ctx!.arc(0, -size * 0.22, size * 0.24, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 1.5})`;
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.4})`;
      ctx!.lineWidth = 0.8;
      ctx!.stroke();

      // Left fin
      ctx!.beginPath();
      ctx!.moveTo(-size * 0.38, size * 0.18);
      ctx!.lineTo(-size * 0.78, size * 0.65);
      ctx!.lineTo(-size * 0.12, size * 0.48);
      ctx!.closePath();
      ctx!.fillStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.fill();

      // Right fin
      ctx!.beginPath();
      ctx!.moveTo(size * 0.38, size * 0.18);
      ctx!.lineTo(size * 0.78, size * 0.65);
      ctx!.lineTo(size * 0.12, size * 0.48);
      ctx!.closePath();
      ctx!.fillStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.fill();

      // Flame
      const fl = ctx!.createRadialGradient(0, size * 0.62, 0, 0, size * 1.0, size * 0.55);
      fl.addColorStop(0, `rgba(255,215,60,${alpha * 1.1})`);
      fl.addColorStop(0.4, `rgba(255,100,20,${alpha * 0.7})`);
      fl.addColorStop(1, `rgba(255,40,0,0)`);
      ctx!.beginPath();
      ctx!.ellipse(0, size * 0.82, size * 0.24, size * 0.52, 0, 0, Math.PI * 2);
      ctx!.fillStyle = fl; ctx!.fill();

      ctx!.restore();
    }

    // Full detailed astronaut — restored from original
    function drawAstronaut(x: number, y: number, size: number, alpha: number, rotation: number, col: string) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(rotation);
      ctx!.globalAlpha = alpha;

      const s = size;

      // Body suit
      ctx!.beginPath();
      ctx!.ellipse(0, s * 0.12, s * 0.38, s * 0.44, 0, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.55})`;
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.35})`;
      ctx!.lineWidth = 1.2;
      ctx!.stroke();

      // Helmet
      ctx!.beginPath();
      ctx!.arc(0, -s * 0.35, s * 0.3, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.45})`;
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      // Visor
      ctx!.beginPath();
      ctx!.ellipse(0, -s * 0.35, s * 0.18, s * 0.14, 0, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.9})`;
      ctx!.fill();

      // Visor shine
      ctx!.beginPath();
      ctx!.ellipse(-s * 0.06, -s * 0.4, s * 0.05, s * 0.035, -0.5, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
      ctx!.fill();

      // Left arm
      ctx!.beginPath();
      ctx!.moveTo(-s * 0.35, -s * 0.05);
      ctx!.bezierCurveTo(-s * 0.65, s * 0.0, -s * 0.7, s * 0.3, -s * 0.5, s * 0.42);
      ctx!.lineWidth = s * 0.16;
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.lineCap = "round";
      ctx!.stroke();

      // Right arm
      ctx!.beginPath();
      ctx!.moveTo(s * 0.35, -s * 0.05);
      ctx!.bezierCurveTo(s * 0.65, s * 0.0, s * 0.7, s * 0.3, s * 0.5, s * 0.42);
      ctx!.lineWidth = s * 0.16;
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.stroke();

      // Left leg
      ctx!.beginPath();
      ctx!.moveTo(-s * 0.2, s * 0.52);
      ctx!.bezierCurveTo(-s * 0.25, s * 0.75, -s * 0.35, s * 0.85, -s * 0.3, s * 0.95);
      ctx!.lineWidth = s * 0.15;
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.45})`;
      ctx!.stroke();

      // Right leg
      ctx!.beginPath();
      ctx!.moveTo(s * 0.2, s * 0.52);
      ctx!.bezierCurveTo(s * 0.25, s * 0.75, s * 0.35, s * 0.85, s * 0.3, s * 0.95);
      ctx!.lineWidth = s * 0.15;
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.45})`;
      ctx!.stroke();

      // Chest panel
      ctx!.beginPath();
      ctx!.roundRect(-s * 0.14, -s * 0.05, s * 0.28, s * 0.22, s * 0.04);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.7})`;
      ctx!.fill();

      // Tether
      ctx!.beginPath();
      ctx!.moveTo(s * 0.38, s * 0.12);
      ctx!.bezierCurveTo(s * 0.6, -s * 0.1, s * 0.8, s * 0.2, s * 0.9, s * 0.05);
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.3})`;
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
      const baseColor = dark ? "200,210,255" : "99,102,241";

      // Particles
      for (const p of particles) {
        p.pulse += p.pulseSpeed;
        const ga = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        ctx.save();
        if (p.shape === "dot") {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${baseColor},${ga * 1.2})`; ctx.fill();
        } else if (p.shape === "ring") {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${baseColor},${ga * 0.45})`; ctx.lineWidth = 0.8; ctx.stroke();
        } else if (p.shape === "cross") {
          const ss = p.r * 1.8;
          ctx.strokeStyle = `rgba(${baseColor},${ga * 0.45})`; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(p.x - ss, p.y); ctx.lineTo(p.x + ss, p.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p.x, p.y - ss); ctx.lineTo(p.x, p.y + ss); ctx.stroke();
        } else {
          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
          gr.addColorStop(0, `rgba(${baseColor},${ga})`);
          gr.addColorStop(1, `rgba(${baseColor},0)`);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = gr; ctx.fill();
        }
        ctx.restore();
      }

      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${baseColor},${(1 - dist / 110) * 0.05})`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }

      // Rockets
      rocketSpawnTimer++;
      if (rocketSpawnTimer > 300 && rockets.length < 4) { spawnRocket(); rocketSpawnTimer = 0; }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.wobble += r.wobbleSpeed;
        const wa = r.angle + Math.sin(r.wobble) * 0.05;
        r.x += Math.cos(wa) * r.speed;
        r.y += Math.sin(wa) * r.speed;
        r.trailPoints.unshift({ x: r.x, y: r.y });
        if (r.trailPoints.length > 60) r.trailPoints.pop();

        for (let tt = 0; tt < r.trailPoints.length - 1; tt++) {
          const prog = 1 - tt / r.trailPoints.length;
          ctx.beginPath();
          ctx.moveTo(r.trailPoints[tt].x, r.trailPoints[tt].y);
          ctx.lineTo(r.trailPoints[tt + 1].x, r.trailPoints[tt + 1].y);
          ctx.strokeStyle = `rgba(${baseColor},${prog * r.alpha * 0.28})`;
          ctx.lineWidth = prog * 2.5;
          ctx.stroke();
        }

        drawRocket(r.x, r.y, wa, r.size, r.alpha, baseColor);

        const margin = 150;
        if (r.x < -margin || r.x > canvas.width + margin || r.y < -margin || r.y > canvas.height + margin) {
          rockets.splice(i, 1); rocketSpawnTimer = 350;
        }
      }

      // Astronauts
      for (const a of astronauts) {
        a.phase += a.orbitSpeed;
        a.bobPhase += a.bobSpeed;
        a.rotation += a.rotSpeed;

        const px = (a.cx + Math.cos(a.phase) * a.orbitRx) * canvas.width;
        const py = (a.cy + Math.sin(a.phase) * a.orbitRy + Math.sin(a.bobPhase) * 0.008) * canvas.height;

        drawAstronaut(px, py, a.size, a.alpha, a.rotation, baseColor);
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
    ? { transformOrigin: "28px 62px", animation: `legSwingL ${dur} ease-in-out infinite` }
    : {};
  const legR: React.CSSProperties = walking
    ? { transformOrigin: "36px 62px", animation: `legSwingR ${dur} ease-in-out infinite` }
    : {};
  const armL: React.CSSProperties = walking
    ? { transformOrigin: "20px 38px", animation: `armSwingL ${dur} ease-in-out infinite` }
    : {};
  const armR: React.CSSProperties = walking
    ? { transformOrigin: "44px 38px", animation: `armSwingR ${dur} ease-in-out infinite` }
    : {};
  const bodyAnim: React.CSSProperties = walking
    ? { animation: `bodyBob ${dur} ease-in-out infinite` }
    : { animation: "idleSway 3s ease-in-out infinite" };

  return (
    <svg width="64" height="98" viewBox="0 0 64 98" style={{ overflow: "visible" }}>
      {/* Left leg — behind body */}
      <g style={legL}>
        <rect x="24" y="62" width="8" height="23" rx="4" fill="#2c2c2a"/>
        <ellipse cx="28" cy="87" rx="8" ry="3.5" fill="#1a1a18"/>
      </g>
      {/* Body group bobs */}
      <g style={bodyAnim}>
        {/* Hair */}
        <path d="M18 14 Q20 3 32 3 Q44 3 46 14" fill="#2c2c2a"/>
        {/* Head */}
        <circle cx="32" cy="18" r="14" fill="#F4C563"/>
        {/* Eyes */}
        <g style={{ transformOrigin:"26px 16px", animation:"eyeBlink 3.8s ease-in-out infinite" }}>
          <circle cx="26" cy="16" r="2.5" fill="#2c2c2a"/>
        </g>
        <g style={{ transformOrigin:"38px 16px", animation:"eyeBlink 3.8s ease-in-out infinite 0.14s" }}>
          <circle cx="38" cy="16" r="2.5" fill="#2c2c2a"/>
        </g>
        {/* Eyebrows */}
        <path d="M23 10.5 Q26 9 29 10.5" stroke="#2c2c2a" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
        <path d="M35 10.5 Q38 9 41 10.5" stroke="#2c2c2a" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
        {/* Mouth */}
        <path d={speaking ? "M24 24 Q32 32 40 24" : "M27 23.5 Q32 27.5 37 23.5"} stroke="#2c2c2a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* Body / shirt */}
        <rect x="20" y="32" width="24" height="30" rx="5" fill="#4A8FE8"/>
        {/* Collar */}
        <path d="M28 32 L32 39 L36 32" fill="#3a7fd4"/>
        {/* Backpack */}
        <rect x="9" y="34" width="12" height="20" rx="3" fill="#E05A4E"/>
        <rect x="11" y="32" width="8" height="5" rx="2" fill="#C94A40"/>
        <rect x="12" y="40" width="6" height="1.5" rx="1" fill="#C94A40" opacity="0.6"/>
        <rect x="12" y="44" width="6" height="1.5" rx="1" fill="#C94A40" opacity="0.6"/>
      </g>
      {/* Left arm */}
      <g style={armL}>
        <path d="M20 38 Q12 44 10 53" stroke="#F4C563" strokeWidth="7" strokeLinecap="round" fill="none"/>
      </g>
      {/* Right arm + book */}
      <g style={armR}>
        <path d="M44 38 Q52 44 54 53" stroke="#F4C563" strokeWidth="7" strokeLinecap="round" fill="none"/>
        <rect x="51" y="48" width="12" height="15" rx="2" fill="#E8C055"/>
        <rect x="52" y="49" width="2" height="13" rx="1" fill="#D4A843"/>
      </g>
      {/* Right leg — in front */}
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
    ? { transformOrigin: "24px 76px", animation: `robotLegL ${dur} ease-in-out infinite` }
    : {};
  const legR: React.CSSProperties = walking
    ? { transformOrigin: "40px 76px", animation: `robotLegR ${dur} ease-in-out infinite` }
    : {};
  const armL: React.CSSProperties = walking
    ? { transformOrigin: "10px 50px", animation: `armSwingL ${dur} ease-in-out infinite` }
    : {};
  const armR: React.CSSProperties = walking
    ? { transformOrigin: "54px 50px", animation: `armSwingR ${dur} ease-in-out infinite` }
    : {};
  const rootAnim: React.CSSProperties = walking
    ? { animation: `bodyBob ${dur} ease-in-out infinite` }
    : { animation: "floatIdle 3s ease-in-out infinite" };

  return (
    <svg width="64" height="98" viewBox="0 0 64 98" style={{ overflow:"visible", ...rootAnim }}>
      {/* Antenna */}
      <line x1="32" y1="2" x2="32" y2="11" stroke="#3B8BD4" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="32" cy="2" r={thinking ? 6 : 4}
        fill={thinking ? "#FCDE5A" : "#3B8BD4"}
        style={{ transition:"all 0.3s ease", animation: thinking ? "glowPulse 0.65s ease-in-out infinite" : "glowPulse 2.5s ease-in-out infinite" }}/>
      {thinking && <circle cx="32" cy="2" r="10" fill="#FCDE5A" opacity="0.18" style={{ animation:"glowPulse 0.65s ease-in-out infinite" }}/>}

      {/* Head */}
      <rect x="12" y="10" width="40" height="32" rx="9" fill="#3B8BD4"/>
      {/* Screen */}
      <rect x="17" y="15" width="30" height="22" rx="5"
        fill={thinking ? "#FFF9E6" : "#E6F1FB"}
        style={{ transition:"fill 0.4s ease" }}/>

      {/* Eyes with blink */}
      <g style={{ transformOrigin:"26px 26px", animation:"eyeBlink 4.2s ease-in-out infinite" }}>
        <circle cx="26" cy="26" r="5" fill={thinking ? "#BA7517" : "#185FA5"} style={{ transition:"fill 0.3s" }}/>
      </g>
      <g style={{ transformOrigin:"38px 26px", animation:"eyeBlink 4.2s ease-in-out infinite 0.18s" }}>
        <circle cx="38" cy="26" r="5" fill={thinking ? "#BA7517" : "#185FA5"} style={{ transition:"fill 0.3s" }}/>
      </g>
      <circle cx="27.5" cy="24.5" r="2" fill="white"/>
      <circle cx="39.5" cy="24.5" r="2" fill="white"/>

      {/* Mouth */}
      {thinking
        ? <path d="M26 33 Q32 30 38 33" stroke="#BA7517" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        : <path d="M25 34 Q32 38 39 34" stroke="#185FA5" strokeWidth="1.5" fill="none" strokeLinecap="round"/>}

      {/* Neck */}
      <rect x="27" y="42" width="10" height="6" rx="3" fill="#185FA5"/>
      {/* Body */}
      <rect x="14" y="48" width="36" height="28" rx="7" fill="#185FA5"/>
      {/* Chest panel */}
      <rect x="19" y="54" width="26" height="14" rx="4" fill="#3B8BD4"/>
      <circle cx="26" cy="61" r="3" fill="#FCDE5A"/>
      <circle cx="32" cy="61" r="3" fill="#5DCAA5"/>
      <circle cx="38" cy="61" r="3" fill="#E05A4E"/>

      {/* Left leg — behind */}
      <g style={legL}>
        <rect x="19" y="76" width="11" height="15" rx="5" fill="#3B8BD4"/>
        <ellipse cx="24" cy="93" rx="8" ry="3.5" fill="#185FA5"/>
      </g>
      {/* Left arm */}
      <g style={armL}>
        <rect x="5" y="50" width="10" height="22" rx="5" fill="#3B8BD4"/>
        <circle cx="10" cy="74" r="6" fill="#185FA5"/>
      </g>
      {/* Right arm */}
      <g style={armR}>
        <rect x="49" y="50" width="10" height="22" rx="5" fill="#3B8BD4"/>
        <circle cx="54" cy="74" r="6" fill="#185FA5"/>
      </g>
      {/* Right leg — in front */}
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
  const [studentBubble, setStudentBubble]     = useState("I need help with my exam! 😅");
  const [aiBubble, setAiBubble]               = useState("Hey! Ask me anything about studying 🤖");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const msgIdRef   = useRef(0);

  // Walk-in on mount then stop
  useEffect(() => {
    const t = setTimeout(() => { setStudentWalking(false); setRobotWalking(false); }, 1050);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = useCallback((text?: string) => {
    const msg = (text ?? inputValue).trim();
    if (!msg || isTyping) return;
    setInputValue("");

    setMessages(prev => [...prev, { id: ++msgIdRef.current, role: "user", text: msg }]);
    setStudentBubble(msg.length > 44 ? msg.slice(0,41)+"…" : msg);
    setStudentSpeaking(true);
    setStudentWalking(true);
    setRobotThinking(true);
    setIsTyping(true);

    setTimeout(() => { setStudentWalking(false); setStudentSpeaking(false); }, 720);

    const delay = 1300 + Math.random() * 500;
    setTimeout(() => {
      const resp = getAIResponse(msg);
      setMessages(prev => [...prev, { id: ++msgIdRef.current, role: "ai", text: resp.text }]);
      setAiBubble(resp.text.length > 52 ? resp.text.slice(0,49)+"…" : resp.text);
      setIsTyping(false);
      setRobotThinking(false);
    }, delay);
  }, [inputValue, isTyping]);

  const CHIPS = [
    { label: "Exam in 3 days 😰",      msg: "I have an exam in 3 days and I'm really stressed" },
    { label: "Need a study plan 📅",   msg: "I need a study plan for my upcoming exam" },
    { label: "Active recall 🧠",       msg: "Help me understand flashcards and active recall" },
    { label: "Just uploaded notes 📄", msg: "I just uploaded my notes, what should I do next?" },
  ];

  return (
    <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.45)] dark:bg-[rgb(var(--card2)/0.35)] backdrop-blur-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-[rgb(var(--border))]">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
          <div className="h-6 w-6 rounded-lg bg-[rgb(var(--fg))] flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-[rgb(var(--bg))]"/>
          </div>
          Ask the AI Tutor
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400"
            style={{ animation:"glowPulse 2s ease-in-out infinite" }}/>
          <span className="text-[11px] text-[rgb(var(--muted2))] font-medium">Online · Always available</span>
        </div>
      </div>

      {/* Scene */}
      <div className="relative px-6 pt-6 pb-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--card)/0.22)] overflow-hidden">

        {/* Walking path dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-64 flex justify-between items-center"
          style={{ animation:"pathDotIn 0.6s ease-out 0.8s both" }}>
          {Array.from({length:16}).map((_,i)=>(
            <span key={i} className="h-1 w-1 rounded-full bg-[rgb(var(--border))]"
              style={{ opacity:0.2+(i%3)*0.12 }}/>
          ))}
        </div>

        {/* Characters row */}
        <div className="relative flex items-end justify-center gap-12 max-w-sm mx-auto">

          {/* Student */}
          <div className="flex flex-col items-center gap-1.5 z-10"
            style={{ animation:"studentEnter 0.75s cubic-bezier(0.22,1,0.36,1) both" }}>

            <div key={studentBubble}
              className="relative rounded-2xl rounded-bl-sm px-3 py-2 max-w-[150px] min-w-[90px] text-[11px] leading-relaxed font-medium shadow-sm"
              style={{
                background:"rgb(var(--card))",
                border:"1px solid rgb(var(--border))",
                color:"rgb(var(--fg))",
                animation:"bubblePop 0.38s cubic-bezier(0.175,0.885,0.32,1.275) both",
              }}>
              {studentBubble}
              <span className="absolute -bottom-[7px] left-5 w-3.5 h-3.5 rotate-45"
                style={{ background:"rgb(var(--card))", borderRight:"1px solid rgb(var(--border))", borderBottom:"1px solid rgb(var(--border))" }}/>
            </div>

            <StudentCharacter walking={studentWalking} speaking={studentSpeaking}/>

            <span className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--muted2))] flex items-center gap-1">
              <GraduationCap className="h-3 w-3"/> Student
            </span>
          </div>

          {/* Arrows */}
          <div className="flex flex-col items-center gap-0.5 pb-12 flex-shrink-0">
            {[0,1,2].map(i=>(
              <span key={i} className="text-[rgb(var(--border))] text-xl leading-none select-none"
                style={{ opacity:0.25+(i*0.2), animation:`glowPulse ${1+i*0.35}s ease-in-out ${i*0.18}s infinite` }}>›</span>
            ))}
          </div>

          {/* Robot */}
          <div className="flex flex-col items-center gap-1.5 z-10"
            style={{ animation:"robotEnter 0.75s cubic-bezier(0.22,1,0.36,1) 0.1s both" }}>

            <div key={aiBubble}
              className="relative rounded-2xl rounded-br-sm px-3 py-2 max-w-[150px] min-w-[90px] text-[11px] leading-relaxed font-medium shadow-sm bg-sky-500/10 border border-sky-400/30 text-sky-700 dark:text-sky-300"
              style={{ animation:"bubblePop 0.38s cubic-bezier(0.175,0.885,0.32,1.275) both" }}>
              {isTyping
                ? <span className="flex items-center gap-1">
                    {[0,1,2].map(i=>(
                      <span key={i} className="h-1.5 w-1.5 rounded-full bg-sky-400 inline-block"
                        style={{ animation:`dotBounce 1.2s ease-in-out ${i*0.16}s infinite` }}/>
                    ))}
                  </span>
                : aiBubble}
              <span className="absolute -bottom-[7px] right-5 w-3.5 h-3.5 rotate-45 bg-sky-500/10 border-r border-b border-sky-400/30"/>
            </div>

            <RobotCharacter walking={robotWalking} thinking={robotThinking}/>

            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500 dark:text-sky-400 flex items-center gap-1">
              <Bot className="h-3 w-3"/> AI Tutor
            </span>
          </div>
        </div>
      </div>

      {/* Chat log */}
      <div className="px-6 py-4 max-h-72 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-[rgb(var(--muted2))] py-5 leading-relaxed">
            Tap a suggestion or type your question — I'll point you to the right tool ✨
          </p>
        )}

        {messages.map(msg=>(
          <div key={msg.id}
            className={`flex gap-2.5 ${msg.role==="user" ? "justify-end" : "justify-start"}`}
            style={{ animation:"msgSlideIn 0.28s ease-out both" }}>

            {msg.role==="ai" && (
              <div className="h-7 w-7 rounded-full bg-sky-100 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400"/>
              </div>
            )}

            <div className="flex flex-col gap-1.5 max-w-[78%]">
              <div className={[
                "rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                msg.role==="user"
                  ? "rounded-tr-sm bg-[rgb(var(--fg))] text-[rgb(var(--bg))]"
                  : "rounded-tl-sm bg-sky-500/10 border border-sky-400/20 text-[rgb(var(--fg))]",
              ].join(" ")}>
                {msg.text}
              </div>


            </div>

            {msg.role==="user" && (
              <div className="h-7 w-7 rounded-full bg-[rgb(var(--card2))] border border-[rgb(var(--border))] flex items-center justify-center flex-shrink-0 mt-0.5">
                <GraduationCap className="h-3.5 w-3.5 text-[rgb(var(--muted))]"/>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5 justify-start" style={{ animation:"msgSlideIn 0.2s ease-out both" }}>
            <div className="h-7 w-7 rounded-full bg-sky-100 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-800 flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400"/>
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-sky-500/10 border border-sky-400/20 px-2">
              <TypingDots/>
            </div>
          </div>
        )}
        <div ref={chatEndRef}/>
      </div>

      {/* Chips */}
      <div className="px-6 pb-3 flex flex-wrap gap-1.5">
        {CHIPS.map(chip=>(
          <button key={chip.msg} onClick={()=>handleSend(chip.msg)} disabled={isTyping}
            className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.6)] hover:bg-[rgb(var(--card)/0.9)] hover:border-[rgb(var(--fg)/0.2)] disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-[11px] font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-all duration-150 hover:-translate-y-0.5 active:scale-95">
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 pb-5">
        <div className="flex gap-2.5 items-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.8)] px-4 py-1 focus-within:border-sky-400/50 transition-colors duration-200">
          <input
            type="text"
            value={inputValue}
            onChange={e=>setInputValue(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); handleSend(); } }}
            disabled={isTyping}
            placeholder="Ask about studying, exam prep, or the tools…"
            autoComplete="off"
            className="flex-1 bg-transparent text-xs text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] outline-none py-2.5 disabled:opacity-50"
          />
          <button onClick={()=>handleSend()} disabled={isTyping||!inputValue.trim()}
            className="h-7 w-7 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:bg-[rgb(var(--border))] disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150 flex-shrink-0 active:scale-95">
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
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200",
        active
          ? "bg-[rgb(var(--fg))] text-[rgb(var(--bg))] shadow-[0_4px_20px_rgb(var(--shadow)/0.3)] scale-[1.02]"
          : "bg-transparent border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:border-[rgb(var(--fg)/0.3)] hover:scale-[1.01]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ── Step Card ──────────────────────────────────────────────────────────────
function StepCard({ num, title, desc, icon: Icon, accentClass, lineClass }: {
  num: number; title: string; desc: string; icon: any; accentClass: string; lineClass: string;
}) {
  return (
    <div className="group relative rounded-2xl border p-5 overflow-hidden border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] dark:bg-[rgb(var(--card)/0.5)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:bg-[rgb(var(--card)/0.92)] dark:hover:bg-[rgb(var(--card)/0.85)] hover:shadow-[0_20px_56px_rgb(var(--shadow)/0.22)]">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
      <span className="absolute -right-1 -top-3 text-[5rem] font-black leading-none text-[rgb(var(--fg)/0.04)] select-none pointer-events-none group-hover:text-[rgb(var(--fg)/0.08)] transition-colors duration-300">{num}</span>
      <div className="relative flex items-start gap-3">
        <div className={["h-9 w-9 shrink-0 rounded-xl inline-flex items-center justify-center bg-[rgb(var(--card2)/0.8)] border border-[rgb(var(--border))] transition-transform duration-300 group-hover:scale-110", accentClass].join(" ")}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--muted2))] mt-2">Step {num}</div>
      </div>
      <div className="relative mt-4 text-sm font-semibold text-[rgb(var(--fg))] leading-snug">{title}</div>
      <p className="relative mt-1.5 text-xs text-[rgb(var(--muted))] leading-relaxed">{desc}</p>
      <div className="relative mt-5 h-px w-full overflow-hidden rounded-full bg-[rgb(var(--border))]">
        <div className={`h-full w-0 group-hover:w-3/4 transition-all duration-500 ease-out rounded-full ${lineClass}`} />
      </div>
    </div>
  );
}

// ── Quick Card ─────────────────────────────────────────────────────────────
function QuickCard({ title, desc, icon: Icon, href, tag, accentClass, tagBg, tagText }: {
  title: string; desc: string; icon: any; href: string; tag: string; accentClass: string; tagBg: string; tagText: string;
}) {
  return (
    <Link href={href} className="group relative rounded-2xl border p-5 overflow-hidden flex flex-col border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] dark:bg-[rgb(var(--card)/0.5)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:bg-[rgb(var(--card)/0.92)] dark:hover:bg-[rgb(var(--card)/0.85)] hover:shadow-[0_20px_56px_rgb(var(--shadow)/0.22)]">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-[rgb(var(--primary)/0.05)] to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <div className={["h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0 border border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.8)] transition-all duration-300 group-hover:scale-110", accentClass].join(" ")}>
          <Icon className="h-4 w-4" />
        </div>
        <span className={["text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-1", tagBg, tagText].join(" ")}>{tag}</span>
      </div>
      <div className="relative mt-4 text-sm font-semibold text-[rgb(var(--fg))] leading-snug">{title}</div>
      <p className="relative mt-1.5 text-xs text-[rgb(var(--muted))] leading-relaxed flex-1">{desc}</p>
      <div className="relative mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--primary))]">
        Get started
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1.5 transition-transform duration-200" />
      </div>
    </Link>
  );
}

// ── Stat Pill ──────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] dark:bg-[rgb(var(--card)/0.5)] backdrop-blur-sm px-3.5 py-2 text-xs">
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-[rgb(var(--muted))]">{label}</span>
      <span className="font-semibold text-[rgb(var(--fg))]">{value}</span>
    </div>
  );
}

// ── How-it-works data per tab ──────────────────────────────────────────────
const HOW_HUB = [
  { num: 1, title: "Upload Content",        desc: "Upload a PDF or paste notes. Best for text PDFs (slides exported).",        icon: Plus,         accentClass: "text-sky-500 dark:text-sky-400",       lineClass: "bg-sky-400"     },
  { num: 2, title: "AI Processing",         desc: "AI extracts & organises: summary, key concepts, flashcards, and quizzes.",  icon: Brain,        accentClass: "text-violet-500 dark:text-violet-400", lineClass: "bg-violet-400"  },
  { num: 3, title: "Study Materials Ready", desc: "Your full study pack appears instantly — browse inside the Study Hub.",     icon: BookOpen,     accentClass: "text-emerald-500 dark:text-emerald-400",lineClass: "bg-emerald-400" },
  { num: 4, title: "Active Recall",         desc: "Quiz yourself with flashcards and practice tests to lock in the material.", icon: Target,       accentClass: "text-rose-500 dark:text-rose-400",     lineClass: "bg-rose-400"    },
];

const HOW_PLAN = [
  { num: 1, title: "Set Your Exam Date",   desc: "Tell the AI your exam date, subject, and difficulty level.",         icon: CalendarClock, accentClass: "text-sky-500 dark:text-sky-400",       lineClass: "bg-sky-400"     },
  { num: 2, title: "Enter Available Time", desc: "Share how many hours per day you can dedicate to studying.",         icon: Zap,           accentClass: "text-violet-500 dark:text-violet-400", lineClass: "bg-violet-400"  },
  { num: 3, title: "AI Builds Your Plan",  desc: "Get a personalised weekly schedule with daily goals and topics.",   icon: Brain,         accentClass: "text-emerald-500 dark:text-emerald-400",lineClass: "bg-emerald-400" },
  { num: 4, title: "Follow & Master",      desc: "Tick off daily tasks and stay on track all the way to exam day.",   icon: ListChecks,    accentClass: "text-rose-500 dark:text-rose-400",     lineClass: "bg-rose-400"    },
];

// ── Main Page ──────────────────────────────────────────────────────────────
export default function StudyMain() {
  const router = useRouter();
  const sp = useSearchParams();

  const urlTab = (sp.get("tab") ?? "hub") as "hub" | "plan";
  const [tab, setTabState] = useState<"hub" | "plan">(urlTab);

  useEffect(() => {
    setTabState(urlTab);
  }, [urlTab]);

  function setTab(next: "hub" | "plan") {
    if (next === tab) return;
    setTabState(next);
    router.replace(`/study?tab=${next}`);
  }

  const howItWorks = tab === "hub" ? HOW_HUB : HOW_PLAN;
  const modeLabel = tab === "hub" ? "Active Recall Engine" : "AI Study Plan Generator";

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <style>{GLOBAL_ANIM}</style>
      <FloatingParticles />

      {/* Background atmosphere — restored from original */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full blur-3xl bg-[rgb(var(--shadow)/0.14)]" />
        <div className="absolute top-1/3 right-[-8rem] h-96 w-96 rounded-full blur-3xl bg-[rgb(var(--primary2)/0.09)]" />
        <div className="absolute bottom-0 left-[-6rem] h-64 w-64 rounded-full blur-3xl bg-[rgb(var(--primary)/0.07)]" />
        <div
          className="absolute inset-0 opacity-[0.022] dark:opacity-[0.038]"
          style={{
            backgroundImage: `linear-gradient(rgb(var(--fg)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--fg)) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative z-10 pt-10 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-5">

          {/* ── Header ── */}
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] dark:bg-[rgb(var(--card)/0.5)] text-[rgb(var(--muted))] backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                AI Learning Suite
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight leading-tight">
                Simple.{" "}
                <span className="text-[rgb(var(--muted))]">Powerful.</span>{" "}
                <span className="relative inline-block">
                  Intelligent.
                  <span className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-gradient-to-r from-violet-500 via-sky-400 to-emerald-400 opacity-70" />
                </span>
              </h1>

              {/* Stat pills */}
              <div className="mt-4 flex flex-wrap gap-2">
                <StatPill icon={Zap}          label="AI-powered"    value="Instant"  color="text-amber-400" />
                <StatPill icon={Brain}         label="Recall Engine" value="Active"   color="text-violet-500 dark:text-violet-400" />
                <StatPill icon={CalendarClock} label="Plans"         value="Adaptive" color="text-sky-500 dark:text-sky-400" />
              </div>

              {/* Tabs */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] dark:bg-[rgb(var(--card)/0.5)] backdrop-blur-sm p-1">
                  <TabButton active={tab === "hub"}  onClick={() => setTab("hub")}>
                    <BookOpen className="h-3.5 w-3.5" />
                    Study Hub
                  </TabButton>
                  <TabButton active={tab === "plan"} onClick={() => setTab("plan")}>
                    <CalendarClock className="h-3.5 w-3.5" />
                    Study Plan
                  </TabButton>
                </div>

                <span
                  key={modeLabel}
                  className="text-[11px] text-[rgb(var(--muted2))] pl-1"
                  style={{ animation: "labelFadeIn 0.22s ease-out both" }}
                >
                  — {modeLabel}
                </span>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/study/hub/upload"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-[rgb(var(--bg))] bg-[rgb(var(--fg))] hover:opacity-85 active:scale-95 shadow-[0_8px_24px_rgb(var(--shadow)/0.2)] transition-all duration-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Material
            </Link>
          </header>

          {/* ── AI Chat Widget ── */}
          <AIChatWidget />

          {/* ── How it Works ── */}
          <section className="rounded-2xl border p-6 border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.45)] dark:bg-[rgb(var(--card2)/0.35)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 pb-5 border-b border-[rgb(var(--border))]">
              <div
                key={`title-${tab}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]"
                style={{ animation: "labelFadeIn 0.22s ease-out both" }}
              >
                <div className="h-6 w-6 rounded-lg bg-[rgb(var(--fg))] flex items-center justify-center">
                  <Wand2 className="h-3.5 w-3.5 text-[rgb(var(--bg))]" />
                </div>
                How {tab === "hub" ? "Study Hub" : "Study Plan"} Works
              </div>
              <div
                key={`meta-${tab}`}
                className="text-[11px] text-[rgb(var(--muted2))] font-medium"
                style={{ animation: "labelFadeIn 0.25s ease-out both" }}
              >
                {modeLabel} · 4 steps
              </div>
            </div>

            <div
              key={tab}
              className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3"
              style={{ animation: "stepFadeIn 0.3s ease-out both" }}
            >
              {howItWorks.map((s, i) => (
                <div
                  key={s.num}
                  style={{ animation: `stepFadeIn 0.3s ease-out ${i * 55}ms both` }}
                >
                  <StepCard {...s} />
                </div>
              ))}
            </div>
          </section>

          {/* ── Quick Actions ── */}
          <section className="rounded-2xl border p-6 border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.45)] dark:bg-[rgb(var(--card2)/0.35)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 pb-5 border-b border-[rgb(var(--border))]">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">Quick Actions</div>
              <div className="text-[11px] text-[rgb(var(--muted2))] font-medium">Pick a workflow</div>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <QuickCard title="Active Recall Study Hub"  desc="Browse your materials, generate study packs, and quiz yourself."  icon={BookOpen}     href="/study/hub"        tag="Essential" accentClass="text-emerald-500 dark:text-emerald-400" tagBg="bg-emerald-500/10" tagText="text-emerald-600 dark:text-emerald-400" />
              <QuickCard title="AI Study Plan Generator"  desc="Generate a weekly plan based on exam date + available time."       icon={CalendarClock} href="/study/plan"       tag="New"       accentClass="text-sky-500 dark:text-sky-400"     tagBg="bg-sky-500/10"     tagText="text-sky-600 dark:text-sky-400" />
              <QuickCard title="Upload New Material"      desc="Add lecture notes or a PDF to create a study pack instantly."      icon={Plus}          href="/study/hub/upload" tag="Fast"      accentClass="text-rose-500 dark:text-rose-400"   tagBg="bg-rose-500/10"    tagText="text-rose-600 dark:text-rose-400" />
            </div>
          </section>

          {/* ── AI Tip Banner ── */}
          <div className="relative rounded-2xl border border-[rgb(var(--border))] bg-gradient-to-r from-violet-500/[0.07] via-sky-500/[0.05] to-emerald-500/[0.07] dark:from-violet-500/10 dark:via-sky-500/[0.07] dark:to-emerald-500/10 backdrop-blur-sm p-5 overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgb(139 92 246 / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgb(14 165 233 / 0.3) 0%, transparent 50%)" }} />
            <div className="relative flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[rgb(var(--fg))]">Pro tip: Use the Active Recall method</p>
                <p className="text-[11px] text-[rgb(var(--muted))] mt-0.5 leading-relaxed">Studies show active recall improves long-term retention by up to 50% vs passive re-reading. Upload your notes and start quizzing yourself today.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}