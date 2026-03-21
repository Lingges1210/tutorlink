"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  studypalApplyDecayOnMount,
  studypalMarkFed,
  studypalClearPendingDrop,
  studypalClearTreatCap,
  type SPLogEntry,
} from "@/lib/studypalReward";

/* ─── TYPES ─────────────────────────────────────────────── */
type PetType  = "cat" | "dog";
type AnimState = "idle" | "walk" | "jump" | "happy" | "excited" | "eat" | "sleep" | "meow" | "bark";
type AccId    = "none" | "cap" | "glasses" | "crown" | "bow" | "scarf" | "hat" | "headband" | "monocle" | "sunglasses" | "ribbon" | "halo" | "earring" | "wizard" | "bandana";
type TabId    = "feed" | "wardrobe" | "about";

interface SPState {
  xp: number; treats: number; points: number;
  petType: PetType; petName: string;
  acc: AccId; owned: AccId[];
  pending: number; onboarded: boolean;
  lastFedAt?: number;
  lastDecayedAt?: number;
  streakCount: number;
  lastStreakDate?: string;
  activityLog: SPLogEntry[];
  pendingDrop?: AccId | null;
  leveledUp?: boolean;
  treatCapReached?: boolean;
}

/* ─── DATA ──────────────────────────────────────────────── */
export const ACTIVITIES = [
  { id: "quiz",    name: "Complete a quiz",       xp: 9,  treats: 3,  icon: "quiz"    },
  { id: "streak",  name: "Daily study streak",    xp: 6,  treats: 2,  icon: "streak"  },
  { id: "booking", name: "Book a tutor",          xp: 15, treats: 5,  icon: "booking" },
  { id: "session", name: "Complete a session",    xp: 24, treats: 8,  icon: "session" },
  { id: "sos",     name: "SOS resolved",          xp: 12, treats: 4,  icon: "sos"     },
  { id: "badge",   name: "Earn an achievement",   xp: 30, treats: 10, icon: "badge"   },
];

const LEVELS = [
  { name: "Beginner", xp: 0,   icon: "seed"  },
  { name: "Learner",  xp: 50,  icon: "book"  },
  { name: "Scholar",  xp: 150, icon: "grad"  },
  { name: "Ace",      xp: 300, icon: "star"  },
  { name: "Legend",   xp: 500, icon: "crown" },
];

const ACCS: { id: AccId; name: string; cost: number }[] = [
  { id: "none",       name: "Default",    cost: 0  },
  { id: "bow",        name: "Bow Tie",    cost: 10 },
  { id: "headband",   name: "Headband",   cost: 12 },
  { id: "glasses",    name: "Glasses",    cost: 15 },
  { id: "hat",        name: "Party Hat",  cost: 18 },
  { id: "cap",        name: "Grad Cap",   cost: 20 },
  { id: "scarf",      name: "Scarf",      cost: 25 },
  { id: "monocle",    name: "Monocle",    cost: 35 },
  { id: "ribbon",     name: "Ribbon",     cost: 22 },
  { id: "sunglasses", name: "Sunglasses", cost: 28 },
  { id: "earring",    name: "Earring",    cost: 30 },
  { id: "halo",       name: "Halo",       cost: 40 },
  { id: "bandana",    name: "Bandana",    cost: 18 },
  { id: "wizard",     name: "Wizard Hat", cost: 45 },
  { id: "crown",      name: "Crown",      cost: 50 },
];

const LS_KEY       = "sp_v6";
const TWO_DAYS_MS  = 2 * 24 * 60 * 60 * 1000;
const TREATS_MAX   = 15;

function def(): SPState {
  return {
    xp: 0, treats: 8, points: 120, petType: "cat", petName: "Mochi",
    acc: "none", owned: ["none"], pending: 0, onboarded: false,
    lastFedAt: undefined, lastDecayedAt: undefined,
    streakCount: 0, lastStreakDate: undefined,
    activityLog: [], pendingDrop: null, leveledUp: false, treatCapReached: false,
  };
}
function load(): SPState {
  if (typeof window === "undefined") return def();
  try {
    const r = localStorage.getItem(LS_KEY);
    if (r) return { ...def(), ...JSON.parse(r) };
  } catch { }
  return def();
}
function save(s: SPState) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { } }
function getLvl(xp: number) { for (let i = LEVELS.length - 1; i >= 0; i--) if (xp >= LEVELS[i].xp) return i; return 0; }

function fmtRelTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60)   return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ─── ICONS ─────────────────────────────────────────────── */
function Icon({ name, size = 16, color = "currentColor", strokeWidth = 1.8 }: { name: string; size?: number; color?: string; strokeWidth?: number }) {
  const s = { style: { width: size, height: size, display: "inline-block", flexShrink: 0 } };
  const p = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (name) {
    case "star":       return <svg {...s} viewBox="0 0 24 24"><polygon {...p} points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case "zap":        return <svg {...s} viewBox="0 0 24 24"><polygon {...p} points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
    case "award":      return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="8" r="6" /><path {...p} d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>;
    case "book":       return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path {...p} d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
    case "calendar":   return <svg {...s} viewBox="0 0 24 24"><rect {...p} x="3" y="4" width="18" height="18" rx="2" ry="2" /><line {...p} x1="16" y1="2" x2="16" y2="6" /><line {...p} x1="8" y1="2" x2="8" y2="6" /><line {...p} x1="3" y1="10" x2="21" y2="10" /></svg>;
    case "check":      return <svg {...s} viewBox="0 0 24 24"><polyline {...p} points="20 6 9 17 4 12" /></svg>;
    case "x":          return <svg {...s} viewBox="0 0 24 24"><line {...p} x1="18" y1="6" x2="6" y2="18" /><line {...p} x1="6" y1="6" x2="18" y2="18" /></svg>;
    case "sparkle":    return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /><path {...p} d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z" /><path {...p} d="M5 15l.75 2.25L8 18l-2.25.75L5 21l-.75-2.25L2 18l2.25-.75z" /></svg>;
    case "flame":      return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>;
    case "help":       return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="10" /><path {...p} d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line {...p} x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    case "trophy":     return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path {...p} d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path {...p} d="M4 22h16" /><path {...p} d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path {...p} d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path {...p} d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></svg>;
    case "tag":        return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line {...p} x1="7" y1="7" x2="7.01" y2="7" /></svg>;
    case "cookie":     return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /><path {...p} d="M8.5 8.5v.01" /><path {...p} d="M16 15.5v.01" /><path {...p} d="M12 12v.01" /></svg>;
    case "coins":      return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="8" cy="8" r="6" /><path {...p} d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path {...p} d="M7 6h1v4" /><path {...p} d="M16.71 13.88L17.5 14.5l-3.5 3.88" /></svg>;
    case "shirt":      return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" /></svg>;
    case "info":       return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="10" /><line {...p} x1="12" y1="8" x2="12" y2="12" /><line {...p} x1="12" y1="16" x2="12.01" y2="16" /></svg>;
    case "user":       return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle {...p} cx="12" cy="7" r="4" /></svg>;
    case "refresh":    return <svg {...s} viewBox="0 0 24 24"><polyline {...p} points="1 4 1 10 7 10" /><path {...p} d="M3.51 15a9 9 0 1 0 .49-3.14" /></svg>;
    case "seed":       return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M7 20h10" /><path {...p} d="M10 20c5.5-2.5.8-6.4 3-10" /><path {...p} d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" /><path {...p} d="M14.1 6a7 7 0 0 1 1.5 4.7c-1.7.1-3.1-.2-4.2-.9C10.2 9 9.5 7.6 9.5 5.2c2.5.2 4.1 1.1 4.6.8z" /></svg>;
    case "grad":       return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M22 10v6M2 10l10-5 10 5-10 5z" /><path {...p} d="M6 12v5c3 3 9 3 12 0v-5" /></svg>;
    case "crown":      return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" /><path {...p} d="M5 20h14" /></svg>;
    case "arrow-r":    return <svg {...s} viewBox="0 0 24 24"><line {...p} x1="5" y1="12" x2="19" y2="12" /><polyline {...p} points="12 5 19 12 12 19" /></svg>;
    case "chevron-r":  return <svg {...s} viewBox="0 0 24 24"><polyline {...p} points="9 18 15 12 9 6" /></svg>;
    case "cat":        return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.26A9.06 9.06 0 0 1 12 5z" /><path {...p} d="M8 14v.5" /><path {...p} d="M16 14v.5" /><path {...p} d="M11.25 16.25h1.5L12 17l-.75-.75z" /></svg>;
    case "dog":        return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M4.5 7.5C4 5.5 5 4 7 4l1.5 3"/><path {...p} d="M19.5 7.5C20 5.5 19 4 17 4l-1.5 3"/><path {...p} d="M12 4c-4.5 0-7.5 2.5-7.5 6.5C4.5 15 7.5 18 12 18s7.5-3 7.5-7.5C19.5 6.5 16.5 4 12 4z"/><circle cx="9" cy="11" r="1" fill={color} stroke="none"/><circle cx="15" cy="11" r="1" fill={color} stroke="none"/><ellipse cx="12" cy="13.5" rx="1.8" ry="1.2" fill={color} stroke="none"/><path {...p} d="M10 15.5q2 1.5 4 0"/></svg>;
    case "paw":        return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="11" cy="4" r="2" /><circle {...p} cx="18" cy="8" r="2" /><circle {...p} cx="20" cy="16" r="2" /><path {...p} d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" /></svg>;
    case "settings":   return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="3" /><path {...p} d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    case "lock":       return <svg {...s} viewBox="0 0 24 24"><rect {...p} x="3" y="11" width="18" height="11" rx="2" ry="2" /><path {...p} d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
    case "unlock":     return <svg {...s} viewBox="0 0 24 24"><rect {...p} x="3" y="11" width="18" height="11" rx="2" ry="2" /><path {...p} d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>;
    case "bolt":       return <svg {...s} viewBox="0 0 24 24"><path {...p} fill={color} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>;
    case "bell":       return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path {...p} d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
    case "gift":       return <svg {...s} viewBox="0 0 24 24"><polyline {...p} points="20 12 20 22 4 22 4 12" /><rect {...p} x="2" y="7" width="20" height="5" /><line {...p} x1="12" y1="22" x2="12" y2="7" /><path {...p} d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path {...p} d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>;
    case "clock":      return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="10" /><polyline {...p} points="12 6 12 12 16 14" /></svg>;
    case "history":    return <svg {...s} viewBox="0 0 24 24"><polyline {...p} points="1 4 1 10 7 10" /><path {...p} d="M3.51 15a9 9 0 1 0 .49-3.14" /></svg>;
    case "drop":       return <svg {...s} viewBox="0 0 24 24"><path {...p} d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>;
    default:           return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="3" /></svg>;
  }
}

function ActivityIcon({ id, size = 18 }: { id: string; size?: number }) {
  const map: Record<string, string> = { quiz: "book", streak: "flame", booking: "calendar", session: "sparkle", sos: "help", badge: "trophy" };
  return <Icon name={map[id] || "zap"} size={size} />;
}
function LevelIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const map: Record<string, string> = { seed: "seed", book: "book", grad: "grad", star: "star", crown: "crown" };
  return <Icon name={map[icon] || "star"} size={size} />;
}

