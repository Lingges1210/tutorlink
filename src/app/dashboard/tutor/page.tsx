"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Star,
  Timer,
  Sparkles,
  GraduationCap,
  User,
} from "lucide-react";

type RatingSummary = {
  ok: boolean;
  avg?: number;
  count?: number;
};

type SessionsApi = {
  items: Array<{
    id: string;
    scheduledAt: string;
    endsAt: string | null;
    durationMin: number | null;
    status: string | null;
    subject?: { code?: string | null; title?: string | null } | null;
    student?: { name?: string | null; email?: string | null } | null;
  }>;
};

type AvailabilityApi = {
  success: boolean;
  availability: string | null;
  status: string | null;
};

type BoxState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "empty" }
  | { status: "error" };

function fmtLocal(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function summarizeAvailability(raw: string) {
  const dayOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
  const dayLabel: Record<string, string> = {
    MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu",
    FRI: "Fri", SAT: "Sat", SUN: "Sun",
  };

  try {
    const parsed = JSON.parse(raw);
    const rows: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.availability)
      ? parsed.availability
      : [];

    const active = rows.filter((r) => r && r.off === false);
    if (!active.length) return { headline: "No active days", detail: "You marked all days as off." };

    active.sort(
      (a, b) =>
        dayOrder.indexOf((a.day ?? "").toUpperCase()) -
        dayOrder.indexOf((b.day ?? "").toUpperCase())
    );

    const days = active
      .map((r) => dayLabel[(r.day ?? "").toUpperCase()] ?? r.day)
      .filter(Boolean);

    const ranges: string[] = [];
    let slotsCount = 0;

    for (const r of active) {
      const slots: any[] = Array.isArray(r.slots) ? r.slots : [];
      slotsCount += slots.length;
      for (const s of slots) {
        const start = typeof s?.start === "string" ? s.start : null;
        const end = typeof s?.end === "string" ? s.end : null;
        if (start && end) ranges.push(`${start}–${end}`);
      }
    }

    const uniqRanges = Array.from(new Set(ranges));
    const rangesPreview =
      uniqRanges.length > 2
        ? `${uniqRanges.slice(0, 2).join(", ")} +${uniqRanges.length - 2} more`
        : uniqRanges.join(", ");

    const daysPreview =
      days.length > 4 ? `${days.slice(0, 4).join(", ")}…` : days.join(", ");

    return {
      headline: daysPreview,
      detail: rangesPreview || `${active.length} day${active.length === 1 ? "" : "s"} set · ${slotsCount} slot${slotsCount === 1 ? "" : "s"}`,
    };
  } catch {
    const clean = raw.replace(/\s+/g, " ").trim();
    return {
      headline: "Availability set",
      detail: clean.length > 60 ? clean.slice(0, 60).trimEnd() + "…" : clean,
    };
  }
}

/* ── Pulse dot for "live" feel ── */
function LiveDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--primary)/0.5)]" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--primary))]" />
    </span>
  );
}

/* ── Skeleton ── */
function SkeletonLines() {
  return (
    <div className="space-y-2.5">
      <div className="h-5 w-32 animate-pulse rounded-lg bg-[rgb(var(--border)/0.8)]" />
      <div className="h-3 w-44 animate-pulse rounded-lg bg-[rgb(var(--border)/0.5)]" />
    </div>
  );
}

/* ── Glance Card ── */
function GlanceCard({
  href,
  title,
  icon,
  accent,
  tag,
  children,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  accent: string; // tailwind bg class for icon ring
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.6)] p-5 shadow-[0_4px_24px_rgb(var(--shadow)/0.07)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(var(--shadow)/0.14)] hover:bg-[rgb(var(--card)/0.85)] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.4)]"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[rgb(var(--border))] ${accent} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <span className="mt-0.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--muted2))]">
          {tag}
        </span>
      </div>

      {/* Title */}
      <div className="text-xs font-semibold uppercase tracking-widest text-[rgb(var(--muted2))] mb-2">
        {title}
      </div>

      {/* Content */}
      <div className="min-h-[48px]">{children}</div>

      {/* Footer */}
      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--primary))]">
        View details
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
      </div>

      {/* Hover glow */}
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-[rgb(var(--primary)/0.12)] blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Link>
  );
}

