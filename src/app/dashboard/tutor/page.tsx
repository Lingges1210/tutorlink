"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Star,
  Timer,
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
  status: string | null; // tutorApplication status (APPROVED, etc)
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

/** ✅ NEW: turn stored availability JSON into a short, human summary */
function summarizeAvailability(raw: string) {
  const dayOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
  const dayLabel: Record<string, string> = {
    MON: "Mon",
    TUE: "Tue",
    WED: "Wed",
    THU: "Thu",
    FRI: "Fri",
    SAT: "Sat",
    SUN: "Sun",
  };

  try {
    const parsed = JSON.parse(raw);

    // supports both: [{ day, off, slots }] OR { availability: [...] }
    const rows: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.availability)
      ? parsed.availability
      : [];

    const active = rows.filter((r) => r && r.off === false);
    if (!active.length) {
      return {
        headline: "No active days",
        detail: "You marked all days as off.",
      };
    }

    // sort days nicely
    active.sort(
      (a, b) =>
        dayOrder.indexOf((a.day ?? "").toUpperCase()) -
        dayOrder.indexOf((b.day ?? "").toUpperCase())
    );

    const days = active
      .map((r) => dayLabel[(r.day ?? "").toUpperCase()] ?? r.day)
      .filter(Boolean);

    // collect time ranges
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

    // unique, keep it short
    const uniqRanges = Array.from(new Set(ranges));
    const rangesPreview =
      uniqRanges.length > 2
        ? `${uniqRanges.slice(0, 2).join(", ")} +${uniqRanges.length - 2} more`
        : uniqRanges.join(", ");

    const daysPreview =
      days.length > 4 ? `${days.slice(0, 4).join(", ")}…` : days.join(", ");

    return {
      headline: `${daysPreview}`,
      detail: rangesPreview
        ? rangesPreview
        : `${active.length} day${active.length === 1 ? "" : "s"} set • ${slotsCount} slot${
            slotsCount === 1 ? "" : "s"
          }`,
    };
  } catch {
    // fallback if not JSON
    const clean = raw.replace(/\s+/g, " ").trim();
    return {
      headline: "Availability set",
      detail: clean.length > 60 ? clean.slice(0, 60).trimEnd() + "…" : clean,
    };
  }
}

