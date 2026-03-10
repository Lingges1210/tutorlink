"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, CalendarClock, Sparkles, CheckCircle2, Flame,
  Wand2, RefreshCcw, BookOpenCheck, Timer, GraduationCap, AlertCircle,
  HelpCircle, Moon, Sun, Sunset, Trophy, Target, Zap, BookOpen, X, Star,
  ChevronRight, Clock, BarChart2, Layers,
} from "lucide-react";
import { StudyBackground } from "@/components/FloatingParticles";

/* ─── types ─── */
type DayKey = "MON"|"TUE"|"WED"|"THU"|"FRI"|"SAT"|"SUN";
const DAY_KEYS: DayKey[] = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
const DAY_LABEL: Record<DayKey,string> = { MON:"Mon",TUE:"Tue",WED:"Wed",THU:"Thu",FRI:"Fri",SAT:"Sat",SUN:"Sun" };

type Style        = "SHORT_BURSTS"|"DEEP_STUDY";
type PreferredTime = "MORNING"|"AFTERNOON"|"NIGHT";
type InputSubject  = { name:string; level0to10:number; weakTopics:string[]; weakInput:string };

type PlanItem = {
  id:string; date:string; subjectName:string; topic:string; task:string;
  durationMin:number; type:"STUDY"|"PRACTICE"|"REVIEW"|"TUTOR";
  reason?:string|null; status:"PENDING"|"DONE"|"SKIPPED"|string;
  timeBlock?:string|null;
};
type Plan = {
  id:string; title:string; startDate:string; endDate:string;
  examDate?:string|null; hoursPerWeek:number; style:Style;
  subjects:any; availability:any; items:PlanItem[];
  preferredTime?:PreferredTime; aiExplanation?:string;
};