/* ─── GLOBAL STYLES ─────────────────────────────────────── */
const KF = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');
  :root {
    --c-bg:#F5F4FC;--c-surface:#FFFFFF;--c-surface2:#EEEAF8;--c-border:rgba(100,90,180,0.13);--c-border2:rgba(100,90,180,0.22);
    --c-text:#1A1830;--c-text2:#5A5478;--c-text3:#9890B8;--c-accent:#6B58F0;--c-accent2:#8474F8;--c-accent3:#A99EFF;
    --c-teal:#0DB8A4;--c-green:#16A97A;--c-amber:#C47900;--c-red:#E04040;--c-cat:#8474F8;--c-dog:#3A8FE0;
    --r-sm:10px;--r-md:14px;--r-lg:20px;--r-xl:26px;
    --font-body:'DM Sans',system-ui,sans-serif;--font-serif:'Instrument Serif',Georgia,serif;
    --shadow-sm:0 1px 4px rgba(80,60,200,0.10),0 1px 2px rgba(80,60,200,0.06);
    --shadow-md:0 4px 16px rgba(80,60,200,0.12),0 2px 6px rgba(80,60,200,0.07);
    --shadow-lg:0 10px 40px rgba(80,60,200,0.15),0 4px 12px rgba(80,60,200,0.09);
    --shadow-accent:0 4px 24px rgba(107,88,240,0.22);
  }
  .dark {
    --c-bg:#0F0E17;--c-surface:#16151F;--c-surface2:#1C1A28;--c-border:rgba(255,255,255,0.07);--c-border2:rgba(255,255,255,0.12);
    --c-text:#E8E4F4;--c-text2:#8B86A0;--c-text3:#5C5874;--c-accent:#7C6AFF;--c-accent2:#A594FE;--c-accent3:#C4BBFF;
    --c-teal:#2DD4BF;--c-green:#34D399;--c-amber:#FBBF24;--c-red:#F87171;--c-cat:#A594FE;--c-dog:#60AEFF;
    --shadow-sm:0 1px 3px rgba(0,0,0,0.4),0 1px 2px rgba(0,0,0,0.3);
    --shadow-md:0 4px 16px rgba(0,0,0,0.5),0 2px 6px rgba(0,0,0,0.3);
    --shadow-lg:0 10px 40px rgba(0,0,0,0.6),0 4px 12px rgba(0,0,0,0.4);
    --shadow-accent:0 4px 24px rgba(124,106,255,0.3);
  }
  .sp { font-family:var(--font-body);background:var(--c-bg);color:var(--c-text); }
  .sp-inner { max-width:650px;margin:0 auto;padding:0 0 40px; }

  @keyframes sp-idle    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes sp-walk-x  { 0%{left:-180px;transform:scaleX(1)} 47%{left:calc(100% + 20px);transform:scaleX(1)} 50%{left:calc(100% + 20px);transform:scaleX(-1)} 97%{left:-180px;transform:scaleX(-1)} 100%{left:-180px;transform:scaleX(1)} }
  @keyframes sp-jump    { 0%{transform:translateY(0) scaleY(1)} 20%{transform:translateY(0) scaleY(.9) scaleX(1.08)} 45%{transform:translateY(-60px) scaleY(1.04)} 75%{transform:translateY(-50px)} 90%{transform:translateY(-4px)} 100%{transform:translateY(0) scaleY(1)} }
  @keyframes sp-wiggle  { 0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-7deg)} 50%{transform:rotate(6deg)} 80%{transform:rotate(-5deg)} }
  @keyframes sp-eat     { 0%,100%{transform:translateY(0) scaleX(1)} 30%{transform:translateY(5px) scaleX(.98)} 70%{transform:translateY(3px) scaleX(1.02)} }
  @keyframes sp-tail-c  { 0%,100%{transform:rotate(0deg)} 30%{transform:rotate(20deg)} 70%{transform:rotate(-16deg)} }
  @keyframes sp-tail-d  { 0%,100%{transform:rotate(-15deg)} 50%{transform:rotate(30deg)} }
  @keyframes sp-leg-f   { 0%,100%{transform:rotate(-22deg)} 50%{transform:rotate(26deg)} }
  @keyframes sp-leg-b   { 0%,100%{transform:rotate(22deg)} 50%{transform:rotate(-26deg)} }
  @keyframes sp-blink   { 0%,88%,100%{transform:scaleY(1)} 92%,95%{transform:scaleY(.05)} }
  @keyframes sp-xp      { 0%{opacity:1;transform:translateY(0) scale(1.1)} 60%{opacity:1;transform:translateY(-38px) scale(1.18)} 100%{opacity:0;transform:translateY(-60px) scale(.9)} }
  @keyframes sp-xp2     { 0%{opacity:0;transform:translateY(0) scale(.8)} 20%{opacity:1} 70%{opacity:1;transform:translateY(-30px) scale(1)} 100%{opacity:0;transform:translateY(-50px) scale(.7)} }
  @keyframes sp-bar-flash { 0%{opacity:0;transform:scaleX(0)} 30%{opacity:1;transform:scaleX(1)} 70%{opacity:.6} 100%{opacity:0;transform:scaleX(1)} }
  @keyframes sp-burst   { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0)} }
  @keyframes sp-treat   { 0%{opacity:0;transform:translateY(-38px) rotate(0) scale(1.2)} 40%{opacity:1} 80%{opacity:1;transform:translateY(0) rotate(200deg) scale(.9)} 100%{opacity:0;transform:translateY(10px) scale(1.4)} }
  @keyframes sp-speech  { from{opacity:0;transform:scale(.65) translateY(5px)} 60%{transform:scale(1.06)} to{opacity:1;transform:scale(1)} }
  @keyframes sp-glow    { 0%,100%{opacity:.25;transform:scale(1)} 50%{opacity:.65;transform:scale(1.08)} }
  @keyframes sp-zzz1    { 0%,25%{opacity:0;transform:translate(0,0) scale(.6)} 55%{opacity:1} 100%{opacity:0;transform:translate(8px,-28px) scale(.9)} }
  @keyframes sp-zzz2    { 0%,35%{opacity:0;transform:translate(0,0) scale(.6)} 65%{opacity:1} 100%{opacity:0;transform:translate(14px,-42px) scale(1.1)} }
  @keyframes sp-toast   { from{opacity:0;transform:translateY(-14px) scale(.9)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes sp-toast-out { to{opacity:0;transform:translateY(-10px) scale(.94)} }
  @keyframes sp-shimmer { 0%{background-position:-300% center} 100%{background-position:300% center} }
  @keyframes sp-pop     { from{opacity:0;transform:scale(.7) rotate(-12deg)} 80%{transform:scale(1.04)} to{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes sp-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes sp-pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:.8} }
  @keyframes sp-fade-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sp-spin    { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes sp-ring    { 0%{opacity:0;transform:scale(.85)} 50%{opacity:.5} 100%{opacity:0;transform:scale(1.15)} }
  @keyframes sp-heartbeat { 0%,100%{transform:scale(1)} 40%{transform:scale(1.14)} 70%{transform:scale(.96)} }
  @keyframes sp-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.015)} }
  @keyframes sp-hunger-banner { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sp-levelup { 0%{opacity:0;transform:scale(.6) rotate(-6deg)} 70%{transform:scale(1.06) rotate(1deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes sp-decay-tick { 0%{opacity:0;transform:translateY(0) scale(1)} 40%{opacity:1} 100%{opacity:0;transform:translateY(-40px) scale(.8)} }

  .sp-idle  { animation:sp-idle 3.2s ease-in-out infinite; }
  .sp-eat   { animation:sp-eat .4s ease-in-out infinite; }
  .sp-jump  { animation:sp-jump .65s cubic-bezier(.2,1.4,.5,1) forwards; }
  .sp-wiggle{ animation:sp-wiggle .5s ease-in-out; }
  .sp-tail-c{ transform-origin:0 100%;animation:sp-tail-c 2.2s ease-in-out infinite; }
  .sp-tail-d{ transform-origin:0 0;animation:sp-tail-d .95s ease-in-out infinite; }
  .sp-lf    { transform-origin:50% 0;animation:sp-leg-f .5s ease-in-out infinite; }
  .sp-lb    { transform-origin:50% 0;animation:sp-leg-b .5s ease-in-out infinite; }
  .sp-eye,.sp-eye2 { transform-origin:50% 50%;animation:sp-blink 5.5s ease-in-out infinite; }
  .sp-happy .sp-pupil { display:none; }
  .sp-happy .sp-arc   { display:block; }
  .sp-arc { display:none; }
  .sp-excited .sp-ear-l { animation:sp-wiggle .42s ease-in-out infinite; }
  .sp-excited .sp-ear-r { animation:sp-wiggle .42s ease-in-out infinite;animation-delay:.1s; }
`;

/* ─── ACCESSORY SVG (cat) ───────────────────────────────── */
// Cat anatomy (viewBox 0 0 170 175):
//   Head circle: cx=84 cy=70 r=51  top=y19  bottom=y121
//   Eyes: cx=59 cy=70  /  cx=109 cy=70
//   Ear tips: left≈(15,10)  right≈(153,10)
//   Collar bell: cx=84 cy=108   Neck width ~88px centred x=84
function CatAcc({ id }: { id: AccId }) {

  // grad cap — flat mortarboard: wide stiff brim rect + square top, distinct from cone hats
  if (id === "cap") return (<>
    <rect x="50" y="28" width="68" height="9" rx="3" fill="#7C6AFF"/>
    <rect x="64" y="10" width="40" height="20" rx="3" fill="#5E4FD4"/>
    <rect x="63" y="28" width="42" height="3" rx="1" fill="#4A3EC0"/>
    <line x1="116" y1="28" x2="122" y2="46" stroke="#A594FE" strokeWidth="3.5" strokeLinecap="round"/>
    <circle cx="122" cy="49" r="5" fill="#A594FE"/>
  </>);

  // glasses — lenses centred exactly on eyes cy=70
  if (id === "glasses") return (<>
    <circle cx="59" cy="70" r="15" stroke="#7C6AFF" strokeWidth="2.8" fill="rgba(124,106,255,.12)" opacity=".9"/>
    <circle cx="109" cy="70" r="15" stroke="#7C6AFF" strokeWidth="2.8" fill="rgba(124,106,255,.12)" opacity=".9"/>
    <line x1="74" y1="70" x2="94" y2="70" stroke="#7C6AFF" strokeWidth="2.5"/>
    <line x1="22" y1="68" x2="44" y2="70" stroke="#7C6AFF" strokeWidth="2"/>
    <line x1="146" y1="68" x2="124" y2="70" stroke="#7C6AFF" strokeWidth="2"/>
  </>);

  // sunglasses — wide lenses, each centred on eye (cx=59 and cx=109), cy=70
  if (id === "sunglasses") return (<>
    <rect x="41" y="63" width="36" height="18" rx="7" fill="#1A1040" opacity=".93"/>
    <rect x="91" y="63" width="36" height="18" rx="7" fill="#1A1040" opacity=".93"/>
    <line x1="77" y1="72" x2="91" y2="72" stroke="#7C6AFF" strokeWidth="2.5"/>
    <line x1="22" y1="69" x2="41" y2="72" stroke="#7C6AFF" strokeWidth="2"/>
    <line x1="146" y1="69" x2="127" y2="72" stroke="#7C6AFF" strokeWidth="2"/>
    <rect x="46" y="66" width="11" height="7" rx="2" fill="rgba(124,106,255,.28)"/>
    <rect x="96" y="66" width="11" height="7" rx="2" fill="rgba(124,106,255,.28)"/>
  </>);

  // crown — higher: base y=26, points reach y=8, floats clearly above head
  if (id === "crown") return (<>
    <path d="M58,26 L69,8 L84,22 L99,8 L110,26 L107,38 H61 Z" fill="#FBBF24"/>
    <circle cx="84" cy="22" r="5" fill="#FDE68A"/>
    <circle cx="58" cy="26" r="4" fill="#FDE68A"/>
    <circle cx="110" cy="26" r="4" fill="#FDE68A"/>
    <rect x="61" y="36" width="46" height="4" rx="2" fill="#D97706"/>
  </>);

  // bow tie — sits right on collar bell cy=108
  if (id === "bow") return (<>
    <ellipse cx="65" cy="108" rx="17" ry="10" fill="#7C6AFF"/>
    <ellipse cx="103" cy="108" rx="17" ry="10" fill="#7C6AFF"/>
    <ellipse cx="65" cy="108" rx="9" ry="5" fill="#A594FE" opacity=".45"/>
    <ellipse cx="103" cy="108" rx="9" ry="5" fill="#A594FE" opacity=".45"/>
    <circle cx="84" cy="108" r="8" fill="#C4BBFF"/>
  </>);

  // ribbon — raised: arc at y=46, bow knot at cy=34 (high on forehead)
  if (id === "ribbon") return (<>
    <path d="M50,46 Q84,30 118,46" stroke="#FF80B0" strokeWidth="13" strokeLinecap="round" fill="none"/>
    <circle cx="84" cy="34" r="12" fill="#FF80B0"/>
    <circle cx="84" cy="34" r="6" fill="#FFB8D4"/>
    <path d="M52,46 Q84,34 116,46" stroke="rgba(255,255,255,.3)" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="5 4"/>
  </>);

  // scarf — sits below collar: band at y=112-126, tail drapes left-front
  if (id === "scarf") return (<>
    <path d="M38,112 Q84,126 130,112 Q132,121 130,126 Q84,140 38,126 Z" fill="#2DD4BF"/>
    <path d="M38,112 Q84,120 130,112" stroke="rgba(255,255,255,.28)" strokeWidth="2" fill="none"/>
    <path d="M50,125 Q44,138 48,152 Q51,162 60,157" stroke="#2DD4BF" strokeWidth="12" strokeLinecap="round" fill="none"/>
    <path d="M50,125 Q44,138 48,152" stroke="rgba(255,255,255,.22)" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="6 5"/>
  </>);

  // party hat — colourful stripes, pink base, clearly different from wizard (dark) and cap (flat)
  if (id === "hat") return (<>
    <ellipse cx="84" cy="28" rx="42" ry="10" fill="#FF80B0"/>
    <polygon points="84,0 42,28 126,28" fill="#FF5FA0"/>
    <line x1="60" y1="21" x2="70" y2="5" stroke="#FFD060" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/>
    <line x1="76" y1="26" x2="82" y2="8" stroke="#7C6AFF" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/>
    <line x1="90" y1="26" x2="96" y2="8" stroke="#2DD4BF" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/>
    <line x1="103" y1="21" x2="110" y2="7" stroke="#FFD060" strokeWidth="3" strokeLinecap="round" opacity=".9"/>
    <circle cx="84" cy="0" r="6" fill="#FFD060"/>
  </>);

  // headband — arc from ear-to-ear, gem centred on forehead at cy=36
  if (id === "headband") return (<>
    <path d="M26,56 Q84,30 142,56" stroke="#7C6AFF" strokeWidth="10" strokeLinecap="round" fill="none"/>
    <circle cx="84" cy="36" r="14" fill="#7C6AFF"/>
    <circle cx="84" cy="36" r="7" fill="#C4BBFF"/>
  </>);

  // monocle — ring around right eye cx=109 cy=70
  if (id === "monocle") return (<>
    <circle cx="109" cy="70" r="17" stroke="#8B7355" strokeWidth="3.5" fill="rgba(251,191,36,.1)"/>
    <line x1="124" y1="83" x2="135" y2="96" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/>
  </>);

  // halo — floats 6px above head top y=19, so cy=13, rx=34 to span head width
  if (id === "halo") return (<>
    <ellipse cx="84" cy="13" rx="34" ry="9" fill="none" stroke="#FFD060" strokeWidth="4"/>
    <ellipse cx="84" cy="13" rx="34" ry="9" fill="none" stroke="#FFE898" strokeWidth="2" opacity=".6"/>
  </>);

  // earring — left side of head. At y=88 head edge x≈84-47=37. Earring at x=31.
  if (id === "earring") return (<>
    <circle cx="31" cy="88" r="5" fill="none" stroke="#FFD060" strokeWidth="2.5"/>
    <circle cx="31" cy="100" r="5.5" fill="#FFB820"/>
  </>);

  // wizard hat — tall narrow dark cone with starry details, clearly taller+narrower than party hat
  if (id === "wizard") return (<>
    <ellipse cx="84" cy="30" rx="30" ry="8" fill="#5E4FD4"/>
    <polygon points="84,-8 54,30 114,30" fill="#4A3BB8"/>
    <polygon points="84,-8 54,30 114,30" fill="none" stroke="#A594FE" strokeWidth="1.5" opacity=".6"/>
    <circle cx="84" cy="-8" r="4" fill="#C4BBFF"/>
    <circle cx="70" cy="10" r="3.5" fill="#C4BBFF" opacity=".85"/>
    <circle cx="96" cy="4" r="2.5" fill="#C4BBFF" opacity=".7"/>
    <circle cx="76" cy="20" r="2" fill="#A594FE" opacity=".6"/>
    <circle cx="100" cy="16" r="2" fill="#A594FE" opacity=".5"/>
  </>);

  // bandana — sits below collar: top at y=108, peak drapes to y=130
  if (id === "bandana") return (<>
    <path d="M41,108 Q84,122 127,108 Q127,122 84,140 Q41,122 41,108 Z" fill="#2DD4BF"/>
    <path d="M41,108 Q84,118 127,108" stroke="rgba(255,255,255,.3)" strokeWidth="2" fill="none"/>
    <path d="M64,134 L72,152 Q78,161 82,159" stroke="#2DD4BF" strokeWidth="9" strokeLinecap="round" fill="none"/>
  </>);

  return null;
}

/* ─── ACCESSORY SVG (dog) ───────────────────────────────── */
// Dog anatomy (viewBox 0 0 170 175):
//   Head circle: cx=84 cy=66 r=50  top=y16  bottom=y116
//   Eyes: cx=59 cy=64  /  cx=109 cy=64
//   Floppy ears: left x≈5–52 hangs to y=97  /  right x≈116–163
//   Snout: cx=84 cy=84 rx=28 ry=22   Nose: cy=79
//   Body top: cy=82   Neck zone: y=82–116
function DogAcc({ id }: { id: AccId }) {

  // grad cap — flat mortarboard: stiff wide brim rect + square top block
  if (id === "cap") return (<>
    <rect x="50" y="24" width="68" height="9" rx="3" fill="#7C6AFF"/>
    <rect x="64" y="6" width="40" height="20" rx="3" fill="#5E4FD4"/>
    <rect x="63" y="24" width="42" height="3" rx="1" fill="#4A3EC0"/>
    <line x1="116" y1="24" x2="122" y2="42" stroke="#A594FE" strokeWidth="3.5" strokeLinecap="round"/>
    <circle cx="122" cy="45" r="5" fill="#A594FE"/>
  </>);

  // glasses — lenses centred on eyes cy=64
  if (id === "glasses") return (<>
    <circle cx="59" cy="64" r="15" stroke="#7C6AFF" strokeWidth="2.8" fill="rgba(124,106,255,.12)" opacity=".9"/>
    <circle cx="109" cy="64" r="15" stroke="#7C6AFF" strokeWidth="2.8" fill="rgba(124,106,255,.12)" opacity=".9"/>
    <line x1="74" y1="64" x2="94" y2="64" stroke="#7C6AFF" strokeWidth="2.5"/>
    <line x1="22" y1="62" x2="44" y2="64" stroke="#7C6AFF" strokeWidth="2"/>
    <line x1="146" y1="62" x2="124" y2="64" stroke="#7C6AFF" strokeWidth="2"/>
  </>);

  // sunglasses — wide lenses centred on eyes cy=64
  if (id === "sunglasses") return (<>
    <rect x="41" y="55" width="36" height="18" rx="7" fill="#1A1040" opacity=".93"/>
    <rect x="91" y="55" width="36" height="18" rx="7" fill="#1A1040" opacity=".93"/>
    <line x1="77" y1="64" x2="91" y2="64" stroke="#60AEFF" strokeWidth="2.5"/>
    <line x1="22" y1="61" x2="41" y2="64" stroke="#60AEFF" strokeWidth="2"/>
    <line x1="146" y1="61" x2="127" y2="64" stroke="#60AEFF" strokeWidth="2"/>
    <rect x="46" y="58" width="11" height="7" rx="2" fill="rgba(96,174,255,.28)"/>
    <rect x="96" y="58" width="11" height="7" rx="2" fill="rgba(96,174,255,.28)"/>
  </>);

  // crown — higher: base y=22, points reach y=4, above head top y=16
  if (id === "crown") return (<>
    <path d="M58,22 L69,4 L84,18 L99,4 L110,22 L107,34 H61 Z" fill="#FBBF24"/>
    <circle cx="84" cy="18" r="5" fill="#FDE68A"/>
    <circle cx="58" cy="22" r="4" fill="#FDE68A"/>
    <circle cx="110" cy="22" r="4" fill="#FDE68A"/>
    <rect x="61" y="32" width="46" height="4" rx="2" fill="#D97706"/>
  </>);

  // bow tie — sits on neck at cy=104
  if (id === "bow") return (<>
    <ellipse cx="65" cy="104" rx="17" ry="10" fill="#7C6AFF"/>
    <ellipse cx="103" cy="104" rx="17" ry="10" fill="#7C6AFF"/>
    <ellipse cx="65" cy="104" rx="9" ry="5" fill="#A594FE" opacity=".45"/>
    <ellipse cx="103" cy="104" rx="9" ry="5" fill="#A594FE" opacity=".45"/>
    <circle cx="84" cy="104" r="8" fill="#C4BBFF"/>
  </>);

  // ribbon — raised: arc at y=42, bow knot at cy=30 (high on forehead)
  if (id === "ribbon") return (<>
    <path d="M50,42 Q84,26 118,42" stroke="#FF80B0" strokeWidth="13" strokeLinecap="round" fill="none"/>
    <circle cx="84" cy="30" r="12" fill="#FF80B0"/>
    <circle cx="84" cy="30" r="6" fill="#FFB8D4"/>
    <path d="M52,42 Q84,30 116,42" stroke="rgba(255,255,255,.3)" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="5 4"/>
  </>);

  // scarf — sits below head: band at y=108-122, tail drapes left-front
  if (id === "scarf") return (<>
    <path d="M34,108 Q84,122 134,108 Q136,117 134,122 Q84,136 34,122 Z" fill="#2DD4BF"/>
    <path d="M34,108 Q84,116 134,108" stroke="rgba(255,255,255,.28)" strokeWidth="2" fill="none"/>
    <path d="M48,121 Q42,134 46,148 Q49,159 58,154" stroke="#2DD4BF" strokeWidth="12" strokeLinecap="round" fill="none"/>
    <path d="M48,121 Q42,134 46,148" stroke="rgba(255,255,255,.22)" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="6 5"/>
  </>);

  // party hat — colourful stripes, pink, clearly different from wizard (dark) and cap (flat)
  if (id === "hat") return (<>
    <ellipse cx="84" cy="22" rx="42" ry="10" fill="#FF80B0"/>
    <polygon points="84,0 42,22 126,22" fill="#FF5FA0"/>
    <line x1="60" y1="16" x2="70" y2="2" stroke="#FFD060" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/>
    <line x1="76" y1="20" x2="82" y2="4" stroke="#7C6AFF" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/>
    <line x1="90" y1="20" x2="96" y2="4" stroke="#2DD4BF" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/>
    <line x1="103" y1="16" x2="110" y2="4" stroke="#FFD060" strokeWidth="3" strokeLinecap="round" opacity=".9"/>
    <circle cx="84" cy="0" r="6" fill="#FFD060"/>
  </>);

  // headband — arc ear-to-ear, gem at cy=32
  if (id === "headband") return (<>
    <path d="M38,50 Q84,26 130,50" stroke="#7C6AFF" strokeWidth="10" strokeLinecap="round" fill="none"/>
    <circle cx="84" cy="32" r="14" fill="#7C6AFF"/>
    <circle cx="84" cy="32" r="7" fill="#C4BBFF"/>
  </>);

  // monocle — ring around right eye cx=109 cy=64
  if (id === "monocle") return (<>
    <circle cx="109" cy="64" r="17" stroke="#8B7355" strokeWidth="3.5" fill="rgba(251,191,36,.1)"/>
    <line x1="124" y1="77" x2="135" y2="90" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/>
  </>);

  // halo — floats 6px above head top y=16, so cy=10, rx=34
  if (id === "halo") return (<>
    <ellipse cx="84" cy="10" rx="34" ry="9" fill="none" stroke="#FFD060" strokeWidth="4"/>
    <ellipse cx="84" cy="10" rx="34" ry="9" fill="none" stroke="#FFE898" strokeWidth="2" opacity=".6"/>
  </>);

  // earring — on front face of left floppy ear
  if (id === "earring") return (<>
    <circle cx="24" cy="78" r="5" fill="none" stroke="#FFD060" strokeWidth="2.5"/>
    <circle cx="24" cy="90" r="5.5" fill="#FFB820"/>
  </>);

  // wizard hat — tall narrow dark cone, clearly taller+narrower than party hat
  if (id === "wizard") return (<>
    <ellipse cx="84" cy="24" rx="30" ry="8" fill="#5E4FD4"/>
    <polygon points="84,-8 54,24 114,24" fill="#4A3BB8"/>
    <polygon points="84,-8 54,24 114,24" fill="none" stroke="#A594FE" strokeWidth="1.5" opacity=".6"/>
    <circle cx="84" cy="-8" r="4" fill="#C4BBFF"/>
    <circle cx="70" cy="6" r="3.5" fill="#C4BBFF" opacity=".85"/>
    <circle cx="96" cy="0" r="2.5" fill="#C4BBFF" opacity=".7"/>
    <circle cx="76" cy="16" r="2" fill="#A594FE" opacity=".6"/>
    <circle cx="100" cy="12" r="2" fill="#A594FE" opacity=".5"/>
  </>);

  // bandana — sits below head circle: top at y=104, peak at y=126
  if (id === "bandana") return (<>
    <path d="M41,104 Q84,118 127,104 Q127,118 84,136 Q41,118 41,104 Z" fill="#2DD4BF"/>
    <path d="M41,104 Q84,114 127,104" stroke="rgba(255,255,255,.3)" strokeWidth="2" fill="none"/>
    <path d="M64,130 L72,148 Q78,157 82,155" stroke="#2DD4BF" strokeWidth="9" strokeLinecap="round" fill="none"/>
  </>);

  return null;
}

/* ─── ACCESSORY PREVIEW ─────────────────────────────────── */
function AccPreview({ id }: { id: AccId }) {
  const sz = { width: 48, height: 36 };
  if (id === "none")       return (<svg {...sz} viewBox="0 0 48 36"><rect x="4" y="4" width="40" height="28" rx="8" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.12)" strokeWidth="1.5"/><line x1="16" y1="12" x2="32" y2="24" stroke="rgba(255,255,255,.25)" strokeWidth="2" strokeLinecap="round"/><line x1="32" y1="12" x2="16" y2="24" stroke="rgba(255,255,255,.25)" strokeWidth="2" strokeLinecap="round"/></svg>);
  if (id === "cap")        return (<svg {...sz} viewBox="0 0 80 42"><rect x="8" y="24" width="64" height="11" rx="5.5" fill="#7C6AFF"/><polygon points="40,4 70,24 10,24" fill="#5E4FD4"/><circle cx="70" cy="40" r="5" fill="#A594FE"/></svg>);
  if (id === "glasses")    return (<svg {...sz} viewBox="0 0 88 30"><circle cx="22" cy="15" r="13" stroke="#7C6AFF" strokeWidth="2.5" fill="rgba(124,106,255,.1)"/><circle cx="66" cy="15" r="13" stroke="#7C6AFF" strokeWidth="2.5" fill="rgba(124,106,255,.1)"/><line x1="35" y1="15" x2="53" y2="15" stroke="#7C6AFF" strokeWidth="2"/></svg>);
  if (id === "crown")      return (<svg {...sz} viewBox="0 0 80 34"><path d="M4,30 L18,8 L40,22 L62,8 L76,30 Z" fill="#FBBF24"/><circle cx="40" cy="8" r="5" fill="#FDE68A"/></svg>);
  if (id === "bow")        return (<svg {...sz} viewBox="0 0 80 30"><ellipse cx="22" cy="15" rx="19" ry="12" fill="#7C6AFF"/><ellipse cx="58" cy="15" rx="19" ry="12" fill="#7C6AFF"/><circle cx="40" cy="15" r="8" fill="#C4BBFF"/></svg>);
  if (id === "scarf")      return (<svg {...sz} viewBox="0 0 80 20"><path d="M4,10 Q40,2 76,10 Q40,18 4,10Z" fill="#2DD4BF"/></svg>);
  if (id === "hat")        return (<svg {...sz} viewBox="0 0 80 46"><ellipse cx="40" cy="38" rx="34" ry="9" fill="#7C6AFF"/><rect x="24" y="2" width="32" height="38" rx="5" fill="#7C6AFF"/><circle cx="40" cy="2" r="5.5" fill="#C4BBFF"/></svg>);
  if (id === "headband")   return (<svg {...sz} viewBox="0 0 80 30"><path d="M4,22 Q40,4 76,22" stroke="#7C6AFF" strokeWidth="8" strokeLinecap="round" fill="none"/><circle cx="40" cy="12" r="11" fill="#7C6AFF"/><circle cx="40" cy="12" r="5.5" fill="#C4BBFF"/></svg>);
  if (id === "monocle")    return (<svg {...sz} viewBox="0 0 60 46"><circle cx="22" cy="18" r="16" stroke="#8B7355" strokeWidth="3" fill="rgba(251,191,36,.1)"/><line x1="36" y1="28" x2="50" y2="42" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/></svg>);
  if (id === "sunglasses") return (<svg {...sz} viewBox="0 0 88 30"><rect x="4" y="6" width="32" height="18" rx="6" fill="#1A1040"/><rect x="52" y="6" width="32" height="18" rx="6" fill="#1A1040"/><line x1="36" y1="15" x2="52" y2="15" stroke="#7C6AFF" strokeWidth="2"/></svg>);
  if (id === "ribbon")     return (<svg {...sz} viewBox="0 0 80 30"><path d="M6,20 Q40,4 74,20" stroke="#FF80B0" strokeWidth="9" strokeLinecap="round" fill="none"/><circle cx="40" cy="12" r="9" fill="#FF80B0"/><circle cx="40" cy="12" r="4.5" fill="#FFB8D4"/></svg>);
  if (id === "halo")       return (<svg {...sz} viewBox="0 0 80 24"><ellipse cx="40" cy="12" rx="30" ry="10" fill="none" stroke="#FFD060" strokeWidth="4"/><ellipse cx="40" cy="12" rx="30" ry="10" fill="none" stroke="#FFE898" strokeWidth="2" opacity=".6"/></svg>);
  if (id === "earring")    return (<svg {...sz} viewBox="0 0 40 40"><circle cx="20" cy="12" r="7" fill="none" stroke="#FFD060" strokeWidth="2.5"/><circle cx="20" cy="26" r="6" fill="#FFB820"/></svg>);
  if (id === "wizard")     return (<svg {...sz} viewBox="0 0 80 50"><path d="M40,2 L20,44 L60,44 Z" fill="#5E4FD4"/><ellipse cx="40" cy="44" rx="22" ry="7" fill="#7C6AFF"/><circle cx="40" cy="4" r="4" fill="#C4BBFF"/></svg>);
  if (id === "bandana")    return (<svg {...sz} viewBox="0 0 80 30"><path d="M4,14 Q40,2 76,14 Q40,26 4,14Z" fill="#2DD4BF"/></svg>);
  return null;
}

/* ─── CAT SVG ─────────────────────────────────────────────── */
function CatSVG({ anim, acc, onClick }: { anim: AnimState; acc: AccId; onClick: () => void }) {
  const walk=anim==="walk",eat=anim==="eat",sleep=anim==="sleep",happy=["happy","excited","meow"].includes(anim),excited=anim==="excited";
  const bc=eat?"sp-eat":walk?"":"sp-idle",lf=walk?"sp-lf":"",lb=walk?"sp-lb":"";
  return (
    <svg viewBox="0 0 170 175" onClick={onClick} style={{ width:170,height:175,cursor:"pointer",overflow:"visible",filter:"drop-shadow(0 10px 28px rgba(210,130,80,.25))" }}>
      <defs>
        <radialGradient id="cat-body" cx="50%" cy="40%" r="55%"><stop offset="0%" stopColor="#F6CFAE"/><stop offset="100%" stopColor="#E39B6B"/></radialGradient>
        <radialGradient id="cat-face" cx="50%" cy="38%" r="52%"><stop offset="0%" stopColor="#FBE0C7"/><stop offset="100%" stopColor="#EDB183"/></radialGradient>
        <radialGradient id="cat-belly" cx="50%" cy="55%" r="50%"><stop offset="0%" stopColor="#FFF1E3" stopOpacity="0.9"/><stop offset="100%" stopColor="#F6CFAE" stopOpacity="0"/></radialGradient>
      </defs>
      <g className={`${bc}${happy?" sp-happy":""}${excited?" sp-excited":""}`}>
        <ellipse cx="85" cy="171" rx="36" ry="7" fill="rgba(210,130,80,.18)"/>
        <g className="sp-tail-c" style={{transformOrigin:"54px 132px"}}><path d="M54,132 Q18,125 14,106 Q10,84 30,77" stroke="#C97A4A" strokeWidth="11" strokeLinecap="round" fill="none"/><path d="M54,132 Q18,125 14,106 Q10,84 30,77" stroke="#E39B6B" strokeWidth="7" strokeLinecap="round" fill="none"/><path d="M54,132 Q18,125 14,106 Q10,84 30,77" stroke="#F6CFAE" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55"/><circle cx="29" cy="75" r="8" fill="#E39B6B"/><circle cx="29" cy="75" r="4" fill="#FFF1E3"/></g>
        <g className={lb} style={{transformOrigin:"66px 124px"}}><rect x="58" y="124" width="16" height="33" rx="8" fill="#E39B6B"/><ellipse cx="66" cy="158" rx="12" ry="6" fill="#C97A4A"/></g>
        <g className={lb} style={{transformOrigin:"102px 124px"}}><rect x="94" y="124" width="16" height="33" rx="8" fill="#E39B6B"/><ellipse cx="102" cy="158" rx="12" ry="6" fill="#C97A4A"/></g>
        <ellipse cx="84" cy="120" rx="46" ry="34" fill="url(#cat-body)"/>
        <ellipse cx="84" cy="128" rx="28" ry="20" fill="url(#cat-belly)"/>
        <path d="M44,100 Q84,114 124,100" stroke="#B8840A" strokeWidth="9" fill="none" strokeLinecap="round"/><path d="M44,100 Q84,114 124,100" stroke="#FFD060" strokeWidth="6" fill="none" strokeLinecap="round"/><path d="M44,100 Q84,114 124,100" stroke="#FFE898" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6"/><circle cx="84" cy="108" r="6.5" fill="#FFB820"/><circle cx="82" cy="106" r="3" fill="#FFE070"/><line x1="84" y1="111" x2="84" y2="115" stroke="#C07800" strokeWidth="1.5" strokeLinecap="round"/>
        <g className={lf} style={{transformOrigin:"62px 112px"}}><rect x="54" y="112" width="16" height="35" rx="8" fill="#E39B6B"/><ellipse cx="62" cy="148" rx="12" ry="6" fill="#C97A4A"/></g>
        <g className={lf} style={{transformOrigin:"104px 112px"}}><rect x="96" y="112" width="16" height="35" rx="8" fill="#E39B6B"/><ellipse cx="104" cy="148" rx="12" ry="6" fill="#C97A4A"/></g>
        <g className="sp-ear-l" style={{transformOrigin:"42px 50px"}}><polygon points="34,64 15,10 63,43" fill="#B9653C"/><polygon points="37,59 22,15 57,40" fill="#D98B5A"/><polygon points="41,54 27,20 54,39" fill="#F7C7A3" opacity="0.55"/></g>
        <g className="sp-ear-r" style={{transformOrigin:"126px 50px"}}><polygon points="130,64 153,10 105,43" fill="#B9653C"/><polygon points="127,59 146,15 111,40" fill="#D98B5A"/><polygon points="123,54 141,20 113,39" fill="#F7C7A3" opacity="0.55"/></g>
        <circle cx="84" cy="70" r="51" fill="url(#cat-face)"/><ellipse cx="77" cy="55" rx="20" ry="12" fill="rgba(255,255,255,.12)"/><ellipse cx="84" cy="86" rx="24" ry="16" fill="#F8D8BE" opacity=".9"/>
        {happy && <><ellipse cx="52" cy="87" rx="10" ry="6" fill="#FF9DB0" opacity=".2"/><ellipse cx="116" cy="87" rx="10" ry="6" fill="#FF9DB0" opacity=".2"/></>}
        {sleep && <><ellipse cx="54" cy="80" rx="8" ry="5" fill="#EDB183" opacity=".22"/><ellipse cx="114" cy="80" rx="8" ry="5" fill="#EDB183" opacity=".22"/></>}
        <polygon points="84,86 79,80 89,80" fill="#F29AA3"/><polygon points="84,86 79,80 89,80" fill="none" stroke="#DD7C88" strokeWidth="0.7"/>
        <path d="M78,91 Q84,96 90,91" stroke="#B96D4A" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <line x1="16" y1="80" x2="58" y2="84" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/><line x1="15" y1="89" x2="57" y2="89" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/><line x1="17" y1="97" x2="58" y2="93" stroke="#C97A4A" strokeWidth="1.2" strokeLinecap="round" opacity=".28"/>
        <line x1="152" y1="80" x2="110" y2="84" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/><line x1="153" y1="89" x2="111" y2="89" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/><line x1="151" y1="97" x2="110" y2="93" stroke="#C97A4A" strokeWidth="1.2" strokeLinecap="round" opacity=".28"/>
        {!sleep && (<><ellipse className="sp-eye" cx="59" cy="70" rx="10" ry="12" fill="#2A2A2A"/><circle className="sp-pupil" cx="59" cy="67" r="3.5" fill="rgba(255,255,255,.9)"/><ellipse className="sp-eye2" cx="109" cy="70" rx="10" ry="12" fill="#2A2A2A"/><circle className="sp-pupil" cx="109" cy="67" r="3.5" fill="rgba(255,255,255,.9)"/><path className="sp-arc" d="M51 70 Q59 78 67 70" stroke="#2A2A2A" strokeWidth="3" fill="none" strokeLinecap="round"/><path className="sp-arc" d="M101 70 Q109 78 117 70" stroke="#2A2A2A" strokeWidth="3" fill="none" strokeLinecap="round"/></>)}
        {sleep && (<>
          {/* left closed eye — filled lid + curved lash line */}
          <ellipse cx="59" cy="70" rx="10" ry="6" fill="#EDB183"/>
          <path d="M49,70 Q59,76 69,70" stroke="#C97A4A" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          {/* right closed eye */}
          <ellipse cx="109" cy="70" rx="10" ry="6" fill="#EDB183"/>
          <path d="M99,70 Q109,76 119,70" stroke="#C97A4A" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </>)}
        <CatAcc id={acc}/>
      </g>
    </svg>
  );
}

/* ─── DOG SVG ─────────────────────────────────────────────── */
function DogSVG({ anim, acc, onClick }: { anim: AnimState; acc: AccId; onClick: () => void }) {
  const walk=anim==="walk",eat=anim==="eat",sleep=anim==="sleep",happy=["happy","excited","bark"].includes(anim),excited=anim==="excited";
  const bc=eat?"sp-eat":walk?"":"sp-idle",lf=walk?"sp-lf":"",lb=walk?"sp-lb":"";
  return (
    <svg viewBox="0 0 170 175" style={{width:170,height:175,cursor:"pointer",overflow:"visible",filter:"drop-shadow(0 10px 28px rgba(200,155,60,.28))"}} onClick={onClick}>
      <defs>
        <radialGradient id="dog-body" cx="50%" cy="40%" r="55%"><stop offset="0%" stopColor="#EAC97A"/><stop offset="100%" stopColor="#C8A050"/></radialGradient>
        <radialGradient id="dog-face" cx="50%" cy="38%" r="52%"><stop offset="0%" stopColor="#F2D898"/><stop offset="100%" stopColor="#D4AE6A"/></radialGradient>
        <radialGradient id="dog-belly" cx="50%" cy="60%" r="50%"><stop offset="0%" stopColor="#FBF0D2" stopOpacity="0.9"/><stop offset="100%" stopColor="#EAC97A" stopOpacity="0"/></radialGradient>
        <radialGradient id="dog-ear" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#D0985A"/><stop offset="100%" stopColor="#A87040"/></radialGradient>
      </defs>
      <g className={`${bc}${happy?" sp-happy":""}${excited?" sp-excited":""}`}>
        <ellipse cx="85" cy="171" rx="38" ry="7" fill="rgba(180,130,40,.18)"/>
        <g className="sp-tail-d" style={{transformOrigin:"122px 110px"}}><path d="M122,110 Q150,95 155,74 Q158,54 138,50" stroke="#A07030" strokeWidth="11" strokeLinecap="round" fill="none"/><path d="M122,110 Q150,95 155,74 Q158,54 138,50" stroke="#DEB870" strokeWidth="7" strokeLinecap="round" fill="none"/><path d="M122,110 Q150,95 155,74 Q158,54 138,50" stroke="#F5DCA0" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55"/><circle cx="137" cy="48" r="8" fill="#DEB870"/><circle cx="137" cy="48" r="4" fill="#F8E8B8"/></g>
        <g className={lb} style={{transformOrigin:"66px 122px"}}><rect x="58" y="122" width="16" height="35" rx="8" fill="#C8A050"/><ellipse cx="66" cy="158" rx="12" ry="6" fill="#A07030"/></g>
        <g className={lb} style={{transformOrigin:"102px 122px"}}><rect x="94" y="122" width="16" height="35" rx="8" fill="#C8A050"/><ellipse cx="102" cy="158" rx="12" ry="6" fill="#A07030"/></g>
        <ellipse cx="84" cy="118" rx="48" ry="36" fill="url(#dog-body)"/><ellipse cx="84" cy="126" rx="30" ry="22" fill="url(#dog-belly)"/>
        <g className={lf} style={{transformOrigin:"62px 110px"}}><rect x="54" y="110" width="16" height="37" rx="8" fill="#C8A050"/><ellipse cx="62" cy="148" rx="12" ry="6" fill="#A07030"/></g>
        <g className={lf} style={{transformOrigin:"104px 110px"}}><rect x="96" y="110" width="16" height="37" rx="8" fill="#C8A050"/><ellipse cx="104" cy="148" rx="12" ry="6" fill="#A07030"/></g>
        <path d="M22,42 Q6,34 5,68 Q3,96 28,97 Q52,98 52,72 Q52,44 28,38 Z" fill="#A87040"/><path d="M26,46 Q12,40 11,68 Q10,90 28,91 Q48,91 48,72 Q48,48 28,44 Z" fill="url(#dog-ear)"/>
        <path d="M148,42 Q162,34 163,68 Q165,96 140,97 Q116,98 116,72 Q116,44 140,38 Z" fill="#A87040"/><path d="M144,46 Q156,40 157,68 Q158,90 140,91 Q120,91 120,72 Q120,48 140,44 Z" fill="url(#dog-ear)"/>
        <circle cx="84" cy="66" r="50" fill="url(#dog-face)"/><ellipse cx="77" cy="52" rx="22" ry="13" fill="rgba(255,255,255,.12)"/>
        <ellipse cx="84" cy="84" rx="28" ry="22" fill="#F8EDD0"/><ellipse cx="74" cy="91" rx="10" ry="8" fill="#F0E0B8"/><ellipse cx="94" cy="91" rx="10" ry="8" fill="#F0E0B8"/><ellipse cx="84" cy="88" rx="7" ry="6" fill="#E8D4A8"/>
        <ellipse cx="84" cy="79" rx="11" ry="8" fill="#3A1F0C"/><ellipse cx="84" cy="78" rx="7" ry="5" fill="#2A1006"/><ellipse cx="81" cy="76" rx="3" ry="2" fill="rgba(255,255,255,.22)"/>
        <path d="M75,90 Q84,100 93,90" stroke="#8B5E30" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        {happy && <><ellipse cx="47" cy="83" rx="10" ry="6" fill="#FF9040" opacity=".2"/><ellipse cx="121" cy="83" rx="10" ry="6" fill="#FF9040" opacity=".2"/></>}
        {sleep && <><ellipse cx="52" cy="80" rx="8" ry="5" fill="#C8A050" opacity=".2"/><ellipse cx="116" cy="80" rx="8" ry="5" fill="#C8A050" opacity=".2"/></>}
        <g className="sp-eye" style={{transformOrigin:"59px 64px"}}>
          {!sleep && (<><circle cx="59" cy="64" r="14" fill="#1A0E04"/><circle cx="59" cy="64" r="14" fill="none" stroke="#4A2E10" strokeWidth="1.5"/><circle className="sp-pupil" cx="60" cy="64" r="9" fill="#F8F0E0"/><circle className="sp-pupil" cx="64" cy="60" r="4" fill="#7A4A18"/><circle className="sp-pupil" cx="57" cy="67" r="2.2" fill="rgba(255,255,255,.45)"/><circle className="sp-pupil" cx="63" cy="61" r="1.4" fill="rgba(255,255,255,.9)"/><path className="sp-arc" d="M46,64 Q59,50 72,64" stroke="#D4A050" strokeWidth="3.5" fill="none" strokeLinecap="round"/></>)}
          {sleep && (<><ellipse cx="59" cy="64" rx="12" ry="6" fill="#D4AE6A"/><path d="M47,64 Q59,70 71,64" stroke="#A07030" strokeWidth="2.5" fill="none" strokeLinecap="round"/></>)}
        </g>
        <g className="sp-eye2" style={{transformOrigin:"109px 64px"}}>
          {!sleep && (<><circle cx="109" cy="64" r="14" fill="#1A0E04"/><circle cx="109" cy="64" r="14" fill="none" stroke="#4A2E10" strokeWidth="1.5"/><circle className="sp-pupil" cx="110" cy="64" r="9" fill="#F8F0E0"/><circle className="sp-pupil" cx="114" cy="60" r="4" fill="#7A4A18"/><circle className="sp-pupil" cx="107" cy="67" r="2.2" fill="rgba(255,255,255,.45)"/><circle className="sp-pupil" cx="113" cy="61" r="1.4" fill="rgba(255,255,255,.9)"/><path className="sp-arc" d="M96,64 Q109,50 122,64" stroke="#D4A050" strokeWidth="3.5" fill="none" strokeLinecap="round"/></>)}
          {sleep && (<><ellipse cx="109" cy="64" rx="12" ry="6" fill="#D4AE6A"/><path d="M97,64 Q109,70 121,64" stroke="#A07030" strokeWidth="2.5" fill="none" strokeLinecap="round"/></>)}
        </g>
        <DogAcc id={acc}/>
      </g>
    </svg>
  );
}

/* ─── SCENE BG ───────────────────────────────────────────── */
function SceneBg({ petType }: { petType: PetType }) {
  const c = petType === "cat" ? "#7C6AFF" : "#60AEFF";
  return (
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"hidden"}} viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
      <defs><radialGradient id="scene-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={c} stopOpacity=".08"/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient></defs>
      <rect width="400" height="200" fill="url(#scene-glow)"/>
      <line x1="0" y1="178" x2="400" y2="178" stroke={c} strokeWidth=".8" strokeOpacity=".15"/>
      {[[30,30],[370,25],[15,120],[385,110],[200,20]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.5" fill={c} opacity=".2" style={{animation:`sp-float ${3+i*.5}s ease-in-out infinite`,animationDelay:`${i*.7}s`}}/>
      ))}
    </svg>
  );
}

/* ─── LEVEL-UP MODAL ─────────────────────────────────────── */
function LevelUpModal({ levelName, droppedAcc, accName, accentHex, onClose }: {
  levelName: string; droppedAcc: AccId | null; accName: string; accentHex: string; onClose: () => void;
}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",backdropFilter:"blur(6px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border2)",borderRadius:28,padding:"36px 32px",maxWidth:360,width:"100%",textAlign:"center",boxShadow:"var(--shadow-lg)",animation:"sp-levelup .5s cubic-bezier(.34,1.56,.64,1) both",fontFamily:"var(--font-body)"}}>
        <div style={{width:72,height:72,borderRadius:20,background:`${accentHex}20`,border:`1px solid ${accentHex}40`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",animation:"sp-heartbeat 1.6s ease-in-out infinite"}}>
          <Icon name="sparkle" size={32} color={accentHex}/>
        </div>
        <div style={{fontSize:"1.5rem",fontFamily:"var(--font-serif)",fontStyle:"italic",color:"var(--c-text)",marginBottom:8,fontWeight:400}}>Level Up!</div>
        <div style={{fontSize:14,color:"var(--c-text2)",marginBottom:20}}>You've reached <strong style={{color:accentHex}}>{levelName}</strong></div>
        {droppedAcc && (
          <div style={{background:`${accentHex}10`,border:`1px solid ${accentHex}25`,borderRadius:16,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:48,height:36,flexShrink:0}}><AccPreview id={droppedAcc}/></div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--c-text)",display:"flex",alignItems:"center",gap:6}}><Icon name="gift" size={13} color="var(--c-green)"/>Free accessory drop!</div>
              <div style={{fontSize:11,color:"var(--c-text3)",marginTop:2}}><strong style={{color:accentHex}}>{accName}</strong> has been added to your wardrobe</div>
            </div>
          </div>
        )}
        <button onClick={onClose} style={{width:"100%",padding:"12px 0",border:"none",borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer",background:`linear-gradient(135deg,${accentHex},#5E4FD4)`,color:"#fff",fontFamily:"var(--font-body)",boxShadow:"var(--shadow-accent)"}}>Awesome!</button>
      </div>
    </div>
  );
}

/* ─── TOAST ──────────────────────────────────────────────── */
interface Toast { id: number; treats: number; actName: string; }
function ToastItem({ toast, petName, onFeed }: { toast: Toast; petName: string; onFeed: (n: number) => void }) {
  const [out, setOut] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOut(true), 5500); return () => clearTimeout(t); }, []);
  return (
    <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border2)",borderRadius:18,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"var(--shadow-lg)",animation:out?"sp-toast-out .3s ease forwards":"sp-toast .38s cubic-bezier(.34,1.56,.64,1) forwards",pointerEvents:"auto",fontFamily:"var(--font-body)"}}>
      <div style={{width:42,height:42,borderRadius:12,background:"rgba(124,106,255,.15)",border:"1px solid rgba(124,106,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="cookie" size={18} color="var(--c-accent2)"/></div>
      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"var(--c-text)"}}>{toast.treats} treats queued</div><div style={{fontSize:11,color:"var(--c-text3)",marginTop:2}}>{toast.actName} — tap to feed {petName}</div></div>
      <button onClick={() => onFeed(toast.treats)} style={{background:"linear-gradient(135deg,var(--c-accent),#5E4FD4)",color:"#fff",border:"none",borderRadius:10,padding:"8px 14px",fontSize:12,fontWeight:600,fontFamily:"var(--font-body)",cursor:"pointer",flexShrink:0,boxShadow:"var(--shadow-accent)",whiteSpace:"nowrap" as const}}>Give Treat</button>
    </div>
  );
}