function GlanceCard({
  href,
  title,
  icon,
  tag = "Today",
  children,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  tag?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "group relative overflow-hidden rounded-3xl border border-[rgb(var(--border))]",
        "bg-[rgb(var(--card)/0.7)] p-5 shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]",
        "transition hover:-translate-y-0.5 hover:bg-[rgb(var(--card)/0.85)]",
        "focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary)/0.35)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))]">
              {icon}
            </span>
            <div className="text-sm font-semibold text-[rgb(var(--fg))]">
              {title}
            </div>
          </div>

          <div className="mt-3">{children}</div>

          <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[rgb(var(--primary))]">
            Open{" "}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </div>
        </div>

        <div className="mt-0.5 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-1 text-[10px] font-semibold text-[rgb(var(--muted2))]">
          {tag}
        </div>
      </div>

      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[rgb(var(--primary)/0.10)] blur-2xl opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}

function SkeletonLines() {
  return (
    <div className="space-y-2">
      <div className="h-6 w-24 animate-pulse rounded bg-[rgb(var(--border))]" />
      <div className="h-3 w-40 animate-pulse rounded bg-[rgb(var(--border))]" />
    </div>
  );
}

export default function TutorDashboardPage() {
  // prevent double fetch spam in dev strict mode
  const ran = useRef({ rating: false, sessions: false, availability: false });

  const [summary, setSummary] = useState<{ avg: number; count: number } | null>(
    null
  );

  const [sessions, setSessions] = useState<BoxState<SessionsApi>>({
    status: "loading",
  });

  const [availability, setAvailability] = useState<BoxState<AvailabilityApi>>({
    status: "loading",
  });

  // ratings
  useEffect(() => {
    if (ran.current.rating) return;
    ran.current.rating = true;

    let alive = true;

    const run = async () => {
      try {
        const res = await fetch("/api/tutor/ratings/summary", {
          cache: "no-store",
        });
        const data: RatingSummary = await res.json().catch(() => ({ ok: false }));
        if (!alive) return;

        if (
          res.ok &&
          data.ok &&
          typeof data.avg === "number" &&
          typeof data.count === "number" &&
          data.count > 0
        ) {
          setSummary({
            avg: Math.round(data.avg * 10) / 10,
            count: data.count,
          });
        } else {
          setSummary(null);
        }
      } catch {
        if (!alive) return;
        setSummary(null);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  // sessions list (we will pick "next")
  useEffect(() => {
    if (ran.current.sessions) return;
    ran.current.sessions = true;

    let alive = true;

    const run = async () => {
      try {
        const res = await fetch("/api/tutor/sessions", { cache: "no-store" });
        const data: SessionsApi = await res.json().catch(() => ({ items: [] }));
        if (!alive) return;

        if (res.ok && data && Array.isArray(data.items)) {
          setSessions(
            data.items.length ? { status: "ready", data } : { status: "empty" }
          );
        } else {
          setSessions({ status: "empty" });
        }
      } catch {
        if (!alive) return;
        setSessions({ status: "error" });
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  // availability
  useEffect(() => {
    if (ran.current.availability) return;
    ran.current.availability = true;

    let alive = true;

    const run = async () => {
      try {
        const res = await fetch("/api/tutor/availability", { cache: "no-store" });
        const data: AvailabilityApi = await res.json().catch(() => ({
          success: false,
          availability: null,
          status: null,
        }));
        if (!alive) return;

        if (res.ok && data && typeof data.success === "boolean") {
          // treat as "ready" even if availability is null (we handle UI)
          setAvailability({ status: "ready", data });
        } else {
          setAvailability({ status: "empty" });
        }
      } catch {
        if (!alive) return;
        setAvailability({ status: "error" });
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  const ratingPill = useMemo(() => {
    if (!summary) return null;

    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5 shadow-[0_10px_30px_rgb(var(--shadow)/0.08)]">
        <Star className="h-4 w-4 text-[rgb(var(--muted2))]" />
        <div className="text-xs font-semibold text-[rgb(var(--fg))]">
          {summary.avg.toFixed(1)}
          <span className="ml-1 text-[rgb(var(--muted2))]">
            ({summary.count} rating{summary.count === 1 ? "" : "s"})
          </span>
        </div>
      </div>
    );
  }, [summary]);

  // compute next session from /api/tutor/sessions
  const nextSession = useMemo(() => {
    if (sessions.status !== "ready") return null;
    const now = Date.now();

    // find first scheduledAt >= now
    const next = sessions.data.items.find((s) => {
      const t = Date.parse(s.scheduledAt);
      return Number.isFinite(t) && t >= now;
    });

    return next ?? null;
  }, [sessions]);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card) / 0.7)] p-6 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[260px]">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
                <LayoutDashboard className="h-5 w-5 text-[rgb(var(--fg))]" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
                  Tutor Dashboard
                </h1>
                <p className="mt-0.5 text-sm text-[rgb(var(--muted))]">
                  Manage tutoring requests, sessions, and your availability.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
                <Link
                  href="/dashboard/student"
                  className="px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]"
                >
                  Student
                </Link>
                <Link
                  href="/dashboard/tutor"
                  className="border-l border-[rgb(var(--border))] bg-[rgb(var(--primary)/0.14)] px-3 py-2 text-xs font-semibold text-[rgb(var(--primary))]"
                >
                  Tutor
                </Link>
              </div>
            </div>
          </div>

          {ratingPill}
        </div>
      </header>

      {/* Today at a glance */}
      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card) / 0.7)] p-6 shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
            Today at a Glance
          </h2>

          
        </div>

        {/* ✅ changed md:grid-cols-3 -> md:grid-cols-2 because we removed one card */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* ✅ REMOVED: Pending requests card */}

          {/* Next session from /api/tutor/sessions */}
          <GlanceCard
            href="/dashboard/tutor/sessions"
            title="Next session"
            icon={<CheckCircle2 className="h-5 w-5 text-[rgb(var(--primary))]" />}
            tag="Upcoming"
          >
            {sessions.status === "loading" ? (
              <SkeletonLines />
            ) : sessions.status === "error" ? (
              <div className="text-xs text-[rgb(var(--muted))]">
                Sessions unavailable right now.
              </div>
            ) : !nextSession ? (
              <div className="text-xs text-[rgb(var(--muted))]">
                No upcoming sessions yet.
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                  {fmtLocal(nextSession.scheduledAt)}
                </div>
                <div className="text-xs text-[rgb(var(--muted))]">
                  {nextSession.student?.name ?? "Student"}
                  <span className="mx-1">•</span>
                  {nextSession.subject?.code ??
                    nextSession.subject?.title ??
                    "Subject"}
                </div>
              </div>
            )}
          </GlanceCard>

          {/* Availability from /api/tutor/availability */}
          <GlanceCard
            href="/dashboard/tutor/availability"
            title="Availability"
            icon={<Timer className="h-5 w-5 text-[rgb(var(--primary))]" />}
            tag="Schedule"
          >
            {availability.status === "loading" ? (
              <SkeletonLines />
            ) : availability.status === "error" ? (
              <div className="text-xs text-[rgb(var(--muted))]">
                Availability unavailable right now.
              </div>
            ) : availability.status !== "ready" ? (
              <div className="text-xs text-[rgb(var(--muted))]">Nothing yet.</div>
            ) : (
              (() => {
                const raw = availability.data.availability?.trim() ?? "";
                const isApproved = availability.data.status === "APPROVED";

                if (!isApproved) {
                  return (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-[rgb(var(--muted2))]">
                        Not approved yet
                      </div>
                      <div className="text-xs text-[rgb(var(--muted))]">
                        Availability is available after tutor approval.
                      </div>
                    </div>
                  );
                }

                if (!raw) {
                  return (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-[rgb(var(--muted2))]">
                        No availability set
                      </div>
                      <div className="text-xs text-[rgb(var(--muted))]">
                        Add your times so students can book you.
                      </div>
                    </div>
                  );
                }

                // ✅ NEW: readable summary instead of raw JSON preview
                const s = summarizeAvailability(raw);

                return (
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                      {s.headline}
                    </div>
                    <div className="text-xs text-[rgb(var(--muted))]">
                      {s.detail}
                    </div>
                  </div>
                );
              })()
            )}
          </GlanceCard>
        </div>
      </section>
    </div>
  );
}