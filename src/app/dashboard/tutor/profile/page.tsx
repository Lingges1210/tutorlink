"use client";

// src/app/dashboard/tutor/profile/page.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Star, Plus, Trash2, BookOpen,
  TrendingUp, Calendar, Award, Sparkles, ChevronRight,
} from "lucide-react";

type Subject = { id: string; code: string; title: string };
type ProfileResp = {
  ok: boolean;
  tutor?: {
    id: string; name: string | null; email: string; programme: string | null;
    avatarUrl: string | null; createdAt: string;
    avgRating: number; ratingCount: number; subjects: Subject[];
  };
  stats?: { completedCount: number; upcomingCount: number; joinedSince: string };
  reviews?: {
    id: string; rating: number; comment: string | null;
    createdAt: string; student: { name: string | null };
  }[];
};
type SubjectsResp = { ok: boolean; subjects: Subject[] };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function StarsRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
        <Star key={n} size={size}
          className={value >= n
            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.5)]"
            : "text-[rgb(var(--muted2))] opacity-25"} />
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, blobCls, iconBg, iconCls }: {
  icon: React.ElementType; label: string; value: string | number;
  blobCls: string; iconBg: string; iconCls: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgb(var(--shadow)/0.14)]">
      <div className={`pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20 ${blobCls}`} />
      <div className={`mb-3 inline-flex rounded-xl p-2 ${iconBg}`}>
        <Icon size={15} className={iconCls} />
      </div>
      <div className="text-[0.62rem] uppercase tracking-widest text-[rgb(var(--muted2))]">{label}</div>
      <div className="mt-1 text-xl font-bold tracking-tight text-[rgb(var(--fg))]">{value}</div>
    </div>
  );
}

const SUBJECT_GRADIENTS = [
  "from-violet-500/10 to-purple-500/10 border-violet-500/20",
  "from-blue-500/10  to-cyan-500/10  border-blue-500/20",
  "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
  "from-amber-500/10 to-orange-500/10 border-amber-500/20",
  "from-rose-500/10  to-pink-500/10  border-rose-500/20",
];

