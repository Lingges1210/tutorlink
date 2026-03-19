"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, RefreshCcw, BookOpen, MoreVertical,
  Pencil, Trash2, X, AlertTriangle, Clock,
  ChevronRight, Search, Sparkles,
  FolderOpen, Layers, AlertCircle, Zap,
  GraduationCap, FileText, TrendingUp,
} from "lucide-react";
import { StudyBackground } from "@/components/FloatingParticles";

type StudySubj = { id: string; name: string; materialCount?: number };
type Material = {
  id: string; title: string; createdAt: string;
  updatedAt: string; studySubjectId?: string | null;
};

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

const SUBJECT_COLORS = [
  { bg: "rgba(139,92,246,.13)", border: "rgba(139,92,246,.3)", text: "rgb(139,92,246)", dot: "rgb(139,92,246)" },
  { bg: "rgba(59,130,246,.13)", border: "rgba(59,130,246,.3)", text: "rgb(59,130,246)", dot: "rgb(59,130,246)" },
  { bg: "rgba(16,185,129,.13)", border: "rgba(16,185,129,.3)", text: "rgb(16,185,129)", dot: "rgb(16,185,129)" },
  { bg: "rgba(245,158,11,.13)", border: "rgba(245,158,11,.3)", text: "rgb(245,158,11)", dot: "rgb(245,158,11)" },
  { bg: "rgba(239,68,68,.13)", border: "rgba(239,68,68,.3)", text: "rgb(239,68,68)", dot: "rgb(239,68,68)" },
  { bg: "rgba(236,72,153,.13)", border: "rgba(236,72,153,.3)", text: "rgb(236,72,153)", dot: "rgb(236,72,153)" },
];

function getSubjectColor(_id: string, index: number) {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

function KeyHandler({ onEsc }: { onEsc: () => void }) {
  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === "Escape") onEsc(); }
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onEsc]);
  return null;
}

