// src/app/study/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, RefreshCcw, BookOpen, MoreVertical,
  Pencil, Trash2, X, AlertTriangle, Clock,
  FolderOpen, ChevronRight, Search, GraduationCap,
} from "lucide-react";

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
  const [subjects, setSubjects] = useState<StudySubj[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("");
  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<any>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState<string>("");

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }

  async function loadSubjects() {
    const r = await fetch("/api/study/study-subjects", { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (r.ok && d?.ok) setSubjects(d.subjects ?? []);
  }

  async function loadMaterials(subjectId?: string) {
    const qs = subjectId ? `?studySubjectId=${encodeURIComponent(subjectId)}` : "";
    const r = await fetch(`/api/study/materials${qs}`, { cache: "no-store" });
    const d = await r.json().catch(() => null);
    if (!r.ok) throw new Error(d?.error || "Failed to load materials");
    setItems(d?.materials ?? []);
  }

  async function loadAll() {
    setErr(null); setLoading(true);
    try { await loadSubjects(); await loadMaterials(activeSubjectId); }
    catch (e: any) { setErr(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line
  useEffect(() => {
    setErr(null);
    loadMaterials(activeSubjectId).catch((e: any) => setErr(e?.message || "Failed to load"));
  }, [activeSubjectId]); // eslint-disable-line

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!menuOpenId) return;
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || menuBtnRef.current?.contains(t)) return;
      setMenuOpenId(null);
    }
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [menuOpenId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((m) => m.title.toLowerCase().includes(q));
  }, [items, search]);

  const subjectName = useMemo(() => {
    if (!activeSubjectId) return "All Materials";
    return subjects.find((s) => s.id === activeSubjectId)?.name ?? "Subject";
  }, [activeSubjectId, subjects]);

  function openRename(m: Material) { setMenuOpenId(null); setRenameId(m.id); setRenameValue(m.title); setRenameOpen(true); }
  function openDelete(m: Material) { setMenuOpenId(null); setDeleteId(m.id); setDeleteTitle(m.title); setDeleteOpen(true); }

  async function doRename() {
    if (!renameId) return;
    const nextTitle = renameValue.trim();
    if (!nextTitle) return;
    try {
      const r = await fetch(`/api/study/materials/${renameId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "Rename failed");
      setRenameOpen(false); setRenameId(null); setRenameValue("");
      await loadMaterials(activeSubjectId); showToast("Renamed ✓");
    } catch (e: any) { showToast(e?.message || "Rename failed"); }
  }

  async function doDelete() {
    if (!deleteId) return;
    try {
      const r = await fetch(`/api/study/materials/${deleteId}`, { method: "DELETE" });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "Delete failed");
      setDeleteOpen(false); setDeleteId(null); setDeleteTitle("");
      if (d?.subjectDeleted) { setActiveSubjectId(""); await loadSubjects(); await loadMaterials(""); }
      else { await loadSubjects(); await loadMaterials(activeSubjectId); }
      showToast("Deleted");
    } catch (e: any) { showToast(e?.message || "Delete failed"); }
  }

  return (
    <div className="min-h-screen pt-7 pb-16 bg-[rgb(var(--background))]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,rgb(139,92,246),rgb(217,70,239))" }}
            >
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[rgb(var(--fg))] leading-tight">Study Hub</h1>
              <p className="text-xs text-[rgb(var(--muted))] font-mono">Active Recall Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              disabled={loading}
              className="h-9 w-9 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] inline-flex items-center justify-center text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] transition-colors disabled:opacity-40"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/study/hub/upload"
              className="h-9 px-4 rounded-xl inline-flex items-center gap-1.5 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,rgb(139,92,246),rgb(217,70,239))" }}
            >
              <Plus className="h-4 w-4" />
              New Material
            </Link>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex gap-5 items-start">

          {/* Sidebar */}
          <aside className="w-48 shrink-0 sticky top-6">
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] overflow-hidden">
              <div className="px-3 pt-3 pb-2 border-b border-[rgb(var(--border))]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--muted2))] font-mono">Subjects</p>
              </div>
              <nav className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => setActiveSubjectId("")}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors
                    ${activeSubjectId === ""
                      ? "bg-violet-500/10 text-violet-500 border border-violet-400/25"
                      : "text-[rgb(var(--muted))] hover:bg-[rgb(var(--card2))] hover:text-[rgb(var(--fg))] border border-transparent"
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                    All
                  </span>
                  <span className={`font-mono text-[10px] rounded-md px-1.5 py-0.5
                    ${activeSubjectId === "" ? "bg-violet-500/15 text-violet-500" : "bg-[rgb(var(--card2))] text-[rgb(var(--muted2))]"}`}>
                    {items.length}
                  </span>
                </button>

                {subjects.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSubjectId(s.id)}
                    className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-colors
                      ${activeSubjectId === s.id
                        ? "bg-violet-500/10 text-violet-500 border border-violet-400/25"
                        : "text-[rgb(var(--muted))] hover:bg-[rgb(var(--card2))] hover:text-[rgb(var(--fg))] border border-transparent"
                      }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-400/60 shrink-0" />
                      <span className="truncate">{s.name}</span>
                    </span>
                    {typeof s.materialCount === "number" && (
                      <span className={`font-mono text-[10px] rounded-md px-1.5 py-0.5 shrink-0
                        ${activeSubjectId === s.id ? "bg-violet-500/15 text-violet-500" : "bg-[rgb(var(--card2))] text-[rgb(var(--muted2))]"}`}>
                        {s.materialCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              <div className="px-3 py-2.5 border-t border-[rgb(var(--border))] space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[rgb(var(--muted2))]">Total</span>
                  <span className="font-mono text-[10px] font-medium text-[rgb(var(--fg))]">{items.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[rgb(var(--muted2))]">Subjects</span>
                  <span className="font-mono text-[10px] font-medium text-[rgb(var(--fg))]">{subjects.length}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Title + search row */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-[rgb(var(--fg))]">{subjectName}</h2>
                <p className="text-xs text-[rgb(var(--muted))] font-mono">
                  {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgb(var(--muted2))] pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="h-9 w-48 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] pl-9 pr-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400/40 transition-all"
                />
              </div>
            </div>

            {err && (
              <div className="mb-3 rounded-lg border border-red-400/25 bg-red-500/8 px-3 py-2 text-xs text-red-400">{err}</div>
            )}

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-[60px] rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] animate-pulse" style={{ opacity: 1 - i * 0.25 }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] mb-3">
                  <BookOpen className="h-4.5 w-4.5 text-[rgb(var(--muted2))]" style={{ height: "1.125rem", width: "1.125rem" }} />
                </div>
                <p className="text-sm font-semibold text-[rgb(var(--fg))]">{search ? "Nothing found" : "No materials yet"}</p>
                <p className="mt-1 text-xs text-[rgb(var(--muted))] max-w-xs mx-auto">
                  {search ? `No materials match "${search}".` : "Add your first study material to get started."}
                </p>
                {!search && (
                  <Link
                    href="/study/hub/upload"
                    className="mt-3 inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(135deg,rgb(139,92,246),rgb(217,70,239))" }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Material
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((m) => (
                  <div
                    key={m.id}
                    className="relative rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] group hover:border-violet-400/30 hover:shadow-sm transition-all duration-150"
                  >
                    <Link href={`/study/hub/${m.id}`} className="flex items-center gap-3 px-3.5 py-3 pr-11">
                      <div className="h-8 w-8 shrink-0 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] flex items-center justify-center group-hover:border-violet-400/30 transition-colors">
                        <BookOpen className="h-3.5 w-3.5 text-[rgb(var(--muted2))] group-hover:text-violet-400 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[rgb(var(--fg))] truncate">{m.title}</p>
                        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 text-[10px] text-[rgb(var(--muted2))] font-mono">
                            <Clock className="h-2.5 w-2.5" />{fmtRelative(m.updatedAt)}
                          </span>
                          <span className="text-[rgb(var(--border))]">·</span>
                          <span className="text-[10px] text-[rgb(var(--muted2))] font-mono">{fmtDate(m.createdAt)}</span>
                          {m.studySubjectId && (() => {
                            const subj = subjects.find(s => s.id === m.studySubjectId);
                            return subj ? (
                              <span className="text-[9px] border border-violet-400/25 bg-violet-500/8 text-violet-400 rounded-full px-2 py-0.5">
                                {subj.name}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-[rgb(var(--border))] group-hover:text-violet-400 transition-colors shrink-0" />
                    </Link>

                    {/* 3-dot button + dropdown — self-contained relative wrapper */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-2.5 z-30">
                      <button
                        ref={menuOpenId === m.id ? menuBtnRef : undefined}
                        type="button"
                        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpenId(cur => cur === m.id ? null : m.id); }}
                        className="h-7 w-7 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] inline-flex items-center justify-center text-[rgb(var(--muted2))] opacity-0 group-hover:opacity-100 hover:text-[rgb(var(--fg))] transition-all"
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>

                      {menuOpenId === m.id && (
                        <div
                          ref={menuRef}
                          className="absolute top-[calc(100%+4px)] right-0 z-50 w-36 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-1 shadow-xl"
                          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openRename(m); }}
                            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))] transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5 text-[rgb(var(--muted2))]" /> Rename
                          </button>
                          <button
                            type="button"
                            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDelete(m); }}
                            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/8 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/95 backdrop-blur-sm px-4 py-2 text-xs font-medium text-[rgb(var(--fg))] shadow-lg font-mono">
            {toast}
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRenameOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[rgb(var(--border))]">
              <span className="text-sm font-semibold text-[rgb(var(--fg))]">Rename material</span>
              <button
                onClick={() => setRenameOpen(false)}
                className="h-6 w-6 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] inline-flex items-center justify-center text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doRename(); }}
                className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2.5 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-2 focus:ring-violet-400/20 focus:border-violet-400/40 transition-all"
                placeholder="Material title"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRenameOpen(false)}
                  className="h-8 px-3.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={doRename}
                  className="h-8 px-3.5 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,rgb(139,92,246),rgb(217,70,239))" }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[rgb(var(--border))]">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg border border-amber-400/30 bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                </div>
                <span className="text-sm font-semibold text-[rgb(var(--fg))]">Confirm delete</span>
              </div>
              <button
                onClick={() => setDeleteOpen(false)}
                className="h-6 w-6 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] inline-flex items-center justify-center text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-[rgb(var(--muted))]">
                Delete <span className="font-semibold text-[rgb(var(--fg))]">"{deleteTitle}"</span>? This cannot be undone.
              </p>
              <div className="rounded-lg border border-amber-400/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-400">
                If this came from a PDF, the stored file will also be removed.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteOpen(false)}
                  className="h-8 px-3.5 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-xs font-medium text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={doDelete}
                  className="h-8 px-3.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <KeyHandler onEsc={() => { setMenuOpenId(null); setRenameOpen(false); setDeleteOpen(false); }} />
    </div>
  );
}

function KeyHandler({ onEsc }: { onEsc: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onEsc(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEsc]);
  return null;
}