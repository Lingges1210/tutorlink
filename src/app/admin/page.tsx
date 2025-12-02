// src/app/admin/page.tsx
"use client";

import React from "react";

const statCards = [
  {
    label: "Total Users",
    value: "1,248",
    subtitle: "Registered students & tutors in TutorLink",
  },
  {
    label: "Active Tutors",
    value: "74",
    subtitle: "Verified tutors with at least 1 session",
  },
  {
    label: "Sessions This Week",
    value: "132",
    subtitle: "Completed peer tutoring sessions",
  },
  {
    label: "SOS Requests",
    value: "9",
    subtitle: "Urgent academic help requests",
  },
];

const weeklySessions = [
  { day: "Mon", value: 18 },
  { day: "Tue", value: 24 },
  { day: "Wed", value: 29 },
  { day: "Thu", value: 21 },
  { day: "Fri", value: 16 },
  { day: "Sat", value: 14 },
  { day: "Sun", value: 10 },
];

const subjectDemand = [
  { name: "Programming I / II", value: 86 },
  { name: "Data Structures & Algorithms", value: 74 },
  { name: "Discrete Mathematics", value: 63 },
  { name: "Calculus", value: 51 },
  { name: "Circuit Theory", value: 38 },
];

export default function AdminPage() {
  const maxSessions = Math.max(...weeklySessions.map((s) => s.value));

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Admin Analytics</h1>
        <p className="text-sm text-slate-300 max-w-xl">
          Overview of TutorLink usage, tutoring activity and demand trends.
          This dashboard uses sample analytics data to illustrate how the admin
          can monitor the platform.
        </p>
      </header>

      {/* Top stats */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-200">
          Today&apos;s Overview
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.85)]"
            >
              <div className="absolute -right-6 -top-8 h-20 w-20 rounded-full bg-gradient-to-tr from-violet-500/20 via-sky-400/30 to-transparent blur-xl" />

              <p className="text-[0.75rem] font-medium uppercase tracking-wide text-slate-400">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-300">{card.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Charts row */}
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Weekly sessions bar chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Weekly Tutoring Sessions
              </h2>
              <p className="text-xs text-slate-400">
                Sample data showing completed sessions by day.
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[0.65rem] font-medium text-emerald-300">
              +12% vs last week (mock)
            </span>
          </div>

          <div className="mt-4 flex h-52 items-end gap-3 rounded-lg border border-slate-800 bg-gradient-to-b from-slate-900/70 via-slate-950 to-slate-950 px-4 pb-4 pt-3">
            {weeklySessions.map((s) => {
              const height = (s.value / maxSessions) * 100;
              return (
                <div
                  key={s.day}
                  className="flex flex-1 flex-col items-center justify-end"
                >
                  <div
                    className="mb-1 flex h-full w-full items-end justify-center rounded-t-lg bg-gradient-to-t from-violet-600 via-sky-500 to-cyan-400 shadow-[0_10px_30px_rgba(56,189,248,0.55)]"
                    style={{ height: `${height}%` }}
                  />
                  <span className="mt-1 text-[0.65rem] font-medium text-slate-300">
                    {s.day}
                  </span>
                  <span className="text-[0.6rem] text-slate-500">
                    {s.value} sessions
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subject demand */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
          <h2 className="text-sm font-semibold text-white">
            Top Subjects by Demand
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Sample breakdown of student requests across key courses.
          </p>

          <div className="mt-4 space-y-3">
            {subjectDemand.map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-200">
                    {item.name}
                  </p>
                  <p className="text-[0.7rem] text-slate-400">
                    {item.value}% of requests
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-sky-400 to-emerald-400"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2">
            <p className="text-[0.7rem] font-medium text-emerald-300">
              Insight (mock)
            </p>
            <p className="mt-1 text-[0.7rem] text-slate-300">
              CS fundamentals (Programming, DSA, Discrete Math) contribute to
              the majority of tutor requests, suggesting these areas should have
              higher tutor allocation.
            </p>
          </div>
        </div>
      </section>

      {/* Satisfaction + platform health */}
      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
          <h2 className="text-sm font-semibold text-white">
            Student Satisfaction (Mock Survey)
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Sample survey results from students who used TutorLink.
          </p>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500/20 via-sky-500/20 to-violet-500/25">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-center text-sm font-semibold text-emerald-300 border border-emerald-500/60">
                4.6<span className="ml-0.5 text-[0.6rem] text-slate-400">/5</span>
              </div>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <p>Key highlights (sample data):</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>92% found it easier to connect with a suitable tutor.</li>
                <li>88% agreed sessions improved subject understanding.</li>
                <li>85% would recommend TutorLink to a friend.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
          <h2 className="text-sm font-semibold text-white">
            Platform Health Snapshot
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            High-level mock indicators for system & usage health.
          </p>

          <div className="mt-4 grid gap-3 text-xs text-slate-200">
            <div className="flex items-center justify-between">
              <span>System Uptime</span>
              <span className="font-semibold text-emerald-300">99.3%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Average Response Time</span>
              <span className="font-semibold text-sky-300">180 ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Successful Bookings</span>
              <span className="font-semibold text-emerald-300">95%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Resolved Reports</span>
              <span className="font-semibold text-violet-300">81%</span>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-[0.7rem] text-slate-300">
            This section is intentionally based on fake but realistic values to
            demonstrate how TutorLink&apos;s admin panel can support monitoring
            of performance, reliability and student experience.
          </div>
        </div>
      </section>
    </div>
  );
}