export default function StudyHub() {
  const [subjects, setSubjects]       = useState<StudySubj[]>([]);
  const [activeSubjectId, setActive]  = useState<string>("");
  const [items, setItems]             = useState<Material[]>([]);
  const [loading, setLoading]         = useState(true);
  const [err, setErr]                 = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const toastRef                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuOpenId, setMenuOpenId]   = useState<string | null>(null);
  const menuRef                       = useRef<HTMLDivElement | null>(null);
  const menuBtnRef                    = useRef<HTMLButtonElement | null>(null);
  const [renameOpen, setRenameOpen]   = useState(false);
  const [renameId, setRenameId]       = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming]       = useState(false);
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState("");
  const [deleting, setDeleting]       = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [hoveredId, setHoveredId]     = useState<string | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 2600);
  }

  const loadSubjects = useCallback(async () => {
    const r = await fetch("/api/study/study-subjects", { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (r.ok && d?.ok) setSubjects(d.subjects ?? []);
  }, []);

  const loadMaterials = useCallback(async (sid?: string) => {
    const qs = sid ? `?studySubjectId=${encodeURIComponent(sid)}` : "";
    const r = await fetch(`/api/study/materials${qs}`, { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.error || "Failed to load");
    setItems(d?.materials ?? []);
  }, []);

  const loadAll = useCallback(async () => {
    setErr(null); setLoading(true);
    try { await loadSubjects(); await loadMaterials(activeSubjectId); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }, [loadSubjects, loadMaterials, activeSubjectId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    setErr(null);
    loadMaterials(activeSubjectId).catch((e: unknown) => {
      setErr(e instanceof Error ? e.message : "Failed");
    });
  }, [activeSubjectId, loadMaterials]);

  useEffect(() => {
    function onPD(e: PointerEvent) {
      if (!menuOpenId) return;
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || menuBtnRef.current?.contains(t)) return;
      setMenuOpenId(null);
      setMenuPos(null);
    }
    window.addEventListener("pointerdown", onPD, true);
    return () => window.removeEventListener("pointerdown", onPD, true);
  }, [menuOpenId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(m => m.title.toLowerCase().includes(q));
  }, [items, search]);

  const headingLabel = useMemo(() => {
    if (!activeSubjectId) return "All Materials";
    return subjects.find(s => s.id === activeSubjectId)?.name ?? "Subject";
  }, [activeSubjectId, subjects]);

  function openRename(m: Material) {
    setMenuOpenId(null); setRenameId(m.id); setRenameValue(m.title); setRenameOpen(true);
  }
  function openDelete(m: Material) {
    setMenuOpenId(null); setDeleteId(m.id); setDeleteTitle(m.title); setDeleteOpen(true);
  }

  async function doRename() {
    if (!renameId || renaming) return;
    const t = renameValue.trim(); if (!t) return;
    setRenaming(true);
    try {
      const r = await fetch(`/api/study/materials/${renameId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "Rename failed");
      setRenameOpen(false); setRenameId(null); setRenameValue("");
      await loadMaterials(activeSubjectId); showToast("Renamed ✓");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Rename failed", false); }
    finally { setRenaming(false); }
  }

  async function doDelete() {
    if (!deleteId || deleting) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/study/materials/${deleteId}`, { method: "DELETE" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "Delete failed");
      setDeleteOpen(false); setDeleteId(null); setDeleteTitle("");
      if (d?.subjectDeleted) { setActive(""); await loadSubjects(); await loadMaterials(""); }
      else { await loadSubjects(); await loadMaterials(activeSubjectId); }
      showToast("Deleted");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Delete failed", false); }
    finally { setDeleting(false); }
  }

  const totalMaterials = items.length;
  const recentCount = items.filter(m => {
    return Date.now() - new Date(m.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <>
      <style>{`
        :root { --sh-transition: 0.18s cubic-bezier(0.16,1,0.3,1); }

        .sh-card  { background:rgb(var(--card));  border:1px solid rgb(var(--border)); }
        .sh-card2 { background:rgb(var(--card2)); border:1px solid rgb(var(--border)); }
        .sh-divider { border-top:1px solid rgb(var(--border)); }

        .sh-fg     { color:rgb(var(--fg)); }
        .sh-muted  { color:rgb(var(--muted)); }
        .sh-muted2 { color:rgb(var(--muted2)); }
        .sh-label  { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:rgb(var(--muted2)); }

        .sh-acc-pill { background:rgba(var(--primary),.1); border:1px solid rgba(var(--primary),.25); color:rgb(var(--primary)); }
        .sh-acc-text { color:rgb(var(--primary)); }
        .sh-grad {
          background:linear-gradient(135deg,rgb(var(--primary)),rgba(var(--primary),.55));
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }

        .sh-ghost { background:rgb(var(--card2)); border:1px solid rgb(var(--border)); color:rgb(var(--fg)); transition:all var(--sh-transition); }
        .sh-ghost:hover:not(:disabled) { border-color:rgba(var(--primary),.4); color:rgb(var(--primary)); background:rgba(var(--primary),.05); }
        .sh-ghost:active:not(:disabled) { transform:scale(.93); }
        .sh-ghost:disabled { opacity:.45; }

        .sh-cta { background:rgb(var(--primary)); color:#fff; border:none; transition:all var(--sh-transition); position:relative; overflow:hidden; }
        .sh-cta::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.15),transparent 60%); opacity:0; transition:opacity var(--sh-transition); }
        .sh-cta:hover:not(:disabled)::after { opacity:1; }
        .sh-cta:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(var(--primary),.4); }
        .sh-cta:active:not(:disabled) { transform:scale(.96) translateY(0); box-shadow:none; }
        .sh-cta:disabled { opacity:.5; }

        .sh-hero { background:rgb(var(--card)); border:1px solid rgb(var(--border)); border-radius:24px; overflow:hidden; position:relative; }
        .sh-hero-bg { position:absolute; inset:0; background:radial-gradient(ellipse at 90% 10%,rgba(var(--primary),.12),transparent 50%),radial-gradient(ellipse at 10% 90%,rgba(139,92,246,.08),transparent 50%); pointer-events:none; }
        .sh-hero-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(var(--primary),.04) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--primary),.04) 1px,transparent 1px); background-size:32px 32px; pointer-events:none; }

        .sh-qstat { display:flex; flex-direction:column; gap:2px; }
        .sh-qstat-num { font-size:26px; font-weight:800; line-height:1; color:rgb(var(--fg)); }
        .sh-qstat-label { font-size:11px; color:rgb(var(--muted)); font-weight:500; }

        .sh-progress-track { height:4px; border-radius:99px; background:rgb(var(--card2)); overflow:hidden; }
        .sh-progress-fill { height:100%; border-radius:99px; background:linear-gradient(90deg,rgb(var(--primary)),rgb(236,72,153)); transition:width .6s cubic-bezier(.16,1,.3,1); }

        .sh-nav-btn { border-radius:12px; transition:all var(--sh-transition); position:relative; overflow:hidden; }
        .sh-nav-btn:active { transform:scale(.96); }
        .sh-nav-on  { background:rgba(var(--primary),.12); border:1.5px solid rgba(var(--primary),.3); color:rgb(var(--primary)); font-weight:700; box-shadow:0 2px 12px rgba(var(--primary),.15); }
        .sh-nav-on::before { content:''; position:absolute; left:0; top:0; bottom:0; width:2px; background:rgb(var(--primary)); border-radius:0 2px 2px 0; }
        .sh-nav-off { background:transparent; border:1px solid transparent; color:rgb(var(--muted)); }
        .sh-nav-off:hover { background:rgb(var(--card2)); color:rgb(var(--fg)); border-color:rgb(var(--border)); }
        .sh-badge-on  { background:rgba(var(--primary),.18); color:rgb(var(--primary)); }
        .sh-badge-off { background:rgb(var(--card2)); color:rgb(var(--muted2)); }

        .sh-item { background:rgb(var(--card)); border:1px solid rgb(var(--border)); border-radius:20px; overflow:visible; transition:all var(--sh-transition); position:relative; }
        .sh-item:hover { border-color:rgba(var(--primary),.3); box-shadow:0 8px 32px rgba(var(--primary),.1),0 2px 8px rgba(0,0,0,.06); transform:translateY(-2px); }
        .sh-item:active { transform:scale(.997) translateY(0); }

        .sh-item-shimmer { position:absolute; inset-x:0; top:0; height:1.5px; background:linear-gradient(90deg,transparent,rgba(var(--primary),.6) 50%,transparent); transform:scaleX(0); transform-origin:left; transition:transform .35s cubic-bezier(.16,1,.3,1); }
        .sh-item:hover .sh-item-shimmer { transform:scaleX(1); }

        .sh-item-glow { position:absolute; top:0; right:0; width:200px; height:100%; background:radial-gradient(ellipse at right center,rgba(var(--primary),.07),transparent 70%); opacity:0; transition:opacity .25s; pointer-events:none; }
        .sh-item:hover .sh-item-glow { opacity:1; }

        .sh-item-stripe { width:3px; flex-shrink:0; align-self:stretch; background:rgba(var(--primary),.2); transition:background var(--sh-transition),width var(--sh-transition); }
        .sh-item:hover .sh-item-stripe { background:rgb(var(--primary)); width:4px; }

        .sh-icon-box { height:40px; width:40px; border-radius:13px; flex-shrink:0; background:rgba(var(--primary),.08); border:1px solid rgba(var(--primary),.18); display:flex; align-items:center; justify-content:center; transition:all var(--sh-transition); }
        .sh-item:hover .sh-icon-box { background:rgba(var(--primary),.15); border-color:rgba(var(--primary),.35); transform:scale(1.08) rotate(-2deg); }

        .sh-subj-badge { border-radius:99px; font-size:10px; font-weight:600; padding:2px 8px; letter-spacing:.02em; }

        .sh-dot-btn { height:30px; width:30px; border-radius:10px; background:rgb(var(--card2)); border:1px solid rgb(var(--border)); display:inline-flex; align-items:center; justify-content:center; color:rgb(var(--muted2)); opacity:0; transition:all .15s; }
        .sh-item:hover .sh-dot-btn { opacity:1; }
        .sh-dot-btn:hover { color:rgb(var(--fg)); border-color:rgba(var(--primary),.3); background:rgba(var(--primary),.06); }
        .sh-dot-btn:active { transform:scale(.88); }

        .sh-dropdown { position:absolute; top:calc(100% + 6px); right:0; width:150px; border-radius:14px; background:rgb(var(--card)); border:1px solid rgb(var(--border)); box-shadow:0 16px 48px rgba(0,0,0,.2),0 4px 12px rgba(0,0,0,.1); padding:6px; z-index:9999; animation:shDrop .15s cubic-bezier(.16,1,.3,1) both; }
        @keyframes shDrop { from{opacity:0;transform:translateY(-6px) scale(.95)} to{opacity:1;transform:none} }

        .sh-menu-btn { width:100%; display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:9px; font-size:12px; font-weight:500; background:transparent; border:none; cursor:pointer; font-family:inherit; transition:all .12s; }
        .sh-menu-btn:active { transform:scale(.95); }

        .sh-skeleton { border-radius:20px; height:80px; background:rgb(var(--card)); border:1px solid rgb(var(--border)); animation:shPulse 1.8s ease-in-out infinite; position:relative; overflow:hidden; }
        .sh-skeleton::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(var(--primary),.04) 50%,transparent); animation:shSweep 1.8s ease-in-out infinite; }
        @keyframes shPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes shSweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

        .sh-empty { border-radius:24px; border:2px dashed rgb(var(--border)); background:rgb(var(--card)); text-align:center; padding:64px 24px; position:relative; overflow:hidden; }
        .sh-empty::before { content:''; position:absolute; inset:0; background:radial-gradient(circle at 50% 50%,rgba(var(--primary),.04),transparent 60%); pointer-events:none; }

        .sh-input { background:rgb(var(--card2)); border:1px solid rgb(var(--border)); color:rgb(var(--fg)); outline:none; transition:border-color .15s,box-shadow .15s,background .15s; font-family:inherit; }
        .sh-input::placeholder { color:rgb(var(--muted)); opacity:.6; }
        .sh-input:focus { border-color:rgba(var(--primary),.5); box-shadow:0 0 0 3px rgba(var(--primary),.12); background:rgb(var(--card)); }
        .sh-search { transition:width .25s ease; width:180px; }
        .sh-search:focus { width:260px; }

        .sh-backdrop { background:rgba(0,0,0,.55); backdrop-filter:blur(8px); }
        .sh-modal { background:rgb(var(--card)); border:1px solid rgb(var(--border)); box-shadow:0 40px 100px rgba(0,0,0,.3); border-radius:24px; overflow:hidden; animation:shPop .2s cubic-bezier(.16,1,.3,1) both; }
        @keyframes shPop { from{opacity:0;transform:scale(.92) translateY(12px)} to{opacity:1;transform:none} }

        .sh-toast { background:rgb(var(--card)); border:1px solid rgb(var(--border)); backdrop-filter:blur(16px); border-radius:16px; box-shadow:0 12px 40px rgba(0,0,0,.2); animation:shToast .22s cubic-bezier(.16,1,.3,1) both; }
        @keyframes shToast { from{opacity:0;transform:translateX(-50%) translateY(12px) scale(.94)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }

        .sh-up { animation:shUp .4s cubic-bezier(.16,1,.3,1) both; }
        @keyframes shUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .sh-fade { animation:shFade .3s ease both; }
        @keyframes shFade { from{opacity:0} to{opacity:1} }
        .d1{animation-delay:.06s} .d2{animation-delay:.12s} .d3{animation-delay:.18s}

        @keyframes shPingDot { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(2.2);opacity:0} }
        .sh-ping { animation:shPingDot 1.5s cubic-bezier(0,0,.2,1) infinite; }
      `}</style>

      <div className="pt-6 pb-24 min-h-screen" style={{ background: "rgb(var(--background))" }}>
        <StudyBackground />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

          {/* HERO */}
          <div className="sh-hero sh-up mb-6">
            <div className="sh-hero-bg" />
            <div className="sh-hero-grid" />

            <div className="relative px-6 py-6 flex items-center justify-between gap-6 flex-wrap">

              {/* left */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center sh-acc-pill"
                    style={{ boxShadow: "0 0 0 6px rgba(var(--primary),.08),0 8px 24px rgba(var(--primary),.2)" }}
                  >
                    <GraduationCap className="h-7 w-7 sh-acc-text" />
                  </div>
                  <span
                    className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full"
                    style={{ background: "rgb(34,197,94)" }}
                  >
                    <span
                      className="sh-ping absolute inset-0 rounded-full"
                      style={{ background: "rgb(34,197,94)" }}
                    />
                  </span>
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold sh-acc-pill mb-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    ACTIVE RECALL ENGINE
                  </div>
                  <h1 className="text-3xl font-black sh-fg tracking-tight leading-none">
                    Study <span className="sh-grad">Hub</span>
                  </h1>
                  <p className="text-xs sh-muted mt-1.5 font-medium">
                    Your personal learning command center
                  </p>
                </div>
              </div>

              {/* right */}
              <div className="flex items-center gap-4 flex-wrap">

                <div
                  className="flex items-center rounded-2xl overflow-hidden sh-card"
                  style={{ padding: "10px 0" }}
                >
                  <div className="sh-qstat text-center px-5">
                    <span className="sh-qstat-num" style={{ color: "rgb(var(--primary))" }}>{subjects.length}</span>
                    <span className="sh-qstat-label">Subjects</span>
                  </div>
                  <div className="w-px self-stretch" style={{ background: "rgb(var(--border))" }} />
                  <div className="sh-qstat text-center px-5">
                    <span className="sh-qstat-num">{totalMaterials}</span>
                    <span className="sh-qstat-label">Materials</span>
                  </div>
                  <div className="w-px self-stretch" style={{ background: "rgb(var(--border))" }} />
                  <div className="sh-qstat text-center px-5">
                    <span className="sh-qstat-num" style={{ color: "rgb(34,197,94)" }}>{recentCount}</span>
                    <span className="sh-qstat-label">This week</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={loadAll}
                    disabled={loading}
                    title="Refresh"
                    className="sh-ghost inline-flex items-center justify-center rounded-xl"
                    style={{ height: 38, width: 38 }}
                  >
                    <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </button>
                  <Link
                    href="/study/hub/upload"
                    className="sh-cta inline-flex items-center gap-2 rounded-xl px-4 text-sm font-bold"
                    style={{ height: 38 }}
                  >
                    <Plus className="h-4 w-4" /> New Material
                  </Link>
                </div>

              </div>
            </div>

            {totalMaterials > 0 && (
              <div className="relative px-6 pb-4">
                <div className="sh-progress-track">
                  <div
                    className="sh-progress-fill"
                    style={{ width: `${Math.min((totalMaterials / 20) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] sh-muted mt-1.5 font-medium">
                  {totalMaterials} of 20 materials · {Math.round(Math.min((totalMaterials / 20) * 100, 100))}% to milestone
                </p>
              </div>
            )}
          </div>

          {/* ERROR */}
          {err && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-4 mb-5 text-sm text-red-500 flex items-start gap-3 sh-fade">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="flex-1 leading-relaxed">{err}</span>
              <button type="button" onClick={() => setErr(null)} className="hover:opacity-70 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* BODY */}
          <div className="flex gap-5 items-start">

            {/* SIDEBAR */}
            <aside className="w-56 shrink-0 sticky top-6 sh-up d1 space-y-3">

              <div className="sh-card rounded-2xl overflow-hidden shadow-sm">
                <div
                  className="px-4 pt-4 pb-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid rgb(var(--border))" }}
                >
                  <p className="sh-label flex items-center gap-1.5">
                    <Layers className="h-3 w-3" /> Subjects
                  </p>
                  <span
                    className="text-[10px] font-bold rounded-lg px-2 py-0.5"
                    style={{
                      background: "rgb(var(--primary))",
                      color: "#fff",
                      minWidth: 18,
                      textAlign: "center",
                      display: "inline-block",
                    }}
                  >
                    {subjects.length}
                  </span>
                </div>

                <nav className="p-2 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => setActive("")}
                    className={`sh-nav-btn w-full flex items-center justify-between px-3 py-2.5 text-xs ${activeSubjectId === "" ? "sh-nav-on" : "sh-nav-off"}`}
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" /> All Materials
                    </span>
                    <span className={`text-[10px] font-bold rounded-lg px-1.5 py-0.5 min-w-[18px] text-center ${activeSubjectId === "" ? "sh-badge-on" : "sh-badge-off"}`}>
                      {items.length}
                    </span>
                  </button>

                  {subjects.map((s, idx) => {
                    const col = getSubjectColor(s.id, idx);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActive(s.id)}
                        className={`sh-nav-btn w-full flex items-center justify-between px-3 py-2.5 text-xs ${activeSubjectId === s.id ? "sh-nav-on" : "sh-nav-off"}`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2 w-2 rounded-full shrink-0 transition-all"
                            style={{
                              background: col.dot,
                              opacity: activeSubjectId === s.id ? 1 : 0.45,
                              boxShadow: activeSubjectId === s.id ? `0 0 8px ${col.dot}` : "none",
                            }}
                          />
                          <span className="truncate">{s.name}</span>
                        </span>
                        {typeof s.materialCount === "number" && (
                          <span className={`text-[10px] font-bold rounded-lg px-1.5 py-0.5 shrink-0 min-w-[18px] text-center ${activeSubjectId === s.id ? "sh-badge-on" : "sh-badge-off"}`}>
                            {s.materialCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className="px-4 py-3 sh-divider space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sh-muted2 flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5" /> Total materials
                    </span>
                    <span className="text-[10px] font-bold sh-fg">{items.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sh-muted2 flex items-center gap-1">
                      <Layers className="h-2.5 w-2.5" /> Subjects
                    </span>
                    <span className="text-[10px] font-bold sh-fg">{subjects.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sh-muted2 flex items-center gap-1">
                      <TrendingUp className="h-2.5 w-2.5" /> This week
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: "rgb(34,197,94)" }}>
                      {recentCount}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="sh-card rounded-2xl p-4"
                style={{ background: "rgba(var(--primary),.05)", borderColor: "rgba(var(--primary),.15)" }}
              >
                <p className="text-xs font-bold sh-fg mb-1 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 sh-acc-text" /> Quick Add
                </p>
                <p className="text-[11px] sh-muted leading-relaxed mb-3">
                  Upload PDFs, notes, or paste text to generate flashcards instantly.
                </p>
                <Link
                  href="/study/hub/upload"
                  className="sh-cta flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold"
                  style={{ height: 32 }}
                >
                  <Plus className="h-3 w-3" /> Add Material
                </Link>
              </div>

            </aside>

            {/* MAIN */}
            <div className="flex-1 min-w-0 sh-up d2">

              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-base font-black sh-fg leading-none">{headingLabel}</p>
                  <p className="text-xs sh-muted mt-1 font-medium">
                    {loading ? "Loading…" : (
                      <span>
                        {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                        {search && (
                          <span className="sh-acc-text"> matching &ldquo;{search}&rdquo;</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sh-muted2 pointer-events-none" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search materials…"
                    className="sh-input sh-search rounded-2xl pl-9 pr-8 text-xs font-medium"
                    style={{ height: 36 }}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full inline-flex items-center justify-center sh-muted2 transition-opacity hover:opacity-70"
                      style={{ background: "rgba(var(--muted2),.2)" }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 0.7, 0.5].map((op, i) => (
                    <div
                      key={i}
                      className="sh-skeleton"
                      style={{ opacity: op, animationDelay: `${i * 140}ms` }}
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="sh-empty sh-fade">
                  <div
                    className="inline-flex h-16 w-16 items-center justify-center rounded-2xl sh-acc-pill mb-5"
                    style={{ boxShadow: "0 0 0 8px rgba(var(--primary),.06)" }}
                  >
                    <BookOpen className="h-7 w-7 sh-acc-text" />
                  </div>
                  <p className="text-base font-black sh-fg">
                    {search ? "Nothing found" : "No materials yet"}
                  </p>
                  <p className="text-sm sh-muted mt-2 max-w-xs mx-auto leading-relaxed">
                    {search
                      ? `No materials match "${search}". Try a different term.`
                      : "Upload your first study material and let the active recall engine transform how you learn."}
                  </p>
                  {!search && (
                    <Link
                      href="/study/hub/upload"
                      className="sh-cta mt-6 inline-flex items-center gap-2 rounded-2xl px-6 text-sm font-bold"
                      style={{ height: 40 }}
                    >
                      <Plus className="h-4 w-4" /> Add Your First Material
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((m, i) => {
                    const subjIdx = subjects.findIndex(s => s.id === m.studySubjectId);
                    const subj    = subjects.find(s => s.id === m.studySubjectId);
                    const col     = subj ? getSubjectColor(m.studySubjectId!, subjIdx) : null;
                    const isOpen  = menuOpenId === m.id;

                    return (
                      <div
                        key={m.id}
                        className="sh-item sh-up"
                        style={{ animationDelay: `${i * 40}ms` }}
                        onMouseEnter={() => setHoveredId(m.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <div className="sh-item-shimmer" />
                        <div className="sh-item-glow" />

                        {/* inner row — clipped for stripe/shimmer visuals */}
                        <div className="flex items-center pr-12" style={{ borderRadius: 20, overflow: "hidden" }}>

                          <div className="sh-item-stripe" style={{ minHeight: 74 }} />

                          <Link href={`/study/hub/${m.id}`} className="flex items-center flex-1 min-w-0">
                            <div className="sh-icon-box mx-4 my-4 shrink-0">
                              <BookOpen className="h-4 w-4 sh-acc-text" style={{ opacity: .75 }} />
                            </div>

                            <div className="flex-1 min-w-0 py-4">
                              <p className="text-sm font-bold sh-fg truncate leading-snug">{m.title}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="flex items-center gap-1 text-[11px] sh-muted2 font-medium">
                                  <Clock className="h-3 w-3" />
                                  {fmtRelative(m.updatedAt)}
                                </span>
                                <span className="sh-muted2 opacity-30 text-xs">·</span>
                                <span className="text-[11px] sh-muted2">{fmtDate(m.createdAt)}</span>
                                {subj && col && (
                                  <span
                                    className="sh-subj-badge"
                                    style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text }}
                                  >
                                    {subj.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            <ChevronRight
                              className="h-4 w-4 shrink-0 transition-all sh-muted2 mx-3"
                              style={{
                                opacity: hoveredId === m.id ? 0.7 : 0.3,
                                transform: hoveredId === m.id ? "translateX(2px)" : "none",
                                color: hoveredId === m.id ? "rgb(var(--primary))" : undefined,
                              }}
                            />
                          </Link>
                        </div>

                        {/* three-dot — outside clipping div so dropdown shows freely */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ zIndex: 40 }}>
                          <button
                            ref={isOpen ? menuBtnRef : undefined}
                            type="button"
                            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={e => {
                              e.preventDefault(); e.stopPropagation();
                              if (isOpen) { setMenuOpenId(null); setMenuPos(null); }
                              else {
                                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                                setMenuOpenId(m.id);
                              }
                            }}
                            className="sh-dot-btn"
                            aria-label="Actions"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div
          className="sh-toast fixed bottom-6 left-1/2 z-50 pointer-events-none flex items-center gap-2.5 px-5 py-3 text-xs font-bold sh-fg"
          style={{ transform: "translateX(-50%)" }}
        >
          {toast.ok
            ? <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "rgb(34,197,94)", boxShadow: "0 0 8px rgb(34,197,94)" }} />
            : <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: "rgb(239,68,68)" }} />
          }
          {toast.msg}
        </div>
      )}

      {/* RENAME MODAL */}
      {renameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="sh-backdrop fixed inset-0" onClick={() => setRenameOpen(false)} />
          <div className="sh-modal relative w-full max-w-sm">
            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,rgb(139,92,246),rgb(var(--primary)),rgb(217,70,239))" }} />
            <div className="flex items-center justify-between px-5 py-4 sh-divider" style={{ borderTop: "none" }}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl sh-acc-pill flex items-center justify-center">
                  <Pencil className="h-3.5 w-3.5 sh-acc-text" />
                </div>
                <span className="text-sm font-black sh-fg">Rename material</span>
              </div>
              <button
                onClick={() => setRenameOpen(false)}
                className="sh-ghost h-8 w-8 rounded-xl inline-flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="sh-label block mb-2">Title</label>
                <input
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && doRename()}
                  autoFocus
                  placeholder="Material title"
                  className="sh-input w-full rounded-xl px-4 py-2.5 text-sm font-medium"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRenameOpen(false)}
                  className="sh-ghost rounded-xl px-4 text-sm font-semibold"
                  style={{ height: 38 }}
                >
                  Cancel
                </button>
                <button
                  onClick={doRename}
                  disabled={renaming || !renameValue.trim()}
                  className="sh-cta rounded-xl px-5 text-sm font-bold"
                  style={{ height: 38 }}
                >
                  {renaming ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="sh-backdrop fixed inset-0" onClick={() => setDeleteOpen(false)} />
          <div className="sh-modal relative w-full max-w-sm">
            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,rgb(239,68,68),rgb(249,115,22))" }} />
            <div className="flex items-center justify-between px-5 py-4 sh-divider" style={{ borderTop: "none" }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.25)" }}
                >
                  <AlertTriangle className="h-3.5 w-3.5" style={{ color: "rgb(245,158,11)" }} />
                </div>
                <span className="text-sm font-black sh-fg">Confirm delete</span>
              </div>
              <button
                onClick={() => setDeleteOpen(false)}
                className="sh-ghost h-8 w-8 rounded-xl inline-flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm sh-muted leading-relaxed">
                Delete <span className="font-bold sh-fg">&quot;{deleteTitle}&quot;</span>? This action cannot be undone.
              </p>
              <div
                className="rounded-xl px-4 py-3 text-xs flex items-start gap-2.5"
                style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", color: "rgb(180,115,0)" }}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                If this material came from a PDF, the stored file will also be permanently removed.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteOpen(false)}
                  className="sh-ghost rounded-xl px-4 text-sm font-semibold"
                  style={{ height: 38 }}
                >
                  Cancel
                </button>
                <button
                  onClick={doDelete}
                  disabled={deleting}
                  className="rounded-xl px-5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                  style={{ height: 38, background: "rgb(220,38,38)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgb(239,68,68)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgb(220,38,38)")}
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <KeyHandler onEsc={() => { setMenuOpenId(null); setMenuPos(null); setRenameOpen(false); setDeleteOpen(false); }} />

      {/* DROPDOWN PORTAL — fixed position, escapes all overflow contexts */}
      {menuOpenId && menuPos && (() => {
        const m = filtered.find(x => x.id === menuOpenId);
        if (!m) return null;
        return (
          <div
            ref={menuRef}
            className="sh-dropdown"
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); openRename(m); setMenuPos(null); }}
              className="sh-menu-btn sh-fg"
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--primary),.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Pencil className="h-3.5 w-3.5 sh-muted2" /> Rename
            </button>
            <button
              type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); openDelete(m); setMenuPos(null); }}
              className="sh-menu-btn"
              style={{ color: "rgb(239,68,68)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        );
      })()}
    </>
  );
}