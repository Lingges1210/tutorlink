// src/app/study/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Plus,
  RefreshCcw,
  BookOpen,
  CalendarClock,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";

type StudySubj = { id: string; name: string; materialCount?: number };
type Material = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  studySubjectId?: string | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

function pill(active: boolean) {
  return `inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition
  ${
    active
      ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
      : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:bg-[rgb(var(--card))]"
  }`;
}

export default function StudyHub() {
  const [subjects, setSubjects] = useState<StudySubj[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("");

  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<any>(null);

  // menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // outside click refs
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);

  // modals
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState<string>("");

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
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
    setErr(null);
    setLoading(true);
    try {
      await loadSubjects();
      await loadMaterials(activeSubjectId);
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setErr(null);
    loadMaterials(activeSubjectId).catch((e: any) => setErr(e?.message || "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubjectId]);

  // ✅ Reliable outside-click closer (works even when Link is involved)
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!menuOpenId) return;

      const t = e.target as Node;

      // if click is inside menu or the menu button -> do nothing
      if (menuRef.current?.contains(t)) return;
      if (menuBtnRef.current?.contains(t)) return;

      setMenuOpenId(null);
    }

    window.addEventListener("pointerdown", onPointerDown, true); // capture
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [menuOpenId]);

  const subjectName = useMemo(() => {
    if (!activeSubjectId) return "All Subjects";
    return subjects.find((s) => s.id === activeSubjectId)?.name ?? "Subject";
  }, [activeSubjectId, subjects]);

  function openRename(m: Material) {
    setMenuOpenId(null);
    setRenameId(m.id);
    setRenameValue(m.title);
    setRenameOpen(true);
  }

  function openDelete(m: Material) {
    setMenuOpenId(null);
    setDeleteId(m.id);
    setDeleteTitle(m.title);
    setDeleteOpen(true);
  }

  async function doRename() {
    if (!renameId) return;
    const nextTitle = renameValue.trim();
    if (!nextTitle) return;

    try {
      const r = await fetch(`/api/study/materials/${renameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error(d?.error || "Rename failed");

      setRenameOpen(false);
      setRenameId(null);
      setRenameValue("");
      await loadMaterials(activeSubjectId);
      showToast("Renamed ✅");
    } catch (e: any) {
      showToast(e?.message || "Rename failed");
    }
  }

  async function doDelete() {
  if (!deleteId) return;

  try {
    const r = await fetch(`/api/study/materials/${deleteId}`, { method: "DELETE" });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.ok) throw new Error(d?.error || "Delete failed");

    setDeleteOpen(false);
    setDeleteId(null);
    setDeleteTitle("");

    // ✅ If we just deleted the last material in this subject and backend removed the subject,
    // reset filter so we don't query an invalid subjectId.
    if (d?.subjectDeleted) {
      setActiveSubjectId("");          // go back to All
      await loadSubjects();            // refresh subject pills/counts
      await loadMaterials("");         // load all materials
    } else {
      await loadSubjects();            // refresh counts (optional but recommended)
      await loadMaterials(activeSubjectId);
    }

    showToast("Deleted 🗑️");
  } catch (e: any) {
    showToast(e?.message || "Delete failed");
  }
}

  return (
    <div className="pt-10 pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs text-[rgb(var(--muted2))]">
              <Sparkles className="h-4 w-4" />
              Active Recall Engine
            </div>

            <h1 className="mt-3 text-2xl font-semibold text-[rgb(var(--fg))]">
              Study Hub
            </h1>
            <p className="text-sm text-[rgb(var(--muted))] max-w-2xl">
              Paste your notes → generate AI study pack → quiz yourself. Less rereading, more mastery.
            </p>

            {/* Subject filter pills */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubjectId("")}
                className={pill(activeSubjectId === "")}
              >
                All
              </button>
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSubjectId(s.id)}
                  className={pill(activeSubjectId === s.id)}
                >
                  {s.name}
                  {typeof s.materialCount === "number" && (
                    <span className="text-[10px] rounded-full border border-[rgb(var(--border))] px-2 py-0.5 bg-[rgb(var(--card))] text-[rgb(var(--muted2))]">
                      {s.materialCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAll}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.35]"
              disabled={loading}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>

            <Link
              href="/study/hub/upload"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              Add Material
            </Link>
          </div>
        </header>

        {/* Body Card */}
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4">
            <div className="text-sm font-semibold text-[rgb(var(--fg))] flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Your Materials
              <span className="text-xs font-semibold text-[rgb(var(--muted2))] ml-2">
                • {subjectName}
              </span>
            </div>
            <div className="text-xs text-[rgb(var(--muted2))]">{items.length} item(s)</div>
          </div>

          <div className="mt-4">
            {err && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {err}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                <div className="h-20 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]" />
                <div className="h-20 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]" />
                <div className="h-20 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]" />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-5">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                  No materials in this view
                </div>
                <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                  Add a study material and it will appear here.
                </p>

                <div className="mt-4">
                  <Link
                    href="/study/hub/upload"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2.5 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] hover:opacity-95"
                  >
                    <Plus className="h-4 w-4" />
                    Add Material
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((m) => (
                  <div
                    key={m.id}
                    className="relative rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 hover:ring-1 hover:ring-[rgb(var(--primary))/0.25] transition"
                  >
                    {/* Main click area */}
                    <Link href={`/study/hub/${m.id}`} className="block pr-12">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-[rgb(var(--fg))] truncate">
                            {m.title}
                          </div>
                          <div className="mt-1 text-sm text-[rgb(var(--muted))] inline-flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            Created: {fmt(m.createdAt)}
                          </div>
                        </div>

                        <span className="text-xs border border-[rgb(var(--border))] px-2 py-1 rounded-full bg-[rgb(var(--card))] text-[rgb(var(--muted2))]">
                          Updated {fmt(m.updatedAt)}
                        </span>
                      </div>
                    </Link>

                    {/* ✅ ⋯ menu button (z-30 is the key) */}
                    <button
                      ref={menuOpenId === m.id ? menuBtnRef : undefined}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpenId((cur) => (cur === m.id ? null : m.id));
                      }}
                      className="absolute top-3 right-3 z-30 h-8 w-8 inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.20]"
                      aria-label="Actions"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {/* dropdown */}
                    {menuOpenId === m.id && (
                      <div
                        ref={menuRef}
                        className="absolute top-12 right-3 z-40 w-44 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_18px_40px_rgba(0,0,0,0.18)] p-1"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openRename(m);
                          }}
                          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card2))]"
                        >
                          <Pencil className="h-4 w-4" />
                          Rename
                        </button>

                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openDelete(m);
                          }}
                          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-2 text-xs font-semibold text-[rgb(var(--fg))] shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
              {toast}
            </div>
          </div>
        )}

        {/* Rename modal */}
        {renameOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setRenameOpen(false)} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between border-b border-[rgb(var(--border))] p-4">
                  <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                    Rename material
                  </div>
                  <button
                    type="button"
                    onClick={() => setRenameOpen(false)}
                    className="h-8 w-8 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] inline-flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--primary))/0.35]"
                    placeholder="New title"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRenameOpen(false)}
                      className="h-10 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 text-xs font-semibold text-[rgb(var(--fg))]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={doRename}
                      className="h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] hover:opacity-95"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete modal */}
        {deleteOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteOpen(false)} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                <div className="flex items-center justify-between border-b border-[rgb(var(--border))] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Confirm delete
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    className="h-8 w-8 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] inline-flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <div className="text-sm text-[rgb(var(--muted))]">
                    Delete{" "}
                    <span className="font-semibold text-[rgb(var(--fg))]">
                      “{deleteTitle}”
                    </span>
                    ?
                    <div className="text-xs text-[rgb(var(--muted2))] mt-1">
                      This can’t be undone.
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(false)}
                      className="h-10 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 text-xs font-semibold text-[rgb(var(--fg))]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={doDelete}
                      className="h-10 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(220,38,38,0.25)] hover:opacity-95"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="text-[10px] text-[rgb(var(--muted2))] inline-flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    If this came from a PDF, the stored file is removed too.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <KeyHandler
          onEsc={() => {
            setMenuOpenId(null);
            setRenameOpen(false);
            setDeleteOpen(false);
          }}
        />
      </div>
    </div>
  );
}

function KeyHandler({ onEsc }: { onEsc: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onEsc();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEsc]);

  return null;
}