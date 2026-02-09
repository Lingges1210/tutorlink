// src/app/page.tsx
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
    <div className="space-y-20">
      {/* HERO */}
      <section className="relative -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/40 shadow-xl shadow-violet-900/15">
          {/* Background */}
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,#312E81_0%,#1E1B4B_42%,#0B1220_100%)] opacity-95" />
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-700/18 blur-3xl -z-10" />
          <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl -z-10" />

          <div className="px-6 sm:px-10 lg:px-12 pt-7 sm:pt-10 lg:pt-12 pb-12 sm:pb-14">
            <div className="grid gap-10 lg:gap-12 md:grid-cols-[1.05fr,0.95fr] items-start">
              {/* Left */}
              <div className="max-w-2xl">
                <div className="fade-up-1">
                  <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/35 bg-violet-950/35 px-3 py-1 text-[0.7rem] font-medium text-violet-200 backdrop-blur">
                    <ShieldCheck size={14} />
                    Campus-exclusive — Verified USM Students Only
                  </span>
                </div>

                <h1 className="fade-up-2 mt-4 text-4xl font-bold sm:text-5xl leading-[1.05] tracking-tight">
                  <span className="bg-gradient-to-r from-violet-200 via-indigo-200 to-slate-100 bg-clip-text text-transparent">
                    Peer tutoring that actually
                  </span>{" "}
                  <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                    feels organised.
                  </span>
                </h1>

                <p className="fade-up-3 mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                  TutorLink helps USM students connect with seniors and peers for
                  the exact courses they need — with bookings, notes, reminders,
                  and progress tracking.
                </p>

                <div className="fade-up-4 mt-6 grid gap-2 text-xs sm:text-sm text-slate-300 max-w-xl">
                  {[
                    "Search tutors by course code, not guesswork",
                    "Keep sessions structured with history and notes",
                    "Build momentum with milestones and rankings",
                  ].map((text) => (
                    <div key={text} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-violet-300 mt-0.5" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>

                <div className="fade-up-5 mt-8 flex flex-wrap gap-3 sm:gap-4 text-sm">
                  <Link
                    href="/find-tutor"
                    className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-500 px-5 py-2.5 font-semibold text-white shadow hover:opacity-90 transition"
                  >
                    Find a Tutor
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    href="/auth/register"
                    className="rounded-md bg-slate-950/40 border border-slate-700 px-5 py-2.5 font-semibold text-slate-200 hover:border-violet-400 hover:text-violet-200 transition"
                  >
                    Create Account
                  </Link>
                </div>

                <p className="fade-up-6 mt-4 text-[0.72rem] text-slate-400">
                  Secure by design • Built for USM coursework • Structured peer learning
                </p>
              </div>

              {/* Right: Feature card */}
              <div className="fade-up-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-6 sm:p-7 shadow-lg shadow-violet-900/15 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-100">
                      Platform highlights
                    </h2>
                    <span className="text-[0.7rem] text-slate-400">Core features</span>
                  </div>

                  <div className="mt-5 grid gap-3 text-xs">
                    {features.map((f) => {
                      const Icon = f.icon;
                      return (
                        <div
                          key={f.title}
                          className="rounded-xl border border-slate-800 bg-slate-950/35 p-4 hover:border-violet-500/35 transition"
                        >
                          <div className="flex items-start gap-3">
                            <Icon size={18} className="text-violet-300 mt-0.5" />
                            <div>
                              <div className="font-semibold text-slate-100">
                                {f.title}
                              </div>
                              <div className="mt-1 text-slate-300 leading-relaxed">
                                {f.desc}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-xl border border-violet-500/18 bg-violet-950/25 p-4 text-xs text-violet-200">
                    <div className="flex items-start gap-2">
                      <Sparkles size={16} className="mt-0.5 text-violet-200" />
                      <div>
                        <span className="font-semibold text-violet-100">Note:</span>{" "}
                        Tutoring can help seniors build leadership experience and strengthen academic confidence.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/45 p-6">
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
                className="rounded-xl border border-slate-800 bg-slate-950/25 p-4"
              >
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50">
                  <Icon size={18} className="text-violet-300" />
                </div>
                <div className="text-xl font-bold text-slate-100">
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-slate-400">{item.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section>
        <h2 className="text-center text-xl font-semibold bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
          How TutorLink Works
        </h2>

        <div className="mt-8 grid gap-6 md:grid-cols-4 text-xs">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="rounded-xl border border-slate-800 bg-slate-900/65 p-5 shadow-md hover:shadow-violet-700/25 transition"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/35">
                    <Icon size={16} className="text-violet-300" />
                  </div>
                  <h3 className="text-violet-300 font-semibold">{item.step}</h3>
                </div>
                <p className="mt-3 text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
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
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow transition hover:border-violet-500/35"
            >
              <p className="text-slate-200 leading-relaxed">“{r.quote}”</p>
              <p className="mt-3 text-[0.7rem] text-slate-400">– {r.user}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-7">
        <h2 className="text-center text-xl font-semibold bg-gradient-to-r from-violet-300 to-indigo-300 bg-clip-text text-transparent">
          FAQ
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {faqs.map((f) => (
            <div
              key={f.q}
              className="rounded-xl border border-slate-800 bg-slate-950/25 p-5"
            >
              <div className="text-sm font-semibold text-slate-100">{f.q}</div>
              <div className="mt-2 text-xs text-slate-300 leading-relaxed">
                {f.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-violet-700/20 blur-3xl -z-10" />
        <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl -z-10" />

        <div className="flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold text-slate-100">
            Ready to learn with the right support?
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300 leading-relaxed">
            Find tutors for your exact course, book properly, track progress, and
            stay consistent.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-500 px-6 py-2.5 font-semibold text-white shadow hover:opacity-90 transition"
            >
              Create Account
              <ArrowRight size={16} />
            </Link>

            <Link
              href="/find-tutor"
              className="rounded-md border border-slate-700 bg-slate-950/35 px-6 py-2.5 font-semibold text-slate-200 hover:border-violet-400 hover:text-violet-200 transition"
            >
              Browse Tutors
            </Link>
          </div>
        </div>
      </section>

      {/* Simple fade-up animations (self-contained) */}
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
        .fade-up-1,
        .fade-up-2,
        .fade-up-3,
        .fade-up-4,
        .fade-up-5,
        .fade-up-6 {
          opacity: 0;
          animation: fadeUp 700ms ease forwards;
        }
        .fade-up-1 {
          animation-delay: 80ms;
        }
        .fade-up-2 {
          animation-delay: 160ms;
        }
        .fade-up-3 {
          animation-delay: 240ms;
        }
        .fade-up-4 {
          animation-delay: 320ms;
        }
        .fade-up-5 {
          animation-delay: 400ms;
        }
        .fade-up-6 {
          animation-delay: 480ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .fade-up-1,
          .fade-up-2,
          .fade-up-3,
          .fade-up-4,
          .fade-up-5,
          .fade-up-6 {
            opacity: 1 !important;
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
