"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Send,
  Sparkles,
  MessageCircle,
  Mic,
  Video,
  MapPin,
  Zap,
  Plus,
  X,
  Check,
  Search,
} from "lucide-react";

type Subject = { id: string; code: string; title: string };

function fmtCode(code: string) {
  return code.replace(/([A-Za-z]+)(\d+)/, "$1 $2");
}

const MODES = [
  { value: "CHAT",      label: "Chat",      icon: MessageCircle },
  { value: "VOICE",     label: "Voice",     icon: Mic           },
  { value: "VIDEO",     label: "Video",     icon: Video         },
  { value: "IN_PERSON", label: "In-person", icon: MapPin        },
];

const ITEM_H = 44; // px per row
const VISIBLE = 5; // rows before scroll kicks in

export default function SOSNewPage() {
  const router = useRouter();
  const [loading, setLoading]           = useState(true);
  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [subjectId, setSubjectId]       = useState("");
  const [query, setQuery]               = useState("");
  const [mode, setMode]                 = useState("CHAT");
  const [description, setDescription]   = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Add-subject state
  const [addingSubject, setAddingSubject] = useState(false);
  const [newCode, setNewCode]             = useState("");
  const [newTitle, setNewTitle]           = useState("");
  const [addingLoading, setAddingLoading] = useState(false);
  const [addError, setAddError]           = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res  = await fetch("/api/subjects", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load subjects");
        if (!mounted) return;
        setSubjects(json.subjects || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q)
    );
  }, [subjects, query]);

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  // When user picks a subject, fill the input with its name and blur
  function pickSubject(s: Subject) {
    setSubjectId(s.id);
    setQuery(`${fmtCode(s.code)} : ${s.title}`);
    searchRef.current?.blur();
  }

  // Clear selection
  function clearSubject() {
    setSubjectId("");
    setQuery("");
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  const canSubmit = useMemo(
    () => !!subjectId && description.trim().length >= 8 && !submitting,
    [subjectId, description, submitting]
  );

  const canAddSubject =
    newCode.trim().length >= 2 && newTitle.trim().length >= 3 && !addingLoading;

  async function handleAddSubject() {
    if (!canAddSubject) return;
    setAddError(null);
    setAddingLoading(true);
    try {
      const res  = await fetch("/api/subjects", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          code:  newCode.trim().toUpperCase(),
          title: newTitle.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to add subject");
      const created: Subject = json.subject;
      setSubjects((prev) => [...prev, created]);
      pickSubject(created);
      setNewCode("");
      setNewTitle("");
      setAddingSubject(false);
    } catch (e: any) {
      setAddError(e?.message || "Something went wrong");
    } finally {
      setAddingLoading(false);
    }
  }

  function cancelAddSubject() {
    setAddingSubject(false);
    setNewCode("");
    setNewTitle("");
    setAddError(null);
  }

  async function onSubmit() {
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res  = await fetch("/api/sos", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ subjectId, mode, description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to submit SOS");
      router.push("/sos");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const activeMode   = MODES.find((m) => m.value === mode)!;
  const ModeIcon     = activeMode.icon;
  const charCount    = description.trim().length;
  const charProgress = Math.min(charCount / 8, 1);

  // Show list only when user has typed something and no subject is locked in
  const showList = !subjectId && !loading && query.trim().length > 0 && subjects.length > 0;
  const listH    = Math.min(filtered.length, VISIBLE) * ITEM_H;

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .anim-1 { opacity:0; animation: fadeUp .4s cubic-bezier(.22,1,.36,1) .04s forwards; }
        .anim-2 { opacity:0; animation: fadeUp .4s cubic-bezier(.22,1,.36,1) .12s forwards; }
        .anim-3 { opacity:0; animation: fadeUp .4s cubic-bezier(.22,1,.36,1) .20s forwards; }
        .anim-4 { opacity:0; animation: fadeUp .4s cubic-bezier(.22,1,.36,1) .28s forwards; }
        .anim-5 { opacity:0; animation: fadeUp .4s cubic-bezier(.22,1,.36,1) .36s forwards; }

        @keyframes lping {
          0%,100% { transform:scale(1); opacity:.7; }
          60%     { transform:scale(1.7); opacity:0; }
        }
        .live-ping { animation: lping 1.8s ease-in-out infinite; }

        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .btn-submit {
          background: linear-gradient(90deg,#7c3aed 0%,#a855f7 28%,#e879f9 50%,#a855f7 72%,#7c3aed 100%);
          background-size: 200% auto;
          animation: shimmer 3.5s linear infinite;
          transition: transform .15s, box-shadow .15s, opacity .15s;
        }
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(139,92,246,.45);
        }
        .btn-submit:active:not(:disabled) { transform: translateY(0); }
        .btn-submit:disabled {
          opacity:.45; animation:none;
          background: linear-gradient(90deg,#7c3aed,#a855f7);
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .75s linear infinite; }

        @keyframes shake {
          0%,100%{ transform:translateX(0); }
          20%    { transform:translateX(-5px); }
          40%    { transform:translateX(5px); }
          60%    { transform:translateX(-3px); }
          80%    { transform:translateX(3px); }
        }
        .shake { animation: shake .35s ease; }

        @keyframes expandDown {
          from { opacity:0; transform: scaleY(.9) translateY(-6px); }
          to   { opacity:1; transform: scaleY(1)  translateY(0);    }
        }
        .expand-down { transform-origin:top; animation: expandDown .22s cubic-bezier(.22,1,.36,1) forwards; }

        .field-card { transition: box-shadow .2s; }
        .field-card:focus-within {
          box-shadow: 0 0 0 2px rgba(139,92,246,.28), 0 8px 24px rgba(139,92,246,.06);
        }

        .mode-btn { transition: transform .15s, box-shadow .15s, background .15s, border-color .15s, color .15s; }
        .mode-btn:hover:not(:disabled):not(.mode-active) { transform: translateY(-2px); }
        .mode-active {
          box-shadow: 0 0 0 2px rgba(139,92,246,.5), 0 4px 16px rgba(139,92,246,.2);
        }

        .subj-scroll::-webkit-scrollbar { width: 4px; }
        .subj-scroll::-webkit-scrollbar-track { background: transparent; }
        .subj-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,.25); border-radius: 99px; }
        .subj-scroll { scrollbar-width: thin; scrollbar-color: rgba(139,92,246,.25) transparent; }

        .subj-row { transition: background .12s; }
        .subj-row:hover { background: rgb(var(--card2)); }
      `}</style>

      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-10 space-y-4">

        {/* ── Back button ── */}
        <div className="anim-1">
          <button
            onClick={() => router.push("/sos")}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-sm font-semibold text-[rgb(var(--muted))] transition-all duration-150 hover:text-[rgb(var(--fg))] hover:border-violet-400/40 hover:-translate-y-0.5 disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>

        {/* ── Header ── */}
        <div className="anim-1 relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-[0_20px_44px_rgba(0,0,0,0.09)]">
          <div className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8  h-32 w-32 rounded-full bg-fuchsia-500/8  blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="relative flex-shrink-0 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 p-3">
              <Zap className="h-5 w-5 text-violet-500 dark:text-violet-400" />
              <span className="absolute inset-0 rounded-2xl border border-violet-400/30 live-ping pointer-events-none" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[rgb(var(--fg))] tracking-tight">Create SOS</h1>
              <p className="text-sm text-[rgb(var(--muted))] mt-0.5">
                Submit an urgent request — a tutor connects{" "}
                <span className="font-semibold text-violet-500 dark:text-violet-400">immediately.</span>
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
            </div>
          </div>
        </div>

        {/* ── Global error ── */}
        {error && (
          <div className="shake rounded-2xl border border-red-300/60 bg-red-50 dark:bg-red-950/40 dark:border-red-800/50 p-3.5 text-sm text-red-700 dark:text-red-400 flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Subject ── */}
        <div className="anim-2 field-card rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted))]">
              <BookOpen className="h-3.5 w-3.5" />
              Subject
            </label>
            {!addingSubject ? (
              <button
                type="button"
                onClick={() => setAddingSubject(true)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-violet-400/50 bg-violet-500/5 px-3 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:border-violet-500/70 hover:bg-violet-500/10 transition-colors disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
                Add subject
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelAddSubject}
                className="inline-flex items-center gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            )}
          </div>

          {/* Search input */}
          <div className={`relative flex items-center rounded-2xl border bg-[rgb(var(--card2))] transition-colors
            ${subjectId
              ? "border-violet-500/50 ring-2 ring-violet-500/15"
              : "border-[rgb(var(--border))] focus-within:border-violet-400/60 focus-within:ring-2 focus-within:ring-violet-500/15"
            }
          `}>
            <Search className="ml-3.5 h-4 w-4 flex-shrink-0 text-[rgb(var(--muted))]" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (subjectId) setSubjectId(""); // clear selection on edit
              }}
              placeholder={loading ? "Loading subjects…" : "Search or pick a subject…"}
              disabled={loading || submitting}
              className="h-11 flex-1 bg-transparent px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none disabled:opacity-60"
            />
            {/* Right side: loading spinner / selected badge / clear */}
            {loading && (
              <span className="mr-3.5 h-4 w-4 rounded-full border-2 border-violet-400 border-t-transparent spin flex-shrink-0" />
            )}
            {!loading && subjectId && selectedSubject && (
              <span className="mr-2 flex items-center gap-1.5">
                <span className="rounded-lg bg-violet-500 px-2 py-0.5 text-[11px] font-bold text-white">
                  {fmtCode(selectedSubject.code)}
                </span>
                <button
                  type="button"
                  onClick={clearSubject}
                  className="rounded-lg p-1 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
            {!loading && !subjectId && query && (
              <button
                type="button"
                onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                className="mr-3.5 rounded-lg p-0.5 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Subject list — shown when no subject locked in */}
          {showList && (
            <div
              className="expand-down mt-2 overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]"
            >
              {filtered.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3.5 text-sm text-[rgb(var(--muted))]">
                  <Search className="h-3.5 w-3.5 flex-shrink-0" />
                  No subjects match "{query}"
                </div>
              ) : (
                <ul
                  className="subj-scroll overflow-y-auto"
                  style={{ maxHeight: `${VISIBLE * ITEM_H}px` }}
                >
                  {filtered.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); pickSubject(s); }}
                        className="subj-row w-full flex items-center gap-3 px-4 text-sm text-left"
                        style={{ height: `${ITEM_H}px` }}
                      >
                        <span className="flex-shrink-0 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))] px-2 py-0.5 text-xs font-bold text-[rgb(var(--muted))] tabular-nums">
                          {fmtCode(s.code)}
                        </span>
                        <span className="flex-1 truncate font-medium text-[rgb(var(--fg))]">
                          {s.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Add-subject panel */}
          {addingSubject && (
            <div className="expand-down mt-4 rounded-2xl border border-violet-400/25 bg-violet-500/5 dark:bg-violet-500/8 p-4 space-y-3">
              <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                <Plus className="h-3 w-3" />
                New subject
              </p>
              {addError && (
                <div className="rounded-xl border border-red-300/50 bg-red-50 dark:bg-red-950/30 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {addError}
                </div>
              )}
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--muted))] mb-1.5">Code</label>
                  <input
                    type="text"
                    placeholder="CPT111"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                    disabled={addingLoading}
                    maxLength={12}
                    className="h-10 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--muted))] mb-1.5">Title</label>
                  <input
                    type="text"
                    placeholder="Data Structures"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
                    disabled={addingLoading}
                    maxLength={80}
                    className="h-10 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-60"
                  />
                </div>
              </div>
              {(newCode.trim() || newTitle.trim()) && (
                <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2">
                  <span className="text-[11px] text-[rgb(var(--muted))]">Preview:</span>
                  <span className="rounded-lg bg-violet-500/10 px-2 py-0.5 text-xs font-bold text-violet-600 dark:text-violet-400">
                    {newCode.trim().toUpperCase().replace(/([A-Za-z]+)(\d+)/, "$1 $2") || "—"}
                  </span>
                  <span className="text-sm font-medium text-[rgb(var(--fg))]">{newTitle.trim() || "—"}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddSubject}
                  disabled={!canAddSubject}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 text-xs font-semibold text-white shadow-[0_6px_18px_rgba(139,92,246,.28)] disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {addingLoading
                    ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent spin" />
                    : <Check className="h-3.5 w-3.5" />
                  }
                  {addingLoading ? "Adding…" : "Add & Select"}
                </button>
                <p className="text-[11px] text-[rgb(var(--muted2))]">Code ≥ 2 · Title ≥ 3 chars</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Mode ── */}
        <div className="anim-3 field-card rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted))] mb-3">
            How do you want help?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODES.map((m) => {
              const Icon   = m.icon;
              const active = mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  disabled={submitting}
                  className={`mode-btn relative h-14 rounded-2xl border flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-50
                    ${active
                      ? "mode-active border-violet-500/60 bg-violet-500/10 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--muted))] hover:border-violet-400/40 hover:text-[rgb(var(--fg))]"
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
                  {m.label}
                  {active && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-violet-500 border-2 border-[rgb(var(--card))]" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs text-[rgb(var(--muted))]">
            <ModeIcon className="h-3.5 w-3.5 text-violet-500 dark:text-violet-400 flex-shrink-0" />
            <span>Connected via <span className="font-bold text-[rgb(var(--fg))]">{activeMode.label}</span></span>
          </div>
        </div>

        {/* ── Description ── */}
        <div className="anim-4 field-card rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)]">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted))] mb-3">
            What do you need help with?
          </label>
          <textarea
            className="min-h-[148px] w-full resize-none rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-colors hover:border-violet-400/30 leading-relaxed disabled:opacity-60"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I'm stuck on recursion base cases in Data Structures. I've traced through a few examples but keep getting an off-by-one error…"
            disabled={submitting}
          />
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-[rgb(var(--border))] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${charProgress * 100}%`,
                  background: charProgress < 1
                    ? "linear-gradient(90deg,#7c3aed,#a855f7)"
                    : "linear-gradient(90deg,#10b981,#34d399)",
                }}
              />
            </div>
            <span className={`text-[11px] font-semibold tabular-nums transition-colors duration-200 ${charProgress >= 1 ? "text-emerald-500" : "text-[rgb(var(--muted2))]"}`}>
              {charCount} / 8
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-[rgb(var(--muted2))]">
            Tip: mention the topic + what you've already tried for faster help.
          </p>
        </div>

        {/* ── Actions ── */}
        <div className="anim-5 flex flex-wrap items-center gap-3 pb-4">
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="btn-submit inline-flex h-11 items-center gap-2 rounded-2xl px-6 text-sm font-semibold text-white"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit SOS
                <Sparkles className="h-3.5 w-3.5 opacity-80" />
              </>
            )}
          </button>
        </div>

      </div>
    </>
  );
}