function SubjectPill({ subject, onRemove, saving }: { subject: Subject; onRemove: () => void; saving: boolean }) {
  const g = SUBJECT_GRADIENTS[subject.code.charCodeAt(0) % SUBJECT_GRADIENTS.length];
  return (
    <div className={`group flex items-center justify-between gap-3 rounded-2xl border bg-gradient-to-r ${g} px-4 py-3 transition-all duration-200 hover:-translate-y-px hover:shadow-[0_4px_16px_rgb(var(--shadow)/0.10)]`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--card))] shadow-sm">
          <BookOpen size={13} className="text-[rgb(var(--primary))]" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold tracking-wide text-[rgb(var(--fg))]">{subject.code}</div>
          <div className="truncate text-[0.72rem] text-[rgb(var(--muted2))]">{subject.title}</div>
        </div>
      </div>
      <button onClick={onRemove} disabled={saving} title="Remove subject"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted2))] opacity-0 transition-all group-hover:opacity-100 hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export default function TutorProfilePage() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);
  const [profile, setProfile]   = useState<ProfileResp | null>(null);
  const [allSubjects, setAll]   = useState<Subject[]>([]);
  const [selId, setSelId]       = useState("");
  const [customCode, setCode]   = useState("");
  const [customTitle, setTitle] = useState("");

  async function loadAll() {
    setLoading(true); setMsg(null);
    try {
      const [p, s] = await Promise.all([
        fetch("/api/tutor/profile", { cache: "no-store" }),
        fetch("/api/subjects",      { cache: "no-store" }),
      ]);
      const pj: ProfileResp  = await p.json().catch(() => ({ ok: false }));
      const sj: SubjectsResp = await s.json().catch(() => ({ ok: false, subjects: [] }));
      setProfile(pj);
      setAll(Array.isArray(sj.subjects) ? sj.subjects : []);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);

  const mySubjects   = profile?.tutor?.subjects ?? [];
  const availableAdd = useMemo(() => {
    const set = new Set(mySubjects.map((x) => x.id));
    return allSubjects.filter((x) => !set.has(x.id));
  }, [allSubjects, mySubjects]);

  async function addSubject() {
    if (!selId) return;
    setSaving(true); setMsg(null);
    try {
      const res  = await fetch("/api/tutor/subjects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjectId: selId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ text: data?.message ?? "Failed.", ok: false }); return; }
      setSelId(""); await loadAll(); setMsg({ text: "Subject added!", ok: true });
    } finally { setSaving(false); }
  }

  async function addCustomSubject() {
    const code = customCode.trim(), title = customTitle.trim();
    if (!code || !title) { setMsg({ text: "Enter both code and title.", ok: false }); return; }
    setSaving(true); setMsg(null);
    try {
      const res  = await fetch("/api/tutor/subjects/custom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, title }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ text: data?.message ?? "Failed.", ok: false }); return; }
      setCode(""); setTitle(""); await loadAll(); setMsg({ text: "Custom subject added!", ok: true });
    } finally { setSaving(false); }
  }

  async function removeSubject(subjectId: string) {
    setSaving(true); setMsg(null);
    try {
      const res  = await fetch("/api/tutor/subjects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subjectId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ text: data?.message ?? "Failed.", ok: false }); return; }
      await loadAll(); setMsg({ text: "Subject removed.", ok: true });
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-[rgb(var(--border))] border-t-[rgb(var(--primary))]" />
          </div>
          <p className="text-xs text-[rgb(var(--muted2))]">Loading your profile…</p>
        </div>
      </div>
    );
  }

  const tutor = profile?.tutor, stats = profile?.stats, reviews = profile?.reviews ?? [];

  return (
    <div className="space-y-5">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-6 shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]">
        <div className="pointer-events-none absolute -top-14 -right-14 h-52 w-52 rounded-full bg-[rgb(var(--primary))] opacity-[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-violet-500 opacity-[0.05] blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[rgb(var(--primary))] to-violet-500 text-lg font-bold text-white shadow-lg">
                {tutor?.name?.[0]?.toUpperCase() ?? "T"}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 shadow-sm ring-2 ring-[rgb(var(--card))]">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--fg))]">
                  {tutor?.name ?? "Tutor Profile"}
                </h1>
                {tutor && tutor.ratingCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[0.65rem] font-bold text-amber-500 ring-1 ring-amber-400/20">
                    <Star size={9} className="fill-amber-400 text-amber-400" />
                    {tutor.avgRating.toFixed(1)}
                  </span>
                )}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-[rgb(var(--muted))]">
                {tutor?.email}
                {tutor?.programme && (
                  <span className="rounded-md bg-[rgb(var(--card2))] px-2 py-0.5 text-xs text-[rgb(var(--muted2))]">
                    {tutor.programme}
                  </span>
                )}
              </p>
            </div>
          </div>

          {tutor && tutor.ratingCount > 0 && (
            <div className="flex flex-col items-end gap-1.5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 shadow-sm">
              <StarsRow value={tutor.avgRating} size={16} />
              <div className="text-[0.7rem] text-[rgb(var(--muted2))]">
                {tutor.ratingCount} review{tutor.ratingCount !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STATS ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard icon={TrendingUp} label="Sessions completed" value={stats.completedCount}       blobCls="bg-violet-500"  iconBg="bg-violet-500/10"  iconCls="text-violet-500"  />
          <StatCard icon={Calendar}   label="Upcoming sessions"  value={stats.upcomingCount}        blobCls="bg-blue-500"    iconBg="bg-blue-500/10"    iconCls="text-blue-500"   />
          <StatCard icon={Award}      label="Joined since"       value={fmtDate(stats.joinedSince)} blobCls="bg-emerald-500" iconBg="bg-emerald-500/10" iconCls="text-emerald-500" />
        </div>
      )}

      {/* ── SUBJECTS + ADD ── */}
      <div className="grid gap-4 md:grid-cols-[1fr_340px] md:items-start">

        {/* Subjects list */}
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[rgb(var(--primary))/0.1]">
              <BookOpen size={13} className="text-[rgb(var(--primary))]" />
            </div>
            <h2 className="text-sm font-bold text-[rgb(var(--fg))]">Subjects I Teach</h2>
            {mySubjects.length > 0 && (
              <span className="rounded-full bg-[rgb(var(--primary))/0.1] px-2 py-0.5 text-[0.65rem] font-bold text-[rgb(var(--primary))]">
                {mySubjects.length}
              </span>
            )}
          </div>

          {msg && (
            <div className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium ${msg.ok ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20" : "bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20"}`}>
              {msg.ok ? "✓" : "⚠"} {msg.text}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {mySubjects.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[rgb(var(--border))] py-10 text-center">
                <BookOpen size={28} className="text-[rgb(var(--muted2))] opacity-30" />
                <p className="text-xs font-medium text-[rgb(var(--muted2))]">No subjects added yet</p>
                <p className="text-[0.7rem] text-[rgb(var(--muted2))] opacity-60">Add at least one so students can find you</p>
              </div>
            ) : (
              mySubjects.map((s) => (
                <SubjectPill key={s.id} subject={s} onRemove={() => removeSubject(s.id)} saving={saving} />
              ))
            )}
          </div>
        </div>

        {/* Add panels */}
        <div className="space-y-3">

          {/* Quick add */}
          <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/10">
                <Plus size={13} className="text-blue-500" />
              </div>
              <h2 className="text-sm font-bold text-[rgb(var(--fg))]">Quick Add</h2>
            </div>
            <div className="flex gap-2">
              <select value={selId} onChange={(e) => setSelId(e.target.value)}
                disabled={saving || availableAdd.length === 0}
                className="h-9 flex-1 min-w-0 rounded-xl border px-3 text-xs outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] transition-all focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary))/0.15] disabled:opacity-50">
                <option value="">{availableAdd.length === 0 ? "All subjects added" : "Choose subject…"}</option>
                {availableAdd.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.title}</option>)}
              </select>
              <button onClick={addSubject} disabled={saving || !selId}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[rgb(var(--primary))] px-4 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-95 disabled:opacity-50">
                <Plus size={13} /> Add
              </button>
            </div>
          </div>

          {/* Custom subject */}
          <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-500/10">
                  <Sparkles size={13} className="text-violet-500" />
                </div>
                <h2 className="text-sm font-bold text-[rgb(var(--fg))]">New Subject</h2>
              </div>
              <span className="text-[0.65rem] text-[rgb(var(--muted2))]">Code auto-standardized</span>
            </div>
            <p className="mb-4 text-[0.72rem] text-[rgb(var(--muted2))]">Can't find yours? Add a custom one.</p>
            <div className="space-y-2">
              <input value={customCode} onChange={(e) => setCode(e.target.value)}
                placeholder="Subject code (e.g. CPT112)" disabled={saving}
                className="h-9 w-full rounded-xl border px-3 text-xs outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] transition-all focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary))/0.15] disabled:opacity-50" />
              <input value={customTitle} onChange={(e) => setTitle(e.target.value)}
                placeholder="Subject title (e.g. Discrete Structures)" disabled={saving}
                className="h-9 w-full rounded-xl border px-3 text-xs outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] transition-all focus:border-[rgb(var(--primary))] focus:ring-2 focus:ring-[rgb(var(--primary))/0.15] disabled:opacity-50" />
              <button onClick={addCustomSubject} disabled={saving || !customCode.trim() || !customTitle.trim()}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[rgb(var(--primary))] to-violet-500 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md active:scale-[0.99] disabled:opacity-50">
                <Sparkles size={12} /> Add custom subject
              </button>
            </div>
            <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-[rgb(var(--card2))] px-3 py-2">
              <ChevronRight size={11} className="shrink-0 text-[rgb(var(--muted2))]" />
              <span className="text-[0.68rem] text-[rgb(var(--muted2))]">
                e.g. <span className="font-semibold text-[rgb(var(--fg))]">CPT112</span> — Discrete Structures
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── REVIEWS ── */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400/10">
              <Star size={13} className="text-amber-500" />
            </div>
            <h2 className="text-sm font-bold text-[rgb(var(--fg))]">Recent Reviews</h2>
          </div>
          <span className="rounded-full bg-[rgb(var(--card2))] px-2.5 py-1 text-[0.65rem] text-[rgb(var(--muted2))]">Last 3</span>
        </div>

        <div className="mt-4 space-y-3">
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[rgb(var(--border))] py-10 text-center">
              <Star size={28} className="text-[rgb(var(--muted2))] opacity-25" />
              <p className="text-xs text-[rgb(var(--muted2))]">No reviews yet</p>
              <p className="text-[0.7rem] text-[rgb(var(--muted2))] opacity-60">Complete sessions to start receiving feedback</p>
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id}
                className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-5 py-4 transition-all duration-300 hover:-translate-y-px hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.12)]">
                <div className="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full bg-amber-400 opacity-0 blur-2xl transition-opacity group-hover:opacity-[0.04]" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[rgb(var(--primary))/0.15] to-violet-500/10 text-xs font-bold text-[rgb(var(--primary))]">
                      {r.student?.name?.[0]?.toUpperCase() ?? "S"}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[rgb(var(--fg))]">{r.student?.name ?? "Student"}</div>
                      <div className="mt-0.5 text-[0.68rem] text-[rgb(var(--muted2))]">{fmtDate(r.createdAt)}</div>
                    </div>
                  </div>
                  <StarsRow value={r.rating} />
                </div>
                <div className="mt-3 border-t border-[rgb(var(--border))] pt-3">
                  {r.comment?.trim()
                    ? <p className="text-xs leading-relaxed text-[rgb(var(--muted))]">"{r.comment}"</p>
                    : <p className="text-xs italic text-[rgb(var(--muted2))] opacity-50">No comment provided.</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}