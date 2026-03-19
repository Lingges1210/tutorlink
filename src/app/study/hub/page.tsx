"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, RefreshCcw, BookOpen, MoreVertical,
  Pencil, Trash2, X, AlertTriangle, Clock,
  ChevronRight, Search, GraduationCap, Sparkles,
  FolderOpen, Layers, AlertCircle,
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

export default function StudyHub() {
  const [subjects, setSubjects]       = useState<StudySubj[]>([]);
  const [activeSubjectId, setActive]  = useState<string>("");
  const [items, setItems]             = useState<Material[]>([]);
  const [loading, setLoading]         = useState(true);
  const [err, setErr]                 = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const toastRef                      = useRef<any>(null);
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
    catch (e: any) { setErr(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }, [loadSubjects, loadMaterials, activeSubjectId]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    setErr(null);
    loadMaterials(activeSubjectId).catch((e: any) => setErr(e?.message || "Failed"));
  }, [activeSubjectId, loadMaterials]);

  useEffect(() => {
    function onPD(e: PointerEvent) {
      if (!menuOpenId) return;
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || menuBtnRef.current?.contains(t)) return;
      setMenuOpenId(null);
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

  function openRename(m: Material) { setMenuOpenId(null); setRenameId(m.id); setRenameValue(m.title); setRenameOpen(true); }
  function openDelete(m: Material) { setMenuOpenId(null); setDeleteId(m.id); setDeleteTitle(m.title); setDeleteOpen(true); }

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
    } catch (e: any) { showToast(e?.message || "Rename failed", false); }
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
    } catch (e: any) { showToast(e?.message || "Delete failed", false); }
    finally { setDeleting(false); }
  }

  return (
    <>
      <style>{`
        /* ── surfaces ── */
        .sh-card  { background: rgb(var(--card));  border: 1px solid rgb(var(--border)); }
        .sh-card2 { background: rgb(var(--card2)); border: 1px solid rgb(var(--border)); }

        /* ── accent ── */
        .sh-acc-pill { background: rgba(var(--primary),.1); border: 1px solid rgba(var(--primary),.2); color: rgb(var(--primary)); }
        .sh-acc-text { color: rgb(var(--primary)); }

        /* ── buttons ── */
        .sh-ghost {
          background: rgb(var(--card2)); border: 1px solid rgb(var(--border));
          color: rgb(var(--fg)); transition: all .15s;
        }
        .sh-ghost:hover:not(:disabled) { border-color: rgba(var(--primary),.4); color: rgb(var(--primary)); }
        .sh-ghost:active:not(:disabled) { transform: scale(.93); }
        .sh-ghost:disabled { opacity: .45; }

        .sh-cta {
          background: rgb(var(--primary));
          color: #fff; border: none; transition: all .18s;
        }
        .sh-cta:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
        .sh-cta:active:not(:disabled) { transform: scale(.95) translateY(0); }
        .sh-cta:disabled { opacity: .5; }

        /* ── text ── */
        .sh-fg    { color: rgb(var(--fg)); }
        .sh-muted { color: rgb(var(--muted)); }
        .sh-muted2{ color: rgb(var(--muted2)); }
        .sh-grad  {
          background: linear-gradient(135deg, rgb(var(--primary)), rgba(var(--primary),.55));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        /* ── subject nav pills ── */
        .sh-subj-on  {
          background: rgba(var(--primary),.1); border: 1.5px solid rgba(var(--primary),.35);
          color: rgb(var(--primary)); font-weight: 700;
          box-shadow: 0 2px 12px rgba(var(--primary),.2);
        }
        .sh-subj-off {
          background: rgb(var(--card)); border: 1px solid rgb(var(--border));
          color: rgb(var(--muted));
        }
        .sh-subj-off:hover { border-color: rgba(var(--primary),.3); color: rgb(var(--fg)); }

        /* ── material card ── */
        .sh-item {
          background: rgb(var(--card)); border: 1px solid rgb(var(--border));
          border-radius: 16px; overflow: hidden;
          transition: all .16s ease-out; cursor: pointer;
          position: relative;
        }
        .sh-item:hover {
          border-color: rgba(var(--primary),.35);
          box-shadow: 0 4px 20px rgba(var(--primary),.08);
          transform: translateY(-1px);
        }
        .sh-item:active { transform: scale(.995); }

        /* top shimmer on hover */
        .sh-item-glow {
          position: absolute; inset-x: 0; top: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(var(--primary),.5), transparent);
          opacity: 0; transition: opacity .25s;
        }
        .sh-item:hover .sh-item-glow { opacity: 1; }

        /* left type bar */
        .sh-item-bar {
          width: 3px; align-self: stretch; flex-shrink: 0;
          background: rgba(var(--primary),.25);
          transition: background .2s;
        }
        .sh-item:hover .sh-item-bar { background: rgb(var(--primary)); }

        /* ── icon box ── */
        .sh-icon-box {
          height: 36px; width: 36px; border-radius: 10px; flex-shrink: 0;
          background: rgba(var(--primary),.07); border: 1px solid rgba(var(--primary),.18);
          display: flex; align-items: center; justify-content: center;
          transition: all .15s;
        }
        .sh-item:hover .sh-icon-box {
          background: rgba(var(--primary),.14); border-color: rgba(var(--primary),.3);
        }

        /* ── subject badge on card ── */
        .sh-subj-badge {
          background: rgba(var(--primary),.08); border: 1px solid rgba(var(--primary),.22);
          color: rgb(var(--primary)); border-radius: 99px;
          font-size: 10px; font-weight: 600; padding: 1px 8px;
        }

        /* ── 3-dot menu btn ── */
        .sh-dot-btn {
          height: 28px; width: 28px; border-radius: 9px;
          background: rgb(var(--card2)); border: 1px solid rgb(var(--border));
          display: inline-flex; align-items: center; justify-content: center;
          color: rgb(var(--muted2));
          opacity: 0; transition: all .12s;
        }
        .sh-item:hover .sh-dot-btn { opacity: 1; }
        .sh-dot-btn:hover { color: rgb(var(--fg)); border-color: rgba(var(--primary),.3); background: rgba(var(--primary),.06); }
        .sh-dot-btn:active { transform: scale(.88); }

        /* ── dropdown menu ── */
        .sh-dropdown {
          position: absolute; top: calc(100% + 6px); right: 0;
          width: 144px; border-radius: 12px;
          background: rgb(var(--card)); border: 1px solid rgb(var(--border));
          box-shadow: 0 8px 32px rgba(0,0,0,.18); padding: 6px; z-index: 50;
          animation: shDrop .12s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes shDrop { from { opacity:0; transform:translateY(-4px) scale(.97) } to { opacity:1; transform:none } }

        .sh-menu-btn {
          width: 100%; display: flex; align-items: center; gap: 8px;
          padding: 7px 10px; border-radius: 8px; font-size: 12px; font-weight: 500;
          background: transparent; border: none; cursor: pointer; font-family: inherit;
          transition: all .1s;
        }
        .sh-menu-btn:active { transform: scale(.95); }

        /* ── skeleton ── */
        .sh-skeleton {
          border-radius: 16px; height: 72px;
          background: rgb(var(--card2)); border: 1px solid rgb(var(--border));
          animation: shPulse 1.6s ease-in-out infinite;
        }
        @keyframes shPulse { 0%,100%{opacity:1} 50%{opacity:.45} }

        /* ── empty state ── */
        .sh-empty {
          border-radius: 20px; border: 1.5px dashed rgb(var(--border));
          background: rgb(var(--card)); text-align: center; padding: 52px 24px;
        }

        /* ── input ── */
        .sh-input {
          background: rgb(var(--card2)); border: 1px solid rgb(var(--border));
          color: rgb(var(--fg)); outline: none; transition: border-color .15s, box-shadow .15s;
          font-family: inherit;
        }
        .sh-input::placeholder { color: rgb(var(--muted)); opacity: .6; }
        .sh-input:focus {
          border-color: rgba(var(--primary),.5);
          box-shadow: 0 0 0 3px rgba(var(--primary),.1);
        }

        /* ── search expand ── */
        .sh-search { transition: width .2s ease; width: 180px; }
        .sh-search:focus { width: 240px; }

        /* ── label ── */
        .sh-label {
          font-size: 11px; font-weight: 600; letter-spacing: .05em;
          text-transform: uppercase; color: rgb(var(--muted2));
        }

        /* ── modal ── */
        .sh-backdrop { background: rgba(0,0,0,.5); backdrop-filter: blur(6px); }
        .sh-modal {
          background: rgb(var(--card)); border: 1px solid rgb(var(--border));
          box-shadow: 0 32px 80px rgba(0,0,0,.28); border-radius: 20px; overflow: hidden;
          animation: shPop .18s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes shPop { from{opacity:0;transform:scale(.94) translateY(8px)} to{opacity:1;transform:none} }

        /* ── toast ── */
        .sh-toast {
          background: rgb(var(--card)); border: 1px solid rgb(var(--border));
          backdrop-filter: blur(12px); border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,.18);
          animation: shToast .2s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes shToast { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

        /* ── divider ── */
        .sh-divider { border-top: 1px solid rgb(var(--border)); }

        /* ── sidebar nav ── */
        .sh-nav-on {
          background: rgba(var(--primary),.1); border: 1.5px solid rgba(var(--primary),.28);
          color: rgb(var(--primary)); font-weight: 700;
        }
        .sh-nav-off {
          background: transparent; border: 1px solid transparent;
          color: rgb(var(--muted));
        }
        .sh-nav-off:hover { background: rgb(var(--card2)); color: rgb(var(--fg)); }
        .sh-nav-btn { border-radius: 11px; transition: all .13s; }
        .sh-nav-btn:active { transform: scale(.96); }

        .sh-badge-on  { background: rgba(var(--primary),.16); color: rgb(var(--primary)); }
        .sh-badge-off { background: rgb(var(--card2)); color: rgb(var(--muted2)); }

        /* ── animations ── */
        .sh-up  { animation: shUp  .3s cubic-bezier(.16,1,.3,1) both; }
        @keyframes shUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .d1{animation-delay:.05s} .d2{animation-delay:.1s} .d3{animation-delay:.15s}
      `}</style>

      <div className="pt-8 pb-20 min-h-screen" style={{ background: "rgb(var(--background))" }}>
        <StudyBackground />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

          {/* ══ HEADER ══ */}
          <header className="sh-up flex items-start justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sh-acc-pill mb-2">
                <Sparkles className="h-3 w-3" />
                Active Recall Engine
              </div>
              <h1 className="text-2xl font-bold sh-fg tracking-tight leading-tight">
                Study <span className="sh-grad">Hub</span>
              </h1>
              <p className="text-sm sh-muted mt-1">
                {subjects.length} subject{subjects.length !== 1 ? "s" : ""} · {items.length} material{items.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 mt-1">
              <button
                onClick={loadAll} disabled={loading} title="Refresh"
                className="sh-ghost inline-flex items-center justify-center rounded-xl"
                style={{ height: 36, width: 36 }}
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <Link
                href="/study/hub/upload"
                className="sh-cta inline-flex items-center gap-2 rounded-xl px-4 text-sm font-bold"
                style={{ height: 36 }}
              >
                <Plus className="h-4 w-4" /> New Material
              </Link>
            </div>
          </header>

          {/* ══ ERROR ══ */}
          {err && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-4 mb-5 text-sm text-red-500 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="flex-1 leading-relaxed">{err}</span>
              <button type="button" onClick={() => setErr(null)} className="hover:opacity-70 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ══ BODY ══ */}
          <div className="flex gap-5 items-start">

            {/* ── SIDEBAR ── */}
            <aside className="w-52 shrink-0 sticky top-6 sh-up d1">
              <div className="sh-card rounded-2xl overflow-hidden shadow-sm">

                <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgb(var(--border))" }}>
                  <p className="sh-label flex items-center gap-1.5">
                    <Layers className="h-3 w-3" /> Subjects
                  </p>
                </div>

                <nav className="p-2 space-y-0.5">
                  {/* All */}
                  <button
                    type="button"
                    onClick={() => setActive("")}
                    className={`sh-nav-btn w-full flex items-center justify-between px-3 py-2.5 text-xs ${activeSubjectId === "" ? "sh-nav-on" : "sh-nav-off"}`}
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" /> All
                    </span>
                    <span className={`text-[10px] font-bold rounded-lg px-1.5 py-0.5 min-w-[18px] text-center ${activeSubjectId === "" ? "sh-badge-on" : "sh-badge-off"}`}>
                      {items.length}
                    </span>
                  </button>

                  {subjects.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActive(s.id)}
                      className={`sh-nav-btn w-full flex items-center justify-between px-3 py-2.5 text-xs ${activeSubjectId === s.id ? "sh-nav-on" : "sh-nav-off"}`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`h-2 w-2 rounded-full shrink-0 transition-all ${activeSubjectId === s.id ? "sh-acc-text" : "sh-muted2"}`}
                          style={{ background: activeSubjectId === s.id ? "rgb(var(--primary))" : "rgb(var(--muted2))", opacity: activeSubjectId === s.id ? 1 : 0.4 }} />
                        <span className="truncate">{s.name}</span>
                      </span>
                      {typeof s.materialCount === "number" && (
                        <span className={`text-[10px] font-bold rounded-lg px-1.5 py-0.5 shrink-0 min-w-[18px] text-center ${activeSubjectId === s.id ? "sh-badge-on" : "sh-badge-off"}`}>
                          {s.materialCount}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>

                <div className="px-4 py-3 sh-divider space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sh-muted2">Total materials</span>
                    <span className="text-[10px] font-bold sh-fg">{items.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sh-muted2">Subjects</span>
                    <span className="text-[10px] font-bold sh-fg">{subjects.length}</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* ── MAIN ── */}
            <div className="flex-1 min-w-0 sh-up d2">

              {/* list header */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-bold sh-fg">{headingLabel}</p>
                  <p className="text-xs sh-muted mt-0.5">
                    {loading ? "Loading…" : `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`}
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sh-muted2 pointer-events-none" style={{ transition: "color .15s" }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="sh-input sh-search rounded-xl pl-9 pr-8 text-sm"
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

              {/* list */}
              {loading ? (
                <div className="space-y-2.5">
                  {[1, 0.7, 0.45].map((op, i) => (
                    <div key={i} className="sh-skeleton" style={{ opacity: op, animationDelay: `${i * 120}ms` }} />
                  ))}
                </div>

              ) : filtered.length === 0 ? (
                <div className="sh-empty">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl sh-acc-pill mb-4">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold sh-fg">{search ? "Nothing found" : "No materials yet"}</p>
                  <p className="text-xs sh-muted mt-1.5 max-w-xs mx-auto leading-relaxed">
                    {search
                      ? `No materials match "${search}". Try a different term.`
                      : "Upload your first study material and let the active recall engine do the rest."}
                  </p>
                  {!search && (
                    <Link
                      href="/study/hub/upload"
                      className="sh-cta mt-5 inline-flex items-center gap-2 rounded-xl px-5 text-sm font-bold"
                      style={{ height: 36 }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Material
                    </Link>
                  )}
                </div>

              ) : (
                <div className="space-y-2">
                  {filtered.map((m, i) => {
                    const subj = subjects.find(s => s.id === m.studySubjectId);
                    const isOpen = menuOpenId === m.id;
                    return (
                      <div
                        key={m.id}
                        className="sh-item sh-up"
                        style={{ animationDelay: `${i * 35}ms` }}
                      >
                        <div className="sh-item-glow" />
                        <Link href={`/study/hub/${m.id}`} className="flex items-center gap-0 pr-12">
                          {/* left bar */}
                          <div className="sh-item-bar" style={{ height: "100%", minHeight: 68 }} />

                          {/* icon */}
                          <div className="sh-icon-box mx-4 my-3.5 shrink-0">
                            <BookOpen className="h-4 w-4 sh-acc-text" style={{ opacity: .7 }} />
                          </div>

                          {/* text */}
                          <div className="flex-1 min-w-0 py-3.5">
                            <p className="text-sm font-semibold sh-fg truncate leading-snug">{m.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="flex items-center gap-1 text-[11px] sh-muted2">
                                <Clock className="h-3 w-3" />{fmtRelative(m.updatedAt)}
                              </span>
                              <span className="sh-muted2 opacity-40">·</span>
                              <span className="text-[11px] sh-muted2">{fmtDate(m.createdAt)}</span>
                              {subj && (
                                <span className="sh-subj-badge">{subj.name}</span>
                              )}
                            </div>
                          </div>

                          {/* arrow */}
                          <ChevronRight className="h-4 w-4 shrink-0 mr-3 sh-muted2 transition-all" style={{ opacity: .4 }} />
                        </Link>

                        {/* 3-dot */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30">
                          <button
                            ref={isOpen ? menuBtnRef : undefined}
                            type="button"
                            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpenId(isOpen ? null : m.id); }}
                            className="sh-dot-btn"
                            aria-label="Actions"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>

                          {isOpen && (
                            <div
                              ref={menuRef}
                              className="sh-dropdown"
                              onPointerDown={e => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onPointerDown={e => { e.preventDefault(); e.stopPropagation(); }}
                                onClick={e => { e.preventDefault(); e.stopPropagation(); openRename(m); }}
                                className="sh-menu-btn sh-fg"
                                style={{ "--hover-bg": "rgba(var(--primary),.07)" } as any}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--primary),.08)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              >
                                <Pencil className="h-3.5 w-3.5 sh-muted2" /> Rename
                              </button>
                              <button
                                type="button"
                                onPointerDown={e => { e.preventDefault(); e.stopPropagation(); }}
                                onClick={e => { e.preventDefault(); e.stopPropagation(); openDelete(m); }}
                                className="sh-menu-btn"
                                style={{ color: "rgb(239 68 68)" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,.08)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          )}
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

      {/* ══ TOAST ══ */}
      {toast && (
        <div className="sh-toast fixed bottom-6 left-1/2 z-50 pointer-events-none flex items-center gap-2.5 px-5 py-2.5 text-xs font-semibold sh-fg"
          style={{ transform: "translateX(-50%)" }}>
          {toast.ok
            ? <span className="h-2 w-2 rounded-full shrink-0" style={{ background: "rgb(34 197 94)" }} />
            : <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: "rgb(239 68 68)" }} />
          }
          {toast.msg}
        </div>
      )}

      {/* ══ RENAME MODAL ══ */}
      {renameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="sh-backdrop fixed inset-0" onClick={() => setRenameOpen(false)} />
          <div className="sh-modal relative w-full max-w-sm">
            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,rgb(139,92,246),rgb(217,70,239))" }} />
            <div className="flex items-center justify-between px-5 py-4 sh-divider" style={{ borderTop: "none" }}>
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg sh-acc-pill flex items-center justify-center">
                  <Pencil className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-bold sh-fg">Rename material</span>
              </div>
              <button onClick={() => setRenameOpen(false)}
                className="sh-ghost h-7 w-7 rounded-xl inline-flex items-center justify-center">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <input
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doRename()}
                autoFocus
                placeholder="Material title"
                className="sh-input w-full rounded-xl px-4 py-2.5 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setRenameOpen(false)}
                  className="sh-ghost rounded-xl px-4 text-sm font-medium" style={{ height: 36 }}>
                  Cancel
                </button>
                <button onClick={doRename}
                  disabled={renaming || !renameValue.trim()}
                  className="sh-cta rounded-xl px-5 text-sm font-bold" style={{ height: 36 }}>
                  {renaming ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE MODAL ══ */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="sh-backdrop fixed inset-0" onClick={() => setDeleteOpen(false)} />
          <div className="sh-modal relative w-full max-w-sm">
            <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg,rgb(239,68,68),rgb(249,115,22))" }} />
            <div className="flex items-center justify-between px-5 py-4 sh-divider" style={{ borderTop: "none" }}>
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.25)" }}>
                  <AlertTriangle className="h-3.5 w-3.5" style={{ color: "rgb(245 158 11)" }} />
                </div>
                <span className="text-sm font-bold sh-fg">Confirm delete</span>
              </div>
              <button onClick={() => setDeleteOpen(false)}
                className="sh-ghost h-7 w-7 rounded-xl inline-flex items-center justify-center">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm sh-muted leading-relaxed">
                Delete <span className="font-bold sh-fg">&quot;{deleteTitle}&quot;</span>? This cannot be undone.
              </p>
              <div className="rounded-xl px-3.5 py-2.5 text-xs flex items-start gap-2"
                style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", color: "rgb(180 115 0)" }}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                If this came from a PDF, the stored file will also be permanently removed.
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteOpen(false)}
                  className="sh-ghost rounded-xl px-4 text-sm font-medium" style={{ height: 36 }}>
                  Cancel
                </button>
                <button onClick={doDelete} disabled={deleting}
                  className="rounded-xl px-5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
                  style={{ height: 36, background: "rgb(220 38 38)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgb(239 68 68)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgb(220 38 38)")}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <KeyHandler onEsc={() => { setMenuOpenId(null); setRenameOpen(false); setDeleteOpen(false); }} />
    </>
  );
}

function KeyHandler({ onEsc }: { onEsc: () => void }) {
  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === "Escape") onEsc(); }
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onEsc]);
  return null;
}