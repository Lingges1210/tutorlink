"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Target,
  CalendarCheck,
  LineChart,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Users,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    title: "Verified campus community",
    desc: "Sign up with a USM email so everyone follows the same campus context and standards.",
    icon: ShieldCheck,
  },
  {
    title: "Find tutors by course code",
    desc: "Search seniors and peers who have completed the exact subject you need support with.",
    icon: Target,
  },
  {
    title: "Structured sessions",
    desc: "Keep everything organised with bookings, notes, reminders, and session history.",
    icon: CalendarCheck,
  },
  {
    title: "Progress & accountability",
    desc: "Track consistency and stay motivated with milestones and performance insights.",
    icon: LineChart,
  },
];

const steps = [
  {
    step: "1 · Sign up",
    desc: "Register with your USM email to unlock a secure campus-only environment.",
    icon: ShieldCheck,
  },
  {
    step: "2 · Find a tutor",
    desc: "Search by faculty, course code, or skill and filter to match what you need.",
    icon: Target,
  },
  {
    step: "3 · Book a session",
    desc: "Confirm a time, share details, and keep your learning organised in one place.",
    icon: CalendarCheck,
  },
  {
    step: "4 · Track progress",
    desc: "Review session history and stay consistent with goals and progress tracking.",
    icon: LineChart,
  },
];

