"use client";
import { useRef, useEffect } from "react";

/**
 * <StarBackground />
 *
 * Renders an animated canvas with:
 *  - 120 twinkling star dots
 *  - 12 shooting stars with glowing heads + fading tails
 *
 * Works in both light mode and dark mode.
 * Dark mode  → pale blue-white stars on dark background
 * Light mode → deep navy/indigo stars (high opacity) + CSS filter for punch
 *
 * Usage:
 *   import StarBackground from "@/components/StarBackground";
 *
 *   export default function MyPage() {
 *     return (
 *       <div className="relative min-h-screen">
 *         <StarBackground />
 *         {/* your page content here, it sits above the canvas *\/}
 *       </div>
 *     );
 *   }
 *
 * The canvas is position:fixed so it covers the full viewport and stays
 * behind all content (z-index: 0). Your page content should sit at
 * relative z-index (z-10 or higher) to appear in front.
 */
export default function StarBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    // Detect dark mode — checked per frame so it reacts to live theme changes
    const isDark = () =>
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 1.6;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Static star field ──────────────────────────────────────────────────
    interface Dot {
      x: number; y: number;
      r: number; alpha: number;
      twinkleSpeed: number; twinkleOffset: number;
    }
    const dots: Dot[] = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.4,
      alpha: 0.2 + Math.random() * 0.55,
      twinkleSpeed: 0.008 + Math.random() * 0.018,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    // ── Shooting stars ─────────────────────────────────────────────────────
    interface Shooter {
      x: number; y: number;
      sx: number; sy: number;
      vx: number; vy: number;
      tailX: number[]; tailY: number[];
      tailMax: number;
      progress: number;
      totalFrames: number;
      opacity: number;
      delay: number;
      active: boolean;
      size: number;
    }

    const W = () => canvas.width;
    const H = () => canvas.height;

    const makeShooter = (): Shooter => {
      const sx = Math.random() * W() * 0.82;
      const sy = Math.random() * H() * 0.52;
      const angle = (30 + Math.random() * 20) * (Math.PI / 180);
      const speed = 6 + Math.random() * 7;
      return {
        x: sx, y: sy, sx, sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        tailX: [], tailY: [],
        tailMax: Math.round(18 + Math.random() * 18),
        progress: 0,
        totalFrames: Math.round(55 + Math.random() * 45),
        opacity: 0.55 + Math.random() * 0.35,
        delay: Math.round(Math.random() * 200),
        active: false,
        size: 1.4 + Math.random() * 1.2,
      };
    };

    const shooters: Shooter[] = Array.from({ length: 12 }, makeShooter);

    // ── Draw loop ──────────────────────────────────────────────────────────
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // Static dots
      for (const d of dots) {
        const tw = Math.sin(frame * d.twinkleSpeed + d.twinkleOffset) * 0.3;
        const a = Math.max(0.05, d.alpha + tw);
        ctx.beginPath();
        ctx.arc(d.x * canvas.width, d.y * canvas.height, d.r, 0, Math.PI * 2);
        ctx.fillStyle = isDark()
          ? `rgba(200,210,255,${a})`
          : `rgba(15,20,100,${a * 3.2})`;
        ctx.fill();
      }

      // Shooting stars
      for (const s of shooters) {
        if (!s.active) {
          s.delay--;
          if (s.delay <= 0) s.active = true;
          continue;
        }

        s.x += s.vx;
        s.y += s.vy;
        s.tailX.push(s.x);
        s.tailY.push(s.y);
        if (s.tailX.length > s.tailMax) { s.tailX.shift(); s.tailY.shift(); }
        s.progress++;

        if (s.progress >= s.totalFrames) {
          Object.assign(s, makeShooter());
          continue;
        }

        // Fade envelope — ramp in first 10 frames, ramp out last 14 frames
        const env =
          s.progress < 10 ? s.progress / 10
          : s.progress > s.totalFrames - 14 ? (s.totalFrames - s.progress) / 14
          : 1;
        const alpha = s.opacity * env;

        // Tail
        const len = s.tailX.length;
        if (len >= 2) {
          for (let i = 1; i < len; i++) {
            const t = i / len; // 0 = tip (oldest), 1 = head
            ctx.beginPath();
            ctx.moveTo(s.tailX[i - 1], s.tailY[i - 1]);
            ctx.lineTo(s.tailX[i], s.tailY[i]);
            ctx.strokeStyle = isDark()
              ? `rgba(230,235,255,${alpha * t * t})`
              : `rgba(10,15,120,${alpha * t * t * 4.5})`;
            ctx.lineWidth = s.size * t;
            ctx.lineCap = "round";
            ctx.stroke();
          }
        }

        // Glowing head
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3.5);
        if (isDark()) {
          grad.addColorStop(0,   `rgba(255,255,255,${alpha})`);
          grad.addColorStop(0.3, `rgba(200,210,255,${alpha * 0.7})`);
          grad.addColorStop(1,   `rgba(180,190,255,0)`);
        } else {
          grad.addColorStop(0,   `rgba(5,10,140,${alpha * 1.8})`);
          grad.addColorStop(0.3, `rgba(20,30,180,${alpha * 1.4})`);
          grad.addColorStop(1,   `rgba(40,60,200,0)`);
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = isDark()
          ? `rgba(255,255,255,${alpha})`
          : `rgba(5,10,120,${alpha * 2})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <>
      <style>{`
        .star-bg-canvas {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          pointer-events: none;
          z-index: 0;
          opacity: 0.85;
        }
        /* Light mode: boost contrast so deep-navy stars pop clearly */
        @media (prefers-color-scheme: light) {
          .star-bg-canvas { opacity: 1; filter: contrast(1.4) brightness(0.65); }
        }
        :root:not(.dark) .star-bg-canvas { opacity: 1; filter: contrast(1.4) brightness(0.65); }
      `}</style>
      <canvas ref={canvasRef} className="star-bg-canvas" aria-hidden="true" />
    </>
  );
}