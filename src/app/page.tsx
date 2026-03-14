"use client";
import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";

/* ─── DATA ────────────────────────────────────────────────── */

const outcomes = [
  {
    svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    title: "Less stress during peak weeks",
    desc: "When assignments pile up, reach the right people faster — no more begging in random group chats.",
  },
  {
    svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
    title: "More consistent study progress",
    desc: "Get structured help that actually moves you forward — not just one-off answers that don't stick.",
  },
  {
    svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    title: "Fair access for everyone",
    desc: "No more 'you must know seniors'. Everyone gets equal access to ask and learn.",
  },
];

const stats = [
  { label: "Campus-exclusive", value: "USM only", icon: "🏛" },
  { label: "Fast coordination", value: "Book in minutes", icon: "⏱" },
  { label: "Built for students", value: "Peer-first", icon: "👥" },
  { label: "Community trust", value: "Verified users", icon: "🛡" },
];

const reviews = [
  { initials: "ZA", name: "Zara A.", course: "Year 2 · CSC", stars: 5, quote: "I stopped wasting time asking around. Found someone who actually explains things properly." },
  { initials: "KR", name: "Kumar R.", course: "Tutor · MAT", stars: 5, quote: "Everything is organized and sessions are clear. So much easier to help people this way." },
  { initials: "NF", name: "Nur F.", course: "New Intake · EEE", stars: 5, quote: "Didn't know many seniors yet — this made getting help feel way less intimidating." },
  { initials: "HA", name: "Haziq A.", course: "Year 3 · ECE", stars: 5, quote: "Booked a tutor for my circuits module in under 5 minutes. Exam prep sorted." },
  { initials: "LM", name: "Li Mei", course: "Year 1 · BIO", stars: 5, quote: "The SOS feature saved me the night before my lab report was due. Incredible." },
  { initials: "RS", name: "Raj S.", course: "Tutor · PHY", stars: 5, quote: "I love that students can actually find me based on subject and time. No more random DMs." },
  { initials: "AM", name: "Amirah M.", course: "Year 2 · CHE", stars: 5, quote: "My study streak keeps me accountable. I've been consistent for 3 weeks now." },
  { initials: "DP", name: "Danish P.", course: "Year 3 · COM", stars: 4, quote: "Smart matching actually works — got paired with a senior who took the same module." },
  { initials: "YS", name: "Yuna S.", course: "New Intake · MED", stars: 5, quote: "As a new student, TutorLink made me feel like I had support from day one." },
  { initials: "FH", name: "Farid H.", course: "Tutor · MAT", stars: 5, quote: "The points system motivates me to tutor more. It genuinely feels rewarding." },
];

const faqs = [
  { q: "Who can join TutorLink?", a: "USM students using verified USM email authentication. Just sign up with your student email and you're in — no approval needed for learners." },
  { q: "Is TutorLink paid?", a: "The MVP is completely free. Optional paid sessions or a token-based tipping system may be introduced later based on community feedback." },
  { q: "Is this like tuition?", a: "Not exactly. It's peer support — short, focused help sessions between students. Think of it as a smarter version of asking a senior for help, but organized." },
  { q: "Can I be a tutor?", a: "Yes. Apply as a tutor, submit for review, and once approved your profile goes live. You decide your own availability and which subjects you offer." },
  { q: "How does smart matching work?", a: "We match you based on your course code, availability window, learning preference, and past session ratings to surface the most relevant tutors first." },
  { q: "What is SOS Academic Help?", a: "SOS is for urgent requests. When you need help right now, it surfaces available tutors in real time and notifies them instantly so you get a response fast." },
  { q: "Is my personal data private?", a: "Yes. We only collect what's strictly needed to run the service. Your data is never sold or shared with third parties." },
  { q: "How are tutors verified?", a: "Tutors go through a manual review before approval. Their profiles display ratings, session counts, and feedback from past learners." },
  { q: "Can I leave feedback after a session?", a: "Absolutely — every completed session prompts a rating and optional review. This keeps the community quality high." },
  { q: "What subjects are covered?", a: "Any subject taught at USM. From engineering maths and physics to language electives — if it's on your timetable, there's likely a tutor for it." },
];

const trustItems = [
  { icon: "🔐", title: "USM verification", desc: "Only verified university accounts can access the platform." },
  { icon: "⭐", title: "Tutor accountability", desc: "Profiles, feedback, and reporting help keep the community safe." },
  { icon: "🪪", title: "Clear roles", desc: "Students and tutors have separate permissions and experiences." },
  { icon: "🔒", title: "Privacy-first mindset", desc: "Keep personal data minimal — only what's needed for the service." },
];

const tutors = [
  { name: "Aina", rating: "4.9", time: "9–11 pm", badge: "Top Tutor", active: true },
  { name: "Kumar", rating: "4.8", time: "8–10 pm", badge: null, active: false },
  { name: "Syafiq", rating: "4.7", time: "10–12 am", badge: null, active: false },
];



