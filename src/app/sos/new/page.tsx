"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  Send,
  Sparkles,
  MessageCircle,
  Mic,
  Video,
  MapPin,
} from "lucide-react";

type Subject = { id: string; code: string; title: string };

const MODES = [
  { value: "CHAT", label: "Chat", icon: MessageCircle },
  { value: "VOICE", label: "Voice", icon: Mic },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "IN_PERSON", label: "In-person", icon: MapPin },
];

export default function SOSNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [mode, setMode] = useState("CHAT");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/subjects", { cache: "no-store" });
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
    return () => {
      mounted = false;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return subjectId && description.trim().length >= 8 && !submitting;
  }, [subjectId, description, submitting]);

  async function onSubmit() {
    setError(null);
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId, mode, description }),
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

  const modeIcon = MODES.find((m) => m.value === mode)?.icon ?? MessageCircle;
  const ModeIcon = modeIcon;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 space-y-6">
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl border border-[rgb(var(--border))] p-2 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
            <Sparkles className="h-5 w-5 text-[rgb(var(--fg))]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Create SOS</h1>
            <p className="text-sm text-[rgb(var(--muted))]">
              Submit an urgent request. A tutor can accept and you’ll be connected immediately.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Subject */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
            <label className="text-sm font-semibold flex items-center gap-2 text-[rgb(var(--fg))]">
              <BookOpen className="h-4 w-4" />
              Subject
            </label>

            <select
              className="mt-2 h-11 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 text-[rgb(var(--fg))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))/0.35]"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={loading || submitting}
            >
              <option value="">{loading ? "Loading..." : "Select subject"}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Mode */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
            <label className="text-sm font-semibold text-[rgb(var(--fg))]">Mode</label>

            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                const active = mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    disabled={submitting}
                    className={`h-11 rounded-xl border px-3 inline-flex items-center justify-center gap-2 text-xs font-semibold transition
                      ${
                        active
                          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))/0.10] text-[rgb(var(--primary))]"
                          : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.25]"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 text-xs text-[rgb(var(--muted2))] inline-flex items-center gap-2">
              <ModeIcon className="h-4 w-4" />
              Selected: <span className="text-[rgb(var(--fg))] font-semibold">{mode}</span>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] p-4">
            <label className="text-sm font-semibold text-[rgb(var(--fg))]">
              Brief description
            </label>

            <textarea
              className="mt-2 min-h-[140px] w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted2))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))/0.35]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: I’m stuck on recursion base cases for Data Structures. Need a quick explanation + example."
              disabled={submitting}
            />

            <div className="mt-2 flex items-center justify-between text-xs text-[rgb(var(--muted2))]">
              <span>Tip: include topic + what you’ve tried. (min 8 characters)</span>
              <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-1">
                {description.trim().length}/8
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,58,237,0.35)] disabled:opacity-50 hover:opacity-95"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit SOS"}
            </button>

            <button
              onClick={() => router.push("/sos")}
              className="h-11 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-5 text-xs font-semibold text-[rgb(var(--fg))] hover:ring-1 hover:ring-[rgb(var(--primary))/0.25]"
              disabled={submitting}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}