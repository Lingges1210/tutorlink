"use client";

import { useEffect, useRef } from "react";

// ── Floating Particles + Rockets + Astronauts Canvas ─────────────────────
export function FloatingParticles() {
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
      rockets.push({ x, y, angle, speed: 0.8 + Math.random() * 1.0, size: 32 + Math.random() * 26, alpha: 0.32 + Math.random() * 0.28, trailPoints: [], wobble: 0, wobbleSpeed: 0.016 + Math.random() * 0.012 });
    }
    for (let i = 0; i < 3; i++) spawnRocket();

    // Astronauts
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

    function drawRocket(x: number, y: number, angle: number, size: number, alpha: number, col: string) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(angle + Math.PI / 2);
      ctx!.globalAlpha = alpha;

      const aura = ctx!.createRadialGradient(0, 0, 0, 0, 0, size * 1.8);
      aura.addColorStop(0, `rgba(${col},0.12)`);
      aura.addColorStop(1, `rgba(${col},0)`);
      ctx!.beginPath(); ctx!.arc(0, 0, size * 1.8, 0, Math.PI * 2);
      ctx!.fillStyle = aura; ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(0, -size);
      ctx!.bezierCurveTo(size * 0.42, -size * 0.5, size * 0.42, size * 0.28, 0, size * 0.52);
      ctx!.bezierCurveTo(-size * 0.42, size * 0.28, -size * 0.42, -size * 0.5, 0, -size);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.85})`;
      ctx!.fill();

      ctx!.strokeStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.arc(0, -size * 0.22, size * 0.24, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 1.5})`;
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.4})`;
      ctx!.lineWidth = 0.8;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.moveTo(-size * 0.38, size * 0.18);
      ctx!.lineTo(-size * 0.78, size * 0.65);
      ctx!.lineTo(-size * 0.12, size * 0.48);
      ctx!.closePath();
      ctx!.fillStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(size * 0.38, size * 0.18);
      ctx!.lineTo(size * 0.78, size * 0.65);
      ctx!.lineTo(size * 0.12, size * 0.48);
      ctx!.closePath();
      ctx!.fillStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.fill();

      const fl = ctx!.createRadialGradient(0, size * 0.62, 0, 0, size * 1.0, size * 0.55);
      fl.addColorStop(0, `rgba(255,215,60,${alpha * 1.1})`);
      fl.addColorStop(0.4, `rgba(255,100,20,${alpha * 0.7})`);
      fl.addColorStop(1, `rgba(255,40,0,0)`);
      ctx!.beginPath();
      ctx!.ellipse(0, size * 0.82, size * 0.24, size * 0.52, 0, 0, Math.PI * 2);
      ctx!.fillStyle = fl; ctx!.fill();

      ctx!.restore();
    }

    function drawAstronaut(x: number, y: number, size: number, alpha: number, rotation: number, col: string) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(rotation);
      ctx!.globalAlpha = alpha;

      const s = size;

      ctx!.beginPath();
      ctx!.ellipse(0, s * 0.12, s * 0.38, s * 0.44, 0, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.55})`;
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.35})`;
      ctx!.lineWidth = 1.2;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.arc(0, -s * 0.35, s * 0.3, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.45})`;
      ctx!.fill();
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.lineWidth = 1.5;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.ellipse(0, -s * 0.35, s * 0.18, s * 0.14, 0, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.9})`;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.ellipse(-s * 0.06, -s * 0.4, s * 0.05, s * 0.035, -0.5, 0, Math.PI * 2);
      ctx!.fillStyle = `rgba(255,255,255,${alpha * 0.5})`;
      ctx!.fill();

      ctx!.beginPath();
      ctx!.moveTo(-s * 0.35, -s * 0.05);
      ctx!.bezierCurveTo(-s * 0.65, s * 0.0, -s * 0.7, s * 0.3, -s * 0.5, s * 0.42);
      ctx!.lineWidth = s * 0.16;
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.lineCap = "round";
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.moveTo(s * 0.35, -s * 0.05);
      ctx!.bezierCurveTo(s * 0.65, s * 0.0, s * 0.7, s * 0.3, s * 0.5, s * 0.42);
      ctx!.lineWidth = s * 0.16;
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.5})`;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.moveTo(-s * 0.2, s * 0.52);
      ctx!.bezierCurveTo(-s * 0.25, s * 0.75, -s * 0.35, s * 0.85, -s * 0.3, s * 0.95);
      ctx!.lineWidth = s * 0.15;
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.45})`;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.moveTo(s * 0.2, s * 0.52);
      ctx!.bezierCurveTo(s * 0.25, s * 0.75, s * 0.35, s * 0.85, s * 0.3, s * 0.95);
      ctx!.lineWidth = s * 0.15;
      ctx!.strokeStyle = `rgba(${col},${alpha * 0.45})`;
      ctx!.stroke();

      ctx!.beginPath();
      ctx!.roundRect(-s * 0.14, -s * 0.05, s * 0.28, s * 0.22, s * 0.04);
      ctx!.fillStyle = `rgba(${col},${alpha * 0.7})`;
      ctx!.fill();

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

// ── Shared Study Background atmosphere blobs ─────────────────────────────
export function StudyBackground() {
  return (
    <>
      <FloatingParticles />
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
    </>
  );
}