/* ── Stars visual ── */
function StarBar({ avg, max = 5 }: { avg: number; max?: number }) {
  const pct = Math.min(100, (avg / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-[rgb(var(--border))]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[rgb(var(--primary))]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-[rgb(var(--fg))]">
        {avg.toFixed(1)}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════ */
export default function TutorDashboardPage() {
  const ran = useRef({ rating: false, sessions: false, availability: false });

  const [summary, setSummary] = useState<{ avg: number; count: number } | null>(null);
  const [sessions, setSessions] = useState<BoxState<SessionsApi>>({ status: "loading" });
  const [availability, setAvailability] = useState<BoxState<AvailabilityApi>>({ status: "loading" });

  useEffect(() => {
    if (ran.current.rating) return;
    ran.current.rating = true;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/tutor/ratings/summary", { cache: "no-store" });
        const data: RatingSummary = await res.json().catch(() => ({ ok: false }));
        if (!alive) return;
        if (res.ok && data.ok && typeof data.avg === "number" && typeof data.count === "number" && data.count > 0) {
          setSummary({ avg: Math.round(data.avg * 10) / 10, count: data.count });
        } else setSummary(null);
      } catch { if (!alive) return; setSummary(null); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (ran.current.sessions) return;
    ran.current.sessions = true;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/tutor/sessions", { cache: "no-store" });
        const data: SessionsApi = await res.json().catch(() => ({ items: [] }));
        if (!alive) return;
        if (res.ok && Array.isArray(data?.items)) {
          setSessions(data.items.length ? { status: "ready", data } : { status: "empty" });
        } else setSessions({ status: "empty" });
      } catch { if (!alive) return; setSessions({ status: "error" }); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (ran.current.availability) return;
    ran.current.availability = true;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/tutor/availability", { cache: "no-store" });
        const data: AvailabilityApi = await res.json().catch(() => ({ success: false, availability: null, status: null }));
        if (!alive) return;
        if (res.ok && typeof data?.success === "boolean") {
          setAvailability({ status: "ready", data });
        } else setAvailability({ status: "empty" });
      } catch { if (!alive) return; setAvailability({ status: "error" }); }
    })();
    return () => { alive = false; };
  }, []);

  const nextSession = useMemo(() => {
    if (sessions.status !== "ready") return null;
    const now = Date.now();
    return sessions.data.items.find((s) => {
      const t = Date.parse(s.scheduledAt);
      return Number.isFinite(t) && t >= now;
    }) ?? null;
  }, [sessions]);

  return (
    <div className="space-y-5">

      {/* ── HERO HEADER ── */}
      <header className="relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.7)] p-6 shadow-[0_8px_32px_rgb(var(--shadow)/0.10)] backdrop-blur-sm">

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[rgb(var(--primary)/0.08)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 left-8 h-36 w-36 rounded-full bg-[rgb(var(--primary)/0.05)] blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          {/* Left */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] shadow-inner">
                <GraduationCap className="h-5 w-5 text-[rgb(var(--primary))]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-[rgb(var(--fg))]">
                    Tutor Dashboard
                  </h1>
                  <LiveDot />
                </div>
                <p className="text-xs text-[rgb(var(--muted))]">
                  Your sessions, schedule & ratings — all in one place.
                </p>
              </div>
            </div>

            {/* Mode switcher */}
            <div className="mt-4 inline-flex overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-xs font-semibold">
              <Link
                href="/dashboard/student"
                className="flex items-center gap-1.5 px-3.5 py-2 text-[rgb(var(--muted2))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.5)] transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                Student
              </Link>
              <Link
                href="/dashboard/tutor"
                className="flex items-center gap-1.5 border-l border-[rgb(var(--border))] bg-[rgb(var(--primary)/0.12)] px-3.5 py-2 text-[rgb(var(--primary))]"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Tutor
              </Link>
            </div>
          </div>

          {/* Rating badge */}
          {summary ? (
            <div className="flex flex-col items-end gap-1.5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 py-3 shadow-[0_4px_16px_rgb(var(--shadow)/0.07)]">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--muted2))] uppercase tracking-wider">
                <Star className="h-3.5 w-3.5 text-[rgb(var(--primary))]" />
                Your rating
              </div>
              <StarBar avg={summary.avg} />
              <div className="text-[10px] text-[rgb(var(--muted))]">
                {summary.count} review{summary.count === 1 ? "" : "s"}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-[10px] font-semibold text-[rgb(var(--muted))]">
              <Sparkles className="h-3 w-3" />
              No ratings yet
            </div>
          )}
        </div>
      </header>

      {/* ── GLANCE SECTION ── */}
      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.5)] p-5 shadow-[0_4px_20px_rgb(var(--shadow)/0.06)] backdrop-blur-sm">

        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-[rgb(var(--border))]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--muted2))]">
            Today at a Glance
          </span>
          <div className="h-px flex-1 bg-[rgb(var(--border))]" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          {/* ── Next Session ── */}
          <GlanceCard
            href="/dashboard/tutor/sessions"
            title="Next session"
            icon={<CheckCircle2 className="h-5 w-5 text-[rgb(var(--primary))]" />}
            accent="bg-[rgb(var(--primary)/0.10)]"
            tag="Upcoming"
          >
            {sessions.status === "loading" ? (
              <SkeletonLines />
            ) : sessions.status === "error" ? (
              <p className="text-xs text-[rgb(var(--muted))]">Sessions unavailable right now.</p>
            ) : !nextSession ? (
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-[rgb(var(--fg))]">All clear!</p>
                <p className="text-xs text-[rgb(var(--muted))]">No upcoming sessions yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[rgb(var(--fg))]">
                  {fmtLocal(nextSession.scheduledAt)}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))]">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--primary))]">
                    <User className="h-2.5 w-2.5" />
                  </span>
                  {nextSession.student?.name ?? "Student"}
                  <span className="text-[rgb(var(--border))]">·</span>
                  {nextSession.subject?.code ?? nextSession.subject?.title ?? "Subject"}
                </div>
              </div>
            )}
          </GlanceCard>

          {/* ── Availability ── */}
          <GlanceCard
            href="/dashboard/tutor/availability"
            title="Availability"
            icon={<Timer className="h-5 w-5 text-[rgb(var(--primary))]" />}
            accent="bg-[rgb(var(--primary)/0.10)]"
            tag="Schedule"
          >
            {availability.status === "loading" ? (
              <SkeletonLines />
            ) : availability.status === "error" ? (
              <p className="text-xs text-[rgb(var(--muted))]">Availability unavailable right now.</p>
            ) : availability.status !== "ready" ? (
              <p className="text-xs text-[rgb(var(--muted))]">Nothing yet.</p>
            ) : (() => {
              const raw = availability.data.availability?.trim() ?? "";
              const isApproved = availability.data.status === "APPROVED";

              if (!isApproved) {
                return (
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-[rgb(var(--muted2))]">
                      Pending approval
                    </p>
                    <p className="text-xs text-[rgb(var(--muted))]">
                      Available once your application is approved.
                    </p>
                  </div>
                );
              }

              if (!raw) {
                return (
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-[rgb(var(--fg))]">Not set yet</p>
                    <p className="text-xs text-[rgb(var(--muted))]">
                      Add your times so students can book you.
                    </p>
                  </div>
                );
              }

              const s = summarizeAvailability(raw);
              return (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[rgb(var(--fg))]">{s.headline}</p>
                  <p className="text-xs text-[rgb(var(--muted))]">{s.detail}</p>
                </div>
              );
            })()}
          </GlanceCard>

        </div>
      </section>
    </div>
  );
}