"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Wand2,
  CalendarClock,
  BookOpen,
  Brain,
  ArrowRight,
  Plus,
  Zap,
  Target,
  ListChecks,
} from "lucide-react";

// ── Floating Particles + Rockets + Astronauts Canvas ─────────────────────
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

    // Astronauts float in a fixed lazy orbit/drift — always on screen
    const astronauts: {
      cx: number; cy: number;          // centre of drift orbit
      orbitRx: number; orbitRy: number; // orbit radii
      phase: number;                    // current angle in orbit
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

    // Particles
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

    // Rockets
    function spawnRocket() {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0, angle = 0;
      if (side === 0) { x = -60; y = Math.random() * canvas!.height; angle = (Math.random() * 0.5 - 0.25); }
      else if (side === 1) { x = canvas!.width + 60; y = Math.random() * canvas!.height; angle = Math.PI + (Math.random() * 0.5 - 0.25); }
      else if (side === 2) { x = Math.random() * canvas!.width; y = -60; angle = Math.PI / 2 + (Math.random() * 0.5 - 0.25); }
      else { x = Math.random() * canvas!.width; y = canvas!.height + 60; angle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25); }
      // Bigger sizes: 32–58px
      rockets.push({ x, y, angle, speed: 0.8 + Math.random() * 1.0, size: 32 + Math.random() * 26, alpha: 0.32 + Math.random() * 0.28, trailPoints: [], wobble: 0, wobbleSpeed: 0.016 + Math.random() * 0.012 });
    }
    for (let i = 0; i < 3; i++) spawnRocket();

    // Astronauts — place in safe zones (corners / edges away from centre content)
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

    // ── Draw Rocket ──
    function drawRocket(x: number, y: number, angle: number, size: number, alpha: number, col: string) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(angle + Math.PI / 2);
      ctx!.globalAlpha = alpha;

      // Glow aura
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

      // Outline
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

      // Flame core
      const fl = ctx!.createRadialGradient(0, size * 0.62, 0, 0, size * 1.0, size * 0.55);
      fl.addColorStop(0, `rgba(255,215,60,${alpha * 1.1})`);
      fl.addColorStop(0.4, `rgba(255,100,20,${alpha * 0.7})`);
      fl.addColorStop(1, `rgba(255,40,0,0)`);
      ctx!.beginPath();
      ctx!.ellipse(0, size * 0.82, size * 0.24, size * 0.52, 0, 0, Math.PI * 2);
      ctx!.fillStyle = fl; ctx!.fill();

      ctx!.restore();
    }

    // ── Draw Astronaut ──
    function drawAstronaut(x: number, y: number, size: number, alpha: number, rotation: number, col: string) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(rotation);
      ctx!.globalAlpha = alpha;

      const s = size;

      // Suit body (oval torso)
      ctx!.beginPath();
      ctx!.ellipse(0, s * 0.12, s * 0.38, s * 0.44, 0, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.55})`;
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.35})`;
      ctx!.lineWidth = 1.2;
      ctx!.stroke();

      // Helmet (sphere)
      ctx!.beginPath();
      ctx!.arc(0, -s * 0.35, s * 0.3, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.45})`;
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      // Visor (darker ellipse inside helmet)
      ctx!.beginPath();
      ctx!.ellipse(0, -s * 0.35, s * 0.18, s * 0.14, 0, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.9})`;
      ctx!.fill();

      // Visor glint
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

      // Chest pack
      ctx!.beginPath();
      ctx!.roundRect(-s * 0.14, -s * 0.05, s * 0.28, s * 0.22, s * 0.04);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.7})`;
      ctx!.fill();

      // Tether line (squiggly)
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

      // ── Particles ──
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

      // Connecting lines
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

      // ── Rockets ──
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

        // Coloured trail
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

      // ── Astronauts ──
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

// ── Tab Button ─────────────────────────────────────────────────────────────
function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={["inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-300",
        active
          ? "bg-[rgb(var(--fg))] text-[rgb(var(--bg))] shadow-[0_4px_20px_rgb(var(--shadow)/0.3)] scale-[1.02]"
          : "bg-transparent border border-[rgb(var(--border))] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:border-[rgb(var(--fg)/0.3)]",
      ].join(" ")}
    >{children}</button>
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
  { num: 1, title: "Upload Content", desc: "Upload a PDF or paste notes. Best for text PDFs (slides exported).", icon: Plus, accentClass: "text-sky-500 dark:text-sky-400", lineClass: "bg-sky-400" },
  { num: 2, title: "AI Processing", desc: "AI extracts & organises: summary, key concepts, flashcards, and quizzes.", icon: Brain, accentClass: "text-violet-500 dark:text-violet-400", lineClass: "bg-violet-400" },
  { num: 3, title: "Study Materials Ready", desc: "Your full study pack appears instantly — browse inside the Study Hub.", icon: BookOpen, accentClass: "text-emerald-500 dark:text-emerald-400", lineClass: "bg-emerald-400" },
  { num: 4, title: "Active Recall", desc: "Quiz yourself with flashcards and practice tests to lock in the material.", icon: Target, accentClass: "text-rose-500 dark:text-rose-400", lineClass: "bg-rose-400" },
];

const HOW_PLAN = [
  { num: 1, title: "Set Your Exam Date", desc: "Tell the AI your exam date, subject, and difficulty level.", icon: CalendarClock, accentClass: "text-sky-500 dark:text-sky-400", lineClass: "bg-sky-400" },
  { num: 2, title: "Enter Available Time", desc: "Share how many hours per day you can dedicate to studying.", icon: Zap, accentClass: "text-violet-500 dark:text-violet-400", lineClass: "bg-violet-400" },
  { num: 3, title: "AI Builds Your Plan", desc: "Get a personalised weekly schedule with daily goals and topics.", icon: Brain, accentClass: "text-emerald-500 dark:text-emerald-400", lineClass: "bg-emerald-400" },
  { num: 4, title: "Follow & Master", desc: "Tick off daily tasks and stay on track all the way to exam day.", icon: ListChecks, accentClass: "text-rose-500 dark:text-rose-400", lineClass: "bg-rose-400" },
];

// ── Main Page ──────────────────────────────────────────────────────────────
export default function StudyMain() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp.get("tab") ?? "hub") as "hub" | "plan";

  const howItWorks = tab === "hub" ? HOW_HUB : HOW_PLAN;
  const modeLabel = tab === "hub" ? "Active Recall Engine" : "AI Study Plan Generator";

  function setTab(next: "hub" | "plan") { router.push(`/study?tab=${next}`); }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <FloatingParticles />

      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full blur-3xl bg-[rgb(var(--shadow)/0.14)]" />
        <div className="absolute top-1/3 right-[-8rem] h-96 w-96 rounded-full blur-3xl bg-[rgb(var(--primary2)/0.09)]" />
        <div className="absolute bottom-0 left-[-6rem] h-64 w-64 rounded-full blur-3xl bg-[rgb(var(--primary)/0.07)]" />
        <div className="absolute inset-0 opacity-[0.022] dark:opacity-[0.038]"
          style={{ backgroundImage: `linear-gradient(rgb(var(--fg)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--fg)) 1px, transparent 1px)`, backgroundSize: "64px 64px" }}
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
                <StatPill icon={Zap} label="AI-powered" value="Instant" color="text-amber-400" />
                <StatPill icon={Brain} label="Recall Engine" value="Active" color="text-violet-500 dark:text-violet-400" />
                <StatPill icon={CalendarClock} label="Plans" value="Adaptive" color="text-sky-500 dark:text-sky-400" />
              </div>

              {/* Tabs */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.65)] dark:bg-[rgb(var(--card)/0.5)] backdrop-blur-sm p-1">
                  <TabButton active={tab === "hub"} onClick={() => setTab("hub")}>
                    <BookOpen className="h-3.5 w-3.5" />
                    Study Hub
                  </TabButton>
                  <TabButton active={tab === "plan"} onClick={() => setTab("plan")}>
                    <CalendarClock className="h-3.5 w-3.5" />
                    Study Plan
                  </TabButton>
                </div>
                <span className="text-[11px] text-[rgb(var(--muted2))] pl-1">— {modeLabel}</span>
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

          {/* ── How it Works — switches with tab ── */}
          <section className="rounded-2xl border p-6 border-[rgb(var(--border))] bg-[rgb(var(--card2)/0.45)] dark:bg-[rgb(var(--card2)/0.35)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 pb-5 border-b border-[rgb(var(--border))]">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
                <div className="h-6 w-6 rounded-lg bg-[rgb(var(--fg))] flex items-center justify-center">
                  <Wand2 className="h-3.5 w-3.5 text-[rgb(var(--bg))]" />
                </div>
                How {tab === "hub" ? "Study Hub" : "Study Plan"} Works
              </div>
              <div className="text-[11px] text-[rgb(var(--muted2))] font-medium">
                {modeLabel} · 4 steps
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
              {howItWorks.map((s) => (
                <StepCard key={s.num} {...s} />
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
              <QuickCard title="Active Recall Study Hub" desc="Browse your materials, generate study packs, and quiz yourself." icon={BookOpen} href="/study/hub" tag="Essential" accentClass="text-emerald-500 dark:text-emerald-400" tagBg="bg-emerald-500/10" tagText="text-emerald-600 dark:text-emerald-400" />
              <QuickCard title="AI Study Plan Generator" desc="Generate a weekly plan based on exam date + available time." icon={CalendarClock} href="/study/plan" tag="New" accentClass="text-sky-500 dark:text-sky-400" tagBg="bg-sky-500/10" tagText="text-sky-600 dark:text-sky-400" />
              <QuickCard title="Upload New Material" desc="Add lecture notes or a PDF to create a study pack instantly." icon={Plus} href="/study/hub/upload" tag="Fast" accentClass="text-rose-500 dark:text-rose-400" tagBg="bg-rose-500/10" tagText="text-rose-600 dark:text-rose-400" />
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