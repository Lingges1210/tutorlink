"use client";

// src/app/dashboard/tutor/profile/page.tsx
import { useEffect, useMemo, useState } from "react";
import { Star, Plus, Trash2 } from "lucide-react";

type Subject = { id: string; code: string; title: string };

type ProfileResp = {
  ok: boolean;
  tutor?: {
    id: string;
    name: string | null;
    email: string;
    programme: string | null;
    avatarUrl: string | null;
    createdAt: string;
    avgRating: number;
    ratingCount: number;
    subjects: Subject[];
  };
  stats?: {
    completedCount: number;
    upcomingCount: number;
    joinedSince: string;
  };
  reviews?: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    student: { name: string | null };
  }[];
};

type SubjectsResp = { ok: boolean; subjects: Subject[] };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StarsRow({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => {
        const on = value >= n;
        return (
          <Star
            key={n}
            size={14}
            className={
              on ? "fill-amber-400 text-amber-400" : "text-[rgb(var(--muted2))]"
            }
          />
        );
      })}
    </div>
  );
}

export default function TutorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileResp | null>(null);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  // custom subject inputs
  const [customCode, setCustomCode] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  async function loadAll() {
    setLoading(true);
    setMsg(null);
    try {
      const [p, s] = await Promise.all([
        fetch("/api/tutor/profile", { cache: "no-store" }),
        fetch("/api/subjects", { cache: "no-store" }),
      ]);

      const pj: ProfileResp = await p.json().catch(() => ({ ok: false }));
      const sj: SubjectsResp = await s
        .json()
        .catch(() => ({ ok: false, subjects: [] }));

      setProfile(pj);
      setAllSubjects(Array.isArray(sj.subjects) ? sj.subjects : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const mySubjects = profile?.tutor?.subjects ?? [];

  const availableToAdd = useMemo(() => {
    const set = new Set(mySubjects.map((x) => x.id));
    return allSubjects.filter((x) => !set.has(x.id));
  }, [allSubjects, mySubjects]);

  async function addSubject() {
    if (!selectedSubjectId) return;
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/tutor/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId: selectedSubjectId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.message ?? "Failed to add subject.");
        return;
      }

      setSelectedSubjectId("");
      await loadAll();
      setMsg("Subject added.");
    } finally {
      setSaving(false);
    }
  }

  async function addCustomSubject() {
    const code = customCode.trim();
    const title = customTitle.trim();

    if (!code || !title) {
      setMsg("Please enter both subject code and title.");
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/tutor/subjects/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, title }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(data?.message ?? "Failed to add subject.");
        return;
      }

      setCustomCode("");
      setCustomTitle("");
      await loadAll();
      setMsg("Subject added.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSubject(subjectId: string) {
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/tutor/subjects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.message ?? "Failed to remove subject.");
        return;
      }

      await loadAll();
      setMsg("Subject removed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-[rgb(var(--muted2))]">Loading…</div>;
  }

  const tutor = profile?.tutor;
  const stats = profile?.stats;
  const reviews = profile?.reviews ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border p-6 border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
              Tutor Profile
            </h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Manage your teaching subjects and see your performance summary.
            </p>
          </div>

          {/* Rating pill */}
          {tutor && tutor.ratingCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2.5 py-1 transition-all hover:shadow-[0_6px_18px_rgb(var(--shadow)/0.12)]">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                {tutor.avgRating.toFixed(1)}
                <span className="ml-1 text-[rgb(var(--muted2))]">
                  ({tutor.ratingCount} rating
                  {tutor.ratingCount === 1 ? "" : "s"})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/*  Top section: Subjects stretches, Stats fixed at right */}
      <div className="grid gap-4 md:grid-cols-[1fr_360px] md:items-start">
        {/* Subjects (stretch) */}
        <div className="min-w-0 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
              Subjects I Teach
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={saving || availableToAdd.length === 0}
                className="h-9 rounded-md border px-2 text-xs outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))]"
              >
                <option value="">
                  {availableToAdd.length === 0
                    ? "All subjects added"
                    : "Select subject…"}
                </option>
                {availableToAdd.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} {s.title}
                  </option>
                ))}
              </select>

              <button
                onClick={addSubject}
                disabled={saving || !selectedSubjectId}
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-white bg-[rgb(var(--primary))] disabled:opacity-60"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          </div>

          {msg && (
            <div className="mt-3 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">
              {msg}
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[0.75rem] font-semibold text-[rgb(var(--fg))]">
                Add a new subject
              </div>

              <div className="text-[0.7rem] text-[rgb(var(--muted2))]">
                Code will be standardized
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <input
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="Code (e.g. CPT112)"
                disabled={saving}
                className="h-9 rounded-md border px-3 text-xs outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] disabled:opacity-60"
              />

              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Title (e.g. Discrete Structures)"
                disabled={saving}
                className="h-9 rounded-md border px-3 text-xs outline-none border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] disabled:opacity-60 md:col-span-2"
              />

              <button
                onClick={addCustomSubject}
                disabled={saving || !customCode.trim() || !customTitle.trim()}
                className="h-9 rounded-md px-3 text-xs font-semibold text-white bg-[rgb(var(--primary))] hover:opacity-95 disabled:opacity-60 md:col-span-3"
              >
                Add subject
              </button>
            </div>

            <div className="mt-2 text-[0.7rem] text-[rgb(var(--muted2))]">
              Example:{" "}
              <span className="font-medium text-[rgb(var(--fg))]">CPT112</span>{" "}
              — Discrete Structures
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {mySubjects.length === 0 ? (
              <div className="text-xs text-[rgb(var(--muted2))]">
                No subjects added yet. Add at least 1 so students can find you.
              </div>
            ) : (
              mySubjects.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 transition-all hover:bg-[rgb(var(--card)/0.6)]"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                      {s.code}
                    </div>
                    <div className="text-[0.75rem] text-[rgb(var(--muted2))] truncate">
                      {s.title}
                    </div>
                  </div>

                  <button
                    onClick={() => removeSubject(s.id)}
                    disabled={saving}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)] disabled:opacity-60"
                    title="Remove subject"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stats (fixed right) */}
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-5">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Stats</h2>

          {!stats ? (
            <div className="mt-3 text-xs text-[rgb(var(--muted2))]">
              Stats unavailable.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
                <div className="text-[0.65rem] uppercase tracking-wide text-[rgb(var(--muted2))]">
                  Total sessions
                </div>
                <div className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">
                  {stats.completedCount}
                </div>
              </div>

              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
                <div className="text-[0.65rem] uppercase tracking-wide text-[rgb(var(--muted2))]">
                  Upcoming sessions
                </div>
                <div className="mt-1 text-base font-semibold text-[rgb(var(--fg))]">
                  {stats.upcomingCount}
                </div>
              </div>

              <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3">
                <div className="text-[0.65rem] uppercase tracking-wide text-[rgb(var(--muted2))]">
                  Joined since
                </div>
                <div className="mt-1 text-sm font-semibold text-[rgb(var(--fg))]">
                  {fmtDate(stats.joinedSince)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
            Recent Reviews
          </h2>
          <div className="text-xs text-[rgb(var(--muted2))]">
            Showing last 3
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {reviews.length === 0 ? (
            <div className="text-xs text-[rgb(var(--muted2))]">
              No reviews yet.
            </div>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-5 py-4 transition-all hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.12)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                      {r.student?.name ?? "Student"}
                    </div>
                    <div className="mt-0.5 text-[0.7rem] text-[rgb(var(--muted2))]">
                      {fmtDate(r.createdAt)}
                    </div>
                  </div>

                  <StarsRow value={r.rating} />
                </div>

                <div className="mt-3 text-xs text-[rgb(var(--muted))]">
                  {r.comment?.trim() ? r.comment : "No comment provided."}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}