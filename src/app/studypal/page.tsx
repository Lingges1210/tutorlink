"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  studypalApplyDecayOnMount,
  studypalMarkFed,
  studypalClearPendingDrop,
  studypalClearTreatCap,
  studypalLoadFromServer,
  studypalScheduleSync,
  type SPLogEntry,
} from "@/lib/studypalReward";
import MiniGamesModal from "@/components/MiniGamesModal";

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


/* ─── MOOD SYSTEM ────────────────────────────────────────── */
type MoodTier = "ecstatic" | "happy" | "neutral" | "hungry" | "starving";
interface MoodInfo {
  tier: MoodTier; label: string; emoji: string;
  color: string; bg: string; border: string;
  dialogue: { cat: string[]; dog: string[] };
}
const MOODS: Record<MoodTier, MoodInfo> = {
  ecstatic: {
    tier:"ecstatic", label:"Ecstatic", emoji:"🌟",
    color:"#D68000", bg:"rgba(214,128,0,.10)", border:"rgba(214,128,0,.28)",
    dialogue:{
      cat:["Best day ever! 🌟","I love studying!","You're amazing!","Pure happiness!"],
      dog:["BEST DAY EVER! 🌟","I love you!","Woof woof woof!","SO HAPPY!"],
    },
  },
  happy: {
    tier:"happy", label:"Happy", emoji:"😊",
    color:"#00A86B", bg:"rgba(0,168,107,.10)", border:"rgba(0,168,107,.25)",
    dialogue:{
      cat:["All good~","Ready to learn!","Feeling great!","Let's study!"],
      dog:["All good!","Ready to go!","Feeling great!","Let's do this!"],
    },
  },
  neutral: {
    tier:"neutral", label:"Neutral", emoji:"😐",
    color:"#6C5CE7", bg:"rgba(108,92,231,.08)", border:"rgba(108,92,231,.22)",
    dialogue:{
      cat:["How's studying?","Feed me soon~","Just chilling.","Feeling okay."],
      dog:["What's up?","A treat soon?","Just hanging.","Doing okay."],
    },
  },
  hungry: {
    tier:"hungry", label:"Hungry", emoji:"😕",
    color:"#D68000", bg:"rgba(214,128,0,.08)", border:"rgba(214,128,0,.22)",
    dialogue:{
      cat:["Getting hungry…","A treat would be nice.","My tummy's empty.","Study soon?"],
      dog:["Getting hungry…","A treat please?","Belly is rumbling.","Study please!"],
    },
  },
  starving: {
    tier:"starving", label:"Starving", emoji:"😢",
    color:"#E53935", bg:"rgba(229,57,53,.08)", border:"rgba(229,57,53,.22)",
    dialogue:{
      cat:["Please feed me…","So hungry…","I need a treat…","Help me…"],
      dog:["Please feed me…","So hungry…","Need a treat…","Please…"],
    },
  },
};
function computeMood(s: SPState): MoodInfo {
  const overhungry = !s.lastFedAt || (Date.now() - (s.lastFedAt ?? 0) > 2*24*60*60*1000);
  if (s.treats <= 1 || overhungry) return MOODS.starving;
  if (s.treats <= 4) return MOODS.hungry;
  if (s.treats <= 7) return MOODS.neutral;
  if (s.treats >= 12 && (s.streakCount ?? 0) >= 3) return MOODS.ecstatic;
  return MOODS.happy;
}

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
    case "gamepad":    return <svg {...s} viewBox="0 0 24 24"><rect {...p} x="2" y="6" width="20" height="12" rx="2"/><path {...p} d="M6 12h4m-2-2v4"/><circle cx="17" cy="10" r="1" fill={color} stroke="none"/><circle cx="19" cy="12" r="1" fill={color} stroke="none"/></svg>;
    default:           return <svg {...s} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="3" /></svg>;
  }
}

function ActivityIcon({ id, size = 18, color }: { id: string; size?: number; color?: string }) {
  const map: Record<string, string> = { quiz: "book", streak: "flame", booking: "calendar", session: "sparkle", sos: "help", badge: "trophy" };
  return <Icon name={map[id] || "zap"} size={size} color={color}/>;
}
function LevelIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const map: Record<string, string> = { seed: "seed", book: "book", grad: "grad", star: "star", crown: "crown" };
  return <Icon name={map[icon] || "star"} size={size} />;
}