/* ─── STAT BAR ───────────────────────────────────────────── */
function StatBar({ label, val, pct, accent, icon, flash }: { label: string; val: string; pct: number; accent: string; icon: string; flash?: boolean }) {
  return (
    <div style={{marginBottom:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}><Icon name={icon} size={15} color={flash?"var(--c-accent2)":  "var(--c-text3)"}/><span style={{fontSize:13,fontWeight:flash?600:500,color:flash?"var(--c-text)":"var(--c-text2)",letterSpacing:".02em",transition:"all .3s ease"}}>{label}</span></div>
        <span style={{fontSize:12,fontWeight:700,color:flash?"#fff":accent,background:flash?accent:`${accent}18`,padding:"3px 10px",borderRadius:20,border:`1px solid ${accent}${flash?"88":"28"}`,transition:"all .3s ease",boxShadow:flash?`0 0 10px ${accent}60`:"none"}}>{val}</span>
      </div>
      <div style={{height:9,background:"rgba(255,255,255,.06)",borderRadius:6,overflow:"hidden",position:"relative"}}>
        <div style={{height:"100%",borderRadius:6,backgroundImage:`linear-gradient(90deg,${accent},${accent}99)`,backgroundSize:"200% auto",animation:flash?"sp-shimmer .6s linear infinite":"sp-shimmer 3s linear infinite",width:pct+"%",transition:"width .85s cubic-bezier(.34,1.56,.64,1)",boxShadow:flash?`0 0 8px ${accent}80`:"none"}}/>
        {flash && <div style={{position:"absolute",inset:0,borderRadius:6,background:`linear-gradient(90deg,transparent,${accent}50,transparent)`,animation:"sp-bar-flash .8s ease-out forwards"}}/>}
      </div>
    </div>
  );
}
/* ─── ACCESSORY CARD ─────────────────────────────────────── */
function AccessoryCard({ acc, owned, active, canBuy, accentColor, isNew, onClick }: {
  acc: typeof ACCS[0]; owned: boolean; active: boolean; canBuy: boolean; accentColor: string; isNew?: boolean; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const locked = !owned && !canBuy;
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{background:active?`rgba(124,106,255,.1)`:hover?"rgba(255,255,255,.05)":"rgba(255,255,255,.03)",border:`1.5px solid ${active?accentColor:hover?"rgba(255,255,255,.12)":"var(--c-border)"}`,borderRadius:16,padding:"16px 12px",textAlign:"center" as const,cursor:locked?"not-allowed":"pointer",opacity:locked?.45:1,transition:"all .2s ease",boxShadow:active?`0 4px 20px ${accentColor}20`:hover&&!locked?"var(--shadow-sm)":"none",position:"relative" as const}}>
      {isNew && <div style={{position:"absolute",top:6,left:6,fontSize:9,fontWeight:700,background:"var(--c-green)",color:"#fff",padding:"2px 6px",borderRadius:6,letterSpacing:".04em"}}>NEW</div>}
      {active && <div style={{position:"absolute",top:8,right:8,width:18,height:18,borderRadius:"50%",background:"var(--c-accent)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="check" size={10} color="white" strokeWidth={2.5}/></div>}
      <div style={{height:44,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}><AccPreview id={acc.id}/></div>
      <div style={{fontSize:11,fontWeight:600,color:"var(--c-text)",marginBottom:6}}>{acc.name}</div>
      <div style={{fontSize:10,fontWeight:500}}>
        {acc.id==="none"?<span style={{color:"var(--c-text3)"}}>Default</span>
          :active?<span style={{color:accentColor,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><Icon name="check" size={10} color={accentColor}/>Equipped</span>
          :owned?<span style={{color:"var(--c-green)",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><Icon name="unlock" size={10} color="var(--c-green)"/>Owned</span>
          :canBuy?<span style={{color:"var(--c-amber)",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><Icon name="coins" size={10} color="var(--c-amber)"/>{acc.cost}</span>
          :<span style={{color:"var(--c-text3)",display:"flex",alignItems:"center",justifyContent:"center",gap:3}}><Icon name="lock" size={10} color="var(--c-text3)"/>{acc.cost}</span>}
      </div>
    </div>
  );
}

/* ─── HUNGER BANNER ──────────────────────────────────────── */
function HungerBanner({ petName, onDismiss }: { petName: string; onDismiss: () => void }) {
  return (
    <div style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.25)",borderRadius:16,padding:"13px 16px",display:"flex",alignItems:"center",gap:12,animation:"sp-hunger-banner .4s ease both"}}>
      <div style={{width:38,height:38,borderRadius:10,background:"rgba(248,113,113,.15)",border:"1px solid rgba(248,113,113,.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"sp-heartbeat 1.6s ease-in-out infinite"}}><Icon name="help" size={17} color="var(--c-red)"/></div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:600,color:"var(--c-red)",display:"flex",alignItems:"center",gap:6}}><Icon name="paw" size={13} color="var(--c-red)"/>Really hungry!</div>
        <div style={{fontSize:12,color:"var(--c-text3)",marginTop:3}}>{petName} hasn't eaten in over 2 days — complete a study activity!</div>
      </div>
      <button onClick={onDismiss} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:"var(--c-text3)"}}><Icon name="x" size={14} color="var(--c-text3)"/></button>
    </div>
  );
}

/* ─── TREAT CAP BANNER ───────────────────────────────────── */
function TreatCapBanner({ petName, onBurn, onDismiss }: { petName: string; onBurn: () => void; onDismiss: () => void }) {
  return (
    <div style={{background:"rgba(196,121,0,.1)",border:"1px solid rgba(196,121,0,.28)",borderRadius:16,padding:"13px 16px",display:"flex",alignItems:"center",gap:12,animation:"sp-hunger-banner .4s ease both"}}>
      <div style={{width:38,height:38,borderRadius:10,background:"rgba(196,121,0,.15)",border:"1px solid rgba(196,121,0,.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="cookie" size={17} color="var(--c-amber)"/></div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:600,color:"var(--c-amber)",display:"flex",alignItems:"center",gap:6}}><Icon name="cookie" size={13} color="var(--c-amber)"/>Treat bar is full!</div>
        <div style={{fontSize:12,color:"var(--c-text3)",marginTop:3}}>{petName} has 15/15 treats. Play to burn some, then earn more.</div>
      </div>
      <div style={{display:"flex",flexDirection:"column" as const,gap:5,flexShrink:0}}>
        <button onClick={onBurn} style={{background:"linear-gradient(135deg,var(--c-amber),#E07800)",color:"#fff",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:600,fontFamily:"var(--font-body)",cursor:"pointer",whiteSpace:"nowrap" as const}}>Play! −3</button>
        <button onClick={onDismiss} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"var(--c-text3)",fontFamily:"var(--font-body)"}}>Dismiss</button>
      </div>
    </div>
  );
}

/* ─── DECAY POP ──────────────────────────────────────────── */
function DecayPop({ ticks }: { ticks: number }) {
  return (
    <div style={{position:"fixed",top:80,left:"50%",transform:"translateX(-50%)",zIndex:300,background:"rgba(248,113,113,.9)",color:"#fff",fontSize:13,fontWeight:700,padding:"8px 18px",borderRadius:20,boxShadow:"0 4px 16px rgba(248,113,113,.4)",animation:"sp-decay-tick 2.2s ease-out forwards",pointerEvents:"none",fontFamily:"var(--font-body)",whiteSpace:"nowrap" as const,display:"flex",alignItems:"center",gap:6}}>
      <Icon name="clock" size={14} color="white"/>−{ticks} treat{ticks > 1 ? "s" : ""} lost while away
    </div>
  );
}

/* ─── SIMULATE EXPLAINER ─────────────────────────────────── */
function SimulateExplainer({ accentHex }: { accentHex: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{marginBottom:12,borderRadius:14,border:"1px solid var(--c-border)",overflow:"hidden"}}>
      <button onClick={() => setOpen(o => !o)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",background:"rgba(255,255,255,.03)",border:"none",cursor:"pointer",fontFamily:"var(--font-body)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Icon name="info" size={13} color="var(--c-text3)"/><span style={{fontSize:12,fontWeight:600,color:"var(--c-text2)"}}>How rewards &amp; test button work</span></div>
        <svg style={{width:14,height:14,color:"var(--c-text3)",transition:"transform .2s",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{padding:"0 14px 14px",background:"rgba(255,255,255,.02)",animation:"sp-fade-up .2s ease both"}}>
          <div style={{height:1,background:"var(--c-border)",marginBottom:12}}/>
          {[{icon:"sparkle",label:"Complete a session",desc:"Rate your tutor after a session ends → treats queued automatically"},{icon:"book",label:"Submit a quiz",desc:"Finish any quiz pack in Study Hub → treats credited instantly"},{icon:"flame",label:"Tick a study task",desc:"Mark a task DONE in Study Planner → streak treat added"}].map(r => (
            <div key={r.label} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
              <div style={{width:28,height:28,borderRadius:8,background:`${accentHex}18`,border:`1px solid ${accentHex}28`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><Icon name={r.icon} size={13} color={accentHex}/></div>
              <div><div style={{fontSize:12,fontWeight:600,color:"var(--c-text)"}}>{r.label}</div><div style={{fontSize:11,color:"var(--c-text3)",marginTop:2,lineHeight:1.45}}>{r.desc}</div></div>
            </div>
          ))}
          <div style={{height:1,background:"var(--c-border)",margin:"10px 0"}}/>
          <div style={{fontSize:11,color:"var(--c-text3)",lineHeight:1.55,background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.18)",borderRadius:10,padding:"9px 12px"}}>The <strong style={{color:"var(--c-amber)"}}>Test</strong> button simulates an activity for demo purposes — XP and treats are credited as if the real activity happened. Use it to try out the feed animation or see how rewards work.</div>
        </div>
      )}
    </div>
  );
}

/* ─── POINTS EXPLAINER ───────────────────────────────────── */
function PointsExplainer() {
  const [open, setOpen] = useState(false);
  const rows = [{act:"Complete a session",pts:24,icon:"sparkle"},{act:"Earn a badge",pts:30,icon:"trophy"},{act:"Book a tutor",pts:15,icon:"calendar"},{act:"SOS resolved",pts:12,icon:"help"},{act:"Complete a quiz",pts:9,icon:"book"},{act:"Daily streak",pts:6,icon:"flame"}];
  return (
    <div style={{marginBottom:16,borderRadius:14,border:"1px solid var(--c-border)",overflow:"hidden"}}>
      <button onClick={() => setOpen(o => !o)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",background:"rgba(255,255,255,.03)",border:"none",cursor:"pointer",fontFamily:"var(--font-body)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Icon name="coins" size={13} color="var(--c-amber)"/><span style={{fontSize:12,fontWeight:600,color:"var(--c-text2)"}}>How do points work?</span></div>
        <svg style={{width:14,height:14,color:"var(--c-text3)",transition:"transform .2s",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{padding:"0 14px 14px",background:"rgba(255,255,255,.02)",animation:"sp-fade-up .2s ease both"}}>
          <div style={{height:1,background:"var(--c-border)",marginBottom:12}}/>
          <div style={{display:"grid",gap:6}}>
            {rows.map(r => (
              <div key={r.act} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",background:"rgba(255,255,255,.03)",borderRadius:9,border:"1px solid var(--c-border)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}><Icon name={r.icon} size={12} color="var(--c-text3)"/><span style={{fontSize:11,color:"var(--c-text2)"}}>{r.act}</span></div>
                <span style={{fontSize:11,fontWeight:700,color:"var(--c-amber)",background:"rgba(251,191,36,.1)",padding:"2px 8px",borderRadius:6,border:"1px solid rgba(251,191,36,.2)"}}>+{r.pts} pts</span>
              </div>
            ))}
          </div>
          <div style={{marginTop:10,fontSize:11,color:"var(--c-text3)",lineHeight:1.5,padding:"8px 10px",background:"rgba(124,106,255,.06)",borderRadius:9,border:"1px solid rgba(124,106,255,.15)",display:"flex",alignItems:"flex-start",gap:6}}><span style={{flexShrink:0,marginTop:1}}><Icon name="info" size={13} color="var(--c-accent3)"/></span>Points mirror XP — the same activity gives the same number of points and XP simultaneously.</div>
        </div>
      )}
    </div>
  );
}

/* ─── ACTIVITY LOG ───────────────────────────────────────── */
function ActivityLog({ log }: { log: SPLogEntry[] }) {
  const [open, setOpen] = useState(false);
  if (log.length === 0) return null;
  return (
    <div style={{marginBottom:16,borderRadius:14,border:"1px solid var(--c-border)",overflow:"hidden"}}>
      <button onClick={() => setOpen(o => !o)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",background:"rgba(255,255,255,.03)",border:"none",cursor:"pointer",fontFamily:"var(--font-body)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><Icon name="history" size={13} color="var(--c-text3)"/><span style={{fontSize:12,fontWeight:600,color:"var(--c-text2)"}}>Recent activity ({log.length})</span></div>
        <svg style={{width:14,height:14,color:"var(--c-text3)",transition:"transform .2s",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{padding:"0 14px 14px",background:"rgba(255,255,255,.02)",animation:"sp-fade-up .2s ease both"}}>
          <div style={{height:1,background:"var(--c-border)",marginBottom:10}}/>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {log.map((e, i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"rgba(255,255,255,.03)",borderRadius:10,border:"1px solid var(--c-border)"}}>
                <div style={{width:28,height:28,borderRadius:8,background:"rgba(255,255,255,.05)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <ActivityIcon id={e.activityId} size={13}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:"var(--c-text)"}}>{e.activityName}</div>
                  <div style={{fontSize:10,color:"var(--c-text3)",marginTop:2}}>{fmtRelTime(Date.now() - e.timestamp)}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                  <span style={{fontSize:10,fontWeight:700,color:"var(--c-accent2)",background:"rgba(124,106,255,.12)",padding:"1px 6px",borderRadius:5}}>+{e.xp} XP</span>
                  <span style={{fontSize:10,fontWeight:600,color:"var(--c-text3)",background:"rgba(255,255,255,.05)",padding:"1px 6px",borderRadius:5,display:"flex",alignItems:"center",gap:2}}><Icon name="cookie" size={9} color="var(--c-text3)"/>+{e.treats}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ONBOARDING ─────────────────────────────────────────── */
function Onboarding({ onDone }: { onDone: (t: PetType, n: string) => void }) {
  const [step, setStep] = useState(0);
  const [pet, setPet] = useState<PetType | null>(null);
  const [name, setName] = useState("");
  const FEATURES = [
    {icon:"paw",title:"Animated companion",desc:"Real-time idle, walk, and reaction states."},
    {icon:"cookie",title:"Activity rewards",desc:"Earns treats from study sessions automatically."},
    {icon:"bolt",title:"Instant reactions",desc:"Reacts to every tap, feed, and activity."},
    {icon:"shirt",title:"15 accessories",desc:"Unlock with points — level up for free drops!"},
  ];
  const HOW = [
    {title:"Complete any activity",desc:"The system automatically queues treats to a pending tray."},
    {title:"Tap Give Treat",desc:"Watch your companion eat from a bowl in real time."},
    {title:"Keep the bar full",desc:"Treats decay over time — study daily to keep them topped up."},
  ];
  return (
    <div className="sp" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:24}}>
      <style>{KF}</style>
      <div style={{width:"100%",maxWidth:460}}>
        <div style={{display:"flex",gap:6,marginBottom:32,justifyContent:"center"}}>
          {[0,1,2,3].map(i=><div key={i} style={{height:3,borderRadius:3,width:i===step?32:20,background:i<=step?"var(--c-accent)":"rgba(255,255,255,.1)",transition:"all .35s cubic-bezier(.34,1.56,.64,1)"}}/>)}
        </div>
        <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:24,padding:"36px 32px",boxShadow:"var(--shadow-lg)"}}>
          {step === 0 && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:24,animation:"sp-fade-up .4s ease both"}}>
              <div style={{width:72,height:72,borderRadius:20,background:"linear-gradient(135deg,var(--c-accent),#5E4FD4)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"var(--shadow-accent)",animation:"sp-float 3s ease-in-out infinite"}}><Icon name="paw" size={32} color="white" strokeWidth={1.5}/></div>
              <div style={{textAlign:"center"}}><h1 style={{fontSize:"1.75rem",fontFamily:"var(--font-serif)",fontStyle:"italic",color:"var(--c-text)",margin:"0 0 10px",fontWeight:400}}>Study Companion</h1><p style={{fontSize:14,color:"var(--c-text2)",lineHeight:1.65,margin:0,maxWidth:"28ch"}}>A virtual companion that grows alongside your learning progress.</p></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,width:"100%"}}>
                {FEATURES.map((f,i)=>(
                  <div key={f.title} style={{background:"rgba(255,255,255,.04)",border:"1px solid var(--c-border)",borderRadius:14,padding:"14px 15px",animation:`sp-pop .4s ease both`,animationDelay:`${i*0.07}s`}}>
                    <div style={{width:32,height:32,borderRadius:9,background:"rgba(124,106,255,.15)",border:"1px solid rgba(124,106,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}><Icon name={f.icon} size={15} color="var(--c-accent2)"/></div>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--c-text)",marginBottom:4}}>{f.title}</div>
                    <div style={{fontSize:11,color:"var(--c-text3)",lineHeight:1.45}}>{f.desc}</div>
                  </div>
                ))}
              </div>
              <ObBtn onClick={() => setStep(1)}>Get Started</ObBtn>
            </div>
          )}
          {step === 1 && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:22,animation:"sp-fade-up .4s ease both"}}>
              <div style={{textAlign:"center"}}><h2 style={{fontSize:"1.45rem",fontFamily:"var(--font-serif)",fontStyle:"italic",color:"var(--c-text)",margin:"0 0 8px",fontWeight:400}}>Choose your companion</h2><p style={{fontSize:13,color:"var(--c-text2)",margin:0}}>Pick one to start — switch anytime in Profile.</p></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,width:"100%"}}>
                {/* Cat card */}
                <div onClick={()=>setPet("cat")} style={{border:`1.5px solid ${pet==="cat"?"var(--c-accent)":"var(--c-border)"}`,background:pet==="cat"?"rgba(124,106,255,.1)":"rgba(255,255,255,.03)",borderRadius:18,padding:"16px 10px",cursor:"pointer",transition:"all .25s ease",display:"flex",flexDirection:"column",alignItems:"center",gap:8,boxShadow:pet==="cat"?"0 0 0 4px rgba(124,106,255,.12)":"none"}}>
                  <svg width="100" height="100" viewBox="0 0 170 175">
                    <defs>
                      <radialGradient id="ob-cf" cx="50%" cy="38%" r="52%"><stop offset="0%" stopColor="#FBE0C7"/><stop offset="100%" stopColor="#EDB183"/></radialGradient>
                      <radialGradient id="ob-cb" cx="50%" cy="40%" r="55%"><stop offset="0%" stopColor="#F6CFAE"/><stop offset="100%" stopColor="#E39B6B"/></radialGradient>
                      <radialGradient id="ob-cbl" cx="50%" cy="55%" r="50%"><stop offset="0%" stopColor="#FFF1E3" stopOpacity="0.9"/><stop offset="100%" stopColor="#F6CFAE" stopOpacity="0"/></radialGradient>
                    </defs>
                    {/* tail */}
                    <path d="M54,132 Q18,125 14,106 Q10,84 30,77" stroke="#C97A4A" strokeWidth="11" strokeLinecap="round" fill="none"/>
                    <path d="M54,132 Q18,125 14,106 Q10,84 30,77" stroke="#E39B6B" strokeWidth="7" strokeLinecap="round" fill="none"/>
                    {/* body */}
                    <ellipse cx="84" cy="120" rx="46" ry="34" fill="url(#ob-cb)"/>
                    <ellipse cx="84" cy="128" rx="28" ry="20" fill="url(#ob-cbl)"/>
                    {/* collar */}
                    <path d="M44,100 Q84,114 124,100" stroke="#B8840A" strokeWidth="9" fill="none" strokeLinecap="round"/>
                    <path d="M44,100 Q84,114 124,100" stroke="#FFD060" strokeWidth="6" fill="none" strokeLinecap="round"/>
                    <circle cx="84" cy="108" r="6.5" fill="#FFB820"/>
                    {/* legs */}
                    <rect x="58" y="124" width="16" height="30" rx="8" fill="#E39B6B"/>
                    <rect x="94" y="124" width="16" height="30" rx="8" fill="#E39B6B"/>
                    <rect x="54" y="112" width="16" height="30" rx="8" fill="#E39B6B"/>
                    <rect x="96" y="112" width="16" height="30" rx="8" fill="#E39B6B"/>
                    <ellipse cx="66" cy="155" rx="11" ry="5.5" fill="#C97A4A"/>
                    <ellipse cx="102" cy="155" rx="11" ry="5.5" fill="#C97A4A"/>
                    <ellipse cx="62" cy="143" rx="11" ry="5.5" fill="#C97A4A"/>
                    <ellipse cx="104" cy="143" rx="11" ry="5.5" fill="#C97A4A"/>
                    {/* ears */}
                    <polygon points="34,64 15,10 63,43" fill="#B9653C"/>
                    <polygon points="37,59 22,15 57,40" fill="#D98B5A"/>
                    <polygon points="130,64 153,10 105,43" fill="#B9653C"/>
                    <polygon points="127,59 146,15 111,40" fill="#D98B5A"/>
                    {/* head */}
                    <circle cx="84" cy="70" r="51" fill="url(#ob-cf)"/>
                    <ellipse cx="84" cy="86" rx="24" ry="16" fill="#F8D8BE" opacity=".9"/>
                    {/* nose + mouth */}
                    <polygon points="84,86 79,80 89,80" fill="#F29AA3"/>
                    <path d="M78,91 Q84,96 90,91" stroke="#B96D4A" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    {/* whiskers */}
                    <line x1="16" y1="80" x2="58" y2="84" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/>
                    <line x1="15" y1="89" x2="57" y2="89" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/>
                    <line x1="152" y1="80" x2="110" y2="84" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/>
                    <line x1="153" y1="89" x2="111" y2="89" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/>
                    {/* eyes */}
                    <ellipse cx="59" cy="70" rx="10" ry="12" fill="#2A2A2A"/>
                    <circle cx="59" cy="67" r="3.5" fill="rgba(255,255,255,.9)"/>
                    <ellipse cx="109" cy="70" rx="10" ry="12" fill="#2A2A2A"/>
                    <circle cx="109" cy="67" r="3.5" fill="rgba(255,255,255,.9)"/>
                  </svg>
                  <div style={{fontSize:13,fontWeight:600,color:pet==="cat"?"var(--c-text)":"var(--c-text2)"}}>Cat</div>
                  {pet==="cat" && <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--c-accent2)",fontWeight:500}}><Icon name="check" size={12} color="var(--c-accent2)"/>Selected</div>}
                </div>

                {/* Dog card */}
                <div onClick={()=>setPet("dog")} style={{border:`1.5px solid ${pet==="dog"?"var(--c-accent)":"var(--c-border)"}`,background:pet==="dog"?"rgba(124,106,255,.1)":"rgba(255,255,255,.03)",borderRadius:18,padding:"16px 10px",cursor:"pointer",transition:"all .25s ease",display:"flex",flexDirection:"column",alignItems:"center",gap:8,boxShadow:pet==="dog"?"0 0 0 4px rgba(124,106,255,.12)":"none"}}>
                  <svg width="100" height="100" viewBox="0 0 170 175">
                    <defs>
                      <radialGradient id="ob-df" cx="50%" cy="38%" r="52%"><stop offset="0%" stopColor="#F2D898"/><stop offset="100%" stopColor="#D4AE6A"/></radialGradient>
                      <radialGradient id="ob-db" cx="50%" cy="40%" r="55%"><stop offset="0%" stopColor="#EAC97A"/><stop offset="100%" stopColor="#C8A050"/></radialGradient>
                      <radialGradient id="ob-de" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#D0985A"/><stop offset="100%" stopColor="#A87040"/></radialGradient>
                    </defs>
                    {/* tail */}
                    <path d="M122,110 Q150,95 155,74 Q158,54 138,50" stroke="#DEB870" strokeWidth="7" strokeLinecap="round" fill="none"/>
                    {/* body */}
                    <ellipse cx="84" cy="118" rx="48" ry="36" fill="url(#ob-db)"/>
                    {/* legs */}
                    <rect x="58" y="122" width="16" height="32" rx="8" fill="#C8A050"/>
                    <rect x="94" y="122" width="16" height="32" rx="8" fill="#C8A050"/>
                    <rect x="54" y="110" width="16" height="34" rx="8" fill="#C8A050"/>
                    <rect x="96" y="110" width="16" height="34" rx="8" fill="#C8A050"/>
                    <ellipse cx="66" cy="155" rx="11" ry="5.5" fill="#A07030"/>
                    <ellipse cx="102" cy="155" rx="11" ry="5.5" fill="#A07030"/>
                    <ellipse cx="62" cy="145" rx="11" ry="5.5" fill="#A07030"/>
                    <ellipse cx="104" cy="145" rx="11" ry="5.5" fill="#A07030"/>
                    {/* floppy ears */}
                    <path d="M22,42 Q6,34 5,68 Q3,96 28,97 Q52,98 52,72 Q52,44 28,38 Z" fill="#A87040"/>
                    <path d="M26,46 Q12,40 11,68 Q10,90 28,91 Q48,91 48,72 Q48,48 28,44 Z" fill="url(#ob-de)"/>
                    <path d="M148,42 Q162,34 163,68 Q165,96 140,97 Q116,98 116,72 Q116,44 140,38 Z" fill="#A87040"/>
                    <path d="M144,46 Q156,40 157,68 Q158,90 140,91 Q120,91 120,72 Q120,48 140,44 Z" fill="url(#ob-de)"/>
                    {/* head */}
                    <circle cx="84" cy="66" r="50" fill="url(#ob-df)"/>
                    {/* snout */}
                    <ellipse cx="84" cy="84" rx="28" ry="22" fill="#F8EDD0"/>
                    <ellipse cx="84" cy="79" rx="11" ry="8" fill="#3A1F0C"/>
                    <ellipse cx="81" cy="76" rx="3" ry="2" fill="rgba(255,255,255,.22)"/>
                    <path d="M75,90 Q84,100 93,90" stroke="#8B5E30" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    {/* eyes */}
                    <circle cx="59" cy="64" r="14" fill="#1A0E04"/>
                    <circle cx="60" cy="64" r="9" fill="#F8F0E0"/>
                    <circle cx="64" cy="60" r="4" fill="#7A4A18"/>
                    <circle cx="63" cy="61" r="1.4" fill="rgba(255,255,255,.9)"/>
                    <circle cx="109" cy="64" r="14" fill="#1A0E04"/>
                    <circle cx="110" cy="64" r="9" fill="#F8F0E0"/>
                    <circle cx="114" cy="60" r="4" fill="#7A4A18"/>
                    <circle cx="113" cy="61" r="1.4" fill="rgba(255,255,255,.9)"/>
                  </svg>
                  <div style={{fontSize:13,fontWeight:600,color:pet==="dog"?"var(--c-text)":"var(--c-text2)"}}>Dog</div>
                  {pet==="dog" && <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--c-accent2)",fontWeight:500}}><Icon name="check" size={12} color="var(--c-accent2)"/>Selected</div>}
                </div>
              </div>
              <ObBtn onClick={()=>setStep(2)} disabled={!pet}>Continue</ObBtn>
            </div>
          )}
          {step === 2 && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:22,animation:"sp-fade-up .4s ease both"}}>
              <div style={{width:60,height:60,borderRadius:17,background:"rgba(124,106,255,.15)",border:"1px solid rgba(124,106,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",animation:"sp-float 3s ease-in-out infinite"}}><Icon name="tag" size={26} color="var(--c-accent2)"/></div>
              <div style={{textAlign:"center"}}><h2 style={{fontSize:"1.45rem",fontFamily:"var(--font-serif)",fontStyle:"italic",color:"var(--c-text)",margin:"0 0 8px",fontWeight:400}}>Name your companion</h2><p style={{fontSize:13,color:"var(--c-text2)",margin:0}}>Shown on your dashboard.</p></div>
              <input value={name} onChange={e=>setName(e.target.value)} maxLength={16} placeholder="Mochi, Luna, Kopi…" style={{width:"100%",padding:"13px 18px",border:`1.5px solid ${name.trim()?"var(--c-accent)":"var(--c-border)"}`,borderRadius:12,fontSize:15,fontWeight:500,textAlign:"center",background:"rgba(255,255,255,.04)",color:"var(--c-text)",outline:"none",transition:"border-color .2s",fontFamily:"var(--font-body)",boxSizing:"border-box" as const}}/>
              <ObBtn onClick={()=>setStep(3)} disabled={!name.trim()}>Continue</ObBtn>
            </div>
          )}
          {step === 3 && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:22,animation:"sp-fade-up .4s ease both"}}>
              <div style={{width:60,height:60,borderRadius:17,background:"rgba(45,212,191,.12)",border:"1px solid rgba(45,212,191,.2)",display:"flex",alignItems:"center",justifyContent:"center",animation:"sp-heartbeat 1.6s ease-in-out infinite"}}><Icon name="check" size={26} color="var(--c-teal)"/></div>
              <div style={{textAlign:"center"}}><h2 style={{fontSize:"1.45rem",fontFamily:"var(--font-serif)",fontStyle:"italic",color:"var(--c-text)",margin:"0 0 8px",fontWeight:400}}>All set</h2><p style={{fontSize:13,color:"var(--c-text2)",margin:0}}>Here's how to keep {name||"your companion"} happy.</p></div>
              <div style={{background:"rgba(255,255,255,.03)",border:"1px solid var(--c-border)",borderRadius:16,padding:"16px 18px",width:"100%"}}>
                {HOW.map((h,i)=>(
                  <div key={h.title} style={{display:"flex",gap:14,marginBottom:i<HOW.length-1?14:0,textAlign:"left"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(124,106,255,.15)",border:"1px solid rgba(124,106,255,.2)",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"var(--c-accent2)"}}>{i+1}</div>
                    <div><div style={{fontSize:13,fontWeight:600,color:"var(--c-text)"}}>{h.title}</div><div style={{fontSize:11,color:"var(--c-text3)",lineHeight:1.5,marginTop:3}}>{h.desc}</div></div>
                  </div>
                ))}
              </div>
              <ObBtn onClick={()=>onDone(pet!,name.trim()||"Pal")}>Start Journey</ObBtn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ObBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"13px 0",border:"none",borderRadius:12,fontSize:14,fontWeight:600,cursor:disabled?"not-allowed":"pointer",background:disabled?"rgba(255,255,255,.06)":"linear-gradient(135deg,var(--c-accent),#5E4FD4)",color:disabled?"var(--c-text3)":"#fff",transition:"all .2s ease",boxShadow:disabled?"none":"var(--shadow-accent)",fontFamily:"var(--font-body)",letterSpacing:".01em",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      {children}
    </button>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────── */
export default function StudyPalPage() {
  const [S, setS]                       = useState<SPState>(def);
  const [anim, setAnim]                 = useState<AnimState>("idle");
  const [speech, setSpeech]             = useState<string | null>(null);
  const [tab, setTab]                   = useState<TabId>("feed");
  const [showBowl, setShowBowl]         = useState(false);
  const [walking, setWalking]           = useState(false);
  const [toasts, setToasts]             = useState<Toast[]>([]);
  const [particles, setParticles]       = useState<{id:number;x:number;y:number;c:string;s:number}[]>([]);
  const [treats, setTreats]             = useState<{id:number;x:number}[]>([]);
  const [xpPops, setXpPops]             = useState<{id:number;v:number}[]>([]);
  const [showHungerBanner, setShowHungerBanner]   = useState(false);
  const [showTreatCapBanner, setShowTreatCapBanner] = useState(false);
  const [decayPopTicks, setDecayPopTicks]           = useState(0);
  const [showLevelUp, setShowLevelUp]               = useState(false);
  const [newlyDroppedAcc, setNewlyDroppedAcc]       = useState<AccId | null>(null);

  const animRef    = useRef<AnimState>("idle");
  const moodT      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakT     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walkT      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepT     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pCnt       = useRef(0);
  const tCnt       = useRef(0);
  const toastCnt   = useRef(0);
  const xpCnt      = useRef(0);
  const clickRot   = useRef(0);

  const PCOLORS = ["#7C6AFF","#A594FE","#C4BBFF","#2DD4BF","#60AEFF","#FBBF24","#34D399"];

  // ── LOAD + DECAY ON MOUNT ───────────────────────────────────
  useEffect(() => {
    const loaded = load();
    setS(loaded);

    // Apply passive decay and surface a pop if any ticks happened
    const lost = studypalApplyDecayOnMount();
    if (lost > 0) {
      setDecayPopTicks(lost);
      setTimeout(() => setDecayPopTicks(0), 2500);
    }

    // Hunger check (after decay is applied)
    const lastFed = loaded.lastFedAt;
    const isHungry = !lastFed || (Date.now() - lastFed > TWO_DAYS_MS);
    if (isHungry) {
      setShowHungerBanner(true);

      // Fire bell notification once per 24h max
      const notifyKey = "sp_hunger_notified";
      const lastNotified = localStorage.getItem(notifyKey);
      const alreadyNotified = lastNotified &&
        Date.now() - Number(lastNotified) < 24 * 60 * 60 * 1000;

      if (!alreadyNotified && loaded.onboarded) {
        fetch("/api/studypal/hungry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ petName: loaded.petName }),
        }).then(r => {
          if (r.ok) localStorage.setItem(notifyKey, String(Date.now()));
        }).catch(() => {}); // silently ignore if offline
      }
    }

    // Treat cap check
    if (loaded.treatCapReached) {
      setShowTreatCapBanner(true);
      studypalClearTreatCap();
    }

    // Level-up drop check
    if (loaded.leveledUp && loaded.pendingDrop) {
      setNewlyDroppedAcc(loaded.pendingDrop as AccId);
      setShowLevelUp(true);
      studypalClearPendingDrop();
    }
  }, []);
  // ────────────────────────────────────────────────────────────

  const upd = useCallback((patch: Partial<SPState>) => {
    setS(prev => { const n = { ...prev, ...patch }; save(n); return n; });
  }, []);

  function triggerAnim(a: AnimState, dur = 2400) {
    animRef.current = a; setAnim(a); clearTimeout(moodT.current!);
    if (a !== "sleep" && a !== "walk") moodT.current = setTimeout(() => { setAnim("idle"); animRef.current = "idle"; }, dur);
  }
  function triggerSpeech(msg: string) {
    setSpeech(msg); clearTimeout(speakT.current!);
    speakT.current = setTimeout(() => setSpeech(null), 2600);
  }
  function spawnParticles() {
    const ps = Array.from({length:12},(_,i)=>{
      const angle=(Math.PI*2/12)*i;
      return {id:pCnt.current++,x:50+Math.cos(angle)*42,y:42+Math.sin(angle)*32,c:PCOLORS[i%7],s:3+Math.random()*5};
    });
    setParticles(p=>[...p,...ps]);
    setTimeout(()=>setParticles(p=>p.filter(x=>!ps.find(n=>n.id===x.id))),800);
  }
  function popXP(v: number) {
    const id=xpCnt.current++;
    setXpPops(p=>[...p,{id,v}]);
    setTimeout(()=>setXpPops(p=>p.filter(x=>x.id!==id)),1200);
  }
  function dropTreats(n: number) {
    for (let i=0;i<Math.min(n,7);i++) {
      const id=tCnt.current++;const x=12+Math.random()*30;
      setTimeout(()=>{setTreats(t=>[...t,{id,x}]);setTimeout(()=>setTreats(t=>t.filter(v=>v.id!==id)),750);},i*110);
    }
  }

  // Walk loop
  useEffect(() => {
    function doWalk() {
      if (animRef.current==="idle"||animRef.current==="walk") {
        setWalking(true);triggerAnim("walk");
        walkT.current=setTimeout(()=>{setWalking(false);triggerAnim("idle");schedule();},9000);
      } else {schedule();}
    }
    function schedule(){walkT.current=setTimeout(doWalk,12000+Math.random()*8000);}
    walkT.current=setTimeout(doWalk,10000);
    return ()=>clearTimeout(walkT.current!);
  },[]);

  function resetSleep() {
    clearTimeout(sleepT.current!);
    sleepT.current=setTimeout(()=>{if(animRef.current==="idle"){triggerAnim("sleep",999999);triggerSpeech("Resting…");}},30000);
  }
  useEffect(()=>{resetSleep();return()=>clearTimeout(sleepT.current!);},[]);

  // Reset sleep timer on tab change too
  useEffect(() => { resetSleep(); }, [tab]);

  function onPetClick() {
    resetSleep();
    if (anim==="sleep"){triggerAnim("idle");triggerSpeech(S.petType==="cat"?"Awake now":"Good morning!");return;}
    const seqs: AnimState[]=["meow","jump","happy","excited"];
    const a=seqs[clickRot.current%seqs.length];clickRot.current++;
    triggerAnim(a,2000);
    const lines: Record<string,Record<string,string>>={cat:{meow:"Meow~",jump:"Wheee!",happy:"So happy!",excited:"Zoomies!"},dog:{meow:"Woof!",jump:"Boing!",happy:"Best day!",excited:"Zoomies!"}};
    triggerSpeech(lines[S.petType]?.[a]||"Hi!");
    spawnParticles();
  }

  function triggerActivity(id: string) {
    const a=ACTIVITIES.find(x=>x.id===id);if(!a)return;
    // If treats already maxed out AND nothing pending to feed, block new rewards
    if (S.treats >= TREATS_MAX && S.pending === 0) {
      setShowTreatCapBanner(true);
      triggerSpeech("I'm stuffed!");
      return;
    }
    // If treats maxed but pending exists, just guide to feed — don't block XP
    if (S.treats >= TREATS_MAX && S.pending > 0) {
      triggerSpeech("Feed me first!");
      setTab("feed");
      return;
    }
    const prevLevel = getLvl(S.xp);
    const newXP     = S.xp + a.xp;
    const newLevel  = getLvl(newXP);

    // Log entry
    const entry: SPLogEntry = {activityId:id as any,activityName:a.name,xp:a.xp,treats:a.treats,timestamp:Date.now()};
    const newLog = [entry,...(S.activityLog||[])].slice(0,10);

    upd({ xp:newXP, pending:S.pending+a.treats, points:S.points+a.xp, activityLog:newLog });
    triggerAnim("excited",1800);triggerSpeech(`+${a.xp} XP`);
    spawnParticles();popXP(a.xp);
    setToasts([{id:toastCnt.current++,treats:a.treats,actName:a.name}]);

    // Level up?
    if (newLevel > prevLevel) {
      setTimeout(() => {
        const lvlName = LEVELS[newLevel].name;
        // Pick a random drop from unowned
        const ownedNow = S.owned as AccId[];
        const droppable = (["bow","headband","glasses","hat","cap","scarf","ribbon","sunglasses","earring","monocle","halo","bandana","wizard","crown"] as AccId[]).filter(id=>!ownedNow.includes(id));
        const drop: AccId | null = droppable.length>0 ? droppable[Math.floor(Math.random()*droppable.length)] : null;
        if (drop) {
          setNewlyDroppedAcc(drop);
          upd({ owned:[...ownedNow,drop] });
        }
        setShowLevelUp(true);
        triggerAnim("happy",4000);spawnParticles();
      }, 1200);
    }
  }

  function feedNow(n: number) {
    setToasts([]);
    triggerAnim("eat",n*150+800);triggerSpeech("Nom nom nom!");
    setShowBowl(true);dropTreats(n);
    setTimeout(()=>{
      setShowBowl(false);
      const newTreats = Math.min(S.treats+n, TREATS_MAX);
      upd({treats:newTreats,pending:0,lastFedAt:Date.now(),lastDecayedAt:Date.now()});
      studypalMarkFed();
      localStorage.removeItem("sp_hunger_notified");
      setShowHungerBanner(false);setShowTreatCapBanner(false);
      spawnParticles();triggerAnim("happy",2400);triggerSpeech("Thank you!");
    },n*160+800);
  }

  function burnTreats() {
    // "Play" action — pet burns 3 treats doing zoomies, making room to earn more
    if (S.treats < 3) return;
    upd({treats:S.treats-3});
    triggerAnim("excited",2200);triggerSpeech("Zoomies!");
    spawnParticles();
    setShowTreatCapBanner(false);
  }

  if (!S.onboarded) return <Onboarding onDone={(t,n)=>{const ns={...def(),petType:t,petName:n,treats:8,onboarded:true,lastFedAt:Date.now(),lastDecayedAt:Date.now()};setS(ns);save(ns);}}/>;

  const li=getLvl(S.xp),lvl=LEVELS[li],nxt=LEVELS[li+1];
  const xpPct=nxt?Math.round(((S.xp-lvl.xp)/(nxt.xp-lvl.xp))*100):100;
  const tPct=Math.round((Math.min(S.treats,TREATS_MAX)/TREATS_MAX)*100);
  const hungry=S.treats<3;

  const accentColor=S.petType==="cat"?"var(--c-accent)":"var(--c-dog)";
  const accentHex=S.petType==="cat"?"#7C6AFF":"#60AEFF";
  const PetComp=S.petType==="cat"?CatSVG:DogSVG;

  const statusMsg: Record<AnimState,string>={walk:"Strolling around",eat:"Having a treat",sleep:"Resting",jump:"Jumping!",meow:"Meow!",bark:"Woof!",happy:"Happy!",excited:"Excited!",idle:"Tap to interact"};

  // Acc name lookup for level-up modal
  const droppedAccName = newlyDroppedAcc ? (ACCS.find(a=>a.id===newlyDroppedAcc)?.name ?? "") : "";

  return (
    <div className="sp">
      <style>{KF}</style>

      {/* Level-up modal */}
      {showLevelUp && (
        <LevelUpModal
          levelName={LEVELS[getLvl(S.xp)].name}
          droppedAcc={newlyDroppedAcc}
          accName={droppedAccName}
          accentHex={accentHex}
          onClose={() => { setShowLevelUp(false); setNewlyDroppedAcc(null); }}
        />
      )}

      {/* Decay pop */}
      {decayPopTicks > 0 && <DecayPop ticks={decayPopTicks}/>}

{/* Header */}
      <header style={{background:"color-mix(in srgb, var(--c-surface) 92%, transparent)",backdropFilter:"blur(20px)",borderBottom:"1px solid var(--c-border)",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:650,margin:"0 auto",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:44,height:44,borderRadius:13,background:`linear-gradient(135deg,${accentHex},#5E4FD4)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 12px ${accentHex}44`}}><Icon name={S.petType} size={22} color="white" strokeWidth={1.5}/></div>
              <div style={{position:"absolute",bottom:-2,right:-2,width:12,height:12,borderRadius:"50%",background:"var(--c-green)",border:"2px solid var(--c-bg)"}}/>
            </div>
            <div style={{minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:16,fontWeight:700,color:"var(--c-text)",fontFamily:"var(--font-serif)",fontStyle:"italic",lineHeight:1}}>{S.petName}</span>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase" as const,background:`${accentHex}20`,color:accentHex,padding:"2px 7px",borderRadius:5,border:`1px solid ${accentHex}30`}}>{lvl.name}</span>
                {(S.streakCount??0) > 0 && <span style={{fontSize:10,fontWeight:700,background:"rgba(248,113,113,.15)",color:"var(--c-red)",padding:"2px 7px",borderRadius:5,border:"1px solid rgba(248,113,113,.25)",display:"flex",alignItems:"center",gap:3}}><Icon name="flame" size={10} color="var(--c-red)"/>{S.streakCount}d</span>}
              </div>
              <div style={{marginTop:6,display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:90,height:5,borderRadius:4,background:"rgba(255,255,255,.08)",overflow:"hidden",flexShrink:0}}><div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${accentHex},${accentHex}99)`,width:`${xpPct}%`,transition:"width .8s ease"}}/></div>
                <span style={{fontSize:11,color:"var(--c-text3)",fontWeight:500}}>{S.xp}{nxt?`/${nxt.xp}`:""} XP</span>
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(251,191,36,.12)",color:"var(--c-amber)",fontSize:14,fontWeight:700,padding:"8px 15px",borderRadius:20,border:"1px solid rgba(251,191,36,.25)",flexShrink:0}}>
            <Icon name="coins" size={15} color="var(--c-amber)"/>{S.points}
          </div>
        </div>
      </header>

      {/* Content column */}
      <div className="sp-inner">

        {/* Banners */}
        {(showHungerBanner || showTreatCapBanner) && (
          <div style={{padding:"14px 16px 0",display:"flex",flexDirection:"column",gap:8}}>
            {showHungerBanner && <HungerBanner petName={S.petName} onDismiss={()=>setShowHungerBanner(false)}/>}
            {showTreatCapBanner && <TreatCapBanner petName={S.petName} onBurn={burnTreats} onDismiss={()=>{setShowTreatCapBanner(false);studypalClearTreatCap();}}/>}
          </div>
        )}

        {/* Persistent pending treats banner on mount */}
        {S.pending > 0 && !showBowl && tab !== "feed" && (
          <div style={{margin:"14px 16px 0",background:"rgba(124,106,255,.1)",border:"1px solid rgba(124,106,255,.25)",borderRadius:16,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setTab("feed")}>
            <div style={{width:36,height:36,borderRadius:10,background:"rgba(124,106,255,.2)",border:"1px solid rgba(124,106,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"sp-float 1.8s ease-in-out infinite"}}><Icon name="cookie" size={16} color="var(--c-accent2)"/></div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"var(--c-text)"}}>{S.pending} treats waiting</div><div style={{fontSize:11,color:"var(--c-text3)",marginTop:2}}>Tap to go to Rewards and feed {S.petName}</div></div>
            <Icon name="arrow-r" size={16} color="var(--c-text3)"/>
          </div>
        )}

        {/* Arena card */}
        <div style={{margin:"14px 16px 0",background:"var(--c-surface)",borderRadius:22,border:"1px solid var(--c-border)",overflow:"hidden",boxShadow:"var(--shadow-md)"}}>
          <div style={{height:220,position:"relative",overflow:"hidden",background:"linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,.12) 100%)"}}>
            <SceneBg petType={S.petType}/>
            <div style={{position:"absolute",bottom:16,...(walking?{animation:"sp-walk-x 9s linear forwards",left:-180,width:170}:{left:"50%",transform:"translateX(-50%)"})}}>
              <div style={{position:"relative",width:170,height:175}}>
                {speech && <div style={{position:"absolute",top:-14,right:-18,background:accentHex,color:"#fff",fontSize:12,fontWeight:600,padding:"7px 14px",borderRadius:"16px 16px 16px 3px",whiteSpace:"nowrap" as const,animation:"sp-speech .3s cubic-bezier(.34,1.56,.64,1)",zIndex:30,pointerEvents:"none",fontFamily:"var(--font-body)",boxShadow:`0 4px 16px ${accentHex}44`}}>{speech}</div>}
                {anim==="sleep" && <div style={{position:"absolute",top:4,right:2,pointerEvents:"none"}}><div style={{position:"absolute",top:0,right:0,fontSize:13,fontWeight:700,color:accentHex,animation:"sp-zzz1 2.4s ease-out infinite",fontFamily:"var(--font-body)"}}>z</div><div style={{position:"absolute",top:-16,right:12,fontSize:18,fontWeight:700,color:accentHex,animation:"sp-zzz2 2.4s ease-out infinite",animationDelay:".8s",fontFamily:"var(--font-body)"}}>Z</div></div>}
                {["happy","excited"].includes(anim) && <div style={{position:"absolute",inset:-12,borderRadius:"50%",border:`2px solid ${accentHex}40`,animation:"sp-glow 2s ease-in-out infinite",pointerEvents:"none"}}/>}
                {xpPops.map(p=>(
                  <div key={p.id} style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:50}}>
                    {/* Main XP pop */}
                    <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",fontSize:16,fontWeight:700,color:"#fff",background:accentHex,padding:"4px 11px",borderRadius:20,boxShadow:`0 2px 14px ${accentHex}80`,animation:"sp-xp 1.2s cubic-bezier(.2,1.4,.5,1) forwards",fontFamily:"var(--font-body)",whiteSpace:"nowrap" as const,display:"flex",alignItems:"center",gap:4}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>+{p.v} XP
                    </div>
                    {/* Secondary left pop */}
                    <div style={{position:"absolute",top:14,left:"calc(50% - 42px)",fontSize:11,fontWeight:700,color:accentHex,animation:"sp-xp2 1.3s ease-out .08s forwards",fontFamily:"var(--font-body)",opacity:0,whiteSpace:"nowrap" as const}}>+{p.v}</div>
                    {/* Tertiary right pop */}
                    <div style={{position:"absolute",top:18,left:"calc(50% + 26px)",fontSize:10,fontWeight:600,color:accentHex,animation:"sp-xp2 1.1s ease-out .18s forwards",fontFamily:"var(--font-body)",opacity:0,whiteSpace:"nowrap" as const}}>XP</div>
                  </div>
                ))}
                <PetComp anim={anim} acc={S.acc} onClick={onPetClick}/>
                {particles.map(p=><div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:`${p.y}%`,width:p.s,height:p.s,borderRadius:"50%",background:p.c,pointerEvents:"none",//@ts-ignore
                "--dx":`${(p.x-50)*1.1}px`,"--dy":`${(p.y-42)*.9}px`,animation:"sp-burst .7s ease-out forwards",zIndex:40}}/>)}
                {treats.map(t=><div key={t.id} style={{position:"absolute",left:t.x,top:0,animation:"sp-treat .7s ease-out forwards",zIndex:38}}><svg width="13" height="13" viewBox="0 0 13 13"><circle cx="6.5" cy="6.5" r="6.5" fill={accentHex}/><circle cx="6.5" cy="6.5" r="4" fill="#C4BBFF"/></svg></div>)}
                {showBowl && <div style={{position:"absolute",bottom:8,right:8}}><svg width="58" height="38" viewBox="0 0 58 38"><ellipse cx="29" cy="30" rx="24" ry="7" fill={`${accentHex}18`} stroke={`${accentHex}40`} strokeWidth="1.5"/><circle cx="20" cy="24" r="4" fill={accentHex}/><circle cx="30" cy="21" r="4.5" fill={accentHex}/><circle cx="38" cy="25" r="3" fill="#C4BBFF"/></svg></div>}
              </div>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,display:"flex",justifyContent:"center",padding:"0 0 10px"}}><div style={{fontSize:10,fontWeight:500,color:"var(--c-text3)",letterSpacing:".06em",textTransform:"uppercase" as const}}>{statusMsg[anim]||"Tap to interact"}</div></div>
          </div>

          {/* Stats */}
          <div style={{padding:"18px 20px 0"}}>
            <StatBar label="Experience" val={`${S.xp} XP${nxt?` / ${nxt.xp}`:" · Max"}`} pct={xpPct} accent={accentHex} icon="star" flash={xpPops.length>0}/>
            <StatBar label="Treat level" val={`${S.treats} / ${TREATS_MAX}`} pct={tPct} accent={hungry?"#F87171":accentHex} icon="cookie" flash={false}/>
          </div>

          {/* Status pills */}
          <div style={{padding:"12px 20px 20px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:"rgba(255,255,255,.04)",border:`1px solid ${hungry?"rgba(248,113,113,.2)":"rgba(52,211,153,.2)"}`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:9}}>
                <Icon name={hungry?"help":"paw"} size={18} color={hungry?"var(--c-red)":"var(--c-green)"}/>
                <div><div style={{fontSize:11,fontWeight:700,color:hungry?"var(--c-red)":"var(--c-green)"}}>{hungry?"Hungry":"Happy"}</div><div style={{fontSize:10,color:"var(--c-text3)",marginTop:1}}>{hungry?"Give treats!":"All good"}</div></div>
              </div>
              <div style={{background:"rgba(255,255,255,.04)",border:"1px solid var(--c-border)",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:9}}>
                {(S.streakCount??0)>0 ? (
                  <><Icon name="flame" size={18} color="var(--c-red)"/><div><div style={{fontSize:11,fontWeight:700,color:"var(--c-red)",display:"flex",alignItems:"center",gap:4}}><Icon name="flame" size={10} color="var(--c-red)"/>{S.streakCount}-day streak</div><div style={{fontSize:10,color:"var(--c-text3)",marginTop:1}}>Keep it up!</div></div></>
                ) : (
                  <><Icon name="zap" size={18} color="var(--c-accent2)"/><div><div style={{fontSize:11,fontWeight:700,color:"var(--c-accent2)"}}>{S.xp} XP</div><div style={{fontSize:10,color:"var(--c-text3)",marginTop:1}}>{lvl.name}{nxt?` → ${nxt.name}`:" · Max"}</div></div></>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",margin:"12px 16px 0",background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:14,padding:4,gap:3}}>
          {([["feed","Rewards","trophy"],["wardrobe","Wardrobe","shirt"],["about","Profile","user"]] as [TabId,string,string][]).map(([t,label,icon])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"9px 0",border:"none",cursor:"pointer",fontSize:12,fontFamily:"var(--font-body)",fontWeight:500,transition:"all .2s ease",borderRadius:10,background:tab===t?"rgba(255,255,255,.08)":"transparent",color:tab===t?"var(--c-text)":"var(--c-text3)",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:tab===t?"var(--shadow-sm)":"none",position:"relative" as const}}>
              <Icon name={icon} size={13} color={tab===t?"var(--c-text)":"var(--c-text3)"}/>
              {label}
              {t==="wardrobe" && newlyDroppedAcc && !showLevelUp && <div style={{position:"absolute",top:4,right:8,width:7,height:7,borderRadius:"50%",background:"var(--c-green)",border:"1.5px solid var(--c-bg)"}}/>}
            </button>
          ))}
        </div>

        {/* ── REWARDS TAB ── */}
        {tab==="feed" && (
          <div style={{margin:"12px 16px 0"}}>
            {S.pending>0 && (
              <div style={{background:"rgba(124,106,255,.1)",border:"1px solid rgba(124,106,255,.25)",borderRadius:18,padding:"14px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:14,boxShadow:"var(--shadow-sm)"}}>
                <div style={{width:46,height:46,borderRadius:12,background:"rgba(124,106,255,.2)",border:"1px solid rgba(124,106,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"sp-float 1.8s ease-in-out infinite"}}><Icon name="cookie" size={20} color="var(--c-accent2)"/></div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:"var(--c-text)"}}>{S.pending} treats pending</div><div style={{fontSize:11,color:"var(--c-text3)",marginTop:2}}>{S.petName} is waiting to be fed</div></div>
                <button onClick={()=>feedNow(S.pending)} style={{background:"linear-gradient(135deg,var(--c-accent),#5E4FD4)",color:"#fff",border:"none",borderRadius:10,padding:"9px 16px",fontSize:12,fontWeight:600,fontFamily:"var(--font-body)",cursor:"pointer",flexShrink:0,boxShadow:"var(--shadow-accent)",whiteSpace:"nowrap" as const,display:"flex",alignItems:"center",gap:6}}><Icon name="cookie" size={13} color="white"/>Give Treat</button>
              </div>
            )}

            <div style={{fontSize:10,fontWeight:600,color:"var(--c-text3)",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10,paddingLeft:2}}>Activity Rewards</div>

            <SimulateExplainer accentHex={accentHex}/>
            <PointsExplainer/>
            <ActivityLog log={S.activityLog||[]}/>

            {ACTIVITIES.map((a,i)=>(
              <div key={a.id} style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:16,padding:"14px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12,animation:`sp-pop .35s ease both`,animationDelay:`${i*.05}s`}}>
                <div style={{width:42,height:42,borderRadius:12,background:"rgba(255,255,255,.05)",border:"1px solid var(--c-border)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ActivityIcon id={a.id} size={18}/></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:500,color:"var(--c-text)"}}>{a.name}</div>
                  <div style={{fontSize:12,color:"var(--c-text3)",marginTop:5,display:"flex",gap:8}}>
                    <span style={{background:"rgba(124,106,255,.12)",color:"var(--c-accent2)",padding:"2px 8px",borderRadius:6,fontWeight:600,display:"flex",alignItems:"center",gap:3}}><Icon name="zap" size={10} color="var(--c-accent2)"/>+{a.xp}</span>
                    <span style={{background:"rgba(196,187,255,.08)",color:"var(--c-text2)",padding:"2px 8px",borderRadius:6,fontWeight:600,display:"flex",alignItems:"center",gap:3}}><Icon name="cookie" size={10} color="var(--c-text2)"/>+{a.treats}</span>
                  </div>
                </div>
                <button onClick={()=>triggerActivity(a.id)} style={{background:"rgba(255,255,255,.06)",color:"var(--c-text2)",border:"1px solid var(--c-border)",borderRadius:9,padding:"7px 13px",fontSize:12,fontWeight:500,fontFamily:"var(--font-body)",cursor:"pointer",transition:"all .2s ease",whiteSpace:"nowrap" as const}}>Test</button>
              </div>
            ))}
          </div>
        )}

        {/* ── WARDROBE TAB ── */}
        {tab==="wardrobe" && (
          <div style={{margin:"12px 16px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:600,color:"var(--c-text3)",letterSpacing:".08em",textTransform:"uppercase" as const}}>Accessories ({ACCS.length-1} available)</div>
              <div style={{background:"rgba(251,191,36,.1)",color:"var(--c-amber)",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:20,border:"1px solid rgba(251,191,36,.2)",display:"flex",alignItems:"center",gap:5}}><Icon name="coins" size={12} color="var(--c-amber)"/>{S.points} pts</div>
            </div>
            <div style={{marginBottom:12,padding:"9px 12px",background:"rgba(255,255,255,.03)",border:"1px solid var(--c-border)",borderRadius:10,fontSize:11,color:"var(--c-text3)",lineHeight:1.5}}>
              Earn points by completing sessions, quizzes &amp; tasks. Level up to get free accessory drops! Tap any item to equip or purchase.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {ACCS.map(a=>(
                <AccessoryCard key={a.id} acc={a} owned={S.owned.includes(a.id)} active={S.acc===a.id} canBuy={S.points>=a.cost} accentColor={accentHex} isNew={a.id===newlyDroppedAcc} onClick={()=>buyAcc(a)}/>
              ))}
            </div>
          </div>
        )}

        {/* ── ABOUT TAB ── */}
        {tab==="about" && (
          <div style={{margin:"12px 16px 0",display:"flex",flexDirection:"column",gap:12}}>
            {/* Companion switcher */}
            <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:20,padding:"18px 18px",boxShadow:"var(--shadow-sm)"}}>
              <div style={{fontSize:11,fontWeight:600,color:"var(--c-text3)",letterSpacing:".06em",textTransform:"uppercase" as const,marginBottom:14}}>Companion</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {(["cat","dog"] as PetType[]).map(t=>(
                  <div key={t} onClick={()=>{upd({petType:t});triggerSpeech(t==="cat"?"Meow!":"Woof!");triggerAnim("happy",2000);spawnParticles();}} style={{border:`1.5px solid ${S.petType===t?accentHex:"var(--c-border)"}`,background:S.petType===t?`${accentHex}12`:"rgba(255,255,255,.03)",borderRadius:14,padding:"20px 16px",textAlign:"center" as const,cursor:"pointer",transition:"all .22s ease"}}>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
                      <Icon name={t} size={32} color={S.petType===t?accentHex:"var(--c-text3)"} strokeWidth={1.4}/>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:S.petType===t?"var(--c-text)":"var(--c-text3)",textTransform:"capitalize" as const}}>{t}{S.petType===t&&<span style={{color:accentHex,marginLeft:5}}>·</span>}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:20,padding:"18px 18px"}}>
              <div style={{fontSize:11,fontWeight:600,color:"var(--c-text3)",letterSpacing:".06em",textTransform:"uppercase" as const,marginBottom:14}}>Stats</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {v:S.xp,l:"Total XP",icon:"zap",c:accentHex},
                  {v:S.treats,l:"Treats",icon:"cookie",c:"var(--c-text2)"},
                  {v:S.points,l:"Points",icon:"coins",c:"var(--c-amber)"},
                  {v:S.owned.length-1,l:"Accessories",icon:"shirt",c:"var(--c-green)"},
                  {v:S.streakCount??0,l:"Day streak",icon:"flame",c:"var(--c-red)"},
                  {v:S.activityLog?.length??0,l:"Activities",icon:"history",c:"var(--c-text2)"},
                ].map(x=>(
                  <div key={x.l} style={{background:"rgba(255,255,255,.03)",border:"1px solid var(--c-border)",borderRadius:12,padding:"12px 14px"}}>
                    <Icon name={x.icon} size={15} color={x.c}/>
                    <div style={{fontSize:22,fontWeight:700,color:x.c,marginTop:6,fontFamily:"var(--font-serif)",fontStyle:"italic"}}>{x.v}</div>
                    <div style={{fontSize:10,fontWeight:500,color:"var(--c-text3)",marginTop:3,textTransform:"uppercase" as const,letterSpacing:".05em"}}>{x.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last fed */}
            {S.lastFedAt && (
              <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:16,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
                <Icon name="clock" size={16} color="var(--c-text3)"/>
                <div><div style={{fontSize:12,fontWeight:600,color:"var(--c-text2)"}}>Last fed</div><div style={{fontSize:11,color:"var(--c-text3)",marginTop:2}}>{fmtRelTime(Date.now()-S.lastFedAt)}</div></div>
              </div>
            )}

            {/* Level progression */}
            <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:20,padding:"18px 18px"}}>
              <div style={{fontSize:11,fontWeight:600,color:"var(--c-text3)",letterSpacing:".06em",textTransform:"uppercase" as const,marginBottom:14}}>Level Progression</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {LEVELS.map((l,i)=>{
                  const done=S.xp>=l.xp,curr=i===li;
                  return (
                    <div key={l.name} style={{display:"flex",alignItems:"center",gap:12,opacity:done||curr?1:.35}}>
                      <div style={{width:32,height:32,borderRadius:9,background:curr?`${accentHex}20`:done?"rgba(52,211,153,.1)":"rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1px solid ${curr?accentHex:done?"rgba(52,211,153,.2)":"var(--c-border)"}`}}><LevelIcon icon={l.icon} size={14}/></div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:curr?600:500,color:curr?"var(--c-text)":"var(--c-text2)",display:"flex",alignItems:"center",gap:6}}>{l.name}{curr&&<span style={{fontSize:10,background:`${accentHex}18`,color:accentHex,padding:"2px 7px",borderRadius:5,fontWeight:600}}>current</span>}</div>
                        <div style={{fontSize:12,color:"var(--c-text3)",marginTop:2}}>{l.xp} XP required{i>0&&i<LEVELS.length-1?<span style={{display:"inline-flex",alignItems:"center",gap:3,marginLeft:4}}> · <Icon name="gift" size={11} color="var(--c-text3)"/> free drop</span>:""}</div>
                      </div>
                      {done&&!curr&&<Icon name="check" size={14} color="var(--c-green)"/>}
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={()=>{if(confirm("Reset all progress?")){const n=def();n.onboarded=false;setS(n);save(n);}}} style={{background:"rgba(255,255,255,.04)",color:"var(--c-text3)",border:"1px solid var(--c-border)",borderRadius:12,padding:"12px",fontSize:12,fontWeight:500,fontFamily:"var(--font-body)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
              <Icon name="refresh" size={13} color="var(--c-text3)"/>Reset all progress
            </button>
          </div>
        )}
      </div>


    </div>
  );

  function buyAcc(a: typeof ACCS[0]) {
    if (S.owned.includes(a.id)){upd({acc:a.id});triggerSpeech("Looking sharp!");return;}
    if (S.points>=a.cost){upd({points:S.points-a.cost,owned:[...S.owned,a.id],acc:a.id});triggerSpeech("New look!");triggerAnim("happy",2000);spawnParticles();}
  }
}