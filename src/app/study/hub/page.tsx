"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, RefreshCcw, BookOpen, MoreVertical,
  Pencil, Trash2, X, AlertTriangle, Clock,
  Search, FolderOpen, Layers,
  AlertCircle, GraduationCap, FileText,
  Grid3X3, List, Star,
  Brain, HelpCircle, AlignLeft, Upload,
  Hash, Calendar, HardDrive, ChevronRight,
  Eye, ExternalLink, Maximize2, Minimize2,
  ArrowLeft, ArrowRight, ZoomIn, ZoomOut,
  Download, Copy, Check,
} from "lucide-react";
import { StudyBackground } from "@/components/FloatingParticles";

/* ─── Types ─────────────────────────────────────────────── */
type StudySubj = { id: string; name: string; materialCount?: number };
type Material = {
  id: string; title: string; createdAt: string;
  updatedAt: string; studySubjectId?: string | null;
  content?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
};
type ViewMode = "grid" | "list";
type SortKey = "name" | "date" | "subject";
type PanelMode = "info" | "preview";

/* ─── Helpers ────────────────────────────────────────────── */
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

const SUBJECT_COLORS: Record<number, { bg: string; border: string; text: string; dot: string }> = {
  0: { bg: "rgba(139,92,246,.13)", border: "rgba(139,92,246,.3)", text: "rgb(139,92,246)", dot: "rgb(139,92,246)" },
  1: { bg: "rgba(59,130,246,.13)", border: "rgba(59,130,246,.3)", text: "rgb(59,130,246)", dot: "rgb(59,130,246)" },
  2: { bg: "rgba(16,185,129,.13)", border: "rgba(16,185,129,.3)", text: "rgb(16,185,129)", dot: "rgb(16,185,129)" },
  3: { bg: "rgba(245,158,11,.13)", border: "rgba(245,158,11,.3)", text: "rgb(245,158,11)", dot: "rgb(245,158,11)" },
  4: { bg: "rgba(239,68,68,.13)", border: "rgba(239,68,68,.3)", text: "rgb(239,68,68)", dot: "rgb(239,68,68)" },
  5: { bg: "rgba(236,72,153,.13)", border: "rgba(236,72,153,.3)", text: "rgb(236,72,153)", dot: "rgb(236,72,153)" },
};
function subjectColor(idx: number) { return SUBJECT_COLORS[idx % 6]; }

/* ─── File type icon ─────────────────────────────────────── */
function FileTypeIcon({ title, size = 36 }: { title: string; size?: number }) {
  const ext = title.split(".").pop()?.toLowerCase() ?? "";
  const isPdf = ext === "pdf";
  const isImg = ["png","jpg","jpeg","gif","webp","svg"].includes(ext);
  const isDoc = ["doc","docx"].includes(ext);
  const bg    = isPdf ? "rgba(239,68,68,.12)" : isImg ? "rgba(16,185,129,.12)" : isDoc ? "rgba(139,92,246,.12)" : "rgba(59,130,246,.12)";
  const color = isPdf ? "rgb(220,38,38)"      : isImg ? "rgb(5,150,105)"       : isDoc ? "rgb(109,40,217)"      : "rgb(37,99,235)";
  const label = isPdf ? "PDF"                 : isImg ? "IMG"                  : isDoc ? "DOC"                   : "TXT";
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.26), background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <FileText style={{ width: size * 0.42, height: size * 0.42, color }} />
      <span style={{ fontSize: 7, fontWeight: 800, color, letterSpacing: ".06em", marginTop: 1 }}>{label}</span>
    </div>
  );
}

