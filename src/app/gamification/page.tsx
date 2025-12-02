// src/app/gamification/page.tsx
"use client";

const profileStats = {
  points: 2450,
  level: "Level 4 – Consistent Learner",
  nextReward: "500 pts to unlock: Study Streak Badge",
};

const badges = [
  {
    name: "First Session Completed",
    desc: "Completed your first tutoring session on TutorLink.",
    unlocked: true,
  },
  {
    name: "3 Sessions in a Week",
    desc: "Booked and attended three sessions in the same week.",
    unlocked: true,
  },
  {
    name: "Consistent Learner (4 weeks)",
    desc: "Maintained a weekly study streak for one month.",
    unlocked: false,
  },
  {
    name: "Top 10 Leaderboard",
    desc: "Reached the top 10 in the weekly points ranking.",
    unlocked: false,
  },
];

const leaderboard = [
  { rank: 1, name: "student_2145", points: 3200 },
  { rank: 2, name: "student_2003", points: 2980 },
  { rank: 3, name: "student_1988", points: 2875 },
  { rank: 4, name: "you", points: 2450 },
  { rank: 5, name: "student_2210", points: 2405 },
];

export default function GamificationPage() {
  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">
          Gamification & Rewards
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl">
          Earn points, unlock badges and compete on weekly leaderboards to stay
          motivated in your studies.
        </p>
      </header>

      <section className="grid gap-5 lg:grid-cols-3">
        {/* Profile & points */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
          <h2 className="text-sm font-semibold text-white">
            My Points & Level
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            This is a mock view showing how a student can see their progress in
            the reward system.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500 via-amber-400 to-rose-500">
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-slate-950 text-center border border-amber-400/70">
                <span className="text-xs text-slate-200">Points</span>
                <span className="text-xl font-semibold text-amber-300">
                  {profileStats.points}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-xs text-slate-200">
              <p className="font-semibold">{profileStats.level}</p>
              <p className="text-slate-300">
                {profileStats.nextReward}
              </p>
              <p className="text-slate-400">
                Points are earned by attending sessions, completing study plans,
                and helping tutors by coming prepared.
              </p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
          <h2 className="text-sm font-semibold text-white">
            Badges
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Example of badges a student can unlock.
          </p>

          <div className="mt-4 space-y-3 text-xs">
            {badges.map((badge, idx) => (
              <div
                key={idx}
                className={`rounded-lg border px-3 py-2 ${
                  badge.unlocked
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-900/80"
                }`}
              >
                <p className="text-[0.75rem] font-semibold text-slate-100">
                  {badge.name}
                </p>
                <p className="mt-1 text-[0.7rem] text-slate-300">
                  {badge.desc}
                </p>
                <p className="mt-1 text-[0.7rem] font-medium">
                  {badge.unlocked ? (
                    <span className="text-emerald-300">Unlocked</span>
                  ) : (
                    <span className="text-slate-400">Locked</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
        <h2 className="text-sm font-semibold text-white">
          Weekly Leaderboard (Sample)
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Students are ranked based on points earned from sessions and
          consistent study habits.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/90 text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-300">
                <th className="py-2 pl-3 pr-3 text-left">Rank</th>
                <th className="py-2 pr-3 text-left">Student</th>
                <th className="py-2 pr-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr
                  key={entry.rank}
                  className={`border-b border-slate-800/60 last:border-0 ${
                    entry.name === "you" ? "bg-slate-900/70" : ""
                  }`}
                >
                  <td className="py-2 pl-3 pr-3 text-slate-100">
                    #{entry.rank}
                  </td>
                  <td className="py-2 pr-3 text-slate-100 capitalize">
                    {entry.name}
                  </td>
                  <td className="py-2 pr-3 text-right text-amber-300">
                    {entry.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[0.7rem] text-slate-300">
          In the full system, this leaderboard resets every week and can be
          filtered by school or programme to keep the competition fair and
          encouraging.
        </p>
      </section>
    </div>
  );
}