/* ─── COMPONENT ───────────────────────────────────────────── */

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [realIdx, setRealIdx] = useState(0);
  const CARD_W = 320;
  const GAP = 20;
  const STEP = CARD_W + GAP;

  const total = reviews.length + 2;
  const trackRef = useRef<HTMLDivElement>(null);
  const isJumping = useRef(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = 1 * STEP;
  }, [STEP]);

  const posToReal = useCallback((scrollLeft: number) => {
    const pos = Math.round(scrollLeft / STEP);
    if (pos === 0) return reviews.length - 1;
    if (pos === total - 1) return 0;
    return pos - 1;
  }, [STEP, total]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const handler = () => {
      const pos = Math.round(el.scrollLeft / STEP);
      setRealIdx(posToReal(el.scrollLeft));

      if (isJumping.current) return;

      if (pos === 0) {
        isJumping.current = true;
        el.style.scrollBehavior = "auto";
        el.scrollLeft = reviews.length * STEP;
        el.style.scrollBehavior = "";
        setTimeout(() => { isJumping.current = false; }, 50);
      } else if (pos === total - 1) {
        isJumping.current = true;
        el.style.scrollBehavior = "auto";
        el.scrollLeft = 1 * STEP;
        el.style.scrollBehavior = "";
        setTimeout(() => { isJumping.current = false; }, 50);
      }
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [STEP, total, posToReal]);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el || isJumping.current) return;
      el.scrollBy({ left: STEP, behavior: "smooth" });
    }, 2400);
    return () => clearInterval(id);
  }, [isPaused, STEP]);

  const scrollTo = useCallback((targetReal: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: (targetReal + 1) * STEP, behavior: "smooth" });
    setRealIdx(targetReal);
  }, [STEP]);

  const scrollReview = useCallback((dir: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * STEP, behavior: "smooth" });
  }, [STEP]);

  // ── Canvas shooting stars + static star field ──
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const isDark = () =>
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 1.6;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── Static star field (dots) ──
    interface Dot { x:number; y:number; r:number; alpha:number; twinkleSpeed:number; twinkleOffset:number; }
    const dots: Dot[] = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.4,
      alpha: 0.2 + Math.random() * 0.55,
      twinkleSpeed: 0.008 + Math.random() * 0.018,
      twinkleOffset: Math.random() * Math.PI * 2,
    }));

    // ── Shooting star ──
    interface Shooter {
      x: number; y: number;
      sx: number; sy: number;
      vx: number; vy: number;
      tailX: number[]; tailY: number[];
      tailMax: number;
      progress: number;
      totalFrames: number;
      opacity: number;
      delay: number; active: boolean;
      size: number;
    }

    const W = () => canvas.width;
    const H = () => canvas.height;

    const makeShooter = (): Shooter => {
      const sx = Math.random() * W() * 0.82;
      const sy = Math.random() * H() * 0.52;
      const angle = (30 + Math.random() * 20) * Math.PI / 180;
      const speed = 6 + Math.random() * 7;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const totalFrames = Math.round(55 + Math.random() * 45);
      const tailMax = Math.round(18 + Math.random() * 18);
      return {
        x: sx, y: sy, sx, sy, vx, vy,
        tailX: [], tailY: [],
        tailMax,
        progress: 0,
        totalFrames,
        opacity: 0.55 + Math.random() * 0.35,
        delay: Math.round(Math.random() * 200),
        active: false,
        size: 1.4 + Math.random() * 1.2,
      };
    };

    const shooters: Shooter[] = Array.from({ length: 12 }, makeShooter);

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // draw static dots
      for (const d of dots) {
        const tw = Math.sin(frame * d.twinkleSpeed + d.twinkleOffset) * 0.3;
        const a = Math.max(0.05, d.alpha + tw);
        ctx.beginPath();
        ctx.arc(d.x * canvas.width, d.y * canvas.height, d.r, 0, Math.PI * 2);
        // dark mode: white/blue dots; light mode: vivid purple dots
        const dotColor = isDark()
          ? `rgba(255,255,255,${a})`
          : `rgba(138,43,226,${a})`;
        ctx.fillStyle = dotColor;
        ctx.fill();
      }

      // draw shooters
      for (const s of shooters) {
        if (!s.active) {
          s.delay--;
          if (s.delay <= 0) { s.active = true; }
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

        const env = s.progress < 10
          ? s.progress / 10
          : s.progress > s.totalFrames - 14
            ? (s.totalFrames - s.progress) / 14
            : 1;
        const alpha = s.opacity * env;

        const len = s.tailX.length;
        if (len < 2) continue;
        for (let i = 1; i < len; i++) {
          const t = i / len;
          const x1 = s.tailX[i - 1];
          const y1 = s.tailY[i - 1];
          const x2 = s.tailX[i];
          const y2 = s.tailY[i];
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          // dark mode: white tail; light mode: vivid purple tail
          const tailColor = isDark()
            ? `rgba(255,255,255,${alpha * t * t})`
            : `rgba(138,43,226,${alpha * t * t})`;
          ctx.strokeStyle = tailColor;
          ctx.lineWidth = s.size * t;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        // glowing head
        const gx = s.x, gy = s.y;
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, s.size * 3.5);
        if (isDark()) {
          grad.addColorStop(0,   `rgba(255,255,255,${alpha})`);
          grad.addColorStop(0.3, `rgba(255,255,255,${alpha * 0.6})`);
          grad.addColorStop(1,   `rgba(255,255,255,0)`);
        } else {
          // light mode: vivid purple glow
          grad.addColorStop(0,   `rgba(138,43,226,${alpha})`);
          grad.addColorStop(0.3, `rgba(138,43,226,${alpha * 0.6})`);
          grad.addColorStop(1,   `rgba(138,43,226,0)`);
        }
        ctx.beginPath();
        ctx.arc(gx, gy, s.size * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // solid bright core
        ctx.beginPath();
        ctx.arc(gx, gy, s.size * 0.7, 0, Math.PI * 2);
        // dark mode: white core; light mode: vivid purple core
        ctx.fillStyle = isDark()
          ? `rgba(255,255,255,${alpha})`
          : `rgba(138,43,226,${alpha})`;
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

  const clonedReviews = [reviews[reviews.length - 1], ...reviews, reviews[0]];

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))] overflow-x-hidden">
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes pulseGlow {
          0%,100% { opacity:.38; transform:scale(1); }
          50%      { opacity:.68; transform:scale(1.07); }
        }
        @keyframes shimmer {
          0%   { background-position:-200% center; }
          100% { background-position:200% center; }
        }
        @keyframes progressFill {
          from { width:0%; }
          to   { width:68%; }
        }
        @keyframes dotBlink {
          0%,100% { opacity:1; }
          50%     { opacity:.35; }
        }
        @keyframes accordionOpen {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes floatCard {
          0%,100% { transform:translateY(0px); }
          50%     { transform:translateY(-10px); }
        }
        @keyframes spinSlow {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes popIn {
          0%   { transform:scale(0) rotate(-15deg); opacity:0; }
          70%  { transform:scale(1.1) rotate(3deg); opacity:1; }
          100% { transform:scale(1) rotate(0deg); opacity:1; }
        }
        @keyframes slideInLeft {
          from { transform:translateX(-30px); opacity:0; }
          to   { transform:translateX(0); opacity:1; }
        }
        @keyframes slideInRight {
          from { transform:translateX(30px); opacity:0; }
          to   { transform:translateX(0); opacity:1; }
        }
        @keyframes heartbeat {
          0%,100% { transform:scale(1); }
          14%     { transform:scale(1.15); }
          28%     { transform:scale(1); }
          42%     { transform:scale(1.1); }
          56%     { transform:scale(1); }
        }
        @keyframes pencilWrite {
          0%,100% { transform:rotate(-10deg) translateY(0); }
          50%     { transform:rotate(-5deg) translateY(-4px); }
        }
        @keyframes bookBounce {
          0%,100% { transform:translateY(0) scale(1); }
          50%     { transform:translateY(-8px) scale(1.05); }
        }
        @keyframes starTwinkle {
          0%,100% { opacity:1; transform:scale(1) rotate(0deg); }
          50%     { opacity:.5; transform:scale(0.7) rotate(30deg); }
        }
        @keyframes orbitDot {
          from { transform:rotate(0deg) translateX(28px) rotate(0deg); }
          to   { transform:rotate(360deg) translateX(28px) rotate(-360deg); }
        }
        @keyframes walkBody {
          0%,100% { transform:translateY(0px); }
          50%     { transform:translateY(-3px); }
        }
        @keyframes walkArmL {
          0%,100% { transform:rotate(-28deg); }
          50%     { transform:rotate(28deg); }
        }
        @keyframes walkArmR {
          0%,100% { transform:rotate(28deg); }
          50%     { transform:rotate(-28deg); }
        }
        @keyframes walkLegL {
          0%,100% { transform:rotate(-30deg); }
          50%     { transform:rotate(30deg); }
        }
        @keyframes walkLegR {
          0%,100% { transform:rotate(30deg); }
          50%     { transform:rotate(-30deg); }
        }
        @keyframes walkAcross {
          0%   { left:-80px; transform:scaleX(1); }
          48%  { left:calc(100% + 80px); transform:scaleX(1); }
          50%  { left:calc(100% + 80px); transform:scaleX(-1); }
          98%  { left:-80px; transform:scaleX(-1); }
          100% { left:-80px; transform:scaleX(1); }
        }
        @keyframes bookFloat {
          0%,100% { transform:translateY(0) rotate(-8deg); }
          50%     { transform:translateY(-6px) rotate(-4deg); }
        }
        @keyframes countUp {
          from { transform:translateY(8px); opacity:0; }
          to   { transform:translateY(0); opacity:1; }
        }
        @keyframes ripple {
          0%   { transform:scale(1); opacity:.6; }
          100% { transform:scale(2.4); opacity:0; }
        }
        @keyframes dash {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeInScale {
          from { opacity:0; transform:scale(.92); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes wobble {
          0%,100% { transform:rotate(0deg); }
          25%     { transform:rotate(-6deg); }
          75%     { transform:rotate(6deg); }
        }
        @keyframes typing {
          0%,100% { width:0; }
          40%,60% { width:100%; }
        }

        .anim-1 { animation:fadeUp .65s cubic-bezier(.22,1,.36,1) both .05s; }
        .anim-2 { animation:fadeUp .65s cubic-bezier(.22,1,.36,1) both .2s; }
        .glow-blob { animation:pulseGlow 7s ease-in-out infinite; }
        .live-dot  { animation:dotBlink 2s ease-in-out infinite; }
        .float-card { animation:floatCard 4s ease-in-out infinite; }
        .heartbeat  { animation:heartbeat 2.4s ease-in-out infinite; }
        .pencil-anim { animation:pencilWrite 1.5s ease-in-out infinite; }
        .book-bounce { animation:bookBounce 2s ease-in-out infinite; }
        .wobble-anim { animation:wobble 3s ease-in-out infinite; }
        .spin-slow   { animation:spinSlow 12s linear infinite; }

        .shimmer-text {
          background:linear-gradient(90deg,
            rgb(var(--primary)) 0%,rgb(var(--primary2)) 35%,
            rgb(var(--primary)) 65%,rgb(var(--primary2)) 100%);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
          animation:shimmer 5s linear infinite;
        }

        .card-lift { transition:transform .22s ease,box-shadow .22s ease; }
        .card-lift:hover { transform:translateY(-4px); box-shadow:0 18px 48px rgb(var(--shadow)/.24); }

        .btn-grad {
          background:linear-gradient(135deg,rgb(var(--primary)),rgb(var(--primary2)));
          position:relative; overflow:hidden;
          transition:opacity .18s,transform .18s;
        }
        .btn-grad::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,.18) 0%,transparent 55%);
          pointer-events:none;
        }
        .btn-grad:hover { opacity:.87; transform:translateY(-1px); }

        .btn-ghost { transition:background .18s,transform .18s; }
        .btn-ghost:hover { background:rgb(var(--card)) !important; transform:translateY(-1px); }

        .divider-line {
          height:1px;
          background:linear-gradient(90deg,transparent,rgb(var(--border)/.65) 25%,rgb(var(--border)/.65) 75%,transparent);
          max-width:72rem; margin:0 auto;
        }

        .eyebrow {
          font-size:10.5px; font-weight:700; letter-spacing:.14em;
          text-transform:uppercase; color:rgb(var(--primary));
          display:inline-flex; align-items:center; gap:7px; margin-bottom:8px;
        }
        .eyebrow::before {
          content:''; display:inline-block;
          width:18px; height:2px; border-radius:1px; background:rgb(var(--primary));
        }

        .icon-box {
          display:inline-flex; align-items:center; justify-content:center;
          width:42px; height:42px; border-radius:13px; flex-shrink:0;
          color:rgb(var(--primary));
          background:linear-gradient(135deg,rgb(var(--primary)/.14),rgb(var(--primary2)/.08));
        }

        .progress-bar { height:5px; border-radius:3px; background:rgb(var(--border)); overflow:hidden; }
        .progress-fill {
          height:100%; border-radius:3px;
          background:linear-gradient(90deg,rgb(var(--primary)),rgb(var(--primary2)));
          animation:progressFill 1.4s cubic-bezier(.22,1,.36,1) both .9s;
        }

        .av {
          width:36px; height:36px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:12px; font-weight:700; color:white; flex-shrink:0;
          background:linear-gradient(135deg,rgb(var(--primary)),rgb(var(--primary2)));
        }

        .chip {
          display:inline-flex; align-items:center; gap:5px;
          border-radius:999px; border:1px solid rgb(var(--border));
          background:rgb(var(--card)/.5); padding:4px 11px;
          font-size:11.5px; color:rgb(var(--muted)); white-space:nowrap;
          transition:background .16s,color .16s,border-color .16s;
        }
        .chip:hover { background:rgb(var(--card)); color:rgb(var(--fg)); border-color:rgb(var(--primary)/.4); }

        .glass { border:1px solid rgb(var(--border)); background:rgb(var(--card)/.6); }

        /* ── Review carousel — infinite loop ── */
        .review-track {
          display:flex; gap:20px;
          overflow-x:auto; scroll-snap-type:x mandatory;
          scrollbar-width:none; -ms-overflow-style:none;
          padding-top:24px; padding-bottom:28px;
          padding-left:calc(50vw - 160px);
          padding-right:calc(50vw - 160px);
          scroll-behavior:smooth;
        }
        .review-track::-webkit-scrollbar { display:none; }
        .review-card {
          flex:0 0 320px; scroll-snap-align:center;
          border:1px solid rgb(var(--border));
          background:rgb(var(--card)/.6);
          border-radius:24px; padding:24px;
          transition:transform .4s cubic-bezier(.22,1,.36,1),
                      opacity .4s ease,
                      box-shadow .4s ease,
                      border-color .4s ease,
                      background .4s ease;
          transform:scale(.84); opacity:.45;
          will-change:transform,opacity;
        }
        .review-card.active {
          transform:scale(1); opacity:1;
          box-shadow:0 24px 60px rgb(var(--primary)/.2),0 4px 20px rgb(0,0,0/.1);
          border-color:rgb(var(--primary)/.35);
          background:rgb(var(--card)/.95);
        }
        .review-card.near {
          transform:scale(.91); opacity:.7;
        }

        /* ── FAQ — two independent flex columns ── */
        .faq-grid {
          display:grid;
          grid-template-columns:1fr;
          gap:12px;
          align-items:start;
        }
        @media(min-width:640px){
          .faq-grid { grid-template-columns:1fr 1fr; }
        }
        .faq-col { display:flex; flex-direction:column; gap:12px; }
        .faq-item {
          border:1px solid rgb(var(--border));
          background:rgb(var(--card)/.6);
          border-radius:20px;
          overflow:hidden;
          transition:border-color .2s,background .2s,box-shadow .2s;
        }
        .faq-item.open {
          border-color:rgb(var(--primary)/.35);
          background:rgb(var(--card)/.85);
          box-shadow:0 8px 32px rgb(var(--primary)/.1);
        }
        .faq-trigger {
          width:100%; text-align:left; background:none; border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          padding:18px 22px; color:rgb(var(--fg));
          transition:background .15s;
        }
        .faq-trigger:hover { background:rgb(var(--primary)/.04); }
        .faq-chevron {
          width:20px; height:20px; flex-shrink:0;
          display:inline-flex; align-items:center; justify-content:center;
          border-radius:50%; border:1px solid rgb(var(--border));
          font-size:11px; color:rgb(var(--muted));
          transition:transform .28s cubic-bezier(.22,1,.36,1),
                      background .2s, border-color .2s, color .2s;
        }
        .faq-item.open .faq-chevron {
          transform:rotate(180deg);
          background:rgb(var(--primary)/.12);
          border-color:rgb(var(--primary)/.4);
          color:rgb(var(--primary));
        }
        .faq-body {
          display:grid;
          grid-template-rows:0fr;
          transition:grid-template-rows .35s cubic-bezier(.22,1,.36,1);
        }
        .faq-item.open .faq-body {
          grid-template-rows:1fr;
        }
        .faq-body-inner {
          overflow:hidden;
        }
        .faq-body-content {
          padding:0 22px 18px;
          animation:accordionOpen .25s ease both;
        }

        /* ── Canvas shooting stars ── */
        .stars-canvas {
          position:fixed; top:0; left:0;
          width:100vw; height:100vh;
          pointer-events:none; z-index:0;
          opacity:0.85;
        }

        /* star sparkles */
        .sparkle {
          position:absolute; pointer-events:none;
          animation:starTwinkle var(--dur,2s) ease-in-out infinite;
          animation-delay:var(--delay,0s);
          font-size:var(--sz,14px);
          opacity:.7;
        }

        /* ripple pulse around SOS */
        .ripple-ring {
          position:absolute; inset:-6px; border-radius:50%;
          border:1.5px solid rgb(34 197 94 / .5);
          animation:ripple 2s ease-out infinite;
        }
        .ripple-ring:nth-child(2) { animation-delay:.7s; }
        .ripple-ring:nth-child(3) { animation-delay:1.4s; }

        /* orbit dot on avatar */
        .orbit-wrap {
          position:relative; display:inline-block;
        }
        .orbit-dot {
          position:absolute; top:50%; left:50%;
          width:6px; height:6px; margin:-3px;
          border-radius:50%;
          background:rgb(var(--primary2));
          animation:orbitDot 3s linear infinite;
          transform-origin:0 0;
        }

        /* outcome card hover icon bounce */
        .card-lift:hover .icon-box {
          animation:bookBounce .6s ease-in-out;
        }

        /* stat card pop */
        .stat-card { transition:transform .2s,box-shadow .2s; }
        .stat-card:hover { transform:translateY(-3px) scale(1.03); box-shadow:0 12px 36px rgb(var(--primary)/.18); }

        /* typing cursor blink */
        .cursor-blink {
          display:inline-block; width:2px; height:1em;
          background:rgb(var(--primary)); margin-left:2px;
          animation:dotBlink .7s ease-in-out infinite;
          vertical-align:text-bottom;
        }

        /* trust card hover */
        .trust-card { transition:transform .22s,box-shadow .22s,border-color .22s; }
        .trust-card:hover {
          transform:translateY(-4px);
          box-shadow:0 16px 44px rgb(var(--primary)/.16);
          border-color:rgb(var(--primary)/.3) !important;
        }
        .trust-card:hover .icon-box { animation:wobble .5s ease-in-out; }

        /* CTA section glow pulse */
        @keyframes ctaGlow {
          0%,100% { opacity:.5; }
          50%     { opacity:.9; }
        }
        .cta-glow { animation:ctaGlow 3.5s ease-in-out infinite; }

        /* number counter */
        .stat-num { animation:countUp .8s cubic-bezier(.22,1,.36,1) both; }
        .stat-num:nth-child(1) { animation-delay:.1s; }
        .stat-num:nth-child(2) { animation-delay:.25s; }
        .stat-num:nth-child(3) { animation-delay:.4s; }

        /* hero card sparkle stars */
        @keyframes twinkleA {
          0%,100% { opacity:0; transform:scale(0) rotate(0deg); }
          50%     { opacity:1; transform:scale(1) rotate(180deg); }
        }
        .twinkle-star { animation:twinkleA var(--dur,2.5s) ease-in-out infinite; animation-delay:var(--delay,0s); }
      `}</style>

      {/* ── Canvas shooting stars ── */}
      <canvas ref={canvasRef} className="stars-canvas" />

      {/* ── Background atmosphere ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="glow-blob absolute -top-40 left-1/2 h-[32rem] w-[56rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "rgb(var(--primary)/.12)" }} />
        <div className="glow-blob absolute top-56 right-[-10rem] h-80 w-80 rounded-full blur-3xl"
          style={{ background: "rgb(var(--primary2)/.11)", animationDelay: "3s" }} />
        <div className="glow-blob absolute bottom-[30%] left-[-8rem] h-64 w-64 rounded-full blur-3xl"
          style={{ background: "rgb(var(--primary)/.08)", animationDelay: "5.5s" }} />
      </div>

      <main className="relative">

        {/* ══════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-16">
          <div className="grid items-center gap-10 md:grid-cols-2">

            {/* Left */}
            <div className="anim-1">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="chip" style={{ borderColor:"rgb(var(--primary)/.35)", color:"rgb(var(--primary))", background:"rgb(var(--primary)/.08)" }}>
                  <span className="live-dot" style={{ width:6,height:6,borderRadius:"50%",background:"rgb(var(--primary))",display:"inline-block" }} />
                  Campus-exclusive
                </span>
                <span className="chip">Verified USM accounts</span>
              </div>

              <h1 style={{ fontSize:"clamp(1.85rem,3.8vw,2.9rem)", fontWeight:800, lineHeight:1.12, letterSpacing:"-0.025em" }}>
                Get help faster.
                <br />
                <span className="shimmer-text">Study Smarter.</span>
                <br />
                <span style={{ color:"rgb(var(--muted))", fontWeight:400, fontSize:"0.87em" }}>Together at USM.</span>
              </h1>

              <p className="mt-3 text-[14px] leading-[1.7]" style={{ color:"rgb(var(--muted))", maxWidth:"40ch" }}>
                TutorLink connects USM students with peer tutors through smart
                matching, easy booking, real-time chat, SOS help, and gamified rewards.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/auth/register" className="btn-grad rounded-2xl px-5 py-2.5 text-sm font-bold text-white">
                  Join with USM Email →
                </Link>
                <Link href="/apply-tutor" className="btn-ghost rounded-2xl border px-5 py-2.5 text-sm font-bold"
                  style={{ borderColor:"rgb(var(--border))", background:"rgb(var(--card)/.6)", color:"rgb(var(--fg))" }}>
                  Become a Tutor
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {[{ d:"✦",l:"Smart Matching"},{d:"◈",l:"SOS Help"},{d:"◎",l:"Analytics"},{d:"◆",l:"Points & Badges"}].map(c=>(
                  <span key={c.l} className="chip">
                    <span style={{ color:"rgb(var(--primary))", fontSize:9 }}>{c.d}</span>{c.l}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-5">
                {[["500+","Students"],["80+","Tutors"],["4.8★","Avg rating"]].map(([v,l],i)=>(
                  <div key={l} className="flex items-center gap-5">
                    {i>0 && <div style={{ width:1,height:26,background:"rgb(var(--border))" }} />}
                    <div>
                      <div className="stat-num" style={{ fontSize:"1.3rem",fontWeight:800,letterSpacing:"-0.02em",lineHeight:1,color:"rgb(var(--fg))" }}>{v}</div>
                      <div style={{ fontSize:11,color:"rgb(var(--muted2))",marginTop:2 }}>{l}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — tutor card with sparkles */}
            <div className="anim-2 float-card rounded-3xl p-5 relative"
              style={{
                border:"1px solid rgb(var(--border))",
                background:"rgb(var(--card)/.68)",
                backdropFilter:"blur(20px)",
                WebkitBackdropFilter:"blur(20px)",
                boxShadow:"0 0 0 1px rgb(var(--border)/.3),0 20px 64px rgb(var(--primary)/.13),0 4px 16px rgb(0,0,0/.1)",
              }}>

              {/* Sparkle stars around card */}
              {[
                { top:"-12px", left:"20%", delay:"0s", dur:"2.5s" },
                { top:"-8px",  right:"15%", delay:"0.8s", dur:"3s" },
                { bottom:"10%", right:"-14px", delay:"1.4s", dur:"2.2s" },
                { bottom:"-10px", left:"30%", delay:"0.4s", dur:"2.8s" },
              ].map((s,i)=>(
                <div key={i} className="twinkle-star" style={{
                  position:"absolute", fontSize:16,
                  ...s, ["--dur" as string]:s.dur, ["--delay" as string]:s.delay,
                }}>✦</div>
              ))}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm font-bold">Find a tutor</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color:"rgb(var(--muted))" }}>
                    <span className="live-dot" style={{ width:5,height:5,borderRadius:"50%",background:"#22c55e",display:"inline-block" }} />
                    3 available now
                  </div>
                </div>
                <span className="rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ border:"1px solid rgb(var(--primary)/.3)", background:"rgb(var(--primary)/.1)", color:"rgb(var(--primary))" }}>
                  CPT113 · Tonight
                </span>
              </div>

              <div className="space-y-2">
                {tutors.map((t,ti)=>(
                  <div key={t.name} className="flex items-center gap-3 rounded-2xl border px-3.5 py-2.5"
                    style={{
                      borderColor:t.active?"rgb(var(--primary)/.3)":"rgb(var(--border))",
                      background:t.active
                        ?"linear-gradient(135deg,rgb(var(--primary)/.1),rgb(var(--primary2)/.07))"
                        :"rgb(var(--card2)/.45)",
                      animation:`fadeInScale .5s cubic-bezier(.22,1,.36,1) both ${0.3 + ti*0.12}s`,
                    }}>
                    <div className="orbit-wrap">
                      <div className="av">{t.name[0]}</div>
                      {t.active && <div className="orbit-dot" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">{t.name}</span>
                        {t.badge && (
                          <span className="text-[10px] rounded-full px-1.5 py-0.5 font-semibold"
                            style={{ background:"rgb(var(--primary)/.15)", color:"rgb(var(--primary))" }}>
                            {t.badge}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px]" style={{ color:"rgb(var(--muted))" }}>
                        <span style={{ color:"#f59e0b" }}>★</span> {t.rating} · {t.time}
                      </div>
                    </div>
                    <button className="rounded-xl px-3 py-1.5 text-xs font-bold text-white flex-shrink-0"
                      style={{ background:t.active?"linear-gradient(135deg,rgb(var(--primary)),rgb(var(--primary2)))":"rgb(var(--primary))" }}
                      type="button">Book</button>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span style={{ color:"rgb(var(--muted))" }}>Your study streak</span>
                  <span className="font-semibold heartbeat inline-block" style={{ color:"rgb(var(--primary))" }}>🔥 5 days</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" /></div>
                <div className="flex justify-between text-[10px] mt-1" style={{ color:"rgb(var(--muted2))" }}>
                  <span>Day 5</span><span>Goal: 7 days</span>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border px-3.5 py-2.5 flex items-center gap-3 relative"
                style={{ borderColor:"rgb(var(--border))", background:"linear-gradient(135deg,rgb(var(--primary)/.09),rgb(var(--primary2)/.06))" }}>
                <div className="relative flex-shrink-0">
                  <div className="ripple-ring" />
                  <div className="ripple-ring" />
                  <div className="ripple-ring" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl text-[10px] font-black text-white relative z-10"
                    style={{ background:"linear-gradient(135deg,rgb(var(--primary)),rgb(var(--primary2)))" }}>SOS</div>
                </div>
                <div className="flex-1">
                  <div className="text-[11px]" style={{ color:"rgb(var(--muted))" }}>Need urgent help?</div>
                  <div className="text-sm font-semibold">SOS Academic Help</div>
                </div>
                <span className="text-[11px] rounded-full px-2.5 py-1 font-semibold"
                  style={{ background:"rgb(34 197 94/.15)", color:"#22c55e" }}>Active</span>
              </div>
            </div>

          </div>
        </section>

        <div className="px-4"><div className="divider-line" /></div>

        {/* ══════════════════════════════════════════════════════
            WHY
        ══════════════════════════════════════════════════════ */}
        <section id="why" className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 max-w-lg">
            <div className="eyebrow">Why TutorLink</div>
            <h2 style={{ fontSize:"1.65rem",fontWeight:800,letterSpacing:"-0.02em" }}>Real outcomes for real students</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color:"rgb(var(--muted))" }}>
              Not a feature list — just what actually changes during your semester.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {outcomes.map((o,oi)=>(
              <div key={o.title} className="card-lift glass rounded-3xl p-6"
                style={{ animation:`fadeUp .6s cubic-bezier(.22,1,.36,1) both ${0.1+oi*0.12}s` }}>
                <div className="icon-box mb-4 transition-all duration-300" dangerouslySetInnerHTML={{ __html:o.svg }} />
                <div className="text-sm font-bold mb-1.5">{o.title}</div>
                <p className="text-sm leading-relaxed" style={{ color:"rgb(var(--muted))" }}>{o.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {stats.map((s,si)=>(
              <div key={s.label} className="stat-card card-lift glass rounded-2xl p-4 flex items-center gap-3"
                style={{
                  background:"rgb(var(--card2)/.5)",
                  animation:`popIn .5s cubic-bezier(.22,1,.36,1) both ${0.2+si*0.08}s`,
                }}>
                <div className="icon-box" style={{ width:36,height:36,borderRadius:10,fontSize:17 }}>{s.icon}</div>
                <div>
                  <div className="text-sm font-bold">{s.value}</div>
                  <div className="text-[11px] mt-0.5" style={{ color:"rgb(var(--muted2))" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="px-4"><div className="divider-line" /></div>

        {/* ══════════════════════════════════════════════════════
            REVIEWS — infinite loop carousel
        ══════════════════════════════════════════════════════ */}
        <section id="reviews" className="py-16 overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 mb-6 flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow">Reviews</div>
              <h2 style={{ fontSize:"1.65rem",fontWeight:800,letterSpacing:"-0.02em" }}>What students are saying</h2>
              <p className="mt-1.5 text-sm" style={{ color:"rgb(var(--muted))" }}>
                Real feedback from the USM community.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={()=>scrollReview(-1)} type="button"
                style={{
                  width:38,height:38,borderRadius:"50%",border:"1px solid rgb(var(--border))",
                  background:"rgb(var(--card)/.7)",cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,color:"rgb(var(--fg))",
                  transition:"opacity .2s,background .2s,transform .15s",
                }}
                onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.1)")}
                onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>←</button>
              <button onClick={()=>scrollReview(1)} type="button"
                style={{
                  width:38,height:38,borderRadius:"50%",border:"1px solid rgb(var(--border))",
                  background:"rgb(var(--card)/.7)",cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,color:"rgb(var(--fg))",
                  transition:"opacity .2s,background .2s,transform .15s",
                }}
                onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.1)")}
                onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}>→</button>
            </div>
          </div>

          {/* Dot indicators */}
          <div className="mx-auto max-w-6xl px-4 flex gap-1.5 mb-2">
            {reviews.map((_,i)=>(
              <button key={i} type="button"
                onClick={()=>scrollTo(i)}
                style={{
                  width:i===realIdx?20:6, height:6, borderRadius:3, border:"none", padding:0, cursor:"pointer",
                  background:i===realIdx?"rgb(var(--primary))":"rgb(var(--border))",
                  transition:"width .25s,background .25s",
                }} />
            ))}
          </div>

          {/* Infinite loop track — [clone_last, ...reviews, clone_first] */}
          <div
            ref={trackRef}
            className="review-track"
            onMouseEnter={()=>setIsPaused(true)}
            onMouseLeave={()=>setIsPaused(false)}
            onTouchStart={()=>setIsPaused(true)}
            onTouchEnd={()=>setTimeout(()=>setIsPaused(false),2000)}
          >
            {clonedReviews.map((r, ci) => {
              const posReal = ci === 0 ? reviews.length - 1 : ci === clonedReviews.length - 1 ? 0 : ci - 1;
              const isActive = posReal === realIdx && (ci !== 0 && ci !== clonedReviews.length - 1
                || (ci === 0 && realIdx === reviews.length - 1)
                || (ci === clonedReviews.length - 1 && realIdx === 0));
              const el = trackRef.current;
              const scrollPos = el ? Math.round(el.scrollLeft / STEP) : 1;
              const dist = Math.abs(ci - scrollPos);
              const cls = dist === 0 ? "active" : dist === 1 ? "near" : "";
              return (
                <div key={`${r.name}-${ci}`} className={`review-card ${cls}`}>
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({length:5}).map((_,j)=>(
                      <span key={j} style={{
                        color:j<r.stars?"#f59e0b":"rgb(var(--border))",
                        fontSize:13,
                        display:"inline-block",
                        animation:j<r.stars?`starTwinkle ${1.5+j*0.3}s ease-in-out infinite`:"none",
                        animationDelay:`${j*0.15}s`,
                      }}>★</span>
                    ))}
                  </div>
                  <p className="text-sm leading-[1.7] mb-5" style={{ color:"rgb(var(--fg))" }}>"{r.quote}"</p>
                  <div className="flex items-center gap-2.5 pt-4" style={{ borderTop:"1px solid rgb(var(--border))" }}>
                    <div className="av text-xs">{r.initials}</div>
                    <div>
                      <div className="text-xs font-semibold">{r.name}</div>
                      <div className="text-[11px] mt-0.5" style={{ color:"rgb(var(--muted2))" }}>{r.course}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="px-4"><div className="divider-line" /></div>

        {/* ══════════════════════════════════════════════════════
            TRUST
        ══════════════════════════════════════════════════════ */}
        <section id="trust" className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 max-w-lg">
            <div className="eyebrow">Trust & Safety</div>
            <h2 style={{ fontSize:"1.65rem",fontWeight:800,letterSpacing:"-0.02em" }}>Safe by design, not by chance</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color:"rgb(var(--muted))" }}>
              A campus-only platform needs strong identity, clear boundaries, and accountability.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {trustItems.map((item,ti)=>(
              <div key={item.title} className="trust-card glass rounded-3xl p-6 flex gap-4"
                style={{
                  border:"1px solid rgb(var(--border))",
                  animation:`slideIn${ti%2===0?"Left":"Right"} .6s cubic-bezier(.22,1,.36,1) both ${0.1+ti*0.1}s`,
                }}>
                <div className="icon-box flex-shrink-0" style={{ fontSize:19 }}>{item.icon}</div>
                <div>
                  <div className="text-sm font-bold">{item.title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color:"rgb(var(--muted))" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="px-4"><div className="divider-line" /></div>

        {/* ══════════════════════════════════════════════════════
            FAQ
        ══════════════════════════════════════════════════════ */}
        <section id="faq" className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-8 max-w-lg">
            <div className="eyebrow">FAQ</div>
            <h2 style={{ fontSize:"1.65rem",fontWeight:800,letterSpacing:"-0.02em" }}>Common questions</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color:"rgb(var(--muted))" }}>
              Click any question to read the answer.
            </p>
          </div>

          <div className="faq-grid">
            {/* Column 1 — even indices */}
            <div className="faq-col">
              {faqs.filter((_,i)=>i%2===0).map((f)=>{
                const i = faqs.indexOf(f);
                return (
                  <div key={f.q} className={`faq-item${openFaq===i?" open":""}`}
                    style={{ animation:`fadeUp .5s cubic-bezier(.22,1,.36,1) both ${0.05+Math.floor(i/2)*0.07}s` }}>
                    <button className="faq-trigger" type="button" onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                      <span className="text-sm font-semibold text-left leading-snug">{f.q}</span>
                      <span className="faq-chevron">▾</span>
                    </button>
                    <div className="faq-body">
                      <div className="faq-body-inner">
                        <div className="faq-body-content">
                          <p className="text-sm leading-relaxed" style={{ color:"rgb(var(--muted))" }}>{f.a}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Column 2 — odd indices */}
            <div className="faq-col">
              {faqs.filter((_,i)=>i%2===1).map((f)=>{
                const i = faqs.indexOf(f);
                return (
                  <div key={f.q} className={`faq-item${openFaq===i?" open":""}`}
                    style={{ animation:`fadeUp .5s cubic-bezier(.22,1,.36,1) both ${0.05+Math.floor(i/2)*0.07}s` }}>
                    <button className="faq-trigger" type="button" onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                      <span className="text-sm font-semibold text-left leading-snug">{f.q}</span>
                      <span className="faq-chevron">▾</span>
                    </button>
                    <div className="faq-body">
                      <div className="faq-body-inner">
                        <div className="faq-body-content">
                          <p className="text-sm leading-relaxed" style={{ color:"rgb(var(--muted))" }}>{f.a}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="px-4"><div className="divider-line" /></div>

        {/* ══════════════════════════════════════════════════════
            CTA
        ══════════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-3xl p-10 md:p-12 text-center relative overflow-hidden"
            style={{
              border:"1px solid rgb(var(--primary)/.22)",
              background:"linear-gradient(135deg,rgb(var(--primary)/.1),rgb(var(--primary2)/.07),rgb(var(--card)/.35))",
            }}>
            <div className="pointer-events-none absolute inset-0 cta-glow"
              style={{ background:"radial-gradient(ellipse 70% 55% at 50% -5%,rgb(var(--primary)/.2),transparent 68%)" }} />

            {/* Floating sparkles in CTA */}
            {["✦","✧","✦","✧","✦"].map((s,i)=>(
              <div key={i} className="sparkle" style={{
                top:`${10+i*15}%`, left:`${5+i*20}%`,
                ["--dur" as string]:`${1.8+i*0.4}s`,
                ["--delay" as string]:`${i*0.3}s`,
                ["--sz" as string]:`${10+i%3*4}px`,
                color:"rgb(var(--primary))",
              }}>{s}</div>
            ))}
            {["✧","✦","✧"].map((s,i)=>(
              <div key={i+5} className="sparkle" style={{
                top:`${20+i*25}%`, right:`${8+i*12}%`,
                ["--dur" as string]:`${2+i*0.5}s`,
                ["--delay" as string]:`${0.6+i*0.4}s`,
                ["--sz" as string]:`${12+i%2*6}px`,
                color:"rgb(var(--primary2))",
              }}>{s}</div>
            ))}

            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-xl mb-4 book-bounce"
                style={{ background:"linear-gradient(135deg,rgb(var(--primary)/.18),rgb(var(--primary2)/.14))", border:"1px solid rgb(var(--primary)/.25)" }}>
                🎓
              </div>
              <h3 style={{ fontSize:"1.5rem",fontWeight:800,letterSpacing:"-0.02em" }}>
                Ready to make academic help feel easy?
              </h3>
              <p className="mt-2 text-sm max-w-sm mx-auto leading-relaxed" style={{ color:"rgb(var(--muted))" }}>
                Join TutorLink with your USM email and start learning with peers today.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/auth/register" className="btn-grad rounded-2xl px-7 py-3 text-sm font-bold text-white">
                  Join with USM Email →
                </Link>
                <Link href="/apply-tutor" className="btn-ghost rounded-2xl border px-7 py-3 text-sm font-bold"
                  style={{ borderColor:"rgb(var(--border))", background:"rgb(var(--card)/.6)", color:"rgb(var(--fg))" }}>
                  Become a Tutor
                </Link>
              </div>
              <div className="mt-4 flex items-center justify-center gap-1 text-xs" style={{ color:"rgb(var(--muted2))" }}>
                {["Free to join","USM students only","No spam"].map((t,i)=>(
                  <span key={t} className="flex items-center gap-1">
                    {i>0 && <span style={{ margin:"0 4px",opacity:.4 }}>·</span>}
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ WALKING FIGURE ════════════════════════════════════ */}
        <div style={{
          position:"relative", height:90, overflow:"hidden",
          marginBottom:0, pointerEvents:"none", userSelect:"none",
        }}>
          <div style={{
            position:"absolute", bottom:16, left:0, right:0, height:1,
            background:"linear-gradient(90deg,transparent,rgb(var(--border)/.5) 20%,rgb(var(--border)/.5) 80%,transparent)",
          }} />
          <div style={{
            position:"absolute", bottom:17,
            animation:"walkAcross 14s linear infinite",
            width:48, transformOrigin:"center bottom",
          }}>
            <svg width="48" height="68" viewBox="0 0 48 68" fill="none"
              style={{ animation:"walkBody .55s ease-in-out infinite", display:"block" }}>
              <ellipse cx="24" cy="66" rx="10" ry="3" fill="rgb(var(--primary))" opacity="0.15"/>
              <rect x="18" y="22" width="9" height="13" rx="3" fill="rgb(var(--primary))" opacity="0.35"/>
              <g style={{ transformOrigin:"24px 50px", animation:"walkLegL .55s ease-in-out infinite" }}>
                <rect x="20" y="49" width="5" height="16" rx="2.5" fill="rgb(var(--primary))" opacity="0.7"/>
                <rect x="18" y="62" width="9" height="4" rx="2" fill="rgb(var(--primary))" opacity="0.85"/>
              </g>
              <g style={{ transformOrigin:"24px 50px", animation:"walkLegR .55s ease-in-out infinite" }}>
                <rect x="23" y="49" width="5" height="16" rx="2.5" fill="rgb(var(--primary2))" opacity="0.65"/>
                <rect x="21" y="62" width="9" height="4" rx="2" fill="rgb(var(--primary2))" opacity="0.8"/>
              </g>
              <rect x="17" y="28" width="14" height="22" rx="6" fill="rgb(var(--primary))" opacity="0.6"/>
              <g style={{ transformOrigin:"17px 32px", animation:"walkArmL .55s ease-in-out infinite" }}>
                <rect x="10" y="30" width="8" height="4" rx="2" fill="rgb(var(--primary))" opacity="0.55"/>
              </g>
              <g style={{ transformOrigin:"31px 32px", animation:"walkArmR .55s ease-in-out infinite" }}>
                <rect x="30" y="30" width="8" height="4" rx="2" fill="rgb(var(--primary))" opacity="0.55"/>
                <rect x="35" y="26" width="8" height="10" rx="2" fill="rgb(var(--primary2))" opacity="0.8"
                  style={{ animation:"bookFloat 1.1s ease-in-out infinite" }}/>
                <line x1="37" y1="26" x2="37" y2="36" stroke="white" strokeWidth="0.8" opacity="0.5"/>
              </g>
              <circle cx="24" cy="17" r="9" fill="rgb(var(--primary))" opacity="0.75"/>
              <circle cx="21.5" cy="16" r="1.2" fill="white" opacity="0.9"/>
              <circle cx="26.5" cy="16" r="1.2" fill="white" opacity="0.9"/>
              <path d="M21 20 Q24 22.5 27 20" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.8"/>
              <rect x="16" y="8" width="16" height="3" rx="1" fill="rgb(var(--primary2))" opacity="0.9"/>
              <polygon points="24,4 32,9 24,11 16,9" fill="rgb(var(--primary2))" opacity="0.85"/>
              <line x1="32" y1="9" x2="34" y2="14" stroke="rgb(var(--primary2))" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
              <circle cx="34" cy="14" r="1.5" fill="rgb(var(--primary2))" opacity="0.8"/>
            </svg>
          </div>
        </div>

      </main>
    </div>
  );
}