const faqs = [
  {
    q: "Is TutorLink only for USM students?",
    a: "Yes. Access is campus-exclusive so it stays trusted and relevant to USM courses.",
  },
  {
    q: "Can I join as a tutor?",
    a: "Yes. You can learn as a student and also tutor subjects you’re confident in.",
  },
  {
    q: "Is it free?",
    a: "Core features are available without charge. Additional options can be introduced later.",
  },
  {
    q: "How is this different from WhatsApp groups?",
    a: "TutorLink is searchable, structured, and trackable—so support doesn’t get buried in chat threads.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-20">
      {/* HERO */}
      <section className="relative -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div
          className="
            relative overflow-hidden rounded-3xl border
            border-slate-200 bg-white shadow-xl
            dark:border-slate-800/80 dark:bg-slate-950/40 dark:shadow-violet-900/15
          "
        >
          {/* Background (light + dark) */}
          <div
            className="
              absolute inset-0 -z-10
              bg-[radial-gradient(circle_at_top,#EDE9FE_0%,#FFFFFF_55%,#F8FAFC_100%)]
              dark:bg-[radial-gradient(circle_at_top,#312E81_0%,#1E1B4B_42%,#0B1220_100%)]
            "
          />
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl -z-10 dark:bg-violet-700/18" />
          <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl -z-10" />

          <div className="px-6 sm:px-10 lg:px-12 pt-8 sm:pt-10 lg:pt-12 pb-12 sm:pb-14">
            <div className="grid gap-10 lg:gap-12 md:grid-cols-[1.05fr,0.95fr] items-start">
              {/* Left */}
              <div className="max-w-2xl">
                <div className="fade-up-1">
                  <span
                    className="
                      inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-medium
                      border-violet-200 bg-violet-50 text-violet-700
                      dark:border-violet-500/35 dark:bg-violet-950/35 dark:text-violet-200
                    "
                  >
                    <ShieldCheck size={14} />
                    Campus-exclusive — Verified USM students only
                  </span>
                </div>

                <h1 className="fade-up-2 mt-4 text-4xl font-bold sm:text-5xl leading-[1.05] tracking-tight">
                  <span
                    className="
                      bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900
                      bg-clip-text text-transparent
                      dark:from-violet-200 dark:via-indigo-200 dark:to-slate-100
                    "
                  >
                    Peer tutoring that actually
                  </span>{" "}
                  <span
                    className="
                      bg-gradient-to-r from-violet-700 to-indigo-600
                      bg-clip-text text-transparent
                      dark:from-blue-400 dark:to-violet-400
                    "
                  >
                    feels organised.
                  </span>
                </h1>

                <p
                  className="
                    fade-up-3 mt-4 text-sm sm:text-base leading-relaxed max-w-xl
                    text-slate-600
                    dark:text-slate-300
                  "
                >
                  TutorLink helps USM students connect with seniors and peers for
                  the exact courses they need — with bookings, notes, reminders,
                  and progress tracking.
                </p>

                <div className="fade-up-4 mt-6 grid gap-2 text-xs sm:text-sm max-w-xl">
                  {[
                    "Search tutors by course code, not guesswork",
                    "Keep sessions structured with history and notes",
                    "Build momentum with milestones and rankings",
                  ].map((text) => (
                    <div key={text} className="flex items-start gap-2">
                      <CheckCircle2
                        size={16}
                        className="mt-0.5 text-violet-600 dark:text-violet-300"
                      />
                      <span className="text-slate-700 dark:text-slate-300">
                        {text}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="fade-up-5 mt-8 flex flex-wrap gap-3 sm:gap-4 text-sm">
                  <Link
                    href="/find-tutor"
                    className="
                      inline-flex items-center gap-2 rounded-md px-5 py-2.5 font-semibold shadow transition
                      bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-500 text-white hover:opacity-90
                    "
                  >
                    Find a Tutor
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    href="/auth/register"
                    className="
                      rounded-md px-5 py-2.5 font-semibold transition
                      border border-slate-300 bg-white text-slate-900 hover:border-violet-300
                      dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-violet-400
                    "
                  >
                    Create Account
                  </Link>
                </div>

                <p className="fade-up-6 mt-4 text-[0.72rem] text-slate-500 dark:text-slate-400">
                  Secure by design • Built for USM coursework • Structured peer learning
                </p>
              </div>

              {/* Right: Feature card */}
              <div className="fade-up-3">
                <div
                  className="
                    rounded-2xl border p-6 sm:p-7 shadow-lg backdrop-blur
                    border-slate-200 bg-white/80
                    dark:border-slate-800 dark:bg-slate-950/35 dark:shadow-violet-900/15
                  "
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Platform highlights
                    </h2>
                    <span className="text-[0.7rem] text-slate-500 dark:text-slate-400">
                      Core features
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 text-xs">
                    {features.map((f) => {
                      const Icon = f.icon;
                      return (
                        <div
                          key={f.title}
                          className="
                            rounded-xl border p-4 transition
                            border-slate-200 bg-white hover:border-violet-200
                            dark:border-slate-800 dark:bg-slate-950/35 dark:hover:border-violet-500/35
                          "
                        >
                          <div className="flex items-start gap-3">
                            <Icon
                              size={18}
                              className="mt-0.5 text-violet-700 dark:text-violet-300"
                            />
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {f.title}
                              </div>
                              <div className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                                {f.desc}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="
                      mt-5 rounded-xl border p-4 text-xs
                      border-violet-200 bg-violet-50 text-violet-800
                      dark:border-violet-500/18 dark:bg-violet-950/25 dark:text-violet-200
                    "
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles size={16} className="mt-0.5" />
                      <div>
                        <span className="font-semibold">Note:</span>{" "}
                        Tutoring can help seniors build leadership experience and strengthen academic confidence.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700/60" />
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section
        className="
          rounded-2xl border p-6
          border-slate-200 bg-white
          dark:border-slate-800 dark:bg-slate-900/45
        "
      >
        <div className="grid gap-4 sm:grid-cols-3 text-center">
          {[
            {
              title: "Course-first",
              desc: "Search by course code and subject focus",
              icon: GraduationCap,
            },
            {
              title: "Structured",
              desc: "Bookings, notes, reminders, and history",
              icon: CalendarCheck,
            },
            {
              title: "Community",
              desc: "Peer learning with trusted campus access",
              icon: Users,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="
                  rounded-xl border p-4
                  border-slate-200 bg-slate-50
                  dark:border-slate-800 dark:bg-slate-950/25
                "
              >
                <div
                  className="
                    mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg border
                    border-slate-200 bg-white
                    dark:border-slate-800 dark:bg-slate-900/50
                  "
                >
                  <Icon size={18} className="text-violet-700 dark:text-violet-300" />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section>
        <h2 className="text-center text-xl font-semibold text-slate-900 dark:bg-gradient-to-r dark:from-violet-300 dark:to-indigo-300 dark:bg-clip-text dark:text-transparent">
          How TutorLink Works
        </h2>

        <div className="mt-8 grid gap-6 md:grid-cols-4 text-xs">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="
                  rounded-xl border p-5 shadow-sm transition
                  border-slate-200 bg-white hover:border-violet-200
                  dark:border-slate-800 dark:bg-slate-900/65 dark:hover:shadow-violet-700/25
                "
              >
                <div className="flex items-center gap-2">
                  <div
                    className="
                      flex h-8 w-8 items-center justify-center rounded-lg border
                      border-slate-200 bg-slate-50
                      dark:border-slate-800 dark:bg-slate-950/35
                    "
                  >
                    <Icon size={16} className="text-violet-700 dark:text-violet-300" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-violet-300">
                    {item.step}
                  </h3>
                </div>
                <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section>
        <h2 className="text-center text-xl font-semibold text-slate-900 dark:bg-gradient-to-r dark:from-indigo-300 dark:to-violet-300 dark:bg-clip-text dark:text-transparent">
          What Students Say
        </h2>

        <div className="mt-8 grid gap-6 md:grid-cols-3 text-xs">
          {[
            {
              quote:
                "Instead of spamming course WhatsApp groups, I can find 1-to-1 help from seniors who took the subject.",
              user: "Year 2 CS Student",
            },
            {
              quote:
                "Sessions feel more serious here—everything is organised, and progress is easy to track.",
              user: "Final Year Tutor",
            },
            {
              quote:
                "A focused platform like this helps students get support earlier and learn more consistently.",
              user: "USM Student",
            },
          ].map((r) => (
            <div
              key={r.user}
              className="
                rounded-xl border p-5 shadow-sm transition
                border-slate-200 bg-white hover:border-violet-200
                dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-violet-500/35
              "
            >
              <p className="leading-relaxed text-slate-700 dark:text-slate-200">
                “{r.quote}”
              </p>
              <p className="mt-3 text-[0.7rem] text-slate-500 dark:text-slate-400">
                – {r.user}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        className="
          rounded-2xl border p-7
          border-slate-200 bg-white
          dark:border-slate-800 dark:bg-slate-900/50
        "
      >
        <h2 className="text-center text-xl font-semibold text-slate-900 dark:bg-gradient-to-r dark:from-violet-300 dark:to-indigo-300 dark:bg-clip-text dark:text-transparent">
          FAQ
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map((f) => (
            <div
              key={f.q}
              className="
                rounded-xl border p-5
                border-slate-200 bg-slate-50
                dark:border-slate-800 dark:bg-slate-950/25
              "
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {f.q}
              </div>
              <div className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {f.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        className="
          relative overflow-hidden rounded-2xl border p-8
          border-slate-200 bg-white
          dark:border-slate-800 dark:bg-slate-900/60
        "
      >
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl -z-10 dark:bg-violet-700/20" />
        <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl -z-10" />

        <div className="flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Ready to learn with the right support?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Find tutors for your exact course, book properly, track progress, and stay consistent.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/auth/register"
              className="
                inline-flex items-center gap-2 rounded-md px-6 py-2.5 font-semibold shadow transition
                bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-500 text-white hover:opacity-90
              "
            >
              Create Account
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/find-tutor"
              className="
                rounded-md border px-6 py-2.5 font-semibold transition
                border-slate-300 bg-white text-slate-900 hover:border-violet-300
                dark:border-slate-700 dark:bg-slate-950/35 dark:text-slate-200 dark:hover:border-violet-400
              "
            >
              Browse Tutors
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