/* ─── helpers ─── */
function cx(...s:Array<string|false|null|undefined>) { return s.filter(Boolean).join(" "); }
function startOfDayISO(iso:string) { const d=new Date(iso); d.setHours(0,0,0,0); return d.toISOString(); }
function prettyDate(iso:string) {
  return new Date(iso).toLocaleDateString(undefined,{ weekday:"short",month:"short",day:"numeric" });
}
function dayStamp(input:Date|string) {
  const d=typeof input==="string"?new Date(input):input;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function prefLabel(p:PreferredTime) {
  return p==="MORNING"?"Morning · 8–11 am":p==="AFTERNOON"?"Afternoon · 1–4 pm":"Night · 7–10 pm";
}

const TASK_PREFIX_MAP: [RegExp, string][] = [
  [/^(spaced\s+review|spaced\s+revision|revision\s+session)[:\s–-]*/i, "Revision: "],
  [/^(learn\s*\+\s*understand|learn\s*and\s*understand|learn\s*&\s*understand)[:\s–-]*/i, "Study: "],
  [/^(practice\s+questions?|practice\s+problems?|practice\s+exercises?)[:\s–-]*/i, "Practice: "],
  [/^(study\s+session|study)[:\s–-]+/i, "Study: "],
  [/^(tutor\s+session|get\s+help)[:\s–-]*/i, "Get help: "],
];
function cleanTask(raw: string): string {
  for (const [re, replacement] of TASK_PREFIX_MAP) {
    if (re.test(raw)) return raw.replace(re, replacement);
  }
  return raw;
}
function getGreeting() {
  const h=new Date().getHours();
  if(h<12) return { text:"Good Morning",   Icon:Sun    };
  if(h<18) return { text:"Good Afternoon", Icon:Sunset };
  return       { text:"Good Evening",    Icon:Moon   };
}
function calcStreak(items:PlanItem[]) {
  const done=new Set(items.filter(x=>x.status==="DONE").map(x=>dayStamp(x.date)));
  let n=0; const d=new Date();
  while(done.has(dayStamp(d))){ n++; d.setDate(d.getDate()-1); }
  return n;
}
function badgeForType(t:PlanItem["type"]) {
  if(t==="TUTOR")    return { label:"Get help",  Icon:GraduationCap };
  if(t==="REVIEW")   return { label:"Revision",  Icon:Flame };
  if(t==="PRACTICE") return { label:"Practice",  Icon:BookOpenCheck };
  return { label:"Study", Icon:Timer };
}

const TYPE_PILL: Record<string,string> = {
  TUTOR:"spg-pill-purple", REVIEW:"spg-pill-amber",
  PRACTICE:"spg-pill-sky", STUDY:"spg-pill-indigo",
};
const TYPE_BAR: Record<string,string> = {
  TUTOR:"spg-bar-purple", REVIEW:"spg-bar-amber",
  PRACTICE:"spg-bar-sky", STUDY:"spg-bar-indigo",
};

/* ════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════ */
export default function StudyPlanPage() {
  const [step,setStep]         = useState<"FORM"|"RESULT">("FORM");
  const [title,setTitle]       = useState("");
  const [examDate,setExamDate] = useState("");
  const [hoursPerWeek,setHPW]  = useState(8);
  const [style,setStyle]       = useState<Style>("SHORT_BURSTS");
  const [preferredTime,setPT]  = useState<PreferredTime>("NIGHT");
  const [days,setDays]         = useState<DayKey[]>(["MON","TUE","WED","THU","FRI","SAT"]);
  const [hoursByDay,setHBD]    = useState<Record<DayKey,number>>({ MON:1,TUE:1,WED:1,THU:1,FRI:1,SAT:2,SUN:2 });
  const [subjects,setSubjects] = useState<InputSubject[]>([{ name:"",level0to10:5,weakTopics:[],weakInput:"" }]);
  const [plan,setPlan]         = useState<Plan|null>(null);
  const [loading,setLoading]   = useState(false);
  const [busyToggle,setBusy]   = useState<string|null>(null);
  const [error,setError]       = useState("");
  const [whyId,setWhyId]       = useState<string|null>(null);
  const [activeSection,setActiveSection] = useState<number>(0);

  async function fetchPlan() {
    const res=await fetch("/api/study/plans",{ cache:"no-store" });
    const json=await res.json();
    if(!json?.ok) throw new Error(json?.error??"Failed to load plan");
    setPlan(json.plan??null);
    if(json.plan?.preferredTime) setPT(json.plan.preferredTime);
    return json.plan??null;
  }
  function patchLocal(id:string,s:"PENDING"|"DONE"|"SKIPPED") {
    setPlan(p=>p?{ ...p, items:p.items.map(it=>it.id===id?{...it,status:s}:it) }:p);
  }
  useEffect(()=>{
    let ok=true;
    (async()=>{ try{ const p=await fetchPlan(); if(ok&&p) setStep("RESULT"); }catch{} })();
    return()=>{ ok=false; };
  },[]);

  async function generatePlan() {
    setError(""); setLoading(true);
    try {
      const cleanSubjects=subjects
        .map(s=>({ name:s.name.trim(), level0to10:+s.level0to10||5,
          weakTopics:s.weakInput.split(",").map(x=>x.trim()).filter(Boolean) }))
        .filter(s=>s.name.length>0);
      if(!cleanSubjects.length) throw new Error("Add at least 1 subject.");
      const res=await fetch("/api/study/plans/generate",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ title:title.trim()||undefined,
          examDate:examDate?new Date(examDate).toISOString():undefined,
          hoursPerWeek, style, preferredTime,
          availability:{days,hoursByDay}, subjects:cleanSubjects }),
      });
      const json=await res.json();
      if(!json?.ok) throw new Error(json?.error??"Failed to generate");
      await fetchPlan(); setStep("RESULT");
    } catch(e:any){ setError(e?.message??"Something went wrong"); }
    finally{ setLoading(false); }
  }

  async function toggleItem(item:PlanItem) {
    const next=item.status==="DONE"?"PENDING":"DONE";
    patchLocal(item.id,next); setBusy(item.id);
    try {
      const res=await fetch("/api/study/plans/item",{
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ itemId:item.id, nextStatus:next }),
      });
      if(!(await res.json())?.ok) throw new Error();
    } catch{ patchLocal(item.id,item.status as any); setError("Failed to update task"); }
    finally{ setBusy(null); }
  }

  async function rebalance() {
    setLoading(true); setError("");
    try {
      const res=await fetch("/api/study/plans/rebalance",{ method:"POST" });
      if(!(await res.json())?.ok) throw new Error("Failed to rebalance");
      await fetchPlan();
    } catch(e:any){ setError(e?.message??"Failed to rebalance"); }
    finally{ setLoading(false); }
  }

  const grouped=useMemo(()=>{
    if(!plan?.items) return [];
    const map=new Map<string,PlanItem[]>();
    for(const it of plan.items){
      const k=startOfDayISO(it.date);
      if(!map.has(k)) map.set(k,[]);
      map.get(k)!.push(it);
    }
    const ord:any={ TUTOR:0,STUDY:1,PRACTICE:2,REVIEW:3 };
    return [...map.entries()]
      .sort((a,b)=>+new Date(a[0])-+new Date(b[0]))
      .map(([date,items])=>({ date, items:items.sort((a,b)=>(ord[a.type]??9)-(ord[b.type]??9)) }));
  },[plan]);

  const progress=useMemo(()=>{
    const all=plan?.items??[];
    const done=all.filter(x=>x.status==="DONE").length;
    const pct=all.length?Math.round(done/all.length*100):0;
    const pbs=new Map<string,number>();
    for(const it of all) if(it.status!=="DONE") pbs.set(it.subjectName,(pbs.get(it.subjectName)??0)+1);
    return { done, total:all.length, pct, weakSpot:[...pbs.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]??null };
  },[plan]);

  const todayPack=useMemo(()=>{
    if(!plan?.items) return null;
    const today=dayStamp(new Date());
    const todays=plan.items.filter(it=>dayStamp(it.date)===today)
      .sort((a,b)=>a.status.localeCompare(b.status));
    const pending=todays.filter(x=>x.status!=="DONE");
    return { todays, pending, streak:calcStreak(plan.items),
      totalMin:pending.reduce((s,x)=>s+(x.durationMin||0),0) };
  },[plan]);

  const whyItem=useMemo(()=>
    whyId&&plan?.items?plan.items.find(x=>x.id===whyId)??null:null
  ,[whyId,plan]);

  const greeting=useMemo(()=>getGreeting(),[]);

  const FORM_SECTIONS = [
    { id: 0, label: "Goals", icon: Target },
    { id: 1, label: "Schedule", icon: CalendarClock },
    { id: 2, label: "Subjects", icon: BookOpen },
  ];

  /* ─── render ─── */
  return (
    <>
      <style>{`
        /* ── surfaces ── */
        .spg-card  { background: rgb(var(--card));  border: 1px solid rgb(var(--border)); }
        .spg-card2 { background: rgb(var(--card2)); border: 1px solid rgb(var(--border)); }
        .spg-inset { background: rgb(var(--card2)); border: 1px solid rgb(var(--border)); border-radius: 14px; }

        /* ── accent ── */
        .spg-acc-pill { background: rgba(var(--primary),.1); border: 1px solid rgba(var(--primary),.2); color: rgb(var(--primary)); }
        .spg-acc-text { color: rgb(var(--primary)); }

        /* ── buttons ── */
        .spg-ghost {
          background: rgb(var(--card2)); border: 1px solid rgb(var(--border));
          color: rgb(var(--fg)); transition: all .15s;
        }
        .spg-ghost:hover:not(:disabled) { border-color: rgba(var(--primary),.4); color: rgb(var(--primary)); }
        .spg-ghost:disabled { opacity: .45; }

        .spg-cta {
          background: rgb(var(--primary));
          color: #fff; border: none;
          transition: all .18s;
        }
        .spg-cta:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
        .spg-cta:disabled { opacity: .5; }

        /* ── type pills ── */
        .spg-pill-indigo { background: rgba(99,102,241,.1); border: 1px solid rgba(99,102,241,.22); color: #4f46e5; }
        .spg-pill-purple { background: rgba(168,85,247,.1); border: 1px solid rgba(168,85,247,.22); color: #7c3aed; }
        .spg-pill-amber  { background: rgba(245,158,11,.1); border: 1px solid rgba(245,158,11,.22); color: #b45309; }
        .spg-pill-sky    { background: rgba(14,165,233,.1);  border: 1px solid rgba(14,165,233,.22); color: #0369a1; }
        .dark .spg-pill-indigo { color: #818cf8; }
        .dark .spg-pill-purple { color: #c084fc; }
        .dark .spg-pill-amber  { color: #fbbf24; }
        .dark .spg-pill-sky    { color: #38bdf8; }

        /* ── type bars ── */
        .spg-bar-indigo { background: #6366f1; }
        .spg-bar-purple { background: #a855f7; }
        .spg-bar-amber  { background: #f59e0b; }
        .spg-bar-sky    { background: #0ea5e9; }

        /* ── stat chips ── */
        .spg-stat-fire  { background: rgba(251,146,60,.1); border: 1px solid rgba(251,146,60,.25); }
        .spg-stat-green { background: rgba(34,197,94,.1);  border: 1px solid rgba(34,197,94,.25); }

        /* ── done state ── */
        .spg-done      { background: rgba(34,197,94,.06); border: 1px solid rgba(34,197,94,.2); }

        /* ── today column ── */
        .spg-today-col { background: rgba(var(--primary),.04); border: 1.5px solid rgba(var(--primary),.22); }
        .spg-today-hdr { border-bottom: 1px solid rgba(var(--primary),.14); }

        /* ── progress bar ── */
        .spg-track { background: rgb(var(--card2)); border: 1px solid rgb(var(--border)); }
        .spg-fill  { background: rgb(var(--primary)); transition: width .9s cubic-bezier(.16,1,.3,1); }

        /* ── day pills ── */
        .spg-day-on  { background: rgba(var(--primary),.12); border: 1.5px solid rgba(var(--primary),.35); color: rgb(var(--primary)); font-weight: 700; }
        .spg-day-off { background: transparent; border: 1px solid rgb(var(--border)); color: rgb(var(--muted)); }
        .spg-day-off:hover { border-color: rgba(var(--primary),.3); color: rgb(var(--fg)); }

        /* ── text ── */
        .spg-fg    { color: rgb(var(--fg)); }
        .spg-muted { color: rgb(var(--muted)); }
        .spg-muted2{ color: rgb(var(--muted2)); }
        .spg-grad  {
          background: linear-gradient(135deg, rgb(var(--primary)), rgba(var(--primary),.55));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        /* ── ai banner ── */
        .spg-ai-banner {
          background: rgba(var(--primary),.05);
          border: 1px solid rgba(var(--primary),.16);
        }

        /* ── tip box ── */
        .spg-tip { background: rgba(var(--primary),.06); border: 1px solid rgba(var(--primary),.15); border-radius: 10px; }

        /* ── range input ── */
        input[type=range].spg-range {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 4px; border-radius: 99px;
          background: rgb(var(--card2)); outline: none; cursor: pointer;
        }
        input[type=range].spg-range::-webkit-slider-thumb {
          -webkit-appearance: none; width: 17px; height: 17px; border-radius: 50%;
          background: rgb(var(--primary)); cursor: pointer;
          border: 2.5px solid rgb(var(--card));
          box-shadow: 0 1px 6px rgba(var(--primary),.35);
          transition: transform .15s;
        }
        input[type=range].spg-range:hover::-webkit-slider-thumb { transform: scale(1.18); }
        input[type=range].spg-range::-moz-range-thumb {
          width: 17px; height: 17px; border-radius: 50%;
          background: rgb(var(--primary)); cursor: pointer; border: none;
        }

        /* ── text inputs ── */
        .spg-input {
          background: rgb(var(--card2)); border: 1px solid rgb(var(--border));
          color: rgb(var(--fg)); outline: none;
          transition: border-color .15s, box-shadow .15s;
          font-family: inherit;
        }
        .spg-input::placeholder { color: rgb(var(--muted)); opacity: .6; }
        .spg-input:focus {
          border-color: rgba(var(--primary),.5);
          box-shadow: 0 0 0 3px rgba(var(--primary),.1);
        }

        /* ── task card hover ── */
        .spg-task { transition: all .16s; cursor: pointer; }
        .spg-task:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.08); }
        .dark .spg-task:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(0,0,0,.3); }

        /* ── modal ── */
        .spg-backdrop { background: rgba(0,0,0,.45); backdrop-filter: blur(6px); }
        .spg-modal { background: rgb(var(--card)); border: 1px solid rgb(var(--border)); box-shadow: 0 24px 60px rgba(0,0,0,.18); }

        /* ── divider ── */
        .spg-divider { border-top: 1px solid rgb(var(--border)); }

        /* ── section nav ── */
        .spg-sec-nav {
          background: rgb(var(--card2));
          border: 1px solid rgb(var(--border));
          border-radius: 12px;
          padding: 4px;
          display: flex;
          gap: 2px;
        }
        .spg-sec-btn {
          flex: 1; border: none; border-radius: 9px;
          padding: 8px 12px; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all .15s;
          font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .spg-sec-btn-active {
          background: rgb(var(--card));
          border: 1.5px solid rgba(var(--primary),.5);
          color: rgb(var(--primary));
          box-shadow: 0 1px 4px rgba(0,0,0,.06);
        }
        .spg-sec-btn-inactive {
          background: transparent; border: 1px solid transparent;
          color: rgb(var(--muted));
        }
        .spg-sec-btn-inactive:hover { color: rgb(var(--fg)); }

        /* ── label ── */
        .spg-label {
          font-size: 11px; font-weight: 600; letter-spacing: .04em;
          text-transform: uppercase; color: rgb(var(--muted2));
          margin-bottom: 6px;
        }

        /* ── option card ── */
        .spg-opt {
          border-radius: 12px; padding: 12px 14px;
          cursor: pointer; transition: all .15s; text-align: left;
          font-family: inherit;
        }
        .spg-opt-on {
          background: rgba(var(--primary),.08);
          border: 2px solid rgb(var(--primary));
          color: rgb(var(--primary));
          box-shadow: 0 0 0 3px rgba(var(--primary),.1);
        }
        .spg-opt-off {
          background: transparent;
          border: 1.5px solid rgb(var(--border));
          color: rgb(var(--fg));
        }
        .spg-opt-off:hover { border-color: rgba(var(--primary),.4); }

        /* ── mascot ── */
        .spg-mascot-wrap {
          position: fixed;
          bottom: 24px;
          right: 28px;
          z-index: 40;
          pointer-events: none;
        }
        .spg-mascot-float {
          animation: spgMascotFloat 3.8s ease-in-out infinite;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        @keyframes spgMascotFloat {
          0%,100% { transform: translateY(0px) rotate(-1deg); }
          50%      { transform: translateY(-10px) rotate(1deg); }
        }

        .spg-arm-l {
          transform-origin: 22px 56px;
          animation: spgArmWobble 3.8s ease-in-out infinite;
        }
        @keyframes spgArmWobble {
          0%,100% { transform: rotate(0deg); }
          30%     { transform: rotate(-8deg); }
          60%     { transform: rotate(4deg); }
        }

        .spg-blink {
          animation: spgBlink 4s ease-in-out infinite;
          opacity: 0;
        }
        @keyframes spgBlink {
          0%,92%,100% { opacity: 0; }
          94%,98%     { opacity: 1; }
        }

        .spg-sparkle1 {
          animation: spgSpark1 2.4s ease-in-out infinite;
          transform-origin: 61.5px 18px;
        }
        @keyframes spgSpark1 {
          0%,100% { opacity:.9; transform: scale(1) rotate(0deg); }
          50%     { opacity:.4; transform: scale(0.6) rotate(20deg); }
        }
        .spg-sparkle2 {
          animation: spgSpark2 3.1s ease-in-out infinite;
          transform-origin: 11px 12px;
        }
        @keyframes spgSpark2 {
          0%,100% { opacity:.9; transform: scale(1); }
          40%     { opacity:.2; transform: scale(0.5); }
        }

        .spg-bubble {
          background: rgb(var(--card));
          border: 1px solid rgb(var(--border));
          border-radius: 12px;
          padding: 5px 10px;
          margin-bottom: 6px;
          order: -1;
          box-shadow: 0 4px 16px rgba(0,0,0,.1);
          position: relative;
          animation: spgBubblePop 4s ease-in-out infinite;
          pointer-events: none;
        }
        .spg-bubble::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid rgb(var(--card));
        }
        .spg-bubble::before {
          content: '';
          position: absolute;
          bottom: -7px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 7px solid rgb(var(--border));
        }
        .spg-bubble-text {
          font-size: 11px;
          font-weight: 600;
          color: rgb(var(--fg));
          white-space: nowrap;
          font-family: inherit;
        }
        @keyframes spgBubblePop {
          0%,100% { opacity: 1; transform: scale(1); }
          45%,55% { opacity: 0; transform: scale(0.85); }
        }
        .spg-up  { animation: spgUp  .38s cubic-bezier(.16,1,.3,1) both; }
        @keyframes spgUp  { from{ opacity:0; transform:translateY(10px) } to{ opacity:1; transform:translateY(0) } }
        .spg-fd  { animation: spgFd  .22s ease both; }
        @keyframes spgFd  { from{opacity:0} to{opacity:1} }
        .spg-pop { animation: spgPop .26s cubic-bezier(.16,1,.3,1) both; }
        @keyframes spgPop { from{opacity:0;transform:scale(.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .spg-fire{ animation: spgFire 2s ease-in-out infinite; }
        @keyframes spgFire{ 0%,100%{transform:scale(1) rotate(-2deg)} 50%{transform:scale(1.12) rotate(2deg)} }
        .spg-spin{ animation: spgSpin .9s linear infinite; }
        @keyframes spgSpin{ to{transform:rotate(360deg)} }

        .d1{animation-delay:.04s} .d2{animation-delay:.08s}
        .d3{animation-delay:.12s} .d4{animation-delay:.16s}

        .spg-panel { display:none; }
        .spg-panel-active { display:block; animation:spgUp .28s cubic-bezier(.16,1,.3,1) both; }

        .spg-num-input::-webkit-inner-spin-button,
        .spg-num-input::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
        .spg-num-input { -moz-appearance:textfield; }

        .spg-subj-card {
          border: 1px solid rgb(var(--border));
          border-radius: 16px;
          overflow: hidden;
        }
        .spg-subj-head {
          background: rgb(var(--card2));
          border-bottom: 1px solid rgb(var(--border));
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .spg-level-track {
          height: 6px; border-radius: 99px;
          background: rgb(var(--card2));
          border: 1px solid rgb(var(--border));
          overflow: hidden;
        }
        .spg-level-fill {
          height: 100%;
          background: linear-gradient(90deg, rgba(var(--primary),.5), rgb(var(--primary)));
          border-radius: 99px;
          transition: width .3s ease;
        }
      `}</style>

      <div className="pt-8 pb-20">
        <StudyBackground />
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">

          {/* ══ HEADER ══ */}
          <header className="spg-up mb-6">
            <Link href="/study?tab=plan"
              className="inline-flex items-center gap-1.5 text-sm spg-muted hover:spg-acc-text transition-colors mb-3">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold spg-acc-pill mb-2">
                  <Sparkles className="h-3 w-3" />
                  AI-Powered
                </div>
                <h1 className="text-2xl font-bold spg-fg tracking-tight leading-tight">
                  Study Plan <span className="spg-grad">Generator</span>
                </h1>
                <p className="text-sm spg-muted mt-1">
                  Smart weekly schedule that adapts to your weak spots and keeps you on track every day.
                </p>
              </div>

              {step==="RESULT" && (
                <button type="button" onClick={()=>setStep("FORM")}
                  className="spg-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold shrink-0 mt-1">
                  <Wand2 className="h-3.5 w-3.5" />
                  Edit inputs
                </button>
              )}
            </div>
          </header>

          {/* ══ ERROR ══ */}
          {error && (
            <div className="spg-fd rounded-2xl border border-red-500/25 bg-red-500/8 p-4 mb-6 text-sm text-red-500 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="flex-1 leading-relaxed">{error}</span>
              <button type="button" onClick={()=>setError("")} className="hover:opacity-70 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ══ AI EXPLANATION BANNER ══ */}
          {step==="RESULT" && plan?.aiExplanation && (
            <div className="spg-ai-banner rounded-xl px-4 py-3 mb-4 spg-up d1 flex items-start gap-2.5">
              <Sparkles className="h-3.5 w-3.5 spg-acc-text mt-0.5 shrink-0" />
              <p className="text-xs spg-muted leading-relaxed">
                <span className="font-semibold spg-acc-text">Why this plan? </span>
                {plan.aiExplanation}
              </p>
            </div>
          )}

          {/* ══════════════════════════════════
              TODAY DASHBOARD
          ══════════════════════════════════ */}
          {step==="RESULT" && plan && todayPack && (
            <section className="spg-card rounded-3xl p-6 shadow-sm mb-6 spg-up d1">

              {/* greeting row */}
              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl flex items-center justify-center spg-acc-pill shrink-0">
                    <greeting.Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold spg-fg">{greeting.text}!</p>
                    <p className="text-xs spg-muted mt-0.5">
                      {prettyDate(new Date().toISOString())}
                      <span className="mx-1.5 opacity-30">·</span>
                      <span className="spg-fg font-medium">{prefLabel(plan.preferredTime??preferredTime)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <div className="spg-stat-fire rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                    <Flame className="spg-fire h-4 w-4 shrink-0" style={{color:"#f97316"}} />
                    <div>
                      <p className="text-base font-bold leading-none" style={{color:"#ea580c"}}>{todayPack.streak}</p>
                      <p className="text-[10px] spg-muted mt-0.5">streak</p>
                    </div>
                  </div>
                  <div className="spg-stat-green rounded-xl px-3.5 py-2.5 flex items-center gap-2">
                    <Trophy className="h-4 w-4 shrink-0" style={{color:"#16a34a"}} />
                    <div>
                      <p className="text-base font-bold leading-none" style={{color:"#16a34a"}}>{progress.pct}%</p>
                      <p className="text-[10px] spg-muted mt-0.5">done</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* progress bar */}
              <div className="spg-track h-1.5 w-full rounded-full overflow-hidden mb-1.5">
                <div className="spg-fill h-full rounded-full" style={{width:`${progress.pct}%`}} />
              </div>
              <div className="flex justify-between text-[11px] spg-muted mb-5">
                <span>{progress.done} of {progress.total} tasks completed</span>
                {todayPack.pending.length>0 && (
                  <span className="spg-acc-text font-semibold">{todayPack.totalMin} min left today</span>
                )}
              </div>

              {/* today tasks */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold spg-fg">Today's Tasks</p>
                {todayPack.todays.length>0 && (
                  <span className="text-xs spg-muted">
                    {todayPack.pending.length===0 ? "All done 🎉" : `${todayPack.pending.length} remaining`}
                  </span>
                )}
              </div>

              {todayPack.todays.length===0 ? (
                <div className="spg-inset p-8 text-center">
                  <BookOpen className="h-7 w-7 mx-auto mb-2.5 spg-muted opacity-30" />
                  <p className="text-sm spg-muted font-medium">No tasks scheduled today</p>
                  <p className="text-xs spg-muted mt-1 opacity-70">
                    <button type="button" onClick={rebalance} className="spg-acc-text font-semibold hover:underline">Rebalance</button>{" "}
                    if you missed days, or regenerate with more hours/week.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {todayPack.todays.map((it,i)=>{
                    const done=it.status==="DONE";
                    const { label,Icon }=badgeForType(it.type);
                    return (
                      <div key={it.id}
                        className={cx("rounded-2xl overflow-hidden spg-up", done?"spg-done":"spg-card2")}
                        style={{animationDelay:`${i*40}ms`}}>
                        <div className={cx("h-[3px] w-full", TYPE_BAR[it.type]??TYPE_BAR.STUDY)} />
                        <button type="button" onClick={()=>toggleItem(it)}
                          disabled={busyToggle===it.id}
                          className="spg-task w-full text-left px-4 py-3.5">
                          <div className="flex items-start gap-3">
                            <div className={cx(
                              "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                              done?"bg-emerald-500 border-emerald-500":"border-current/20"
                            )}>
                              {done && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className={cx("text-sm font-semibold spg-fg leading-snug",done&&"line-through opacity-35")}>
                                  {cleanTask(it.task)}
                                </p>
                                <span className="text-xs spg-muted shrink-0 font-medium tabular-nums">{it.durationMin}m</span>
                              </div>
                              <p className="text-xs spg-muted mt-1">{it.subjectName} · {it.topic}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  TYPE_PILL[it.type]??TYPE_PILL.STUDY)}>
                                  <Icon className="h-2.5 w-2.5" />{label}
                                </span>
                                {it.timeBlock && (
                                  <span className="spg-card rounded-full px-2 py-0.5 text-[10px] spg-muted2">{it.timeBlock}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="px-4 pb-3">
                          <button type="button" onClick={()=>setWhyId(it.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold spg-acc-text hover:underline">
                            <HelpCircle className="h-3 w-3" />Why today?
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* actions */}
              <div className="spg-divider mt-5 pt-4 flex flex-wrap gap-2">
                <button type="button" onClick={()=>fetchPlan()} disabled={loading}
                  className="spg-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold">
                  <RefreshCcw className={cx("h-3.5 w-3.5",loading&&"spg-spin")} />
                  Refresh
                </button>
                <button type="button" onClick={rebalance} disabled={loading}
                  className="spg-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold">
                  <Wand2 className="h-3.5 w-3.5" />
                  Rebalance week
                </button>
                <button type="button" onClick={()=>setStep("FORM")}
                  className="spg-cta ml-auto inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold">
                  Edit plan <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </section>
          )}

          {/* ══════════════════════════════════
              FORM
          ══════════════════════════════════ */}
          {step==="FORM" && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">

              {/* ── LEFT: main form card ── */}
              <div className="spg-card rounded-3xl shadow-sm overflow-hidden spg-up">

                {/* card header */}
                <div className="px-6 pt-6 pb-5 border-b" style={{borderColor:"rgb(var(--border))"}}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center spg-acc-pill shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold spg-fg">Configure your plan</p>
                      <p className="text-xs spg-muted mt-0.5">Fill in the details below to generate a smart schedule</p>
                    </div>
                  </div>

                  {/* section nav */}
                  <div className="spg-sec-nav">
                    {FORM_SECTIONS.map(({ id,label,icon:Icon })=>(
                      <button key={id} type="button"
                        onClick={()=>setActiveSection(id)}
                        className={cx("spg-sec-btn",
                          activeSection===id ? "spg-sec-btn-active" : "spg-sec-btn-inactive")}>
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* panels */}
                <div className="p-6">

                  {/* ── Panel 0: Goals ── */}
                  <div className={activeSection===0 ? "spg-panel-active" : "spg-panel"}>
                    <div className="space-y-5">

                      <div>
                        <p className="spg-label">Plan title <span className="normal-case font-normal opacity-60">(optional)</span></p>
                        <input
                          value={title} onChange={e=>setTitle(e.target.value)}
                          placeholder="e.g., CALC Final Sprint"
                          className="spg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                        />
                      </div>

                      <div>
                        <p className="spg-label">Exam / deadline date</p>
                        <input
                          type="date" value={examDate} onChange={e=>setExamDate(e.target.value)}
                          className="spg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                          style={{colorScheme:"inherit"}}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="spg-label mb-0">Hours per week</p>
                          <span className="inline-block rounded-lg px-2.5 py-1 text-xs font-bold spg-acc-pill">
                            {hoursPerWeek}h / week
                          </span>
                        </div>
                        <input
                          type="range" min={1} max={30} value={hoursPerWeek}
                          onChange={e=>setHPW(+e.target.value)}
                          className="spg-range w-full"
                        />
                        <div className="flex justify-between text-[10px] spg-muted mt-1.5">
                          <span>1h</span><span>30h</span>
                        </div>
                      </div>

                      <div>
                        <p className="spg-label">Study style</p>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            ["SHORT_BURSTS","⚡ Short bursts","25 min sessions, more breaks"],
                            ["DEEP_STUDY",  "🧠 Deep study",  "50 min sessions, fewer breaks"],
                          ] as [Style,string,string][]).map(([s,l,sub])=>(
                            <button key={s} type="button" onClick={()=>setStyle(s)}
                              className={cx("spg-opt", style===s ? "spg-opt-on" : "spg-opt-off")}>
                              <p className="text-xs font-semibold">{l}</p>
                              <p className="text-[10px] mt-0.5 opacity-55">{sub}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="spg-label">Preferred study time</p>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            ["MORNING",  Sun,    "Morning",   "8–11 am"],
                            ["AFTERNOON",Sunset, "Afternoon", "1–4 pm" ],
                            ["NIGHT",    Moon,   "Night",     "7–10 pm"],
                          ] as [PreferredTime,any,string,string][]).map(([t,Icon,l,sub])=>(
                            <button key={t} type="button" onClick={()=>setPT(t)}
                              className={cx("spg-opt text-center", preferredTime===t ? "spg-opt-on" : "spg-opt-off")}>
                              <Icon className="h-4 w-4 mx-auto mb-1.5" />
                              <p className="text-xs font-semibold">{l}</p>
                              <p className="text-[10px] mt-0.5 opacity-55">{sub}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button type="button"
                        onClick={()=>setActiveSection(1)}
                        className="spg-cta w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
                        Continue to Schedule
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* ── Panel 1: Schedule ── */}
                  <div className={activeSection===1 ? "spg-panel-active" : "spg-panel"}>
                    <div className="space-y-5">

                      <div>
                        <p className="spg-label">Active days</p>
                        <div className="flex flex-wrap gap-1.5">
                          {DAY_KEYS.map(d=>(
                            <button key={d} type="button"
                              onClick={()=>setDays(p=>p.includes(d)?p.filter(x=>x!==d):[...p,d])}
                              className={cx(
                                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                                days.includes(d) ? "spg-day-on" : "spg-day-off"
                              )}>
                              {DAY_LABEL[d]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="spg-label">Hours per day</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {DAY_KEYS.map(d=>(
                            <div key={d}
                              className={cx(
                                "rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 transition-all",
                                days.includes(d) ? "spg-card2" : "opacity-40 spg-card2"
                              )}>
                              <span className={cx("text-xs font-semibold",
                                days.includes(d) ? "spg-acc-text" : "spg-muted")}>
                                {DAY_LABEL[d]}
                              </span>
                              <input
                                type="number" min={0} max={8} step={0.5}
                                value={hoursByDay[d]}
                                onChange={e=>setHBD(p=>({...p,[d]:+e.target.value}))}
                                className="spg-input spg-num-input w-12 rounded-lg px-2 py-1 text-xs text-center"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button type="button"
                          onClick={()=>setActiveSection(0)}
                          className="spg-ghost flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
                          Back
                        </button>
                        <button type="button"
                          onClick={()=>setActiveSection(2)}
                          className="spg-cta flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold">
                          Continue to Subjects
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Panel 2: Subjects ── */}
                  <div className={activeSection===2 ? "spg-panel-active" : "spg-panel"}>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="spg-label mb-0">Subjects</p>
                        <button type="button"
                          onClick={()=>setSubjects(p=>[...p,{name:"",level0to10:5,weakTopics:[],weakInput:""}])}
                          className="spg-ghost inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold">
                          + Add subject
                        </button>
                      </div>

                      <div className="space-y-3">
                        {subjects.map((s,idx)=>(
                          <div key={idx} className="spg-subj-card">
                            <div className="spg-subj-head">
                              <div className="flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold spg-acc-pill">
                                  {idx+1}
                                </span>
                                <p className="text-xs font-semibold spg-fg">
                                  {s.name||`Subject ${idx+1}`}
                                </p>
                              </div>
                              {subjects.length>1 && (
                                <button type="button"
                                  onClick={()=>setSubjects(p=>p.filter((_,i)=>i!==idx))}
                                  className="h-7 w-7 rounded-full flex items-center justify-center transition-all hover:bg-red-500/12"
                                  style={{border:"1px solid rgba(239,68,68,.2)",color:"rgba(239,68,68,.65)"}}>
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            <div className="p-4 space-y-4">
                              <input
                                value={s.name}
                                onChange={e=>setSubjects(p=>p.map((x,i)=>i===idx?{...x,name:e.target.value}:x))}
                                placeholder="Subject name, e.g., CAT404 Web Engineering"
                                className="spg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                              />

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-medium spg-muted">Current level</p>
                                  <span className="text-xs font-bold spg-acc-text">{s.level0to10}/10</span>
                                </div>
                                <div className="spg-level-track mb-2">
                                  <div className="spg-level-fill" style={{width:`${s.level0to10*10}%`}} />
                                </div>
                                <input type="range" min={0} max={10} value={s.level0to10}
                                  onChange={e=>setSubjects(p=>p.map((x,i)=>i===idx?{...x,level0to10:+e.target.value}:x))}
                                  className="spg-range w-full"
                                />
                                <div className="flex justify-between text-[10px] spg-muted mt-1">
                                  <span>Beginner</span><span>Expert</span>
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-medium spg-muted mb-1.5">
                                  Weak topics <span className="opacity-60">(comma separated)</span>
                                </p>
                                <input
                                  value={s.weakInput}
                                  onChange={e=>setSubjects(p=>p.map((x,i)=>i===idx?{...x,weakInput:e.target.value}:x))}
                                  placeholder="e.g., SQL joins, React hooks, ERD normalization"
                                  className="spg-input w-full rounded-xl px-3.5 py-2.5 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button type="button"
                          onClick={()=>setActiveSection(1)}
                          className="spg-ghost rounded-xl px-4 py-3 text-sm font-semibold">
                          Back
                        </button>
                        <button type="button" onClick={generatePlan} disabled={loading}
                          className="spg-cta flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold">
                          {loading
                            ? (<><RefreshCcw className="h-4 w-4 spg-spin" />Generating…</>)
                            : (<>{plan?"Regenerate plan":"Generate plan"}<Sparkles className="h-4 w-4" /></>)}
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* ── RIGHT: sidebar ── */}
              <aside className="space-y-4 spg-up d2">

                <div className="spg-card rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-bold spg-fg mb-4">What you'll get</p>
                  <div className="space-y-3">
                    {[
                      { Icon:CalendarClock, text:"Daily study blocks, Mon–Sun"          },
                      { Icon:Flame,         text:"Revision reminders every few days"    },
                      { Icon:Target,        text:"Hard topics get more practice time"   },
                      { Icon:HelpCircle,    text:"Explains why each task is scheduled"  },
                      { Icon:Clock,         text:"Morning / afternoon / night labels"   },
                    ].map(({Icon,text},i)=>(
                      <div key={i} className="flex items-center gap-2.5">
                        <div className="h-6 w-6 rounded-lg flex items-center justify-center spg-acc-pill shrink-0">
                          <Icon className="h-3 w-3" />
                        </div>
                        <p className="text-xs spg-muted">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="spg-card rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-bold spg-fg mb-3">Setup progress</p>
                  <div className="space-y-2">
                    {FORM_SECTIONS.map(({ id,label,icon:Icon })=>(
                      <button key={id} type="button"
                        onClick={()=>setActiveSection(id)}
                        className={cx(
                          "w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all text-left",
                          activeSection===id ? "spg-opt-on" : "spg-opt-off"
                        )}>
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {label}
                        {activeSection===id && <ChevronRight className="h-3 w-3 ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="spg-tip p-4">
                  <p className="text-xs font-bold spg-acc-text mb-1.5">💡 Pro tip</p>
                  <p className="text-xs spg-muted leading-relaxed">
                    Be specific with weak topics — <em>"2NF/3NF normalization"</em>, <em>"SQL GROUP BY"</em>, <em>"JWT auth flow"</em>.
                  </p>
                </div>

              </aside>
            </div>
          )}

          {/* ══════════════════════════════════
              RESULT — stat cards + calendar
          ══════════════════════════════════ */}
          {step==="RESULT" && plan && (
            <div className="space-y-5">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {([
                  {
                    label:"Plan",
                    value: plan.title||"My Study Plan",
                    sub:`${prettyDate(plan.startDate)} → ${prettyDate(plan.endDate)}`,
                    extra:`${prefLabel(plan.preferredTime??preferredTime)}`,
                    Icon:BookOpen,
                  },
                  {
                    label:"Progress",
                    value:`${progress.pct}%`,
                    sub:`${progress.done} of ${progress.total} tasks`,
                    Icon:BarChart2,
                  },
                  {
                    label:"Focus area",
                    value: progress.weakSpot??"—",
                    sub:"Most pending tasks here",
                    Icon:Target,
                  },
                ] as any[]).map((c,i)=>(
                  <div key={i} className="spg-card rounded-2xl p-4 shadow-sm spg-up"
                    style={{animationDelay:`${i*60}ms`}}>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[11px] font-medium spg-muted2">{c.label}</p>
                      <div className="h-6 w-6 rounded-lg flex items-center justify-center spg-acc-pill">
                        <c.Icon className="h-3 w-3" />
                      </div>
                    </div>
                    <p className="text-base font-bold spg-fg leading-snug">{c.value}</p>
                    <p className="text-xs spg-muted mt-1">{c.sub}</p>
                    {c.extra && <p className="text-[11px] spg-muted2 mt-0.5">{c.extra}</p>}
                  </div>
                ))}
              </div>

              <section className="spg-card rounded-3xl shadow-sm spg-up d2 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor:"rgb(var(--border))"}}>
                  <div>
                    <p className="text-sm font-bold spg-fg">Weekly Schedule</p>
                    <p className="text-xs spg-muted mt-0.5">Click any task to mark it complete</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] spg-muted flex-wrap">
                    {[
                      {cls:"spg-bar-indigo",label:"Study"},
                      {cls:"spg-bar-sky",   label:"Practice"},
                      {cls:"spg-bar-amber", label:"Revision"},
                      {cls:"spg-bar-purple",label:"Get help"},
                    ].map(({cls,label})=>(
                      <span key={label} className="flex items-center gap-1">
                        <span className={cx("inline-block h-2 w-2 rounded-full",cls)} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="divide-y" style={{borderColor:"rgb(var(--border))"}}>
                  {grouped.map((day,di)=>{
                    const isToday=dayStamp(day.date)===dayStamp(new Date());
                    const allDone=day.items.every(x=>x.status==="DONE");
                    const doneCount=day.items.filter(x=>x.status==="DONE").length;
                    const totalMin=day.items.reduce((s,x)=>s+(x.durationMin||0),0);
                    return (
                      <div key={day.date}
                        className={cx("spg-up", isToday && "spg-today-col")}
                        style={{animationDelay:`${di*25}ms`}}>

                        <div className={cx(
                          "flex items-center gap-4 px-6 py-3",
                          isToday ? "spg-today-hdr" : ""
                        )}>
                          <div className="w-20 shrink-0">
                            <p className={cx("text-xs font-bold", isToday ? "spg-acc-text" : "spg-fg")}>
                              {prettyDate(day.date).split(",")[0]}
                            </p>
                            <p className="text-[10px] spg-muted">
                              {prettyDate(day.date).split(",").slice(1).join("").trim()}
                            </p>
                          </div>

                          <div className="flex-1 flex flex-wrap gap-2 min-w-0">
                            {day.items.map(it=>{
                              const done=it.status==="DONE";
                              const {Icon}=badgeForType(it.type);
                              return (
                                <div key={it.id} className="flex flex-col gap-1 min-w-0">
                                  <button type="button" onClick={()=>toggleItem(it)}
                                    disabled={busyToggle===it.id}
                                    className={cx(
                                      "spg-task flex items-center gap-2 rounded-xl px-3 py-2 text-left",
                                      done ? "spg-done" : "spg-card2"
                                    )}>
                                    <span className={cx("h-2 w-2 rounded-full shrink-0 mt-px",
                                      TYPE_BAR[it.type]??TYPE_BAR.STUDY)} />
                                    <div className={cx(
                                      "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                      done?"bg-emerald-500 border-emerald-500":"border-current/20"
                                    )}>
                                      {done && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className={cx("text-xs font-semibold spg-fg whitespace-nowrap",
                                        done&&"line-through opacity-35")}>
                                        {cleanTask(it.task)}
                                      </p>
                                      <p className="text-[10px] spg-muted mt-0.5 whitespace-nowrap">
                                        {it.subjectName} · {it.durationMin}m
                                        {it.timeBlock && <span className="opacity-60"> · {it.timeBlock}</span>}
                                      </p>
                                    </div>
                                  </button>

                                  <button type="button" onClick={()=>setWhyId(it.id)}
                                    className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-semibold spg-acc-text hover:underline">
                                    <HelpCircle className="h-2.5 w-2.5" />
                                    Why?
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          <div className="shrink-0 text-right hidden sm:block">
                            <div className={cx(
                              "text-[10px] font-semibold px-2.5 py-1 rounded-full",
                              allDone ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                      : "spg-muted2 spg-card2"
                            )}>
                              {allDone ? "✓ Done" : `${doneCount}/${day.items.length}`}
                            </div>
                            <p className="text-[10px] spg-muted mt-1">{totalMin}m total</p>
                            {isToday && (
                              <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold spg-acc-pill mt-1">
                                TODAY
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* no plan yet */}
          {step==="RESULT" && !plan && (
            <div className="spg-card rounded-3xl p-12 text-center shadow-sm spg-up">
              <div className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center spg-acc-pill mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <p className="text-base font-bold spg-fg">No plan yet</p>
              <p className="mt-1.5 text-sm spg-muted max-w-xs mx-auto leading-relaxed">
                Create your first plan to see your weekly schedule here.
              </p>
              <button type="button" onClick={()=>setStep("FORM")}
                className="spg-cta mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold">
                Generate plan <Sparkles className="h-4 w-4" />
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ══ FLOATING MASCOT ══ */}
      <div className="spg-mascot-wrap" aria-hidden="true">
        <div className="spg-mascot-float">
          <svg width="72" height="90" viewBox="0 0 72 90" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="36" cy="87" rx="16" ry="4" fill="rgba(var(--primary-raw,99,102,241),.18)" />
            <rect x="22" y="46" width="28" height="26" rx="10" fill="rgb(var(--primary))" opacity=".9"/>
            <g className="spg-arm-l">
              <rect x="8" y="52" width="16" height="7" rx="3.5" fill="rgb(var(--primary))" opacity=".85"/>
              <rect x="2" y="48" width="12" height="14" rx="2.5" fill="#f59e0b"/>
              <rect x="7.5" y="48" width="1.5" height="14" rx="0.75" fill="#b45309" opacity=".6"/>
              <rect x="4" y="51" width="5" height="1.5" rx="0.75" fill="#fff" opacity=".5"/>
              <rect x="4" y="54" width="4" height="1.5" rx="0.75" fill="#fff" opacity=".5"/>
              <rect x="4" y="57" width="5" height="1.5" rx="0.75" fill="#fff" opacity=".5"/>
            </g>
            <rect x="48" y="52" width="14" height="7" rx="3.5" fill="rgb(var(--primary))" opacity=".85"/>
            <rect x="25" y="68" width="9" height="14" rx="4.5" fill="rgb(var(--primary))" opacity=".8"/>
            <rect x="38" y="68" width="9" height="14" rx="4.5" fill="rgb(var(--primary))" opacity=".8"/>
            <ellipse cx="29.5" cy="82" rx="7" ry="4" fill="#1e1b4b"/>
            <ellipse cx="42.5" cy="82" rx="7" ry="4" fill="#1e1b4b"/>
            <rect x="31" y="40" width="10" height="8" rx="4" fill="#fcd5b0"/>
            <ellipse cx="36" cy="30" rx="15" ry="16" fill="#fcd5b0"/>
            <path d="M21 25 Q22 14 36 12 Q50 14 51 25 Q48 18 36 17 Q24 18 21 25Z" fill="#1e1b4b"/>
            <g className="spg-eyes">
              <ellipse cx="30" cy="29" rx="2.5" ry="2.5" fill="#1e1b4b"/>
              <ellipse cx="42" cy="29" rx="2.5" ry="2.5" fill="#1e1b4b"/>
              <ellipse cx="30.8" cy="28.2" rx="1" ry="1" fill="#fff" opacity=".7"/>
              <ellipse cx="42.8" cy="28.2" rx="1" ry="1" fill="#fff" opacity=".7"/>
            </g>
            <g className="spg-blink">
              <rect x="27.5" y="27.5" width="5" height="3" rx="1.5" fill="#fcd5b0"/>
              <rect x="39.5" y="27.5" width="5" height="3" rx="1.5" fill="#fcd5b0"/>
            </g>
            <path d="M31 35 Q36 39 41 35" stroke="#c07850" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <ellipse cx="26" cy="33" rx="3" ry="2" fill="#f9a8a8" opacity=".5"/>
            <ellipse cx="46" cy="33" rx="3" ry="2" fill="#f9a8a8" opacity=".5"/>
            <g className="spg-sparkle1">
              <path d="M60 18 L61.5 22 L65 18 L61.5 14Z" fill="#fbbf24" opacity=".9"/>
              <path d="M58 18 L65 18" stroke="#fbbf24" strokeWidth="1" opacity=".6"/>
              <path d="M61.5 14 L61.5 22" stroke="#fbbf24" strokeWidth="1" opacity=".6"/>
            </g>
            <g className="spg-sparkle2">
              <path d="M10 12 L11 15 L14 12 L11 9Z" fill="#a78bfa" opacity=".9"/>
            </g>
          </svg>
          <div className="spg-bubble">
            <p className="spg-bubble-text">You got this! 📚</p>
          </div>
        </div>
      </div>

      {whyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="spg-backdrop spg-fd absolute inset-0" onClick={()=>setWhyId(null)} />
          <div className="spg-modal spg-pop relative w-full max-w-sm rounded-3xl overflow-hidden">
            <div className="h-[3px] w-full" style={{background:"rgb(var(--primary))"}} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-bold spg-fg">Why this task today?</p>
                  <p className="text-xs spg-muted mt-0.5">{whyItem.subjectName} · {prettyDate(whyItem.date)}</p>
                </div>
                <button type="button" onClick={()=>setWhyId(null)}
                  className="spg-ghost h-8 w-8 rounded-xl flex items-center justify-center shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="spg-inset p-4 mb-4">
                <p className="text-sm font-semibold spg-fg mb-2">{cleanTask(whyItem.task)}</p>
                {whyItem.timeBlock && (
                  <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium spg-acc-pill mb-2">
                    {whyItem.timeBlock}
                  </span>
                )}
                <p className="text-sm spg-muted leading-relaxed">
                  {whyItem.reason??"Scheduled to maintain weekly balance and improve long-term retention."}
                </p>
              </div>
              {plan?.aiExplanation && (
                <p className="text-xs spg-muted leading-relaxed mb-4">
                  <span className="font-semibold spg-fg">Plan context: </span>
                  {plan.aiExplanation}
                </p>
              )}
              <button type="button" onClick={()=>setWhyId(null)}
                className="spg-ghost w-full rounded-xl py-2.5 text-sm font-semibold">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}