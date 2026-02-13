"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type SubjectItem = { id: string; code: string; title: string };
type TutorItem = { id: string; name: string | null; programme: string | null; avatarUrl: string | null };

function PrimaryButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="
        inline-flex items-center justify-center
        rounded-md px-3 py-2 text-xs font-semibold text-white
        bg-[rgb(var(--primary))]
        transition-all duration-200
        hover:-translate-y-0.5
        hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]
      "
    >
      {children}
    </Link>
  );
}

function DisabledButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      disabled
      type="button"
      className="
        inline-flex items-center justify-center
        cursor-not-allowed rounded-md px-3 py-2 text-xs font-semibold
        border border-[rgb(var(--border))]
        bg-[rgb(var(--card2))]
        text-[rgb(var(--muted2))]
        opacity-70
      "
    >
      {children}
    </button>
  );
}

function formatLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function FindTutorClient({ authed, verified }: { authed: boolean; verified: boolean }) {
  const canUse = authed && verified;

  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<SubjectItem[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  const [selected, setSelected] = useState<SubjectItem | null>(null);

  const [tutors, setTutors] = useState<TutorItem[]>([]);
  const [loadingTutors, setLoadingTutors] = useState(false);

  const [bookingTutor, setBookingTutor] = useState<TutorItem | null>(null);
  const [scheduledAt, setScheduledAt] = useState(() => formatLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [durationMin, setDurationMin] = useState(60);
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const debounceRef = useRef<number | null>(null);

  // suggestions (debounced)
  useEffect(() => {
    if (!canUse) return;
    const term = q.trim();
    if (!term) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setLoadingSuggest(true);
      try {
        const res = await fetch(`/api/subjects/suggest?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data.items) ? data.items : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggest(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q, canUse]);

  async function loadTutors(subject: SubjectItem) {
    setSelected(subject);
    setSuggestions([]);
    setTutors([]);
    setBookingMsg(null);

    setLoadingTutors(true);
    try {
      const res = await fetch(`/api/tutors/match?subjectId=${encodeURIComponent(subject.id)}`);
      const data = await res.json();
      setTutors(Array.isArray(data.items) ? data.items : []);
    } catch {
      setTutors([]);
    } finally {
      setLoadingTutors(false);
    }
  }

  async function requestSession() {
    if (!selected || !bookingTutor) return;

    setBookingLoading(true);
    setBookingMsg(null);

    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: bookingTutor.id,
          subjectId: selected.id,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMin,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setBookingMsg(data?.message ?? "Failed to request session.");
        return;
      }

      setBookingMsg("✅ Session requested! Check My Bookings for status.");
      setBookingTutor(null);
    } catch {
      setBookingMsg("Failed to request session.");
    } finally {
      setBookingLoading(false);
    }
  }

  const headerBadge = useMemo(() => {
    if (!authed) {
      return <PrimaryButtonLink href="/auth/login">Login to search</PrimaryButtonLink>;
    }
    if (!verified) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          ⏳ Pending verification
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border border-emerald-500/30 bg-emerald-500/15 text-emerald-500">
        ✅ Verified
      </span>
    );
  }, [authed, verified]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="
          rounded-3xl border p-6
          border-[rgb(var(--border))]
          bg-[rgb(var(--card) / 0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]
        "
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">Find a Tutor</h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))] max-w-2xl">
              Search by subject/course, view matching tutors, then request a session.
            </p>
            {!authed && (
              <p className="mt-2 text-xs text-[rgb(var(--muted2))]">
                You can view this page, but searching and booking require login + verification.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">{headerBadge}</div>
        </div>
      </div>

      {/* locked banner */}
      {authed && !verified && (
        <div className="rounded-3xl border p-5 border-amber-500/30 bg-amber-500/10 text-[rgb(var(--fg))]">
          <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            ⚠️ Search is locked until verification
          </div>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Once verified, you can search subjects and request sessions.
          </p>
        </div>
      )}

      {/* Search */}
      <section
        className="
          rounded-3xl border p-5
          border-[rgb(var(--border))]
          bg-[rgb(var(--card) / 0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]
        "
      >
        <div className="relative">
          <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
            Search Subject / Course
          </label>

          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSelected(null);
              setTutors([]);
              setBookingMsg(null);
            }}
            disabled={!canUse}
            placeholder="e.g. WIA2003, Data Structures"
            className={[
              "w-full rounded-md border px-3 py-2 text-sm outline-none transition",
              "border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))]",
              "focus:border-[rgb(var(--primary))]",
              canUse ? "" : "opacity-60 cursor-not-allowed",
            ].join(" ")}
          />

          <div className="mt-2 flex gap-2">
            {!authed ? (
              <PrimaryButtonLink href="/auth/login">Login</PrimaryButtonLink>
            ) : !verified ? (
              <DisabledButton>Search Locked</DisabledButton>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setSelected(null);
                  setSuggestions([]);
                  setTutors([]);
                  setBookingMsg(null);
                }}
                className="
                  rounded-md px-3 py-2 text-xs font-semibold
                  border border-[rgb(var(--border))]
                  bg-[rgb(var(--card2))]
                  text-[rgb(var(--fg))]
                  hover:bg-[rgb(var(--card)/0.6)]
                "
              >
                Clear
              </button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {canUse && (loadingSuggest || suggestions.length > 0) && (
            <div
              className="
                absolute z-20 mt-2 w-full overflow-hidden
                rounded-2xl border border-[rgb(var(--border))]
                bg-[rgb(var(--card2))]
                shadow-[0_20px_60px_rgb(var(--shadow)/0.18)]
              "
            >
              {loadingSuggest && (
                <div className="px-3 py-3 text-xs text-[rgb(var(--muted2))]">Searching…</div>
              )}

              {!loadingSuggest && suggestions.length === 0 && (
                <div className="px-3 py-3 text-xs text-[rgb(var(--muted2))]">No matches</div>
              )}

              {!loadingSuggest &&
                suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadTutors(s)}
                    className="
                      w-full text-left px-3 py-3
                      hover:bg-[rgb(var(--card)/0.6)]
                      border-b border-[rgb(var(--border))]
                      last:border-b-0
                    "
                  >
                    <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                      {s.code} — {s.title}
                    </div>
                    <div className="text-[0.7rem] text-[rgb(var(--muted2))]">Click to see tutors</div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* Selected subject + tutors */}
      {selected && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                {selected.code} {selected.title}
              </div>
              <div className="text-xs text-[rgb(var(--muted2))]">Matching tutors</div>
            </div>

            <Link href="/dashboard/student/sessions" className="text-xs font-medium text-[rgb(var(--primary))] hover:underline">
              My Bookings →
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {loadingTutors ? (
              <div className="text-xs text-[rgb(var(--muted2))]">Loading tutors…</div>
            ) : tutors.length === 0 ? (
              <div className="text-xs text-[rgb(var(--muted2))]">No approved tutors found for this subject yet.</div>
            ) : (
              tutors.map((t) => (
                <div
                  key={t.id}
                  className="
                    flex flex-col rounded-3xl border p-5
                    border-[rgb(var(--border))]
                    bg-[rgb(var(--card) / 0.7)]
                    shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]
                  "
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="
                        h-10 w-10 shrink-0 overflow-hidden rounded-xl
                        border border-[rgb(var(--border))]
                        bg-[rgb(var(--card2))]
                      "
                    >
                      {t.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-xs text-[rgb(var(--muted2))]">
                          👤
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[rgb(var(--fg))] truncate">
                        {t.name ?? "Tutor"}
                      </div>
                      <div className="text-[0.7rem] text-[rgb(var(--muted))] truncate">
                        {t.programme ?? "Programme not set"}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setBookingTutor(t);
                      setBookingMsg(null);
                    }}
                    className="
                      mt-4 w-full rounded-md px-3 py-2 text-xs font-semibold text-white
                      bg-[rgb(var(--primary))]
                      transition-all duration-200
                      hover:-translate-y-0.5
                      hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]
                    "
                  >
                    Request Session
                  </button>
                </div>
              ))
            )}
          </div>

          {bookingMsg && (
            <div
              className="
                rounded-2xl border p-4
                border-[rgb(var(--border))]
                bg-[rgb(var(--card) / 0.7)]
                text-sm text-[rgb(var(--fg))]
              "
            >
              {bookingMsg}
            </div>
          )}
        </section>
      )}

      {/* Booking modal */}
      {bookingTutor && (
        <div
          className="
            fixed inset-0 z-50 grid place-items-center
            bg-black/40 p-4
          "
          onMouseDown={() => setBookingTutor(null)}
        >
          <div
            className="
              w-full max-w-md rounded-3xl border p-5
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2))]
              shadow-[0_30px_120px_rgb(var(--shadow)/0.35)]
            "
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              Request session with {bookingTutor.name ?? "Tutor"}
            </div>
            <div className="mt-1 text-xs text-[rgb(var(--muted2))]">
              {selected?.code} — {selected?.title}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
                  Date & time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="
                    w-full rounded-md border px-3 py-2 text-sm outline-none
                    border-[rgb(var(--border))]
                    bg-[rgb(var(--card))]
                    text-[rgb(var(--fg))]
                    focus:border-[rgb(var(--primary))]
                  "
                />
              </div>

              <div>
                <label className="block text-[0.7rem] font-medium text-[rgb(var(--muted2))] mb-1">
                  Duration (minutes)
                </label>
                <select
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                  className="
                    w-full rounded-md border px-3 py-2 text-sm outline-none
                    border-[rgb(var(--border))]
                    bg-[rgb(var(--card))]
                    text-[rgb(var(--fg))]
                    focus:border-[rgb(var(--primary))]
                  "
                >
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                  <option value={60}>60</option>
                  <option value={90}>90</option>
                  <option value={120}>120</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setBookingTutor(null)}
                className="
                  flex-1 rounded-md px-3 py-2 text-xs font-semibold
                  border border-[rgb(var(--border))]
                  bg-[rgb(var(--card))]
                  text-[rgb(var(--fg))]
                  hover:bg-[rgb(var(--card)/0.6)]
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={requestSession}
                disabled={bookingLoading}
                className={[
                  "flex-1 rounded-md px-3 py-2 text-xs font-semibold text-white",
                  "bg-[rgb(var(--primary))] transition-all duration-200",
                  bookingLoading ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]",
                ].join(" ")}
              >
                {bookingLoading ? "Requesting…" : "Request"}
              </button>
            </div>

            <p className="mt-3 text-[0.7rem] text-[rgb(var(--muted2))]">
              After requesting, check <span className="font-medium">My Bookings</span> for status updates.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