/* ─── PDF blob loader ────────────────────────────────────── */
function PdfPreview({ url, title }: { url: string; title: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    setLoading(true); setFetchErr(false); setBlobUrl(null);

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error("fetch failed");
        return r.blob();
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setBlobUrl(objectUrl);
      })
      .catch(() => setFetchErr(true))
      .finally(() => setLoading(false));

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "rgb(var(--card2))" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(var(--primary),.15)", borderTopColor: "rgb(var(--primary))", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 12, color: "rgb(var(--muted))", fontWeight: 500 }}>Loading PDF…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (fetchErr || !blobUrl) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 32, textAlign: "center", background: "rgb(var(--card2))" }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <FileText style={{ width: 22, height: 22, color: "rgb(220,38,38)" }} />
          <span style={{ fontSize: 7, fontWeight: 800, color: "rgb(220,38,38)", letterSpacing: ".08em" }}>PDF</span>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "rgb(var(--fg))", marginBottom: 6 }}>Can&apos;t load PDF inline</p>
          <p style={{ fontSize: 12, color: "rgb(var(--muted))", lineHeight: 1.6, maxWidth: 240, margin: "0 auto" }}>
            The file couldn&apos;t be fetched. Open it directly instead.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, background: "rgb(var(--primary))", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            <ExternalLink style={{ width: 12, height: 12 }} /> Open PDF
          </a>
          <a href={url} download={title}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, background: "rgba(var(--primary),.08)", border: "1px solid rgba(var(--primary),.2)", color: "rgb(var(--primary))", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            <Download style={{ width: 12, height: 12 }} /> Download
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <iframe
        src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1`}
        title={title}
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}

/* ─── Preview panel content ──────────────────────────────── */
function PreviewContent({ material, zoom, onZoomIn, onZoomOut }: {
  material: Material; zoom: number; onZoomIn: () => void; onZoomOut: () => void;
}) {
  const ext = (material.fileUrl?.split("?")[0] ?? material.title).split(".").pop()?.toLowerCase() ?? "";
  const isImg = ["png","jpg","jpeg","gif","webp","svg"].includes(ext);
  const isPdf =
    ext === "pdf" ||
    material.fileType === "application/pdf" ||
    material.fileUrl?.split("?")[0].toLowerCase().endsWith(".pdf");
  const hasContent = material.content && material.content.trim().length > 0;
  const hasFile = !!material.fileUrl;

  /* Image preview */
  if (isImg && hasFile) {
    return (
      <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgb(var(--card2))" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={material.fileUrl!}
          alt={material.title}
          style={{ maxWidth: `${zoom}%`, maxHeight: "100%", borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,.15)", transition: "max-width .2s" }}
        />
      </div>
    );
  }

  /* ── PDF preview — fetch as blob, then iframe ── */
  if (isPdf && hasFile) {
    return <PdfPreview url={material.fileUrl!} title={material.title} />;
  }

  /* Text / notes content preview */
  if (hasContent) {
    const words = material.content!.trim().split(/\s+/).length;
    const readMins = Math.max(1, Math.round(words / 200));
    return (
      <div style={{ flex: 1, overflow: "auto", padding: "28px 32px" }}>
        {/* mini stats bar */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgb(var(--border))" }}>
          {[
            { label: "Words", val: words.toLocaleString() },
            { label: "Read time", val: `~${readMins} min` },
            { label: "Characters", val: material.content!.length.toLocaleString() },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "rgb(var(--fg))" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "rgb(var(--muted2))", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: Math.max(12, 14 * (zoom / 100)),
            lineHeight: 1.8,
            color: "rgb(var(--fg))",
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-mono, monospace)",
            transition: "font-size .15s",
          }}
        >
          {material.content}
        </div>
      </div>
    );
  }

  /* Empty / no previewable content */
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "rgb(var(--muted))", padding: 40, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(var(--primary),.06)", border: "1px solid rgba(var(--primary),.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
        <Eye style={{ width: 24, height: 24, color: "rgb(var(--primary))", opacity: .5 }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: "rgb(var(--fg))" }}>No preview available</p>
      <p style={{ fontSize: 12, maxWidth: 220, lineHeight: 1.6 }}>
        Open the material to view its full content and start studying.
      </p>
      <Link
        href={`/study/hub/${material.id}`}
        style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, background: "rgba(var(--primary),.08)", border: "1px solid rgba(var(--primary),.2)", color: "rgb(var(--primary))", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
      >
        <ExternalLink style={{ width: 13, height: 13 }} /> Open material
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function StudyHub() {
  /* data */
  const [subjects, setSubjects]       = useState<StudySubj[]>([]);
  const [activeSubjectId, setActive]  = useState<string>("");
  const [items, setItems]             = useState<Material[]>([]);
  const [loading, setLoading]         = useState(true);
  const [err, setErr]                 = useState<string | null>(null);
  /* ui */
  const [search, setSearch]           = useState("");
  const [viewMode, setViewMode]       = useState<ViewMode>("list");
  const [sortKey, setSortKey]         = useState<SortKey>("date");
  const [sortAsc, setSortAsc]         = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  /* selection & panel */
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [panelMode, setPanelMode]     = useState<PanelMode>("info");
  const [previewZoom, setPreviewZoom] = useState(100);
  const [previewFull, setPreviewFull] = useState(false);
  const [copied, setCopied]           = useState(false);
  /* toast */
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);
  const toastRef                      = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* dropdown */
  const [menuOpenId, setMenuOpenId]   = useState<string | null>(null);
  const [menuPos, setMenuPos]         = useState<{ top: number; right: number } | null>(null);
  const menuRef                       = useRef<HTMLDivElement | null>(null);
  /* modals */
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

  /* ── data loaders ── */
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
    loadMaterials(activeSubjectId).catch((e: unknown) => setErr(e instanceof Error ? e.message : "Failed"));
  }, [activeSubjectId, loadMaterials]);

  /* close dropdown on outside click */
  useEffect(() => {
    function onPD(e: PointerEvent) {
      if (!menuOpenId) return;
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      setMenuOpenId(null); setMenuPos(null);
    }
    window.addEventListener("pointerdown", onPD, true);
    return () => window.removeEventListener("pointerdown", onPD, true);
  }, [menuOpenId]);

  /* keyboard nav */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (renameOpen || deleteOpen) return;
      if (e.key === "Escape") {
        setMenuOpenId(null); setMenuPos(null);
        setSelectedId(null); setPreviewFull(false);
      }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && selectedId) {
        const idx = filtered.findIndex(m => m.id === selectedId);
        if (idx === -1) return;
        const next = e.key === "ArrowDown" ? Math.min(idx + 1, filtered.length - 1) : Math.max(idx - 1, 0);
        setSelectedId(filtered[next].id);
        e.preventDefault();
      }
      if (e.key === "Enter" && selectedId && panelMode === "info") {
        setPanelMode("preview");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, renameOpen, deleteOpen, panelMode]);

  /* derived */
  const selectedMaterial = useMemo(() => items.find(m => m.id === selectedId) ?? null, [items, selectedId]);
  const selectedSubjIdx  = useMemo(() => subjects.findIndex(s => s.id === selectedMaterial?.studySubjectId), [subjects, selectedMaterial]);
  const selectedSubj     = useMemo(() => subjects.find(s => s.id === selectedMaterial?.studySubjectId), [subjects, selectedMaterial]);
  const selectedColor    = selectedSubj ? subjectColor(selectedSubjIdx) : null;

  const filtered = useMemo(() => {
    let list = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.title.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name")    cmp = a.title.localeCompare(b.title);
      if (sortKey === "date")    cmp = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortKey === "subject") cmp = (a.studySubjectId ?? "").localeCompare(b.studySubjectId ?? "");
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [items, search, sortKey, sortAsc]);

  const totalMaterials = items.length;
  const recentCount    = items.filter(m => Date.now() - new Date(m.updatedAt).getTime() < 7 * 86400000).length;
  const headingLabel   = activeSubjectId ? (subjects.find(s => s.id === activeSubjectId)?.name ?? "Subject") : "All files";

  /* helpers */
  function selectItem(id: string) {
    if (selectedId === id) { setSelectedId(null); return; }
    setSelectedId(id);
    setPanelMode("info");
    setPreviewZoom(100);
  }

  function openRename(m: Material) { setMenuOpenId(null); setMenuPos(null); setRenameId(m.id); setRenameValue(m.title); setRenameOpen(true); }
  function openDelete(m: Material) { setMenuOpenId(null); setMenuPos(null); setDeleteId(m.id); setDeleteTitle(m.title); setDeleteOpen(true); }

  async function doRename() {
    if (!renameId || renaming) return;
    const t = renameValue.trim(); if (!t) return;
    setRenaming(true);
    try {
      const r = await fetch(`/api/study/materials/${renameId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t }) });
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
      if (selectedId === deleteId) setSelectedId(null);
      if (d?.subjectDeleted) { setActive(""); await loadSubjects(); await loadMaterials(""); }
      else { await loadSubjects(); await loadMaterials(activeSubjectId); }
      showToast("Deleted");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Delete failed", false); }
    finally { setDeleting(false); }
  }

  function cycleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  async function copyContent() {
    if (!selectedMaterial?.content) return;
    await navigator.clipboard.writeText(selectedMaterial.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  /* navigate between files while panel open */
  function navFile(dir: 1 | -1) {
    const idx = filtered.findIndex(m => m.id === selectedId);
    if (idx === -1) return;
    const next = idx + dir;
    if (next < 0 || next >= filtered.length) return;
    setSelectedId(filtered[next].id);
    setPreviewZoom(100);
  }

  /* helper: is the currently selected material a PDF? */
  function selectedIsPdf(mat: Material | null): boolean {
    if (!mat) return false;
    const ext = (mat.fileUrl?.split("?")[0] ?? mat.title).split(".").pop()?.toLowerCase() ?? "";
    return ext === "pdf" || mat.fileType === "application/pdf" || (mat.fileUrl?.split("?")[0].toLowerCase().endsWith(".pdf") ?? false);
  }

  const iconBtnStyle: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8, background: "rgb(var(--card2))", border: "1px solid rgb(var(--border))",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgb(var(--fg))",
  };

  /* ─── full-screen preview overlay ──────────────────────── */
  const fullPreviewPanel = previewFull && selectedMaterial && (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", background: "rgb(var(--card))" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid rgb(var(--border))", flexShrink: 0 }}>
        <button
          onClick={() => setPreviewFull(false)}
          style={{ width: 30, height: 30, borderRadius: 8, background: "rgb(var(--card2))", border: "1px solid rgb(var(--border))", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <Minimize2 style={{ width: 14, height: 14, color: "rgb(var(--fg))" }} />
        </button>
        <FileTypeIcon title={selectedMaterial.title} size={28} />
        <span style={{ fontWeight: 700, fontSize: 14, color: "rgb(var(--fg))", flex: 1 }}>{selectedMaterial.title}</span>
        <div style={{ display: "flex", gap: 6 }}>
          {!selectedIsPdf(selectedMaterial) && (
            <>
              <button onClick={() => setPreviewZoom(z => Math.max(50, z - 15))} style={iconBtnStyle}><ZoomOut style={{ width: 14, height: 14 }} /></button>
              <span style={{ fontSize: 12, color: "rgb(var(--muted))", minWidth: 36, textAlign: "center", alignSelf: "center" }}>{previewZoom}%</span>
              <button onClick={() => setPreviewZoom(z => Math.min(200, z + 15))} style={iconBtnStyle}><ZoomIn style={{ width: 14, height: 14 }} /></button>
              <div style={{ width: 1, background: "rgb(var(--border))", margin: "0 4px" }} />
            </>
          )}
          <button onClick={() => navFile(-1)} style={iconBtnStyle}><ArrowLeft style={{ width: 14, height: 14 }} /></button>
          <button onClick={() => navFile(1)}  style={iconBtnStyle}><ArrowRight style={{ width: 14, height: 14 }} /></button>
        </div>
        <Link href={`/study/hub/${selectedMaterial.id}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0 12px", height: 30, borderRadius: 8, background: "rgb(var(--primary))", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
          <ExternalLink style={{ width: 12, height: 12 }} /> Open
        </Link>
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        <PreviewContent material={selectedMaterial} zoom={previewZoom} onZoomIn={() => setPreviewZoom(z => Math.min(200, z + 15))} onZoomOut={() => setPreviewZoom(z => Math.max(50, z - 15))} />
      </div>
    </div>
  );

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        :root { --sh-ease: cubic-bezier(0.16,1,0.3,1); --sh-dur: 0.18s; }
        .sh-surface  { background: rgb(var(--card));  border: 1px solid rgb(var(--border)); }
        .sh-fg    { color: rgb(var(--fg)); }
        .sh-muted { color: rgb(var(--muted)); }
        .sh-ghost { background: rgb(var(--card2)); border: 1px solid rgb(var(--border)); color: rgb(var(--fg)); cursor: pointer; transition: all var(--sh-dur) var(--sh-ease); font-family: inherit; }
        .sh-ghost:hover:not(:disabled) { border-color: rgba(var(--primary),.35); color: rgb(var(--primary)); background: rgba(var(--primary),.05); }
        .sh-ghost:active:not(:disabled) { transform: scale(.94); }
        .sh-ghost:disabled { opacity: .45; }
        .sh-cta { background: rgb(var(--primary)); color: #fff; border: none; cursor: pointer; transition: all var(--sh-dur) var(--sh-ease); font-family: inherit; }
        .sh-cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(var(--primary),.35); }
        .sh-cta:active:not(:disabled) { transform: scale(.96); box-shadow: none; }
        .sh-cta:disabled { opacity: .5; cursor: not-allowed; }
        .sh-input { background: rgb(var(--card2)); border: 1px solid rgb(var(--border)); color: rgb(var(--fg)); outline: none; transition: border-color .15s, box-shadow .15s; font-family: inherit; }
        .sh-input::placeholder { color: rgb(var(--muted2)); opacity: .6; }
        .sh-input:focus { border-color: rgba(var(--primary),.45); box-shadow: 0 0 0 3px rgba(var(--primary),.1); }
        .sh-search { background: rgb(var(--card2)); border: 1px solid rgb(var(--border)); color: rgb(var(--fg)); outline: none; transition: all .2s; font-family: inherit; border-radius: 8px; height: 34px; padding: 0 28px 0 32px; font-size: 12px; width: 200px; }
        .sh-search::placeholder { color: rgb(var(--muted2)); opacity:.6; }
        .sh-search:focus { border-color: rgba(var(--primary),.4); box-shadow: 0 0 0 3px rgba(var(--primary),.1); width: 260px; background: rgb(var(--card)); }
        .sh-divider { height: 1px; background: rgb(var(--border)); }
        .sh-label { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgb(var(--muted2)); }
        .sh-badge { border-radius: 99px; font-size: 10px; font-weight: 600; padding: 2px 8px; }
        .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* toolbar */
        .sh-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-bottom: 1px solid rgb(var(--border)); background: rgb(var(--card)); flex-wrap: wrap; flex-shrink: 0; }
        /* layout */
        .sh-layout { display: flex; flex: 1; min-height: 0; overflow: hidden; }
        /* sidebar */
        .sh-sidebar { width: 210px; flex-shrink: 0; border-right: 1px solid rgb(var(--border)); overflow-y: auto; padding: 12px 0; background: rgb(var(--card)); transition: width .2s var(--sh-ease), opacity .2s; }
        .sh-sidebar.collapsed { width: 0; opacity: 0; pointer-events: none; overflow: hidden; }
        .sh-nav-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; font-size: 12px; cursor: pointer; color: rgb(var(--muted)); transition: all .12s; border: 1px solid transparent; margin: 0 8px 1px; }
        .sh-nav-item:hover { background: rgb(var(--card2)); color: rgb(var(--fg)); }
        .sh-nav-item.active { background: rgba(var(--primary),.1); border-color: rgba(var(--primary),.2); color: rgb(var(--primary)); font-weight: 600; }
        .sh-nav-count { margin-left: auto; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 99px; background: rgb(var(--card2)); color: rgb(var(--muted2)); }
        .sh-nav-item.active .sh-nav-count { background: rgba(var(--primary),.15); color: rgb(var(--primary)); }
        /* main */
        .sh-main { flex: 1; overflow-y: auto; display: flex; flex-direction: column; min-width: 0; }
        /* list */
        .sh-list-head { display: grid; padding: 6px 14px; border-bottom: 1px solid rgb(var(--border)); background: rgb(var(--card2)); position: sticky; top: 0; z-index: 2; grid-template-columns: 1fr 150px 120px 110px; }
        .sh-list-col { font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgb(var(--muted2)); cursor: pointer; display: flex; align-items: center; gap: 4px; user-select: none; }
        .sh-list-col:hover { color: rgb(var(--fg)); }
        .sh-file-row { display: grid; align-items: center; padding: 7px 14px; border-bottom: 1px solid rgb(var(--border)); cursor: pointer; transition: background .1s; position: relative; grid-template-columns: 1fr 150px 120px 110px; }
        .sh-file-row:hover { background: rgb(var(--card2)); }
        .sh-file-row.selected { background: rgba(var(--primary),.05); border-bottom-color: rgba(var(--primary),.12); }
        .sh-file-row.selected::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: rgb(var(--primary)); border-radius: 0 2px 2px 0; }
        .sh-dot-btn { opacity: 0; transition: opacity .12s; }
        .sh-file-row:hover .sh-dot-btn,
        .sh-file-row.selected .sh-dot-btn { opacity: 1; }
        /* grid */
        .sh-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 10px; padding: 16px; align-content: start; }
        .sh-grid-card { background: rgb(var(--card)); border: 1px solid rgb(var(--border)); border-radius: 14px; padding: 14px 12px 12px; cursor: pointer; transition: all .15s var(--sh-ease); position: relative; }
        .sh-grid-card:hover { border-color: rgba(var(--primary),.3); box-shadow: 0 4px 16px rgba(var(--primary),.08); transform: translateY(-1px); }
        .sh-grid-card.selected { border-color: rgba(var(--primary),.5); background: rgba(var(--primary),.04); box-shadow: 0 0 0 3px rgba(var(--primary),.1); }
        .sh-card-menu { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 6px; background: rgb(var(--card2)); border: 1px solid rgb(var(--border)); display: flex; align-items: center; justify-content: center; opacity: 0; cursor: pointer; transition: opacity .12px; }
        .sh-grid-card:hover .sh-card-menu,
        .sh-grid-card.selected .sh-card-menu { opacity: 1; }
        /* detail panel */
        .sh-detail { flex-shrink: 0; border-left: 1px solid rgb(var(--border)); overflow: hidden; background: rgb(var(--card)); display: flex; flex-direction: column; transition: width .2s var(--sh-ease); }
        .sh-detail.open-info    { width: 280px; }
        .sh-detail.open-preview { width: 420px; }
        .sh-detail.closed       { width: 0; }
        /* panel tabs */
        .sh-tab { padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; color: rgb(var(--muted)); transition: all .14s; background: none; border-top: none; border-left: none; border-right: none; font-family: inherit; }
        .sh-tab.active { color: rgb(var(--primary)); border-bottom-color: rgb(var(--primary)); }
        .sh-tab:hover:not(.active) { color: rgb(var(--fg)); }
        /* preview toolbar */
        .sh-preview-toolbar { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-bottom: 1px solid rgb(var(--border)); background: rgb(var(--card2)); flex-shrink: 0; }
        .sh-icon-btn { width: 28px; height: 28px; border-radius: 7px; background: rgb(var(--card)); border: 1px solid rgb(var(--border)); display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgb(var(--fg)); transition: all .12s; flex-shrink: 0; }
        .sh-icon-btn:hover { border-color: rgba(var(--primary),.3); color: rgb(var(--primary)); background: rgba(var(--primary),.05); }
        /* ai buttons */
        .sh-ai-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; border: 1px solid rgb(var(--border)); background: rgb(var(--card2)); cursor: pointer; font-family: inherit; transition: all .14s; margin-bottom: 5px; text-decoration: none; }
        .sh-ai-btn:hover { border-color: rgba(var(--primary),.3); background: rgba(var(--primary),.04); }
        /* skeleton */
        .sh-skeleton { border-radius: 8px; background: rgb(var(--card2)); animation: shPulse 1.6s ease-in-out infinite; }
        @keyframes shPulse { 0%,100%{opacity:1}50%{opacity:.4} }
        /* modal */
        .sh-backdrop { background: rgba(0,0,0,.5); backdrop-filter: blur(6px); }
        .sh-modal { background: rgb(var(--card)); border: 1px solid rgb(var(--border)); border-radius: 20px; box-shadow: 0 32px 80px rgba(0,0,0,.25); animation: shPop .18s var(--sh-ease) both; }
        @keyframes shPop { from{opacity:0;transform:scale(.93) translateY(10px)}to{opacity:1;transform:none} }
        /* toast */
        .sh-toast { background: rgb(var(--card)); border: 1px solid rgb(var(--border)); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.15); animation: shToastIn .2s var(--sh-ease) both; }
        @keyframes shToastIn { from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)} }
        /* storage bar */
        .sh-storage-bar { height: 3px; border-radius: 99px; background: rgb(var(--card2)); overflow: hidden; margin-top: 6px; }
        .sh-storage-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, rgb(var(--primary)), rgb(236,72,153)); }
        /* empty state */
        .sh-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 60px 24px; gap: 10px; text-align: center; }
      `}</style>

      {fullPreviewPanel}

      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "rgb(var(--background))", overflow: "hidden" }}>
        <StudyBackground />

        {/* ══ TOP TOOLBAR ══════════════════════════════════════ */}
        <div className="sh-toolbar" style={{ position: "relative", zIndex: 10 }}>
          {/* sidebar toggle */}
          <button
            className="sh-ghost"
            onClick={() => setSidebarOpen(o => !o)}
            style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
            title="Toggle sidebar"
          >
            <List style={{ width: 15, height: 15 }} />
          </button>

          {/* logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(var(--primary),.1)", border: "1px solid rgba(var(--primary),.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap style={{ width: 15, height: 15, color: "rgb(var(--primary))" }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: "rgb(var(--fg))" }}>Study Hub</span>
          </div>

          <div style={{ width: 1, height: 20, background: "rgb(var(--border))", margin: "0 2px" }} />

          {/* breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "rgb(var(--muted))" }}>
            <span style={{ cursor: "pointer", transition: "color .12s" }} onClick={() => setActive("")}
              onMouseEnter={e => (e.currentTarget.style.color = "rgb(var(--fg))")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgb(var(--muted))")}>
              My Library
            </span>
            {activeSubjectId && (
              <>
                <ChevronRight style={{ width: 12, height: 12 }} />
                <span style={{ color: "rgb(var(--fg))", fontWeight: 600 }}>{headingLabel}</span>
              </>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* search */}
          <div style={{ position: "relative" }}>
            <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "rgb(var(--muted2))", pointerEvents: "none" }} />
            <input className="sh-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…" />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}>
                <X style={{ width: 12, height: 12, color: "rgb(var(--muted2))" }} />
              </button>
            )}
          </div>

          {/* view toggle */}
          <div style={{ display: "flex", border: "1px solid rgb(var(--border))", borderRadius: 8, overflow: "hidden" }}>
            {(["list", "grid"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)} title={v}
                style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: viewMode === v ? "rgba(var(--primary),.1)" : "transparent", border: "none", cursor: "pointer", color: viewMode === v ? "rgb(var(--primary))" : "rgb(var(--muted2))" }}>
                {v === "list" ? <List style={{ width: 14, height: 14 }} /> : <Grid3X3 style={{ width: 14, height: 14 }} />}
              </button>
            ))}
          </div>

          <button className="sh-ghost" onClick={loadAll} disabled={loading}
            style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }} title="Refresh">
            <RefreshCcw style={{ width: 13, height: 13 }} className={loading ? "animate-spin" : ""} />
          </button>

          <Link href="/study/hub/upload" className="sh-cta"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 8, padding: "0 14px", height: 32, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            <Upload style={{ width: 13, height: 13 }} /> Upload
          </Link>
        </div>

        {/* error */}
        {err && (
          <div style={{ padding: "8px 16px", background: "rgba(239,68,68,.08)", borderBottom: "1px solid rgba(239,68,68,.2)", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgb(220,38,38)", flexShrink: 0, zIndex: 10 }}>
            <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{err}</span>
            <button onClick={() => setErr(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X style={{ width: 13, height: 13 }} /></button>
          </div>
        )}

        {/* ══ BODY ═════════════════════════════════════════════ */}
        <div className="sh-layout" style={{ position: "relative", zIndex: 1 }}>

          {/* SIDEBAR */}
          <div className={`sh-sidebar${sidebarOpen ? "" : " collapsed"}`}>
            <div style={{ padding: "0 0 4px" }}>
              <p className="sh-label" style={{ padding: "4px 18px 6px" }}>Library</p>
              {[
                { label: "All files", icon: <FolderOpen style={{ width: 14, height: 14 }} />, id: "", count: totalMaterials },
                { label: "Starred",   icon: <Star style={{ width: 14, height: 14 }} />, id: "starred", count: null },
                { label: "Recent",    icon: <Clock style={{ width: 14, height: 14 }} />, id: "recent", count: recentCount || null },
              ].map(it => (
                <div key={it.id} className={`sh-nav-item${activeSubjectId === it.id && !["starred","recent"].includes(it.id) ? " active" : it.id === "" && activeSubjectId === "" ? " active" : ""}`}
                  onClick={() => { if (!["starred","recent"].includes(it.id)) setActive(it.id); }}>
                  {it.icon} {it.label}
                  {it.count !== null && it.count! > 0 && <span className="sh-nav-count">{it.count}</span>}
                </div>
              ))}
            </div>

            <div className="sh-divider" style={{ margin: "8px 0" }} />

            <div>
              <p className="sh-label" style={{ padding: "4px 18px 6px" }}>Subjects</p>
              {subjects.length === 0 && <p style={{ fontSize: 11, color: "rgb(var(--muted2))", padding: "2px 18px" }}>No subjects yet</p>}
              {subjects.map((s, idx) => {
                const col = subjectColor(idx);
                return (
                  <div key={s.id} className={`sh-nav-item${activeSubjectId === s.id ? " active" : ""}`} onClick={() => setActive(s.id)}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.dot, flexShrink: 0, boxShadow: activeSubjectId === s.id ? `0 0 6px ${col.dot}` : "none" }} />
                    <span className="truncate" style={{ flex: 1 }}>{s.name}</span>
                    {typeof s.materialCount === "number" && <span className="sh-nav-count">{s.materialCount}</span>}
                  </div>
                );
              })}
            </div>

            <div className="sh-divider" style={{ margin: "8px 0" }} />

            <div style={{ padding: "0 16px" }}>
              <p className="sh-label" style={{ marginBottom: 6 }}>
                <HardDrive style={{ width: 10, height: 10, display: "inline", marginRight: 4 }} />Storage
              </p>
              <div style={{ fontSize: 11, color: "rgb(var(--muted))" }}>
                <span style={{ fontWeight: 600, color: "rgb(var(--fg))" }}>{totalMaterials}</span> files · ~{(totalMaterials * 0.4).toFixed(1)} MB
              </div>
              <div className="sh-storage-bar">
                <div className="sh-storage-fill" style={{ width: `${Math.min((totalMaterials * 0.4) / (10 * 1024) * 100, 100)}%` }} />
              </div>
              <div style={{ fontSize: 10, color: "rgb(var(--muted2))", marginTop: 4 }}>{((totalMaterials * 0.4) / (10 * 1024) * 100).toFixed(2)}% of 10 GB</div>
            </div>
          </div>

          {/* MAIN */}
          <div className="sh-main">
            {/* sub-toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderBottom: "1px solid rgb(var(--border))", background: "rgb(var(--card))", flexShrink: 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "rgb(var(--fg))" }}>{headingLabel}</span>
              <span style={{ fontSize: 12, color: "rgb(var(--muted))" }}>
                {loading ? "Loading…" : `${filtered.length} item${filtered.length !== 1 ? "s" : ""}${search ? ` · "${search}"` : ""}`}
              </span>
              <div style={{ flex: 1 }} />
              {(["name","date","subject"] as SortKey[]).map(k => (
                <button key={k} className="sh-ghost" onClick={() => cycleSort(k)}
                  style={{ height: 26, padding: "0 8px", borderRadius: 6, fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                  {k === "name" ? <Hash style={{ width: 11, height: 11 }} /> : k === "date" ? <Calendar style={{ width: 11, height: 11 }} /> : <Layers style={{ width: 11, height: 11 }} />}
                  {k.charAt(0).toUpperCase() + k.slice(1)} {sortKey === k && <span style={{ fontSize: 9 }}>{sortAsc ? "↑" : "↓"}</span>}
                </button>
              ))}
            </div>

            {/* file list / grid */}
            {loading ? (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {[1, 0.7, 0.5].map((op, i) => <div key={i} className="sh-skeleton" style={{ height: 52, opacity: op }} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="sh-empty">
                <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(var(--primary),.08)", border: "1px solid rgba(var(--primary),.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen style={{ width: 22, height: 22, color: "rgb(var(--primary))" }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "rgb(var(--fg))" }}>{search ? "Nothing found" : "No files yet"}</p>
                <p style={{ fontSize: 12, color: "rgb(var(--muted))", maxWidth: 280, lineHeight: 1.6 }}>
                  {search ? `No files match "${search}".` : "Upload your first study material to get started."}
                </p>
                {!search && (
                  <Link href="/study/hub/upload" className="sh-cta"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 10, padding: "0 18px", height: 36, fontSize: 13, fontWeight: 700, textDecoration: "none", marginTop: 8 }}>
                    <Plus style={{ width: 14, height: 14 }} /> Upload first file
                  </Link>
                )}
              </div>
            ) : viewMode === "list" ? (
              /* ── LIST ── */
              <div style={{ flex: 1, overflowY: "auto" }}>
                <div className="sh-list-head">
                  {(["Name","Subject","Modified","Created"] as const).map((col, i) => (
                    <div key={col} className="sh-list-col"
                      onClick={() => i < 3 && cycleSort(["name","subject","date"][i] as SortKey)}>
                      {col} {sortKey === ["name","subject","date"][i] && <span style={{ fontSize: 9 }}>{sortAsc ? "↑" : "↓"}</span>}
                    </div>
                  ))}
                </div>
                {filtered.map(m => {
                  const si   = subjects.findIndex(s => s.id === m.studySubjectId);
                  const subj = subjects.find(s => s.id === m.studySubjectId);
                  const col  = subj ? subjectColor(si) : null;
                  const isSel = selectedId === m.id;
                  return (
                    <div key={m.id} className={`sh-file-row${isSel ? " selected" : ""}`}
                      onClick={() => selectItem(m.id)}
                      onDoubleClick={() => { setSelectedId(m.id); setPanelMode("preview"); }}>
                      {/* name */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <FileTypeIcon title={m.title} size={30} />
                        <span className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "rgb(var(--fg))" }}>{m.title}</span>
                      </div>
                      {/* subject */}
                      <div>
                        {subj && col
                          ? <span className="sh-badge" style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text }}>{subj.name}</span>
                          : <span style={{ fontSize: 12, color: "rgb(var(--muted2))" }}>—</span>}
                      </div>
                      {/* modified */}
                      <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>{fmtRelative(m.updatedAt)}</div>
                      {/* created + dot menu */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "rgb(var(--muted))" }}>{fmtDate(m.createdAt)}</span>
                        <button className="sh-ghost sh-dot-btn"
                          style={{ width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                          onClick={e => {
                            e.preventDefault(); e.stopPropagation();
                            if (menuOpenId === m.id) { setMenuOpenId(null); setMenuPos(null); }
                            else { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right }); setMenuOpenId(m.id); }
                          }}>
                          <MoreVertical style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── GRID ── */
              <div className="sh-grid" style={{ overflowY: "auto" }}>
                {filtered.map(m => {
                  const si   = subjects.findIndex(s => s.id === m.studySubjectId);
                  const subj = subjects.find(s => s.id === m.studySubjectId);
                  const col  = subj ? subjectColor(si) : null;
                  const isSel = selectedId === m.id;
                  return (
                    <div key={m.id} className={`sh-grid-card${isSel ? " selected" : ""}`}
                      onClick={() => selectItem(m.id)}
                      onDoubleClick={() => { setSelectedId(m.id); setPanelMode("preview"); }}>
                      <button className="sh-card-menu sh-ghost"
                        style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 6, border: "1px solid rgb(var(--border))", padding: 0 }}
                        onClick={e => {
                          e.preventDefault(); e.stopPropagation();
                          if (menuOpenId === m.id) { setMenuOpenId(null); setMenuPos(null); }
                          else { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right }); setMenuOpenId(m.id); }
                        }}>
                        <MoreVertical style={{ width: 12, height: 12 }} />
                      </button>
                      <div style={{ marginBottom: 10 }}><FileTypeIcon title={m.title} size={40} /></div>
                      <p className="truncate" style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--fg))", marginBottom: 4, whiteSpace: "nowrap" }}>{m.title}</p>
                      <p style={{ fontSize: 10, color: "rgb(var(--muted2))", marginBottom: 6 }}>{fmtRelative(m.updatedAt)}</p>
                      {subj && col && <span className="sh-badge" style={{ background: col.bg, border: `1px solid ${col.border}`, color: col.text, fontSize: 10 }}>{subj.name}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ══ DETAIL / PREVIEW PANEL ═══════════════════════ */}
          <div className={`sh-detail ${selectedMaterial ? (panelMode === "preview" ? "open-preview" : "open-info") : "closed"}`}>
            {selectedMaterial && (
              <>
                {/* panel header */}
                <div style={{ display: "flex", alignItems: "center", gap: 2, borderBottom: "1px solid rgb(var(--border))", background: "rgb(var(--card2))", flexShrink: 0 }}>
                  <button className={`sh-tab${panelMode === "info" ? " active" : ""}`} onClick={() => setPanelMode("info")}>Info</button>
                  <button className={`sh-tab${panelMode === "preview" ? " active" : ""}`} onClick={() => setPanelMode("preview")}>
                    <Eye style={{ width: 12, height: 12, display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                    Preview
                  </button>
                  <div style={{ flex: 1 }} />
                  {/* navigate between files */}
                  <button className="sh-icon-btn" onClick={() => navFile(-1)} title="Previous file" style={{ width: 26, height: 26, borderRadius: 6 }}>
                    <ArrowLeft style={{ width: 12, height: 12 }} />
                  </button>
                  <button className="sh-icon-btn" onClick={() => navFile(1)} title="Next file" style={{ width: 26, height: 26, borderRadius: 6 }}>
                    <ArrowRight style={{ width: 12, height: 12 }} />
                  </button>
                  <button className="sh-icon-btn" onClick={() => setSelectedId(null)} title="Close panel" style={{ width: 26, height: 26, borderRadius: 6, marginRight: 6 }}>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>

                {/* ── INFO TAB ── */}
                {panelMode === "info" && (
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {/* file header */}
                    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgb(var(--border))" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                        <FileTypeIcon title={selectedMaterial.title} size={44} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "rgb(var(--fg))", lineHeight: 1.4, marginBottom: 4 }}>{selectedMaterial.title}</p>
                          {selectedSubj && selectedColor && (
                            <span className="sh-badge" style={{ background: selectedColor.bg, border: `1px solid ${selectedColor.border}`, color: selectedColor.text }}>{selectedSubj.name}</span>
                          )}
                        </div>
                      </div>
                      {/* quick action row */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="sh-ghost"
                          onClick={() => setPanelMode("preview")}
                          style={{ flex: 1, height: 30, borderRadius: 8, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Eye style={{ width: 12, height: 12 }} /> Preview
                        </button>
                        <Link href={`/study/hub/${selectedMaterial.id}`}
                          style={{ flex: 1, height: 30, borderRadius: 8, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "rgb(var(--primary))", color: "#fff", textDecoration: "none" }}>
                          <ExternalLink style={{ width: 12, height: 12 }} /> Open
                        </Link>
                      </div>
                    </div>

                    <div style={{ padding: "14px 16px" }}>
                      {/* file info */}
                      <div style={{ marginBottom: 16 }}>
                        <p className="sh-label" style={{ marginBottom: 8 }}>File info</p>
                        {[
                          ["Modified", fmtRelative(selectedMaterial.updatedAt)],
                          ["Created",  fmtDate(selectedMaterial.createdAt)],
                          ["Subject",  selectedSubj?.name ?? "—"],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
                            <span style={{ color: "rgb(var(--muted))" }}>{k}</span>
                            <span style={{ fontWeight: 500, color: "rgb(var(--fg))" }}>{v}</span>
                          </div>
                        ))}
                      </div>

                      <div className="sh-divider" style={{ marginBottom: 16 }} />

                      {/* AI tools */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <p className="sh-label" style={{ marginBottom: 0 }}>Generate with AI</p>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: "rgba(var(--primary),.1)", color: "rgb(var(--primary))" }}>ON DEMAND</span>
                        </div>
                        <p style={{ fontSize: 11, color: "rgb(var(--muted))", marginBottom: 10, lineHeight: 1.5 }}>Press to generate — nothing runs automatically.</p>

                        {[
                          { href: `flashcards`, icon: <Brain style={{ width: 14, height: 14, color: "rgb(139,92,246)" }} />, bg: "rgba(139,92,246,.1)", label: "Flashcards",  sub: "Active recall cards" },
                          { href: `quiz`,       icon: <HelpCircle style={{ width: 14, height: 14, color: "rgb(59,130,246)" }} />, bg: "rgba(59,130,246,.1)", label: "Quiz me",    sub: "Multiple choice test" },
                          { href: `summary`,    icon: <AlignLeft style={{ width: 14, height: 14, color: "rgb(16,185,129)" }} />, bg: "rgba(16,185,129,.1)", label: "Summarise", sub: "Key points & overview" },
                        ].map(t => (
                          <Link key={t.href} href={`/study/hub/${selectedMaterial.id}?generate=${t.href}`} className="sh-ai-btn">
                            <span style={{ width: 28, height: 28, borderRadius: 8, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{t.icon}</span>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--fg))" }}>{t.label}</p>
                              <p style={{ fontSize: 10, color: "rgb(var(--muted))" }}>{t.sub}</p>
                            </div>
                          </Link>
                        ))}
                      </div>

                      <div className="sh-divider" style={{ marginBottom: 14 }} />

                      {/* actions */}
                      <p className="sh-label" style={{ marginBottom: 8 }}>Actions</p>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="sh-ghost" onClick={() => openRename(selectedMaterial)}
                          style={{ flex: 1, height: 30, borderRadius: 8, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Pencil style={{ width: 11, height: 11 }} /> Rename
                        </button>
                        <button onClick={() => openDelete(selectedMaterial)}
                          style={{ flex: 1, height: 30, borderRadius: 8, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "rgb(220,38,38)", cursor: "pointer", fontFamily: "inherit" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,.14)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,.08)")}>
                          <Trash2 style={{ width: 11, height: 11 }} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PREVIEW TAB ── */}
                {panelMode === "preview" && (
                  <>
                    {/* preview toolbar */}
                    {(() => {
                      const isPdf = selectedIsPdf(selectedMaterial);
                      return (
                        <div className="sh-preview-toolbar">
                          {/* zoom controls only for non-PDF */}
                          {!isPdf && (
                            <>
                              <button className="sh-icon-btn" onClick={() => setPreviewZoom(z => Math.max(50, z - 15))} title="Zoom out"><ZoomOut style={{ width: 13, height: 13 }} /></button>
                              <span style={{ fontSize: 11, color: "rgb(var(--muted))", minWidth: 34, textAlign: "center" }}>{previewZoom}%</span>
                              <button className="sh-icon-btn" onClick={() => setPreviewZoom(z => Math.min(200, z + 15))} title="Zoom in"><ZoomIn style={{ width: 13, height: 13 }} /></button>
                              <button className="sh-icon-btn" onClick={() => setPreviewZoom(100)} title="Reset zoom" style={{ fontSize: 9, fontWeight: 700, color: "rgb(var(--muted))" }}>1:1</button>
                            </>
                          )}

                          <div style={{ flex: 1 }} />

                          {/* copy content — only for text materials */}
                          {selectedMaterial.content && !isPdf && (
                            <button className="sh-icon-btn" onClick={copyContent} title="Copy content">
                              {copied ? <Check style={{ width: 13, height: 13, color: "rgb(16,185,129)" }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            </button>
                          )}

                          {/* PDF: open in new tab + download */}
                          {isPdf && selectedMaterial.fileUrl && (
                            <>
                              <a href={selectedMaterial.fileUrl} download={selectedMaterial.title} className="sh-icon-btn" style={{ textDecoration: "none" }} title="Download PDF">
                                <Download style={{ width: 13, height: 13 }} />
                              </a>
                              <a href={selectedMaterial.fileUrl} target="_blank" rel="noopener noreferrer" className="sh-icon-btn" style={{ textDecoration: "none" }} title="Open PDF in new tab">
                                <ExternalLink style={{ width: 13, height: 13 }} />
                              </a>
                              <button className="sh-icon-btn" onClick={() => setPreviewFull(true)} title="Fullscreen PDF">
                                <Maximize2 style={{ width: 13, height: 13 }} />
                              </button>
                            </>
                          )}

                          {/* non-PDF: open in study view + fullscreen */}
                          {!isPdf && (
                            <>
                              <Link href={`/study/hub/${selectedMaterial.id}`} className="sh-icon-btn" style={{ textDecoration: "none" }} title="Open material">
                                <ExternalLink style={{ width: 13, height: 13 }} />
                              </Link>
                              <button className="sh-icon-btn" onClick={() => setPreviewFull(true)} title="Fullscreen preview">
                                <Maximize2 style={{ width: 13, height: 13 }} />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {/* preview content */}
                    <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <PreviewContent
                        material={selectedMaterial}
                        zoom={previewZoom}
                        onZoomIn={() => setPreviewZoom(z => Math.min(200, z + 15))}
                        onZoomOut={() => setPreviewZoom(z => Math.max(50, z - 15))}
                      />
                    </div>

                    {/* preview footer */}
                    <div style={{ borderTop: "1px solid rgb(var(--border))", padding: "8px 12px", background: "rgb(var(--card2))", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "rgb(var(--muted))", fontWeight: 500 }} className="truncate">{selectedMaterial.title}</span>
                      <Link href={`/study/hub/${selectedMaterial.id}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "rgb(var(--primary))", textDecoration: "none" }}>
                        Open full <ChevronRight style={{ width: 11, height: 11 }} />
                      </Link>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>{/* /layout */}
      </div>{/* /root */}

      {/* ══ DROPDOWN PORTAL ══════════════════════════════════ */}
      {menuOpenId && menuPos && (() => {
        const m = filtered.find(x => x.id === menuOpenId);
        if (!m) return null;
        return (
          <div ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999, width: 160, borderRadius: 12, background: "rgb(var(--card))", border: "1px solid rgb(var(--border))", boxShadow: "0 16px 48px rgba(0,0,0,.18)", padding: 6, animation: "shPop .14s var(--sh-ease) both" }}
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); }}>
            {[
              { label: "Preview", icon: <Eye style={{ width: 13, height: 13 }} />, action: () => { setSelectedId(m.id); setPanelMode("preview"); setMenuOpenId(null); setMenuPos(null); } },
            ].map(it => (
              <button key={it.label} onClick={it.action}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, color: "rgb(var(--fg))", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--primary),.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ color: "rgb(var(--muted2))" }}>{it.icon}</span> {it.label}
              </button>
            ))}
            <Link href={`/study/hub/${m.id}`}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, color: "rgb(var(--fg))", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--primary),.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <ExternalLink style={{ width: 13, height: 13, color: "rgb(var(--muted2))" }} /> Open
            </Link>
            <button onClick={() => openRename(m)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, color: "rgb(var(--fg))", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(var(--primary),.06)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Pencil style={{ width: 13, height: 13, color: "rgb(var(--muted2))" }} /> Rename
            </button>
            <div style={{ height: 1, background: "rgb(var(--border))", margin: "4px 0" }} />
            <button onClick={() => openDelete(m)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, color: "rgb(220,38,38)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,.07)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <Trash2 style={{ width: 13, height: 13 }} /> Delete
            </button>
          </div>
        );
      })()}

      {/* ══ TOAST ════════════════════════════════════════════ */}
      {toast && (
        <div className="sh-toast" style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "rgb(var(--fg))", whiteSpace: "nowrap" }}>
          {toast.ok
            ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgb(34,197,94)", boxShadow: "0 0 6px rgb(34,197,94)" }} />
            : <AlertTriangle style={{ width: 13, height: 13, color: "rgb(239,68,68)" }} />}
          {toast.msg}
        </div>
      )}

      {/* ══ RENAME MODAL ═════════════════════════════════════ */}
      {renameOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="sh-backdrop" style={{ position: "fixed", inset: 0 }} onClick={() => setRenameOpen(false)} />
          <div className="sh-modal" style={{ position: "relative", width: "100%", maxWidth: 380 }}>
            <div style={{ height: 2, background: "linear-gradient(90deg,rgb(139,92,246),rgb(var(--primary)),rgb(217,70,239))" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgb(var(--border))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(var(--primary),.1)", border: "1px solid rgba(var(--primary),.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Pencil style={{ width: 13, height: 13, color: "rgb(var(--primary))" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: "rgb(var(--fg))" }}>Rename material</span>
              </div>
              <button className="sh-ghost" onClick={() => setRenameOpen(false)} style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="sh-label" style={{ display: "block", marginBottom: 6 }}>Title</label>
                <input className="sh-input" value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => e.key === "Enter" && doRename()} autoFocus placeholder="Material title" style={{ width: "100%", borderRadius: 9, padding: "8px 12px", fontSize: 13 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="sh-ghost" onClick={() => setRenameOpen(false)} style={{ height: 34, padding: "0 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>Cancel</button>
                <button className="sh-cta" onClick={doRename} disabled={renaming || !renameValue.trim()} style={{ height: 34, padding: "0 16px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                  {renaming ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE MODAL ═════════════════════════════════════ */}
      {deleteOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div className="sh-backdrop" style={{ position: "fixed", inset: 0 }} onClick={() => setDeleteOpen(false)} />
          <div className="sh-modal" style={{ position: "relative", width: "100%", maxWidth: 380 }}>
            <div style={{ height: 2, background: "linear-gradient(90deg,rgb(239,68,68),rgb(249,115,22))" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgb(var(--border))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle style={{ width: 13, height: 13, color: "rgb(245,158,11)" }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: "rgb(var(--fg))" }}>Confirm delete</span>
              </div>
              <button className="sh-ghost" onClick={() => setDeleteOpen(false)} style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, color: "rgb(var(--muted))", lineHeight: 1.6 }}>
                Delete <strong style={{ color: "rgb(var(--fg))" }}>&ldquo;{deleteTitle}&rdquo;</strong>? This cannot be undone.
              </p>
              <div style={{ borderRadius: 9, padding: "10px 12px", fontSize: 11, display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", color: "rgb(161,100,0)", lineHeight: 1.5 }}>
                <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
                If this material came from a PDF, the stored file will also be permanently removed.
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="sh-ghost" onClick={() => setDeleteOpen(false)} style={{ height: 34, padding: "0 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>Cancel</button>
                <button disabled={deleting} onClick={doDelete}
                  style={{ height: 34, padding: "0 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgb(220,38,38)", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", opacity: deleting ? .6 : 1 }}
                  onMouseEnter={e => { if (!deleting) (e.currentTarget as HTMLElement).style.background = "rgb(239,68,68)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgb(220,38,38)"; }}>
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* esc key handler */}
      {(renameOpen || deleteOpen) && (
        <EscHandler onEsc={() => { setRenameOpen(false); setDeleteOpen(false); }} />
      )}
    </>
  );
}

function EscHandler({ onEsc }: { onEsc: () => void }) {
  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === "Escape") onEsc(); }
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onEsc]);
  return null;
}