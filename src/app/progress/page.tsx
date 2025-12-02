// src/app/progress/page.tsx
"use client";

const summaryCards = [
  {
    label: "Sessions Completed",
    value: "12",
    subtitle: "In the last 30 days",
  },
  {
    label: "Active Streak",
    value: "3 weeks",
    subtitle: "You’ve had at least 1 session every week",
  },
  {
    label: "Topics Covered",
    value: "18",
    subtitle: "Across 4 different subjects",
  },
  {
    label: "Average Confidence",
    value: "4.3 / 5",
    subtitle: "Self-rated after each session (sample)",
  },
];

const recentSessions = [
  {
    subject: "Programming I",
    topic: "While loops & conditions",
    tutor: "Aisyah",
    date: "01 Dec 2025",
  },
  {
    subject: "Data Structures",
    topic: "Linked lists vs arrays",
    tutor: "Arif",
    date: "28 Nov 2025",
  },
  {
    subject: "Calculus II",
    topic: "Integration by parts",
    tutor: "Wei Jie",
    date: "26 Nov 2025",
  },
];

const consistency = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 0 },
  { label: "Wed", value: 1 },
  { label: "Thu", value: 1 },
  { label: "Fri", value: 0 },
  { label: "Sat", value: 1 },
  { label: "Sun", value: 0 },
];

export default function ProgressPage() {
  const maxConsistency = Math.max(...consistency.map((c) => c.value || 1));

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">
          My Progress & Analytics
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl">
          View your completed tutoring sessions, topics you have covered, and a
          simple overview of your study consistency using TutorLink.
        </p>
      </header>

      {/* Summary */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-200">
          Progress Summary (Sample Data)
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.85)]"
            >
              <div className="absolute -right-6 -top-8 h-20 w-20 rounded-full bg-gradient-to-tr from-emerald-500/25 via-sky-400/25 to-transparent blur-xl" />
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

      <section className="grid gap-5 lg:grid-cols-3">
        {/* Consistency */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
          <h2 className="text-sm font-semibold text-white">
            Weekly Study Consistency
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            This mock view shows on which days you usually book or attend
            sessions.
          </p>

          <div className="mt-4 flex h-40 items-end gap-3 rounded-lg border border-slate-800 bg-gradient-to-b from-slate-900/70 via-slate-950 to-slate-950 px-4 pb-4 pt-3">
            {consistency.map((c) => {
              const height = (c.value / maxConsistency) * 100;
              return (
                <div
                  key={c.label}
                  className="flex flex-1 flex-col items-center justify-end"
                >
                  <div
                    className={`mb-1 flex h-full w-full items-end justify-center rounded-t-lg ${
                      c.value > 0
                        ? "bg-gradient-to-t from-emerald-600 via-sky-500 to-violet-400 shadow-[0_10px_30px_rgba(74,222,128,0.55)]"
                        : "bg-slate-800"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="mt-1 text-[0.65rem] font-medium text-slate-300">
                    {c.label}
                  </span>
                  <span className="text-[0.6rem] text-slate-500">
                    {c.value > 0 ? "Study day" : "No session"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent sessions */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
          <h2 className="text-sm font-semibold text-white">
            Recent Tutoring Sessions
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Example of how a student can see what topics were covered recently.
          </p>

          <div className="mt-4 space-y-3 text-xs">
            {recentSessions.map((session, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
              >
                <p className="text-[0.7rem] font-semibold text-slate-100">
                  {session.subject}
                </p>
                <p className="mt-1 text-slate-300">{session.topic}</p>
                <p className="mt-1 text-[0.7rem] text-slate-400">
                  Tutor: {session.tutor}
                </p>
                <p className="text-[0.7rem] text-slate-500">{session.date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
