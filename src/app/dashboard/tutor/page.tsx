"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RatingSummary = {
  ok: boolean;
  avg?: number;
  count?: number;
};

export default function TutorDashboardPage() {
  const [summary, setSummary] = useState<{ avg: number; count: number } | null>(
    null
  );

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const res = await fetch("/api/tutor/ratings/summary", {
          cache: "no-store",
        });
        const data: RatingSummary = await res.json().catch(() => ({ ok: false }));

        if (!alive) return;

        if (res.ok && data.ok && typeof data.avg === "number" && typeof data.count === "number") {
          setSummary({
            avg: Math.round(data.avg * 10) / 10,
            count: data.count,
          });
        } else {
          setSummary(null);
        }
      } catch {
        setSummary(null);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card) / 0.7)] p-6 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
              Tutor Dashboard
            </h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Manage tutoring requests, sessions, and your availability.
            </p>

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
                  className="px-3 py-2 text-xs font-semibold bg-[rgb(var(--primary)/0.14)] text-[rgb(var(--primary))] border-l border-[rgb(var(--border))]"
                >
                  Tutor
                </Link>
              </div>
            </div>
          </div>

          {/*  WOW: Rating pill */}
          {summary && summary.count > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5">
              <span className="text-sm leading-none">⭐</span>
              <div className="text-xs font-semibold text-[rgb(var(--fg))]">
                {summary.avg.toFixed(1)}
                <span className="ml-1 text-[rgb(var(--muted2))]">
                  ({summary.count} rating{summary.count === 1 ? "" : "s"})
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Quick cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card) / 0.7)] p-5">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
            Incoming Requests
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--muted))]">
            (Phase 1) Tutors will accept/reject booking requests here.
          </p>
          <div className="mt-3 text-[0.75rem] text-[rgb(var(--muted2))]">
            Status: Coming soon
          </div>
        </div>

        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card) / 0.7)] p-5">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
            My Sessions
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--muted))]">
            (Phase 1) View your accepted/upcoming sessions.
          </p>
          <div className="mt-3 text-[0.75rem] text-[rgb(var(--muted2))]">
            Status: Coming soon
          </div>
        </div>

        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card) / 0.7)] p-5">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
            Availability
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--muted))]">
            (Phase 1) Set when students can book you.
          </p>
          <div className="mt-3 text-[0.75rem] text-[rgb(var(--muted2))]">
            Status: Coming soon
          </div>
        </div>
      </section>

      {/* Next steps for you (dev) */}
      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card) / 0.7)] p-6">
        <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
          Next implementation steps
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[rgb(var(--muted))]">
          <li>
            Create Tutor layout: <code>/dashboard/tutor/layout.tsx</code> with tutor sidebar.
          </li>
          <li>Implement “Incoming Requests” table (Session status = PENDING).</li>
          <li>Add accept/reject actions (updates Session status).</li>
          <li>Add availability editor (simple text/slots for MVP).</li>
        </ul>
      </section>
    </div>
  );
}