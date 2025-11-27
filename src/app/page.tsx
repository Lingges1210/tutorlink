// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-20">
      {/* HERO */}
      <section className="relative mt-6 -mx-6 sm:-mx-12 lg:-mx-24 xl:-mx-32 px-6 sm:px-12 lg:px-24 xl:px-32 py-32">
        {/* Soft background glow */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,#312E81_0%,#1E1B4B_40%,#0F172A_100%)] opacity-80" />

        <div className="grid gap-10 md:grid-cols-[1.2fr,1fr] items-center">
          <div>
            <span className="inline-flex items-center rounded-full border border-violet-500/40 bg-violet-950/40 px-3 py-1 text-[0.7rem] font-medium text-violet-200 shadow-md backdrop-blur">
              🔒 Campus Exclusive — Verified USM Students Only
            </span>

            <h1 className="mt-5 text-4xl font-bold sm:text-5xl leading-snug">
              <span className="bg-gradient-to-r from-violet-300 via-indigo-200 to-slate-100 bg-clip-text text-transparent">
                Peer Tutoring Designed for
              </span>{" "}
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                USM Students
              </span>
            </h1>

            <p className="mt-4 text-sm text-slate-300 leading-relaxed max-w-lg">
              Stop getting lost in random group chats. TutorLink connects you with
              seniors and coursemates who’ve already mastered your subjects —
              structured, accountable, and fully aligned with USM coursework.
            </p>

            <div className="mt-7 flex flex-wrap gap-4 text-sm">
              <Link
                href="/find-tutor"
                className="rounded-md bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-500 px-5 py-2.5 font-medium text-white shadow hover:opacity-90 transition"
              >
                Find a Tutor
              </Link>
              <Link
                href="/auth/register"
                className="rounded-md bg-slate-900 border border-slate-600 px-5 py-2.5 font-medium text-slate-200 hover:border-violet-400 hover:text-violet-300 transition"
              >
                Join as Student
              </Link>
            </div>
          </div>

          {/* Feature highlight card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl shadow-violet-900/30 backdrop-blur-md mt-14 md:mt-16 w-full">
            <h2 className="text-sm font-semibold text-slate-100 mb-4">
              Why choose TutorLink?
            </h2>
            <ul className="space-y-3 text-xs text-slate-300">
              <li>
                🎯 <span className="font-semibold text-violet-300">Smart matching</span> — Find tutors who’ve taken the same course code.
              </li>
              <li>
                📚 <span className="font-semibold text-violet-300">Structured learning</span> — Sessions with notes, reminders & history.
              </li>
              <li>
                📈 <span className="font-semibold text-violet-300">Progress tracking</span> — View consistency streaks & analytics.
              </li>
              <li>
                🏆 <span className="font-semibold text-violet-300">Gamified rewards</span> — Earn badges & leaderboard rankings.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section>
        <h2 className="text-center text-xl font-semibold bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
          How TutorLink Works
        </h2>

        <div className="mt-8 grid gap-6 md:grid-cols-4 text-xs">
          {[
            {
              step: "1 · Sign Up",
              desc: "Register using your USM email to ensure a secure campus-only environment.",
            },
            {
              step: "2 · Find Tutor",
              desc: "Search seniors by subject or course code — not random guessing.",
            },
            {
              step: "3 · Book Session",
              desc: "Confirm meeting time, chat, share files & learn confidently.",
            },
            {
              step: "4 · Track Progress",
              desc: "Session history + consistency streaks keep you accountable.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-md hover:shadow-violet-700/30 transition"
            >
              <h3 className="text-violet-300 font-semibold">{item.step}</h3>
              <p className="mt-2 text-slate-300 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section>
        <h2 className="text-center text-xl font-semibold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
          What Students Say
        </h2>

        <div className="mt-8 grid gap-6 md:grid-cols-3 text-xs">
          {[
            {
              quote:
                "Instead of spamming in course WhatsApp groups, I can now find 1-to-1 help from seniors who actually took the subject.",
              user: "Year 2 CS Student",
            },
            {
              quote:
                "I love getting points & badges while tutoring juniors — more structured than random DMs.",
              user: "Final Year CS Tutor",
            },
            {
              quote:
                "Finally a USM platform that encourages peer learning before going to formal counselling.",
              user: "Imaginary Lecturer 😆",
            },
          ].map((r) => (
            <div
              key={r.user}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow transition hover:border-violet-500/40"
            >
              <p className="text-slate-200 leading-relaxed">“{r.quote}”</p>
              <p className="mt-3 text-[0.7rem] text-slate-400">– {r.user}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