/* ─── GLOBAL STYLES ─────────────────────────────────────── */
const KF = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');

  :root {
    --c-bg:#F0EFF9;--c-surface:#FFFFFF;--c-surface2:#E8E6F6;--c-surface3:#F7F6FE;
    --c-border:rgba(108,92,212,0.11);--c-border2:rgba(108,92,212,0.2);
    --c-text:#18162E;--c-text2:#4E4870;--c-text3:#9B95C0;
    --c-accent:#6C5CE7;--c-accent2:#8B7FF8;--c-accent3:#B8B0FF;
    --c-teal:#00B4A0;--c-green:#00A86B;--c-amber:#D68000;--c-red:#E53935;
    --c-cat:#8B7FF8;--c-dog:#3D9BE9;
    --r-sm:10px;--r-md:14px;--r-lg:20px;--r-xl:28px;
    --font-body:'DM Sans',system-ui,sans-serif;--font-serif:'Instrument Serif',Georgia,serif;
    --shadow-xs:0 1px 3px rgba(60,40,180,0.07);
    --shadow-sm:0 2px 8px rgba(60,40,180,0.09),0 1px 3px rgba(60,40,180,0.06);
    --shadow-md:0 6px 24px rgba(60,40,180,0.11),0 2px 8px rgba(60,40,180,0.07);
    --shadow-lg:0 16px 48px rgba(60,40,180,0.13),0 4px 14px rgba(60,40,180,0.08);
    --shadow-accent:0 4px 20px rgba(108,92,231,0.28);
    --shadow-glow:0 0 0 3px rgba(108,92,231,0.14);
  }
  .dark {
    --c-bg:#0D0C18;--c-surface:#13121F;--c-surface2:#1A1829;--c-surface3:#201E30;
    --c-border:rgba(255,255,255,0.07);--c-border2:rgba(255,255,255,0.13);
    --c-text:#EAE6FF;--c-text2:#7E78A8;--c-text3:#4A4670;
    --c-accent:#7C6AFF;--c-accent2:#A594FE;--c-accent3:#C8C0FF;
    --c-teal:#2DD4BF;--c-green:#34D399;--c-amber:#FBBF24;--c-red:#F87171;
    --c-cat:#A594FE;--c-dog:#60AEFF;
    --shadow-xs:0 1px 3px rgba(0,0,0,0.35);
    --shadow-sm:0 2px 8px rgba(0,0,0,0.4),0 1px 3px rgba(0,0,0,0.3);
    --shadow-md:0 6px 24px rgba(0,0,0,0.5),0 2px 8px rgba(0,0,0,0.3);
    --shadow-lg:0 16px 48px rgba(0,0,0,0.6),0 4px 14px rgba(0,0,0,0.4);
    --shadow-accent:0 4px 20px rgba(124,106,255,0.32);
    --shadow-glow:0 0 0 3px rgba(124,106,255,0.18);
  }
  * { box-sizing:border-box; }
  .sp { font-family:var(--font-body);background:var(--c-bg);color:var(--c-text);-webkit-font-smoothing:antialiased; }
  .sp-inner { max-width:650px;margin:0 auto;padding:0 0 48px; }
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
  @keyframes sp-glow    { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:.55;transform:scale(1.1)} }
  @keyframes sp-zzz1    { 0%,25%{opacity:0;transform:translate(0,0) scale(.6)} 55%{opacity:1} 100%{opacity:0;transform:translate(8px,-28px) scale(.9)} }
  @keyframes sp-zzz2    { 0%,35%{opacity:0;transform:translate(0,0) scale(.6)} 65%{opacity:1} 100%{opacity:0;transform:translate(14px,-42px) scale(1.1)} }
  @keyframes sp-shimmer { 0%{background-position:-300% center} 100%{background-position:300% center} }
  @keyframes sp-pop     { from{opacity:0;transform:scale(.72) translateY(6px)} 75%{transform:scale(1.03) translateY(-1px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes sp-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes sp-fade-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sp-spin    { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes sp-heartbeat { 0%,100%{transform:scale(1)} 40%{transform:scale(1.14)} 70%{transform:scale(.96)} }
  @keyframes sp-hunger-banner { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sp-levelup { 0%{opacity:0;transform:scale(.6) rotate(-6deg)} 70%{transform:scale(1.06) rotate(1deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
  @keyframes sp-decay-tick { 0%{opacity:0;transform:translateY(0) scale(1)} 40%{opacity:1} 100%{opacity:0;transform:translateY(-40px) scale(.8)} }
  @keyframes sp-slide-in { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
  @keyframes sp-tab-in  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
  @keyframes sp-pulse-ring { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.5);opacity:0} }
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
  .sp-card-hover { transition:transform .18s ease,box-shadow .18s ease; }
  .sp-card-hover:hover { transform:translateY(-1px);box-shadow:var(--shadow-md); }
  .sp-tab {
    flex:1;padding:10px 0;border:none;cursor:pointer;font-size:12px;
    font-family:var(--font-body);font-weight:500;
    transition:all .2s cubic-bezier(.34,1.56,.64,1);
    border-radius:11px;display:flex;align-items:center;justify-content:center;gap:5px;position:relative;
  }
  .sp-tab.active { background:var(--c-accent);color:#fff;box-shadow:var(--shadow-accent);font-weight:600; }
  .sp-tab.inactive { background:transparent;color:var(--c-text3); }
  .sp-tab.inactive:hover { background:var(--c-surface2);color:var(--c-text2); }
  .sp-act-row {
    background:var(--c-surface);border:1px solid var(--c-border);border-radius:16px;
    padding:13px 15px;margin-bottom:7px;display:flex;align-items:center;gap:12px;
    transition:border-color .18s,transform .18s,box-shadow .18s;
  }
  .sp-act-row:hover { border-color:var(--c-border2);transform:translateY(-1px);box-shadow:var(--shadow-sm); }
  .sp ::-webkit-scrollbar { width:4px; }
  .sp ::-webkit-scrollbar-track { background:transparent; }
  .sp ::-webkit-scrollbar-thumb { background:var(--c-border2);border-radius:4px; }
`;

/* ─── ACCESSORY SVG (cat) ───────────────────────────────── */
function CatAcc({ id }: { id: AccId }) {
  if (id === "cap") return (<><rect x="50" y="28" width="68" height="9" rx="3" fill="#7C6AFF"/><rect x="64" y="10" width="40" height="20" rx="3" fill="#5E4FD4"/><rect x="63" y="28" width="42" height="3" rx="1" fill="#4A3EC0"/><line x1="116" y1="28" x2="122" y2="46" stroke="#A594FE" strokeWidth="3.5" strokeLinecap="round"/><circle cx="122" cy="49" r="5" fill="#A594FE"/></>);
  if (id === "glasses") return (<><circle cx="59" cy="70" r="15" stroke="#7C6AFF" strokeWidth="2.8" fill="rgba(124,106,255,.12)" opacity=".9"/><circle cx="109" cy="70" r="15" stroke="#7C6AFF" strokeWidth="2.8" fill="rgba(124,106,255,.12)" opacity=".9"/><line x1="74" y1="70" x2="94" y2="70" stroke="#7C6AFF" strokeWidth="2.5"/><line x1="22" y1="68" x2="44" y2="70" stroke="#7C6AFF" strokeWidth="2"/><line x1="146" y1="68" x2="124" y2="70" stroke="#7C6AFF" strokeWidth="2"/></>);
  if (id === "sunglasses") return (<><rect x="41" y="63" width="36" height="18" rx="7" fill="#1A1040" opacity=".93"/><rect x="91" y="63" width="36" height="18" rx="7" fill="#1A1040" opacity=".93"/><line x1="77" y1="72" x2="91" y2="72" stroke="#7C6AFF" strokeWidth="2.5"/><line x1="22" y1="69" x2="41" y2="72" stroke="#7C6AFF" strokeWidth="2"/><line x1="146" y1="69" x2="127" y2="72" stroke="#7C6AFF" strokeWidth="2"/><rect x="46" y="66" width="11" height="7" rx="2" fill="rgba(124,106,255,.28)"/><rect x="96" y="66" width="11" height="7" rx="2" fill="rgba(124,106,255,.28)"/></>);
  if (id === "crown") return (<><path d="M58,26 L69,8 L84,22 L99,8 L110,26 L107,38 H61 Z" fill="#FBBF24"/><circle cx="84" cy="22" r="5" fill="#FDE68A"/><circle cx="58" cy="26" r="4" fill="#FDE68A"/><circle cx="110" cy="26" r="4" fill="#FDE68A"/><rect x="61" y="36" width="46" height="4" rx="2" fill="#D97706"/></>);
  if (id === "bow") return (<><ellipse cx="65" cy="108" rx="17" ry="10" fill="#7C6AFF"/><ellipse cx="103" cy="108" rx="17" ry="10" fill="#7C6AFF"/><ellipse cx="65" cy="108" rx="9" ry="5" fill="#A594FE" opacity=".45"/><ellipse cx="103" cy="108" rx="9" ry="5" fill="#A594FE" opacity=".45"/><circle cx="84" cy="108" r="8" fill="#C4BBFF"/></>);
  if (id === "ribbon") return (<><path d="M50,46 Q84,30 118,46" stroke="#FF80B0" strokeWidth="13" strokeLinecap="round" fill="none"/><circle cx="84" cy="34" r="12" fill="#FF80B0"/><circle cx="84" cy="34" r="6" fill="#FFB8D4"/><path d="M52,46 Q84,34 116,46" stroke="rgba(255,255,255,.3)" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="5 4"/></>);
  if (id === "scarf") return (<><path d="M38,112 Q84,126 130,112 Q132,121 130,126 Q84,140 38,126 Z" fill="#2DD4BF"/><path d="M38,112 Q84,120 130,112" stroke="rgba(255,255,255,.28)" strokeWidth="2" fill="none"/><path d="M50,125 Q44,138 48,152 Q51,162 60,157" stroke="#2DD4BF" strokeWidth="12" strokeLinecap="round" fill="none"/><path d="M50,125 Q44,138 48,152" stroke="rgba(255,255,255,.22)" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="6 5"/></>);
  if (id === "hat") return (<><ellipse cx="84" cy="28" rx="42" ry="10" fill="#FF80B0"/><polygon points="84,0 42,28 126,28" fill="#FF5FA0"/><line x1="60" y1="21" x2="70" y2="5" stroke="#FFD060" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/><line x1="76" y1="26" x2="82" y2="8" stroke="#7C6AFF" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/><line x1="90" y1="26" x2="96" y2="8" stroke="#2DD4BF" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/><line x1="103" y1="21" x2="110" y2="7" stroke="#FFD060" strokeWidth="3" strokeLinecap="round" opacity=".9"/><circle cx="84" cy="0" r="6" fill="#FFD060"/></>);
  if (id === "headband") return (<><path d="M26,56 Q84,30 142,56" stroke="#7C6AFF" strokeWidth="10" strokeLinecap="round" fill="none"/><circle cx="84" cy="36" r="14" fill="#7C6AFF"/><circle cx="84" cy="36" r="7" fill="#C4BBFF"/></>);
  if (id === "monocle") return (<><circle cx="109" cy="70" r="17" stroke="#8B7355" strokeWidth="3.5" fill="rgba(251,191,36,.1)"/><line x1="124" y1="83" x2="135" y2="96" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/></>);
  if (id === "halo") return (<><ellipse cx="84" cy="13" rx="34" ry="9" fill="none" stroke="#FFD060" strokeWidth="4"/><ellipse cx="84" cy="13" rx="34" ry="9" fill="none" stroke="#FFE898" strokeWidth="2" opacity=".6"/></>);
  if (id === "earring") return (<><circle cx="31" cy="88" r="5" fill="none" stroke="#FFD060" strokeWidth="2.5"/><circle cx="31" cy="100" r="5.5" fill="#FFB820"/></>);
  if (id === "wizard") return (<><ellipse cx="84" cy="30" rx="30" ry="8" fill="#5E4FD4"/><polygon points="84,-8 54,30 114,30" fill="#4A3BB8"/><polygon points="84,-8 54,30 114,30" fill="none" stroke="#A594FE" strokeWidth="1.5" opacity=".6"/><circle cx="84" cy="-8" r="4" fill="#C4BBFF"/><circle cx="70" cy="10" r="3.5" fill="#C4BBFF" opacity=".85"/><circle cx="96" cy="4" r="2.5" fill="#C4BBFF" opacity=".7"/><circle cx="76" cy="20" r="2" fill="#A594FE" opacity=".6"/><circle cx="100" cy="16" r="2" fill="#A594FE" opacity=".5"/></>);
  if (id === "bandana") return (<><path d="M41,108 Q84,122 127,108 Q127,122 84,140 Q41,122 41,108 Z" fill="#2DD4BF"/><path d="M41,108 Q84,118 127,108" stroke="rgba(255,255,255,.3)" strokeWidth="2" fill="none"/><path d="M64,134 L72,152 Q78,161 82,159" stroke="#2DD4BF" strokeWidth="9" strokeLinecap="round" fill="none"/></>);
  return null;
}

/* ─── ACCESSORY SVG (dog) ───────────────────────────────── */
function DogAcc({ id }: { id: AccId }) {
  if (id === "cap") return (<><rect x="50" y="24" width="68" height="9" rx="3" fill="#7C6AFF"/><rect x="64" y="6" width="40" height="20" rx="3" fill="#5E4FD4"/><rect x="63" y="24" width="42" height="3" rx="1" fill="#4A3EC0"/><line x1="116" y1="24" x2="122" y2="42" stroke="#A594FE" strokeWidth="3.5" strokeLinecap="round"/><circle cx="122" cy="45" r="5" fill="#A594FE"/></>);
  if (id === "glasses") return (<><circle cx="59" cy="64" r="15" stroke="#7C6AFF" strokeWidth="2.8" fill="rgba(124,106,255,.12)" opacity=".9"/><circle cx="109" cy="64" r="15" stroke="#7C6AFF" strokeWidth="2.8" fill="rgba(124,106,255,.12)" opacity=".9"/><line x1="74" y1="64" x2="94" y2="64" stroke="#7C6AFF" strokeWidth="2.5"/><line x1="22" y1="62" x2="44" y2="64" stroke="#7C6AFF" strokeWidth="2"/><line x1="146" y1="62" x2="124" y2="64" stroke="#7C6AFF" strokeWidth="2"/></>);
  if (id === "sunglasses") return (<><rect x="41" y="55" width="36" height="18" rx="7" fill="#1A1040" opacity=".93"/><rect x="91" y="55" width="36" height="18" rx="7" fill="#1A1040" opacity=".93"/><line x1="77" y1="64" x2="91" y2="64" stroke="#60AEFF" strokeWidth="2.5"/><line x1="22" y1="61" x2="41" y2="64" stroke="#60AEFF" strokeWidth="2"/><line x1="146" y1="61" x2="127" y2="64" stroke="#60AEFF" strokeWidth="2"/><rect x="46" y="58" width="11" height="7" rx="2" fill="rgba(96,174,255,.28)"/><rect x="96" y="58" width="11" height="7" rx="2" fill="rgba(96,174,255,.28)"/></>);
  if (id === "crown") return (<><path d="M58,22 L69,4 L84,18 L99,4 L110,22 L107,34 H61 Z" fill="#FBBF24"/><circle cx="84" cy="18" r="5" fill="#FDE68A"/><circle cx="58" cy="22" r="4" fill="#FDE68A"/><circle cx="110" cy="22" r="4" fill="#FDE68A"/><rect x="61" y="32" width="46" height="4" rx="2" fill="#D97706"/></>);
  if (id === "bow") return (<><ellipse cx="65" cy="104" rx="17" ry="10" fill="#7C6AFF"/><ellipse cx="103" cy="104" rx="17" ry="10" fill="#7C6AFF"/><ellipse cx="65" cy="104" rx="9" ry="5" fill="#A594FE" opacity=".45"/><ellipse cx="103" cy="104" rx="9" ry="5" fill="#A594FE" opacity=".45"/><circle cx="84" cy="104" r="8" fill="#C4BBFF"/></>);
  if (id === "ribbon") return (<><path d="M50,42 Q84,26 118,42" stroke="#FF80B0" strokeWidth="13" strokeLinecap="round" fill="none"/><circle cx="84" cy="30" r="12" fill="#FF80B0"/><circle cx="84" cy="30" r="6" fill="#FFB8D4"/><path d="M52,42 Q84,30 116,42" stroke="rgba(255,255,255,.3)" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="5 4"/></>);
  if (id === "scarf") return (<><path d="M34,108 Q84,122 134,108 Q136,117 134,122 Q84,136 34,122 Z" fill="#2DD4BF"/><path d="M34,108 Q84,116 134,108" stroke="rgba(255,255,255,.28)" strokeWidth="2" fill="none"/><path d="M48,121 Q42,134 46,148 Q49,159 58,154" stroke="#2DD4BF" strokeWidth="12" strokeLinecap="round" fill="none"/><path d="M48,121 Q42,134 46,148" stroke="rgba(255,255,255,.22)" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="6 5"/></>);
  if (id === "hat") return (<><ellipse cx="84" cy="22" rx="42" ry="10" fill="#FF80B0"/><polygon points="84,0 42,22 126,22" fill="#FF5FA0"/><line x1="60" y1="16" x2="70" y2="2" stroke="#FFD060" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/><line x1="76" y1="20" x2="82" y2="4" stroke="#7C6AFF" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/><line x1="90" y1="20" x2="96" y2="4" stroke="#2DD4BF" strokeWidth="3.5" strokeLinecap="round" opacity=".9"/><line x1="103" y1="16" x2="110" y2="4" stroke="#FFD060" strokeWidth="3" strokeLinecap="round" opacity=".9"/><circle cx="84" cy="0" r="6" fill="#FFD060"/></>);
  if (id === "headband") return (<><path d="M38,50 Q84,26 130,50" stroke="#7C6AFF" strokeWidth="10" strokeLinecap="round" fill="none"/><circle cx="84" cy="32" r="14" fill="#7C6AFF"/><circle cx="84" cy="32" r="7" fill="#C4BBFF"/></>);
  if (id === "monocle") return (<><circle cx="109" cy="64" r="17" stroke="#8B7355" strokeWidth="3.5" fill="rgba(251,191,36,.1)"/><line x1="124" y1="77" x2="135" y2="90" stroke="#8B7355" strokeWidth="2.5" strokeLinecap="round"/></>);
  if (id === "halo") return (<><ellipse cx="84" cy="10" rx="34" ry="9" fill="none" stroke="#FFD060" strokeWidth="4"/><ellipse cx="84" cy="10" rx="34" ry="9" fill="none" stroke="#FFE898" strokeWidth="2" opacity=".6"/></>);
  if (id === "earring") return (<><circle cx="24" cy="78" r="5" fill="none" stroke="#FFD060" strokeWidth="2.5"/><circle cx="24" cy="90" r="5.5" fill="#FFB820"/></>);
  if (id === "wizard") return (<><ellipse cx="84" cy="24" rx="30" ry="8" fill="#5E4FD4"/><polygon points="84,-8 54,24 114,24" fill="#4A3BB8"/><polygon points="84,-8 54,24 114,24" fill="none" stroke="#A594FE" strokeWidth="1.5" opacity=".6"/><circle cx="84" cy="-8" r="4" fill="#C4BBFF"/><circle cx="70" cy="6" r="3.5" fill="#C4BBFF" opacity=".85"/><circle cx="96" cy="0" r="2.5" fill="#C4BBFF" opacity=".7"/><circle cx="76" cy="16" r="2" fill="#A594FE" opacity=".6"/><circle cx="100" cy="12" r="2" fill="#A594FE" opacity=".5"/></>);
  if (id === "bandana") return (<><path d="M41,104 Q84,118 127,104 Q127,118 84,136 Q41,118 41,104 Z" fill="#2DD4BF"/><path d="M41,104 Q84,114 127,104" stroke="rgba(255,255,255,.3)" strokeWidth="2" fill="none"/><path d="M64,130 L72,148 Q78,157 82,155" stroke="#2DD4BF" strokeWidth="9" strokeLinecap="round" fill="none"/></>);
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
function CatSVG({ anim, acc, onClick, mood }: { anim: AnimState; acc: AccId; onClick: () => void; mood?: MoodTier }) {
  const walk=anim==="walk",eat=anim==="eat",sleep=anim==="sleep",happy=["happy","excited","meow"].includes(anim),excited=anim==="excited";
  const bc=eat?"sp-eat":walk?"":"sp-idle",lf=walk?"sp-lf":"",lb=walk?"sp-lb":"";
  const ecstatic=mood==="ecstatic",starving=mood==="starving";
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
        {(happy||ecstatic) && <><ellipse cx="52" cy="87" rx="10" ry="6" fill="#FF9DB0" opacity={ecstatic?".5":".2"}/><ellipse cx="116" cy="87" rx="10" ry="6" fill="#FF9DB0" opacity={ecstatic?".5":".2"}/>{ecstatic&&<><circle cx="52" cy="84" r="3" fill="#FFD060" opacity=".55"/><circle cx="116" cy="84" r="3" fill="#FFD060" opacity=".55"/></>}</>}
        {sleep && <><ellipse cx="54" cy="80" rx="8" ry="5" fill="#EDB183" opacity=".22"/><ellipse cx="114" cy="80" rx="8" ry="5" fill="#EDB183" opacity=".22"/></>}
        <polygon points="84,86 79,80 89,80" fill="#F29AA3"/><polygon points="84,86 79,80 89,80" fill="none" stroke="#DD7C88" strokeWidth="0.7"/>
        <path d="M78,91 Q84,96 90,91" stroke="#B96D4A" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <line x1="16" y1="80" x2="58" y2="84" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/><line x1="15" y1="89" x2="57" y2="89" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/><line x1="17" y1="97" x2="58" y2="93" stroke="#C97A4A" strokeWidth="1.2" strokeLinecap="round" opacity=".28"/>
        <line x1="152" y1="80" x2="110" y2="84" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/><line x1="153" y1="89" x2="111" y2="89" stroke="#C97A4A" strokeWidth="1.6" strokeLinecap="round" opacity=".45"/><line x1="151" y1="97" x2="110" y2="93" stroke="#C97A4A" strokeWidth="1.2" strokeLinecap="round" opacity=".28"/>
        {!sleep && !starving && (<><ellipse className="sp-eye" cx="59" cy="70" rx="10" ry="12" fill="#2A2A2A"/><circle className="sp-pupil" cx="59" cy="67" r="3.5" fill="rgba(255,255,255,.9)"/>{ecstatic&&<><circle cx="57" cy="65" r="2" fill="#FFD060" opacity=".9"/><circle cx="61" cy="67" r="1.5" fill="#FFD060" opacity=".7"/></>}<ellipse className="sp-eye2" cx="109" cy="70" rx="10" ry="12" fill="#2A2A2A"/><circle className="sp-pupil" cx="109" cy="67" r="3.5" fill="rgba(255,255,255,.9)"/>{ecstatic&&<><circle cx="107" cy="65" r="2" fill="#FFD060" opacity=".9"/><circle cx="111" cy="67" r="1.5" fill="#FFD060" opacity=".7"/></>}<path className="sp-arc" d="M51 70 Q59 78 67 70" stroke="#2A2A2A" strokeWidth="3" fill="none" strokeLinecap="round"/><path className="sp-arc" d="M101 70 Q109 78 117 70" stroke="#2A2A2A" strokeWidth="3" fill="none" strokeLinecap="round"/></>)}
        {!sleep && starving && (<><ellipse cx="59" cy="70" rx="10" ry="12" fill="#2A2A2A"/><ellipse cx="59" cy="63" rx="11" ry="6" fill="#EDB183" opacity=".85"/><ellipse cx="109" cy="70" rx="10" ry="12" fill="#2A2A2A"/><ellipse cx="109" cy="63" rx="11" ry="6" fill="#EDB183" opacity=".85"/></>)}
        {sleep && (<><ellipse cx="59" cy="70" rx="10" ry="6" fill="#EDB183"/><path d="M49,70 Q59,76 69,70" stroke="#C97A4A" strokeWidth="2.5" fill="none" strokeLinecap="round"/><ellipse cx="109" cy="70" rx="10" ry="6" fill="#EDB183"/><path d="M99,70 Q109,76 119,70" stroke="#C97A4A" strokeWidth="2.5" fill="none" strokeLinecap="round"/></>)}
        <CatAcc id={acc}/>
      </g>
    </svg>
  );
}

/* ─── DOG SVG ─────────────────────────────────────────────── */
function DogSVG({ anim, acc, onClick, mood }: { anim: AnimState; acc: AccId; onClick: () => void; mood?: MoodTier }) {
  const walk=anim==="walk",eat=anim==="eat",sleep=anim==="sleep",happy=["happy","excited","bark"].includes(anim),excited=anim==="excited";
  const bc=eat?"sp-eat":walk?"":"sp-idle",lf=walk?"sp-lf":"",lb=walk?"sp-lb":"";
  const ecstatic=mood==="ecstatic",starving=mood==="starving";
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
        {(happy||ecstatic) && <><ellipse cx="47" cy="83" rx="10" ry="6" fill="#FF9040" opacity={ecstatic?".45":".2"}/><ellipse cx="121" cy="83" rx="10" ry="6" fill="#FF9040" opacity={ecstatic?".45":".2"}/>{ecstatic&&<><circle cx="47" cy="80" r="3" fill="#FFD060" opacity=".55"/><circle cx="121" cy="80" r="3" fill="#FFD060" opacity=".55"/></>}</>}
        {sleep && <><ellipse cx="52" cy="80" rx="8" ry="5" fill="#C8A050" opacity=".2"/><ellipse cx="116" cy="80" rx="8" ry="5" fill="#C8A050" opacity=".2"/></>}
        <g className="sp-eye" style={{transformOrigin:"59px 64px"}}>
          {!sleep && !starving && (<><circle cx="59" cy="64" r="14" fill="#1A0E04"/><circle cx="59" cy="64" r="14" fill="none" stroke="#4A2E10" strokeWidth="1.5"/><circle className="sp-pupil" cx="60" cy="64" r="9" fill="#F8F0E0"/><circle className="sp-pupil" cx="64" cy="60" r="4" fill="#7A4A18"/><circle className="sp-pupil" cx="57" cy="67" r="2.2" fill="rgba(255,255,255,.45)"/><circle className="sp-pupil" cx="63" cy="61" r="1.4" fill="rgba(255,255,255,.9)"/>{ecstatic&&<><circle cx="62" cy="58" r="2" fill="#FFD060" opacity=".9"/><circle cx="58" cy="61" r="1.4" fill="#FFD060" opacity=".7"/></>}<path className="sp-arc" d="M46,64 Q59,50 72,64" stroke="#D4A050" strokeWidth="3.5" fill="none" strokeLinecap="round"/></>)}
          {!sleep && starving && (<><circle cx="59" cy="64" r="14" fill="#1A0E04"/><ellipse cx="59" cy="57" rx="15" ry="7" fill="#D4AE6A" opacity=".88"/></>)}
          {sleep && (<><ellipse cx="59" cy="64" rx="12" ry="6" fill="#D4AE6A"/><path d="M47,64 Q59,70 71,64" stroke="#A07030" strokeWidth="2.5" fill="none" strokeLinecap="round"/></>)}
        </g>
        <g className="sp-eye2" style={{transformOrigin:"109px 64px"}}>
          {!sleep && !starving && (<><circle cx="109" cy="64" r="14" fill="#1A0E04"/><circle cx="109" cy="64" r="14" fill="none" stroke="#4A2E10" strokeWidth="1.5"/><circle className="sp-pupil" cx="110" cy="64" r="9" fill="#F8F0E0"/><circle className="sp-pupil" cx="114" cy="60" r="4" fill="#7A4A18"/><circle className="sp-pupil" cx="107" cy="67" r="2.2" fill="rgba(255,255,255,.45)"/><circle className="sp-pupil" cx="113" cy="61" r="1.4" fill="rgba(255,255,255,.9)"/>{ecstatic&&<><circle cx="112" cy="58" r="2" fill="#FFD060" opacity=".9"/><circle cx="108" cy="61" r="1.4" fill="#FFD060" opacity=".7"/></>}<path className="sp-arc" d="M96,64 Q109,50 122,64" stroke="#D4A050" strokeWidth="3.5" fill="none" strokeLinecap="round"/></>)}
          {!sleep && starving && (<><circle cx="109" cy="64" r="14" fill="#1A0E04"/><ellipse cx="109" cy="57" rx="15" ry="7" fill="#D4AE6A" opacity=".88"/></>)}
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
  const c2 = petType === "cat" ? "#A594FE" : "#93C5FD";
  return (
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"hidden"}} viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="scene-glow" cx="50%" cy="40%" r="55%"><stop offset="0%" stopColor={c} stopOpacity=".12"/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient>
        <radialGradient id="scene-floor" cx="50%" cy="100%" r="50%"><stop offset="0%" stopColor={c} stopOpacity=".08"/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient>
        <linearGradient id="scene-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity=".04"/><stop offset="100%" stopColor={c} stopOpacity="0"/></linearGradient>
      </defs>
      <rect width="400" height="220" fill="url(#scene-top)"/>
      <rect width="400" height="220" fill="url(#scene-glow)"/>
      <g opacity=".12" stroke={c} strokeWidth=".6">
        {[0,50,100,150,200,250,300,350,400].map(x=>(<line key={x} x1={x} y1="185" x2={x+40} y2="220"/>))}
        {[185,195,207,220].map(y=>(<line key={y} x1="0" y1={y} x2="400" y2={y}/>))}
      </g>
      <rect y="180" width="400" height="40" fill="url(#scene-floor)"/>
      <line x1="0" y1="185" x2="400" y2="185" stroke={c} strokeWidth="1" strokeOpacity=".18"/>
      {[[28,28,2.2,3.5],[372,22,1.8,2.8],[14,115,1.6,4],[386,108,2,3.2],[200,18,2.5,3],[80,70,1.4,2.5],[320,55,1.8,3.8],[150,140,1.2,2]].map(([x,y,r,dur],i)=>(
        <circle key={i} cx={x} cy={y} r={r} fill={i%2===0?c:c2} opacity=".25" style={{animation:`sp-float ${dur}s ease-in-out infinite`,animationDelay:`${i*.6}s`}}/>
      ))}
      {[[60,18],[340,35],[180,10],[290,55]].map(([x,y],i)=>(
        <circle key={`s${i}`} cx={x} cy={y} r=".8" fill={c2} opacity=".4" style={{animation:`sp-float ${2.5+i*.4}s ease-in-out infinite`,animationDelay:`${i*.9}s`}}/>
      ))}
    </svg>
  );
}

/* ─── LEVEL-UP MODAL ─────────────────────────────────────── */
function LevelUpModal({ levelName, droppedAcc, accName, accentHex, onClose }: {
  levelName: string; droppedAcc: AccId | null; accName: string; accentHex: string; onClose: () => void;
}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"var(--c-surface)",border:`1px solid ${accentHex}30`,borderRadius:28,padding:"36px 28px 28px",maxWidth:340,width:"100%",textAlign:"center",boxShadow:`var(--shadow-lg),0 0 60px ${accentHex}20`,animation:"sp-levelup .5s cubic-bezier(.34,1.56,.64,1) both",fontFamily:"var(--font-body)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-20%",left:"50%",transform:"translateX(-50%)",width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle,${accentHex}15 0%,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{position:"relative",margin:"0 auto 18px",width:80,height:80}}>
          <div style={{position:"absolute",inset:-8,borderRadius:"50%",border:`2px solid ${accentHex}20`,animation:"sp-pulse-ring 2s ease-out infinite"}}/>
          <div style={{width:80,height:80,borderRadius:22,background:`linear-gradient(135deg,${accentHex}25,${accentHex}10)`,border:`1.5px solid ${accentHex}40`,display:"flex",alignItems:"center",justifyContent:"center",animation:"sp-heartbeat 1.6s ease-in-out infinite",boxShadow:`0 4px 24px ${accentHex}30`}}>
            <Icon name="sparkle" size={34} color={accentHex}/>
          </div>
        </div>
        <div style={{fontSize:"1.65rem",fontFamily:"var(--font-serif)",fontStyle:"italic",color:"var(--c-text)",marginBottom:6,fontWeight:400,lineHeight:1.1}}>Level Up!</div>
        <div style={{fontSize:14,color:"var(--c-text2)",marginBottom:20,lineHeight:1.5}}>You've reached <strong style={{color:accentHex,fontWeight:700}}>{levelName}</strong></div>
        {droppedAcc && (
          <div style={{background:`linear-gradient(135deg,${accentHex}10,${accentHex}06)`,border:`1px solid ${accentHex}28`,borderRadius:18,padding:"14px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:14,textAlign:"left"}}>
            <div style={{width:52,height:40,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:`${accentHex}12`,borderRadius:12,border:`1px solid ${accentHex}20`}}><AccPreview id={droppedAcc}/></div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:"var(--c-text)",display:"flex",alignItems:"center",gap:5,marginBottom:3}}><Icon name="gift" size={12} color="var(--c-green)"/>Free drop!</div>
              <div style={{fontSize:12,color:accentHex,fontWeight:600}}>{accName}</div>
              <div style={{fontSize:10,color:"var(--c-text3)",marginTop:1}}>Added to your wardrobe</div>
            </div>
          </div>
        )}
        <button onClick={onClose} style={{width:"100%",padding:"13px 0",border:"none",borderRadius:14,fontSize:14,fontWeight:700,cursor:"pointer",background:`linear-gradient(135deg,${accentHex},${accentHex}CC)`,color:"#fff",fontFamily:"var(--font-body)",boxShadow:`0 4px 20px ${accentHex}50`,letterSpacing:".02em",transition:"transform .15s,box-shadow .15s"}}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-1px)";}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="";}}>
          Awesome!
        </button>
      </div>
    </div>
  );
}

/* ─── STAT BAR ───────────────────────────────────────────── */
function StatBar({ label, val, pct, accent, icon, flash }: { label: string; val: string; pct: number; accent: string; icon: string; flash?: boolean }) {
  return (
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:24,height:24,borderRadius:7,background:flash?`${accent}25`:"var(--c-surface2)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .3s",border:`1px solid ${flash?accent+"40":"var(--c-border)"}`,flexShrink:0}}>
            <Icon name={icon} size={12} color={flash?accent:"var(--c-text3)"}/>
          </div>
          <span style={{fontSize:12,fontWeight:600,color:flash?"var(--c-text)":"var(--c-text2)",letterSpacing:".01em",transition:"color .3s"}}>{label}</span>
        </div>
        <span style={{fontSize:11,fontWeight:700,color:flash?"#fff":accent,background:flash?accent:`${accent}18`,padding:"3px 10px",borderRadius:20,border:`1px solid ${accent}${flash?"":"28"}`,transition:"all .3s ease",boxShadow:flash?`0 2px 12px ${accent}50`:"none",letterSpacing:".02em"}}>{val}</span>
      </div>
      <div style={{height:8,background:"var(--c-surface2)",borderRadius:8,overflow:"hidden",position:"relative",border:"1px solid var(--c-border)"}}>
        <div style={{height:"100%",borderRadius:8,backgroundImage:`linear-gradient(90deg,${accent}cc,${accent})`,backgroundSize:"200% auto",animation:flash?"sp-shimmer .5s linear infinite":"sp-shimmer 4s linear infinite",width:`${pct}%`,transition:"width .9s cubic-bezier(.34,1.56,.64,1)",boxShadow:flash?`0 0 10px ${accent}80,0 0 4px ${accent}60`:"none"}}/>
        {flash && <div style={{position:"absolute",inset:0,borderRadius:8,background:`linear-gradient(90deg,transparent 0%,${accent}60 50%,transparent 100%)`,animation:"sp-bar-flash .7s ease-out forwards"}}/>}
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
    <div onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{background: active ? `color-mix(in srgb,${accentColor} 10%,var(--c-surface))` : hover ? "var(--c-surface2)" : "var(--c-surface)",border: `1.5px solid ${active ? accentColor : hover && !locked ? "var(--c-border2)" : "var(--c-border)"}`,borderRadius:16, padding:"14px 10px", textAlign:"center" as const,cursor: locked ? "not-allowed" : "pointer",opacity: locked ? .4 : 1,transition:"all .2s ease",boxShadow: active ? `0 4px 18px ${accentColor}25` : hover && !locked ? "var(--shadow-sm)" : "none",position:"relative" as const}}>
      {isNew && <div style={{position:"absolute",top:5,left:5,fontSize:8,fontWeight:800,background:"var(--c-green)",color:"#fff",padding:"2px 5px",borderRadius:5,letterSpacing:".05em",textTransform:"uppercase" as const}}>NEW</div>}
      {active && <div style={{position:"absolute",top:6,right:6,width:17,height:17,borderRadius:"50%",background:accentColor,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 2px 6px ${accentColor}50`}}><Icon name="check" size={9} color="white" strokeWidth={2.8}/></div>}
      <div style={{height:42,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}><AccPreview id={acc.id}/></div>
      <div style={{fontSize:11,fontWeight:600,color:"var(--c-text)",marginBottom:5}}>{acc.name}</div>
      <div style={{fontSize:10,fontWeight:600}}>
        {acc.id==="none" ? <span style={{color:"var(--c-text3)"}}>Default</span>
          : active ? <span style={{color:accentColor,display:"flex",alignItems:"center",justifyContent:"center",gap:2}}><Icon name="check" size={9} color={accentColor}/>Equipped</span>
          : owned ? <span style={{color:"var(--c-green)",display:"flex",alignItems:"center",justifyContent:"center",gap:2}}><Icon name="unlock" size={9} color="var(--c-green)"/>Owned</span>
          : canBuy ? <span style={{color:"var(--c-amber)",display:"flex",alignItems:"center",justifyContent:"center",gap:2}}><Icon name="coins" size={9} color="var(--c-amber)"/>{acc.cost}</span>
          : <span style={{color:"var(--c-text3)",display:"flex",alignItems:"center",justifyContent:"center",gap:2}}><Icon name="lock" size={9} color="var(--c-text3)"/>{acc.cost}</span>}
      </div>
    </div>
  );
}

/* ─── HUNGER BANNER ──────────────────────────────────────── */
function HungerBanner({ petName, onDismiss }: { petName: string; onDismiss: () => void }) {
  return (
    <div style={{background:"color-mix(in srgb,var(--c-red) 8%,var(--c-surface))",border:"1px solid color-mix(in srgb,var(--c-red) 25%,transparent)",borderRadius:16,padding:"13px 14px",display:"flex",alignItems:"center",gap:12,animation:"sp-hunger-banner .4s ease both",boxShadow:"0 2px 12px color-mix(in srgb,var(--c-red) 12%,transparent)"}}>
      <div style={{width:38,height:38,borderRadius:11,background:"color-mix(in srgb,var(--c-red) 15%,transparent)",border:"1px solid color-mix(in srgb,var(--c-red) 25%,transparent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"sp-heartbeat 1.5s ease-in-out infinite"}}>
        <Icon name="help" size={17} color="var(--c-red)"/>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--c-red)",display:"flex",alignItems:"center",gap:5,marginBottom:2}}><Icon name="paw" size={12} color="var(--c-red)"/>Really hungry!</div>
        <div style={{fontSize:11,color:"var(--c-text2)",lineHeight:1.4}}>{petName} hasn't eaten in 2+ days — complete a study activity!</div>
      </div>
      <button onClick={onDismiss} style={{background:"none",border:"none",cursor:"pointer",padding:"4px",borderRadius:8,color:"var(--c-text3)",transition:"background .15s"}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="var(--c-surface2)";}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="none";}}>
        <Icon name="x" size={14} color="var(--c-text3)"/>
      </button>
    </div>
  );
}

/* ─── TREAT CAP BANNER ───────────────────────────────────── */
function TreatCapBanner({ petName, onBurn, onDismiss }: { petName: string; onBurn: () => void; onDismiss: () => void }) {
  return (
    <div style={{background:"color-mix(in srgb,var(--c-amber) 8%,var(--c-surface))",border:"1px solid color-mix(in srgb,var(--c-amber) 28%,transparent)",borderRadius:16,padding:"13px 14px",display:"flex",alignItems:"center",gap:12,animation:"sp-hunger-banner .4s ease both",boxShadow:"0 2px 12px color-mix(in srgb,var(--c-amber) 10%,transparent)"}}>
      <div style={{width:38,height:38,borderRadius:11,background:"color-mix(in srgb,var(--c-amber) 15%,transparent)",border:"1px solid color-mix(in srgb,var(--c-amber) 25%,transparent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Icon name="cookie" size={17} color="var(--c-amber)"/>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:"var(--c-amber)",display:"flex",alignItems:"center",gap:5,marginBottom:2}}><Icon name="cookie" size={12} color="var(--c-amber)"/>Treat bar full!</div>
        <div style={{fontSize:11,color:"var(--c-text2)",lineHeight:1.4}}>{petName} has 15/15 treats. Play mini-games to burn some!</div>
      </div>
      <div style={{display:"flex",flexDirection:"column" as const,gap:4,flexShrink:0}}>
        <button onClick={onBurn} style={{background:"linear-gradient(135deg,var(--c-amber),#E07800)",color:"#fff",border:"none",borderRadius:9,padding:"6px 11px",fontSize:11,fontWeight:700,fontFamily:"var(--font-body)",cursor:"pointer",whiteSpace:"nowrap" as const,boxShadow:"0 2px 8px rgba(196,121,0,.25)"}}>Play! −3</button>
        <button onClick={onDismiss} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"var(--c-text3)",fontFamily:"var(--font-body)",padding:"2px 0"}}>Dismiss</button>
      </div>
    </div>
  );
}

/* ─── DECAY POP ──────────────────────────────────────────── */
function DecayPop({ ticks }: { ticks: number }) {
  return (
    <div style={{position:"fixed",top:72,left:"50%",transform:"translateX(-50%)",zIndex:300,background:"var(--c-red)",color:"#fff",fontSize:12,fontWeight:700,padding:"8px 16px",borderRadius:20,boxShadow:"0 4px 18px rgba(224,64,64,.45)",animation:"sp-decay-tick 2.2s ease-out forwards",pointerEvents:"none",fontFamily:"var(--font-body)",whiteSpace:"nowrap" as const,display:"flex",alignItems:"center",gap:6}}>
      <Icon name="clock" size={13} color="white"/>−{ticks} treat{ticks>1?"s":""} lost while away
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
          <div style={{fontSize:11,color:"var(--c-text3)",lineHeight:1.55,background:"rgba(251,191,36,.06)",border:"1px solid rgba(251,191,36,.18)",borderRadius:10,padding:"9px 12px"}}>The <strong style={{color:"var(--c-amber)"}}>Test</strong> button simulates an activity for demo purposes.</div>
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
                {(["cat","dog"] as PetType[]).map(t => (
                  <div key={t} onClick={()=>setPet(t)} style={{border:`1.5px solid ${pet===t?"var(--c-accent)":"var(--c-border)"}`,background:pet===t?"rgba(124,106,255,.1)":"rgba(255,255,255,.03)",borderRadius:18,padding:"16px 10px",cursor:"pointer",transition:"all .25s ease",display:"flex",flexDirection:"column",alignItems:"center",gap:8,boxShadow:pet===t?"0 0 0 4px rgba(124,106,255,.12)":"none"}}>
                    <div style={{fontSize:11,fontWeight:600,color:pet===t?"var(--c-text)":"var(--c-text2)",textTransform:"capitalize" as const,marginTop:8}}>{t}</div>
                    {pet===t && <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"var(--c-accent2)",fontWeight:500}}><Icon name="check" size={12} color="var(--c-accent2)"/>Selected</div>}
                  </div>
                ))}
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
  const [particles, setParticles]       = useState<{id:number;x:number;y:number;c:string;s:number}[]>([]);
  const [treats, setTreats]             = useState<{id:number;x:number}[]>([]);
  const [xpPops, setXpPops]             = useState<{id:number;v:number}[]>([]);
  const [showHungerBanner, setShowHungerBanner]   = useState(false);
  const [showTreatCapBanner, setShowTreatCapBanner] = useState(false);
  const [decayPopTicks, setDecayPopTicks]           = useState(0);
  const [showLevelUp, setShowLevelUp]               = useState(false);
  const [newlyDroppedAcc, setNewlyDroppedAcc]       = useState<AccId | null>(null);
  const [showGames, setShowGames]                   = useState(false); // ← mini-games

  const animRef    = useRef<AnimState>("idle");
  const moodT      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakT     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walkT      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepT     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodDialogT = useRef<ReturnType<typeof setInterval> | null>(null);
  const moodLineIdx = useRef(0);
  const pCnt       = useRef(0);
  const tCnt       = useRef(0);
  const xpCnt      = useRef(0);
  const clickRot   = useRef(0);

  const PCOLORS = ["#7C6AFF","#A594FE","#C4BBFF","#2DD4BF","#60AEFF","#FBBF24","#34D399"];

  // ── LOAD + DECAY ON MOUNT ───────────────────────────────────
  useEffect(() => {
    // Load from server first, merge with localStorage (winner = newer updatedAt)
    studypalLoadFromServer().then((serverState) => {
      if (serverState) {
        const reloaded = load();
        setS(reloaded);
      }
    });

    const loaded = load();
    setS(loaded);

    const lost = studypalApplyDecayOnMount();
    if (lost > 0) {
      setDecayPopTicks(lost);
      setTimeout(() => setDecayPopTicks(0), 2500);
    }

    const lastFed = loaded.lastFedAt;
    const isHungry = !lastFed || (Date.now() - lastFed > TWO_DAYS_MS);
    if (isHungry) {
      setShowHungerBanner(true);
      const notifyKey = "sp_hunger_notified";
      const lastNotified = localStorage.getItem(notifyKey);
      const alreadyNotified = lastNotified && Date.now() - Number(lastNotified) < 24 * 60 * 60 * 1000;
      if (!alreadyNotified && loaded.onboarded) {
        fetch("/api/studypal/hungry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petName: loaded.petName }) })
          .then(r => { if (r.ok) localStorage.setItem(notifyKey, String(Date.now())); })
          .catch(() => {});
      }
    }

    if (loaded.treatCapReached) { setShowTreatCapBanner(true); studypalClearTreatCap(); }
    if (loaded.leveledUp && loaded.pendingDrop) { setNewlyDroppedAcc(loaded.pendingDrop as AccId); setShowLevelUp(true); studypalClearPendingDrop(); }
  }, []);

  const upd = useCallback((patch: Partial<SPState>) => {
    setS(prev => {
      const n = { ...prev, ...patch };
      save(n);
      studypalScheduleSync(); // debounced — fires 300ms after last change
      return n;
    });
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
  useEffect(() => { resetSleep(); }, [tab]);

  // ── Mood auto-dialogue every 45s of inactivity ──────────
  useEffect(() => {
    clearInterval(moodDialogT.current!);
    moodDialogT.current = setInterval(() => {
      if (animRef.current === "idle" || animRef.current === "sleep") {
        const pool = MOODS[computeMood(load()).tier].dialogue[load().petType as "cat"|"dog"] ?? MOODS.neutral.dialogue.cat;
        const line = pool[moodLineIdx.current % pool.length];
        moodLineIdx.current++;
        triggerSpeech(line);
      }
    }, 45000);
    return () => clearInterval(moodDialogT.current!);
  }, []);

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
    if (S.treats >= TREATS_MAX && S.pending === 0) { setShowTreatCapBanner(true); triggerSpeech("I'm stuffed!"); return; }
    if (S.treats >= TREATS_MAX && S.pending > 0) { triggerSpeech("Feed me first!"); setTab("feed"); return; }
    const prevLevel = getLvl(S.xp);
    const newXP     = S.xp + a.xp;
    const newLevel  = getLvl(newXP);
    const entry: SPLogEntry = {activityId:id as any,activityName:a.name,xp:a.xp,treats:a.treats,timestamp:Date.now()};
    const newLog = [entry,...(S.activityLog||[])].slice(0,10);
    upd({ xp:newXP, pending:S.pending+a.treats, points:S.points+a.xp, activityLog:newLog });
    triggerAnim("excited",1800);triggerSpeech(`+${a.xp} XP`);
    spawnParticles();popXP(a.xp);
    if (newLevel > prevLevel) {
      setTimeout(() => {
        const ownedNow = S.owned as AccId[];
        const droppable = (["bow","headband","glasses","hat","cap","scarf","ribbon","sunglasses","earring","monocle","halo","bandana","wizard","crown"] as AccId[]).filter(id=>!ownedNow.includes(id));
        const drop: AccId | null = droppable.length>0 ? droppable[Math.floor(Math.random()*droppable.length)] : null;
        if (drop) { setNewlyDroppedAcc(drop); upd({ owned:[...ownedNow,drop] }); }
        setShowLevelUp(true);
        triggerAnim("happy",4000);spawnParticles();
      }, 1200);
    }
  }

  function feedNow(n: number) {
    window.dispatchEvent(new CustomEvent("sp:scroll-to-pet"));
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
  const mood = computeMood(S);

  const accentColor=S.petType==="cat"?"var(--c-accent)":"var(--c-dog)";
  const accentHex=S.petType==="cat"?"#7C6AFF":"#60AEFF";
  const PetComp=S.petType==="cat"?CatSVG:DogSVG;

  const statusMsg: Record<AnimState,string>={walk:"Strolling around",eat:"Having a treat",sleep:"Resting",jump:"Jumping!",meow:"Meow!",bark:"Woof!",happy:"Happy!",excited:"Excited!",idle:"Tap to interact"};
  const droppedAccName = newlyDroppedAcc ? (ACCS.find(a=>a.id===newlyDroppedAcc)?.name ?? "") : "";

  return (
    <div className="sp">
      <style>{KF}</style>

      {/* Modals */}
      {showLevelUp && (
        <LevelUpModal
          levelName={LEVELS[getLvl(S.xp)].name}
          droppedAcc={newlyDroppedAcc}
          accName={droppedAccName}
          accentHex={accentHex}
          onClose={() => { setShowLevelUp(false); setNewlyDroppedAcc(null); }}
        />
      )}

      {/* ── Mini-games modal ── */}
      {showGames && (
        <MiniGamesModal
          open={showGames}
          treats={S.treats}
          accentHex={accentHex}
          petName={S.petName}
          onClose={() => setShowGames(false)}
          onReward={(delta, type) => {
            if (type === "treats") {
              upd({ treats: Math.max(0, S.treats - delta) });
            } else {
              upd({ xp: S.xp + delta, points: S.points + delta });
              triggerAnim(delta >= 8 ? "excited" : "happy", 2400);
              triggerSpeech(delta >= 8 ? "Zoomies!" : "Yay!");
              spawnParticles();
              popXP(delta);
            }
          }}
        />
      )}

      {decayPopTicks > 0 && <DecayPop ticks={decayPopTicks}/>}

      {/* Header */}
      <header style={{background:"color-mix(in srgb,var(--c-surface) 88%,transparent)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderBottom:"1px solid var(--c-border)",position:"sticky",top:0,zIndex:50}}>
        <div style={{height:2,background:`linear-gradient(90deg,${accentHex}00,${accentHex},${accentHex}00)`}}/>
        <div style={{maxWidth:650,margin:"0 auto",padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:42,height:42,borderRadius:13,background:`linear-gradient(140deg,${accentHex} 0%,${S.petType==="cat"?"#5E4FD4":"#1A6FC4"} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 3px 14px ${accentHex}55`}}>
                <Icon name={S.petType} size={21} color="white" strokeWidth={1.6}/>
              </div>
              <div style={{position:"absolute",bottom:-1,right:-1,width:11,height:11,borderRadius:"50%",background:"var(--c-green)",border:"2px solid var(--c-bg)",animation:"sp-heartbeat 3s ease-in-out infinite"}}/>
            </div>
            <div style={{minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" as const}}>
                <span style={{fontSize:15,fontWeight:700,color:"var(--c-text)",fontFamily:"var(--font-serif)",fontStyle:"italic",lineHeight:1.1}}>{S.petName}</span>
                <span style={{fontSize:10,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase" as const,background:`${accentHex}22`,color:accentHex,padding:"2px 8px",borderRadius:20,border:`1px solid ${accentHex}38`}}>{lvl.name}</span>
                <span style={{fontSize:11}}>{mood.emoji}</span>
                {(S.streakCount??0)>0 && (
                  <span style={{fontSize:10,fontWeight:700,background:"rgba(229,57,53,.12)",color:"var(--c-red)",padding:"2px 8px",borderRadius:20,border:"1px solid rgba(229,57,53,.22)",display:"flex",alignItems:"center",gap:3}}>
                    <Icon name="flame" size={10} color="var(--c-red)"/>{S.streakCount}d
                  </span>
                )}
              </div>
              <div style={{marginTop:5,display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:88,height:4,borderRadius:4,background:"var(--c-border2)",overflow:"hidden",flexShrink:0}}>
                  <div style={{height:"100%",borderRadius:4,background:`linear-gradient(90deg,${accentHex},${accentHex}BB)`,width:`${xpPct}%`,transition:"width .9s cubic-bezier(.34,1.56,.64,1)"}}/>
                </div>
                <span style={{fontSize:10,color:"var(--c-text3)",fontWeight:500,whiteSpace:"nowrap" as const}}>{S.xp}{nxt?`/${nxt.xp}`:""} XP</span>
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"color-mix(in srgb,var(--c-amber) 12%,transparent)",color:"var(--c-amber)",fontSize:14,fontWeight:700,padding:"7px 14px",borderRadius:20,border:"1px solid color-mix(in srgb,var(--c-amber) 28%,transparent)",flexShrink:0,boxShadow:"0 2px 8px rgba(214,128,0,.12)"}}>
            <Icon name="coins" size={14} color="var(--c-amber)"/>{S.points}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="sp-inner">

        {/* Banners */}
        {(showHungerBanner || showTreatCapBanner) && (
          <div style={{padding:"14px 16px 0",display:"flex",flexDirection:"column",gap:8}}>
            {showHungerBanner && <HungerBanner petName={S.petName} onDismiss={()=>setShowHungerBanner(false)}/>}
            {showTreatCapBanner && <TreatCapBanner petName={S.petName} onBurn={burnTreats} onDismiss={()=>{setShowTreatCapBanner(false);studypalClearTreatCap();}}/>}
          </div>
        )}

        {S.pending > 0 && !showBowl && tab !== "feed" && (
          <div style={{margin:"14px 16px 0",background:"color-mix(in srgb,var(--c-accent) 10%,var(--c-surface))",border:"1px solid color-mix(in srgb,var(--c-accent) 25%,transparent)",borderRadius:16,padding:"12px 15px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",boxShadow:"var(--shadow-sm)",transition:"transform .15s ease"}} onClick={()=>setTab("feed")} className="sp-card-hover">
            <div style={{width:36,height:36,borderRadius:10,background:"color-mix(in srgb,var(--c-accent) 18%,transparent)",border:"1px solid color-mix(in srgb,var(--c-accent) 28%,transparent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"sp-float 1.8s ease-in-out infinite"}}><Icon name="cookie" size={16} color="var(--c-accent2)"/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--c-text)"}}>{S.pending} treats waiting</div>
              <div style={{fontSize:11,color:"var(--c-text3)",marginTop:2}}>Tap to feed {S.petName}</div>
            </div>
            <Icon name="arrow-r" size={16} color="var(--c-text3)"/>
          </div>
        )}

        {/* Arena card */}
        <div style={{margin:"14px 16px 0",background:"var(--c-surface)",borderRadius:24,border:"1px solid var(--c-border)",overflow:"hidden",boxShadow:"var(--shadow-md)"}}>
          <div style={{height:224,position:"relative",overflow:"hidden",background:`linear-gradient(180deg,color-mix(in srgb,${accentHex} 8%,var(--c-surface)) 0%,var(--c-surface) 100%)`}}>
            <SceneBg petType={S.petType}/>
            <div style={{position:"absolute",bottom:16,...(walking?{animation:"sp-walk-x 9s linear forwards",left:-180,width:170}:{left:"50%",transform:"translateX(-50%)"})}}>
              <div style={{position:"relative",width:170,height:175}}>
                {speech && <div style={{position:"absolute",top:-14,right:-18,background:accentHex,color:"#fff",fontSize:12,fontWeight:600,padding:"7px 14px",borderRadius:"16px 16px 16px 3px",whiteSpace:"nowrap" as const,animation:"sp-speech .3s cubic-bezier(.34,1.56,.64,1)",zIndex:30,pointerEvents:"none",fontFamily:"var(--font-body)",boxShadow:`0 4px 16px ${accentHex}44`}}>{speech}</div>}
                {anim==="sleep" && <div style={{position:"absolute",top:4,right:2,pointerEvents:"none"}}><div style={{position:"absolute",top:0,right:0,fontSize:13,fontWeight:700,color:accentHex,animation:"sp-zzz1 2.4s ease-out infinite",fontFamily:"var(--font-body)"}}>z</div><div style={{position:"absolute",top:-16,right:12,fontSize:18,fontWeight:700,color:accentHex,animation:"sp-zzz2 2.4s ease-out infinite",animationDelay:".8s",fontFamily:"var(--font-body)"}}>Z</div></div>}
                {["happy","excited"].includes(anim) && <div style={{position:"absolute",inset:-12,borderRadius:"50%",border:`2px solid ${accentHex}40`,animation:"sp-glow 2s ease-in-out infinite",pointerEvents:"none"}}/>}
                {xpPops.map(p=>(
                  <div key={p.id} style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:50}}>
                    <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",fontSize:16,fontWeight:700,color:"#fff",background:accentHex,padding:"4px 11px",borderRadius:20,boxShadow:`0 2px 14px ${accentHex}80`,animation:"sp-xp 1.2s cubic-bezier(.2,1.4,.5,1) forwards",fontFamily:"var(--font-body)",whiteSpace:"nowrap" as const,display:"flex",alignItems:"center",gap:4}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>+{p.v} XP
                    </div>
                    <div style={{position:"absolute",top:14,left:"calc(50% - 42px)",fontSize:11,fontWeight:700,color:accentHex,animation:"sp-xp2 1.3s ease-out .08s forwards",fontFamily:"var(--font-body)",opacity:0,whiteSpace:"nowrap" as const}}>+{p.v}</div>
                    <div style={{position:"absolute",top:18,left:"calc(50% + 26px)",fontSize:10,fontWeight:600,color:accentHex,animation:"sp-xp2 1.1s ease-out .18s forwards",fontFamily:"var(--font-body)",opacity:0,whiteSpace:"nowrap" as const}}>XP</div>
                  </div>
                ))}
                <PetComp anim={anim} acc={S.acc} onClick={onPetClick} mood={mood.tier}/>
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

          {/* Status pills + Play button */}
          <div style={{padding:"10px 18px 18px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:mood.bg,border:`1px solid ${mood.border}`,borderRadius:14,padding:"11px 14px",display:"flex",alignItems:"center",gap:9,transition:"all .3s ease"}}>
                <div style={{width:30,height:30,borderRadius:9,background:`${mood.color}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16,lineHeight:1}}>
                  {mood.emoji}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:mood.color}}>{mood.label}</div>
                  <div style={{fontSize:10,color:"var(--c-text3)",marginTop:1}}>{mood.tier==="starving"?"Feed me!":mood.tier==="hungry"?"Getting hungry":mood.tier==="ecstatic"?"On a roll!":"All good"}</div>
                </div>
              </div>
              <div style={{background:"var(--c-surface2)",border:"1px solid var(--c-border)",borderRadius:14,padding:"11px 14px",display:"flex",alignItems:"center",gap:9}}>
                {(S.streakCount??0)>0 ? (<>
                  <div style={{width:30,height:30,borderRadius:9,background:"color-mix(in srgb,var(--c-red) 12%,transparent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon name="flame" size={16} color="var(--c-red)"/>
                  </div>
                  <div><div style={{fontSize:12,fontWeight:700,color:"var(--c-red)"}}>{S.streakCount}-day streak</div><div style={{fontSize:10,color:"var(--c-text3)",marginTop:1}}>Keep it up!</div></div>
                </>) : (<>
                  <div style={{width:30,height:30,borderRadius:9,background:"color-mix(in srgb,var(--c-accent) 12%,transparent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon name="zap" size={16} color="var(--c-accent2)"/>
                  </div>
                  <div><div style={{fontSize:12,fontWeight:700,color:"var(--c-accent2)"}}>{S.xp} XP</div><div style={{fontSize:10,color:"var(--c-text3)",marginTop:1}}>{lvl.name}{nxt?` → ${nxt.name}`:" · Max"}</div></div>
                </>)}
              </div>
            </div>

            {/* ── Play mini-games button ── */}
            <button
              onClick={() => setShowGames(true)}
              style={{marginTop:10,width:"100%",padding:"10px 0",borderRadius:13,fontSize:12,fontWeight:700,cursor:"pointer",background:`${accentHex}14`,color:accentHex,border:`1px solid ${accentHex}30`,display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontFamily:"var(--font-body)",transition:"all .18s ease"}}
              onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background=accentHex;el.style.color="#fff";el.style.boxShadow=`0 4px 16px ${accentHex}40`;}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background=`${accentHex}14`;el.style.color=accentHex;el.style.boxShadow="none";}}
            >
              <Icon name="gamepad" size={14} color="currentColor"/>
              Play mini-games · burn treats
              <span style={{fontSize:10,opacity:.7,fontWeight:500}}>({S.treats} treats)</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",margin:"12px 16px 0",background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:16,padding:4,gap:3,boxShadow:"var(--shadow-xs)"}}>
          {([["feed","Rewards","trophy"],["wardrobe","Wardrobe","shirt"],["about","Profile","user"]] as [TabId,string,string][]).map(([t,label,icon])=>(
            <button key={t} onClick={()=>setTab(t)} className={`sp-tab ${tab===t?"active":"inactive"}`}>
              <Icon name={icon} size={13} color={tab===t?"white":"var(--c-text3)"}/>
              {label}
              {t==="wardrobe" && newlyDroppedAcc && !showLevelUp && (
                <div style={{position:"absolute",top:3,right:6,width:7,height:7,borderRadius:"50%",background:"var(--c-green)",border:"1.5px solid var(--c-surface)",animation:"sp-heartbeat 2s ease-in-out infinite"}}/>
              )}
            </button>
          ))}
        </div>

        {/* ── REWARDS TAB ── */}
        {tab==="feed" && (
          <div style={{margin:"12px 16px 0"}}>
            {S.pending>0 && (
              <div style={{background:"color-mix(in srgb,var(--c-accent) 9%,var(--c-surface))",border:"1px solid color-mix(in srgb,var(--c-accent) 24%,transparent)",borderRadius:18,padding:"14px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:14,boxShadow:"var(--shadow-sm)"}}>
                <div style={{width:44,height:44,borderRadius:12,background:"color-mix(in srgb,var(--c-accent) 16%,transparent)",border:"1px solid color-mix(in srgb,var(--c-accent) 26%,transparent)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:"sp-float 1.8s ease-in-out infinite"}}><Icon name="cookie" size={19} color="var(--c-accent2)"/></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--c-text)"}}>{S.pending} treats pending</div>
                  <div style={{fontSize:11,color:"var(--c-text3)",marginTop:2}}>{S.petName} is waiting to be fed</div>
                </div>
                <button onClick={()=>feedNow(S.pending)} style={{background:`linear-gradient(135deg,var(--c-accent),${S.petType==="cat"?"#5E4FD4":"#1A6FC4"})`,color:"#fff",border:"none",borderRadius:11,padding:"10px 16px",fontSize:12,fontWeight:700,fontFamily:"var(--font-body)",cursor:"pointer",flexShrink:0,boxShadow:"var(--shadow-accent)",whiteSpace:"nowrap" as const,display:"flex",alignItems:"center",gap:6}}><Icon name="cookie" size={13} color="white"/>Give Treat</button>
              </div>
            )}
            <div style={{fontSize:10,fontWeight:600,color:"var(--c-text3)",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:10,paddingLeft:2}}>Activity Rewards</div>
            <SimulateExplainer accentHex={accentHex}/>
            <PointsExplainer/>
            <ActivityLog log={S.activityLog||[]}/>
            {ACTIVITIES.map((a,i)=>{
              const colors: Record<string,{bg:string,icon:string,border:string}> = {
                quiz:{bg:"rgba(107,88,240,.12)",icon:"var(--c-accent2)",border:"rgba(107,88,240,.2)"},
                streak:{bg:"rgba(224,64,64,.10)",icon:"var(--c-red)",border:"rgba(224,64,64,.18)"},
                booking:{bg:"rgba(13,184,164,.10)",icon:"var(--c-teal)",border:"rgba(13,184,164,.18)"},
                session:{bg:"rgba(22,169,122,.10)",icon:"var(--c-green)",border:"rgba(22,169,122,.18)"},
                sos:{bg:"rgba(196,121,0,.10)",icon:"var(--c-amber)",border:"rgba(196,121,0,.18)"},
                badge:{bg:"rgba(251,191,36,.10)",icon:"var(--c-amber)",border:"rgba(251,191,36,.20)"},
              };
              const col = colors[a.id] || colors.quiz;
              return (
                <div key={a.id} style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:16,padding:"13px 15px",marginBottom:7,display:"flex",alignItems:"center",gap:12,animation:`sp-pop .35s ease both`,animationDelay:`${i*.05}s`,transition:"border-color .18s,transform .18s,box-shadow .18s"}}
                  onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="translateY(-1px)";el.style.boxShadow="var(--shadow-sm)";el.style.borderColor="var(--c-border2)";}}
                  onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="";el.style.boxShadow="";el.style.borderColor="";}}>
                  <div style={{width:40,height:40,borderRadius:12,background:col.bg,border:`1px solid ${col.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <ActivityIcon id={a.id} size={17} color={col.icon}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--c-text)"}}>{a.name}</div>
                    <div style={{fontSize:11,marginTop:4,display:"flex",gap:6}}>
                      <span style={{background:"color-mix(in srgb,var(--c-accent) 13%,transparent)",color:"var(--c-accent2)",padding:"2px 8px",borderRadius:20,fontWeight:700,display:"flex",alignItems:"center",gap:3,border:"1px solid color-mix(in srgb,var(--c-accent) 22%,transparent)"}}><Icon name="zap" size={9} color="var(--c-accent2)"/>+{a.xp} XP</span>
                      <span style={{background:`${col.bg}`,color:col.icon,padding:"2px 8px",borderRadius:20,fontWeight:600,display:"flex",alignItems:"center",gap:3,border:`1px solid ${col.border}`}}><Icon name="cookie" size={9} color={col.icon}/>+{a.treats}</span>
                    </div>
                  </div>
                  <button onClick={()=>triggerActivity(a.id)} style={{background:`linear-gradient(135deg,${accentHex}18,${accentHex}08)`,color:accentHex,border:`1px solid ${accentHex}30`,borderRadius:10,padding:"7px 14px",fontSize:12,fontWeight:700,fontFamily:"var(--font-body)",cursor:"pointer",transition:"all .18s ease",whiteSpace:"nowrap" as const,letterSpacing:".01em"}}
                    onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background=accentHex;el.style.color="#fff";}}
                    onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background="";el.style.color=accentHex;}}>
                    Test
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── WARDROBE TAB ── */}
        {tab==="wardrobe" && (
          <div style={{margin:"12px 16px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"var(--c-text)"}}>Wardrobe</div>
                <div style={{fontSize:11,color:"var(--c-text3)",marginTop:1}}>{ACCS.length-1} accessories available</div>
              </div>
              <div style={{background:"color-mix(in srgb,var(--c-amber) 12%,var(--c-surface))",color:"var(--c-amber)",fontSize:13,fontWeight:700,padding:"7px 14px",borderRadius:20,border:"1px solid color-mix(in srgb,var(--c-amber) 28%,transparent)",display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 8px color-mix(in srgb,var(--c-amber) 12%,transparent)"}}><Icon name="coins" size={13} color="var(--c-amber)"/>{S.points}</div>
            </div>
            <div style={{marginBottom:12,padding:"10px 13px",background:"color-mix(in srgb,var(--c-accent) 6%,var(--c-surface))",border:"1px solid var(--c-border)",borderRadius:12,fontSize:11,color:"var(--c-text2)",lineHeight:1.55,display:"flex",alignItems:"flex-start",gap:8}}>
              <span style={{flexShrink:0,marginTop:1}}><Icon name="info" size={13} color="var(--c-accent3)"/></span>
              Earn points from sessions, quizzes &amp; tasks. Level up for free drops! Tap to equip or buy.
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
          <div style={{margin:"12px 16px 0",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:20,padding:"16px",boxShadow:"var(--shadow-sm)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"var(--c-text3)",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:12}}>Companion</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {(["cat","dog"] as PetType[]).map(t=>{
                  const sel = S.petType===t;
                  const tHex = t==="cat"?"#8474F8":"#3A8FE0";
                  return (
                    <div key={t} onClick={()=>{upd({petType:t});triggerSpeech(t==="cat"?"Meow!":"Woof!");triggerAnim("happy",2000);spawnParticles();}}
                      style={{border:`1.5px solid ${sel?tHex:"var(--c-border)"}`,background:sel?`color-mix(in srgb,${tHex} 10%,var(--c-surface2))`:"var(--c-surface2)",borderRadius:14,padding:"16px 12px",textAlign:"center" as const,cursor:"pointer",transition:"all .22s cubic-bezier(.34,1.56,.64,1)",boxShadow:sel?`0 4px 16px ${tHex}25`:"none"}}>
                      <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                        <div style={{width:44,height:44,borderRadius:13,background:sel?`color-mix(in srgb,${tHex} 18%,transparent)`:"var(--c-surface3)",border:`1px solid ${sel?tHex+"40":"var(--c-border)"}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .22s ease"}}>
                          <Icon name={t} size={22} color={sel?tHex:"var(--c-text3)"} strokeWidth={1.5}/>
                        </div>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:sel?"var(--c-text)":"var(--c-text3)",textTransform:"capitalize" as const}}>{t}</div>
                      {sel && <div style={{fontSize:10,color:tHex,fontWeight:600,marginTop:2}}>Selected</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:20,padding:"16px",boxShadow:"var(--shadow-sm)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"var(--c-text3)",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:12}}>Stats</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {v:S.xp,l:"Total XP",icon:"zap",c:accentHex,bg:`${accentHex}12`},
                  {v:S.treats,l:"Treats",icon:"cookie",c:"var(--c-teal)",bg:"rgba(13,184,164,.10)"},
                  {v:S.points,l:"Points",icon:"coins",c:"var(--c-amber)",bg:"rgba(196,121,0,.10)"},
                  {v:S.owned.length-1,l:"Accessories",icon:"shirt",c:"var(--c-green)",bg:"rgba(22,169,122,.10)"},
                  {v:S.streakCount??0,l:"Day streak",icon:"flame",c:"var(--c-red)",bg:"rgba(224,64,64,.10)"},
                  {v:S.activityLog?.length??0,l:"Activities",icon:"history",c:"var(--c-accent2)",bg:`${accentHex}10`},
                ].map(x=>(
                  <div key={x.l} style={{background:x.bg,border:"1px solid var(--c-border)",borderRadius:14,padding:"12px 13px"}}>
                    <div style={{width:26,height:26,borderRadius:8,background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:7,border:"1px solid rgba(255,255,255,.06)"}}>
                      <Icon name={x.icon} size={13} color={x.c}/>
                    </div>
                    <div style={{fontSize:24,fontWeight:700,color:x.c,fontFamily:"var(--font-serif)",fontStyle:"italic",lineHeight:1}}>{x.v}</div>
                    <div style={{fontSize:9,fontWeight:700,color:"var(--c-text3)",marginTop:4,textTransform:"uppercase" as const,letterSpacing:".06em"}}>{x.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {S.lastFedAt && (
              <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:14,padding:"13px 16px",display:"flex",alignItems:"center",gap:11}}>
                <div style={{width:34,height:34,borderRadius:10,background:"var(--c-surface2)",border:"1px solid var(--c-border)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name="clock" size={15} color="var(--c-text3)"/>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--c-text2)"}}>Last fed</div>
                  <div style={{fontSize:11,color:"var(--c-text3)",marginTop:1}}>{fmtRelTime(Date.now()-S.lastFedAt)}</div>
                </div>
              </div>
            )}

            <div style={{background:"var(--c-surface)",border:"1px solid var(--c-border)",borderRadius:20,padding:"16px",boxShadow:"var(--shadow-sm)"}}>
              <div style={{fontSize:10,fontWeight:700,color:"var(--c-text3)",letterSpacing:".08em",textTransform:"uppercase" as const,marginBottom:12}}>Level Progression</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {LEVELS.map((l,i)=>{
                  const done=S.xp>=l.xp, curr=i===li;
                  return (
                    <div key={l.name} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 12px",borderRadius:12,background:curr?`color-mix(in srgb,${accentHex} 8%,var(--c-surface2))`:done?"color-mix(in srgb,var(--c-green) 5%,var(--c-surface2))":"transparent",border:`1px solid ${curr?accentHex+"30":done?"color-mix(in srgb,var(--c-green) 15%,transparent)":"transparent"}`,transition:"all .2s ease",opacity:done||curr?1:.35}}>
                      <div style={{width:30,height:30,borderRadius:9,background:curr?`${accentHex}20`:done?"color-mix(in srgb,var(--c-green) 12%,transparent)":"var(--c-surface3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`1px solid ${curr?accentHex:done?"color-mix(in srgb,var(--c-green) 25%,transparent)":"var(--c-border)"}`}}>
                        <LevelIcon icon={l.icon} size={13}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:curr?700:500,color:curr?"var(--c-text)":"var(--c-text2)",display:"flex",alignItems:"center",gap:6}}>
                          {l.name}
                          {curr && <span style={{fontSize:9,background:accentHex,color:"#fff",padding:"2px 7px",borderRadius:20,fontWeight:700,letterSpacing:".04em"}}>NOW</span>}
                        </div>
                        <div style={{fontSize:11,color:"var(--c-text3)",marginTop:1}}>{l.xp} XP{i>0&&i<LEVELS.length-1&&<span style={{display:"inline-flex",alignItems:"center",gap:2,marginLeft:4,opacity:.7}}> · <Icon name="gift" size={10} color="var(--c-text3)"/>drop</span>}</div>
                      </div>
                      {done&&!curr && (
                        <div style={{width:22,height:22,borderRadius:"50%",background:"color-mix(in srgb,var(--c-green) 15%,transparent)",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid color-mix(in srgb,var(--c-green) 25%,transparent)"}}>
                          <Icon name="check" size={12} color="var(--c-green)"/>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={()=>{if(confirm("Reset all progress?")){const n=def();n.onboarded=false;setS(n);save(n);}}}
              style={{background:"var(--c-surface)",color:"var(--c-text3)",border:"1px solid var(--c-border)",borderRadius:14,padding:"13px",fontSize:12,fontWeight:600,fontFamily:"var(--font-body)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"all .18s ease",marginBottom:4}}
              onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background="var(--c-surface2)";el.style.borderColor="var(--c-border2)";}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background="var(--c-surface)";el.style.borderColor="var(--c-border)";}}>
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