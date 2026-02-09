// src/app/page.tsx
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const outcomes = [
  {
    title: "Less stress during peak weeks",
    desc: "When assignments pile up, you can reach the right people faster — without begging in random groups.",
  },
  {
    title: "More consistent study progress",
    desc: "Get structured help that actually moves you forward instead of one-off answers that don’t stick.",
  },
  {
    title: "Fair access for everyone",
    desc: "No more ‘you must know seniors’. Everyone gets a chance to ask and learn with equal access.",
  },
];

const stats = [
  { label: "Campus-exclusive", value: "USM only" },
  { label: "Fast coordination", value: "Book in minutes" },
  { label: "Built for students", value: "Peer-first" },
  { label: "Community trust", value: "Verified users" },
];

const testimonials = [
  {
    name: "Year 2 Student",
    quote:
      "I stopped wasting time asking around. I found someone who actually explains properly.",
  },
  {
    name: "Tutor",
    quote:
      "It’s easier to help people when everything is organized and sessions are clear.",
  },
  {
    name: "New Intake",
    quote:
      "I didn’t know many seniors yet, so this made getting help feel less intimidating.",
  },
];

const faqs = [
  {
    q: "Who can join TutorLink?",
    a: "USM students using verified USM email authentication.",
  },
  {
    q: "Is TutorLink paid?",
    a: "For MVP you can keep it free. Later you can add optional paid sessions or token-based support if needed.",
  },
  {
    q: "Is this like tuition?",
    a: "It’s peer support — short, focused help between students, designed to be affordable and accessible.",
  },
  {
    q: "Can I be a tutor?",
    a: "Yes. You can apply as a tutor, then your profile can be reviewed/approved before tutoring begins.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      {/* subtle background glow (works in light + dark) */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="
            absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full blur-3xl
            bg-[rgb(var(--shadow) / 0.22)]
          "
        />
        <div
          className="
            absolute top-40 right-[-6rem] h-72 w-72 rounded-full blur-3xl
            bg-[rgb(var(--primary2) / 0.18)]
          "
        />
      </div>

      {/* Nav */}
      <header
        className="
          sticky top-0 z-50 border-b backdrop-blur
          border-[rgb(var(--border))]
          bg-[rgb(var(--bg) / 0.75)]
        "
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--primary2))]" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">TutorLink</div>
              <div className="text-[11px] text-[rgb(var(--muted2))]">
                USM Peer Tutoring
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-[rgb(var(--muted))] md:flex">
            <a href="#why" className="hover:text-[rgb(var(--fg))]">
              Why TutorLink
            </a>
            <a href="#community" className="hover:text-[rgb(var(--fg))]">
              Community
            </a>
            <a href="#trust" className="hover:text-[rgb(var(--fg))]">
              Trust
            </a>
            <a href="#faq" className="hover:text-[rgb(var(--fg))]">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* ✅ correct path */}
            <Link
              href="/auth/login"
              className="
                rounded-xl border px-3 py-2 text-sm
                border-[rgb(var(--border))]
                bg-[rgb(var(--card) / 0.65)]
                text-[rgb(var(--fg))]
                hover:bg-[rgb(var(--card) / 0.9)]
              "
            >
              Log in
            </Link>

            {/* ✅ correct path */}
            <Link
              href="/auth/register"
              className="
                rounded-xl px-3 py-2 text-sm font-semibold text-white
                bg-[rgb(var(--primary))]
                hover:opacity-90
              "
            >
              Join with USM Email
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ✅ HERO (layout unchanged, tokenized colors + gradient visible) */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:pt-20">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="fade-up-1">
              <p
                className="
                  inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card) / 0.6)]
                  text-[rgb(var(--fg))]
                "
              >
                Campus-exclusive • Verified USM accounts
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                Get help faster.{" "}
                <span className="inline-block bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary2))] bg-clip-text text-transparent">
                  Study smarter.
                </span>{" "}
                Together at USM.
              </h1>

              <p className="mt-4 text-base leading-relaxed text-[rgb(var(--muted))]">
                TutorLink connects USM students with peer tutors through smart matching,
                easy booking, real-time chat, SOS academic help, progress analytics,
                and gamified rewards.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {/* ✅ correct path */}
                <Link
                  href="/auth/register"
                  className="
                    rounded-2xl px-5 py-3 text-sm font-semibold text-white
                    bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary2))]
                    hover:opacity-90
                  "
                >
                  Join with USM Email
                </Link>

                {/* If you don't have /apply-tutor yet, change this to an existing route */}
                <Link
                  href="/apply-tutor"
                  className="
                    rounded-2xl border px-5 py-3 text-sm font-semibold
                    border-[rgb(var(--border))]
                    bg-[rgb(var(--card) / 0.6)]
                    text-[rgb(var(--fg))]
                    hover:bg-[rgb(var(--card) / 0.9)]
                  "
                >
                  Become a Tutor
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs text-[rgb(var(--muted))]">
                {["Smart Matching", "SOS Academic Help", "Progress Analytics", "Points & Badges"].map(
                  (chip) => (
                    <span
                      key={chip}
                      className="
                        rounded-full border px-3 py-1
                        border-[rgb(var(--border))]
                        bg-[rgb(var(--card) / 0.55)]
                      "
                    >
                      {chip}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Right mock card */}
            <div
              className="
                fade-up-2 rounded-3xl border p-6
                border-[rgb(var(--border))]
                bg-[rgb(var(--card) / 0.6)]
                shadow-[0_0_60px_rgba(124,58,237,0.18)]
              "
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Find a tutor</div>
                <span
                  className="
                    rounded-full border px-2 py-1 text-[11px]
                    border-[rgb(var(--border))]
                    bg-[rgb(var(--card) / 0.55)]
                    text-[rgb(var(--muted))]
                  "
                >
                  CPT113 • Tonight
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  "Aina (4.9) • Available 9–11pm",
                  "Kumar (4.8) • Available 8–10pm",
                  "Syafiq (4.7) • Available 10–12am",
                ].map((row) => (
                  <div
                    key={row}
                    className="
                      flex items-center justify-between rounded-2xl border px-4 py-3
                      border-[rgb(var(--border))]
                      bg-[rgb(var(--card2) / 0.55)]
                    "
                  >
                    <div className="text-sm text-[rgb(var(--fg))]">{row}</div>
                    <button
                      className="
                        rounded-xl px-3 py-2 text-xs font-semibold text-white
                        bg-[rgb(var(--primary))]
                        hover:opacity-90
                      "
                      type="button"
                    >
                      Request
                    </button>
                  </div>
                ))}
              </div>

              <div
                className="
                  mt-4 rounded-2xl border p-4
                  border-[rgb(var(--border))]
                  bg-gradient-to-r from-[rgb(var(--primary) / 0.15)] to-[rgb(var(--primary2) / 0.12)]
                "
              >
                <div className="text-xs text-[rgb(var(--muted))]">Need urgent help?</div>
                <div className="mt-1 text-sm font-semibold">Use SOS Academic Help</div>
              </div>
            </div>
          </div>
        </section>

        {/* Why TutorLink (benefits, not modules) */}
        <section id="why" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="fade-up-3 flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold">Why students use TutorLink</h2>
              <p className="mt-2 text-sm text-[rgb(var(--muted))]">
                Not a feature list — just the real outcomes you want during the semester.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {outcomes.map((o) => (
              <div
                key={o.title}
                className="
                  fade-up-4 rounded-3xl border p-6 transition
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card) / 0.6)]
                  hover:bg-[rgb(var(--card) / 0.9)]
                "
              >
                <div className="text-base font-semibold">{o.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--muted))]">
                  {o.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="
                  fade-up-5 rounded-3xl border p-5
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card2) / 0.5)]
                "
              >
                <div className="text-xs text-[rgb(var(--muted2))]">{s.label}</div>
                <div className="mt-1 text-sm font-semibold">{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Community proof */}
        <section id="community" className="mx-auto max-w-6xl px-4 pb-16">
          <div
            className="
              rounded-3xl border p-8
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2) / 0.45)]
            "
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Built around USM student culture</h2>
                <p className="mt-2 text-sm text-[rgb(var(--muted))]">
                  Short, focused help. Friendly peer learning. Less awkward asking around.
                </p>
              </div>
              <div className="text-xs text-[rgb(var(--muted2))]">
                (Replace these later with real pilot feedback.)
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="
                    rounded-3xl border p-6
                    border-[rgb(var(--border))]
                    bg-[rgb(var(--card) / 0.6)]
                  "
                >
                  <p className="text-sm leading-relaxed text-[rgb(var(--fg))]">
                    “{t.quote}”
                  </p>
                  <div className="mt-3 text-xs text-[rgb(var(--muted2))]">— {t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="text-2xl font-semibold">Trust & safety by design</h2>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            A campus-only platform needs strong identity, clear boundaries, and accountability.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["USM verification", "Only verified university accounts can access the platform."],
              ["Tutor accountability", "Profiles, feedback, and reporting help keep the community safe."],
              ["Clear roles", "Students and tutors have separate permissions and experiences."],
              ["Privacy-first mindset", "Keep personal data minimal — only what’s needed for the service."],
            ].map(([t, d]) => (
              <div
                key={t}
                className="
                  rounded-3xl border p-6
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card) / 0.6)]
                "
              >
                <div className="text-sm font-semibold">{t}</div>
                <p className="mt-2 text-sm text-[rgb(var(--muted))]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ + Final CTA */}
        <section id="faq" className="mx-auto max-w-6xl px-4 pb-20">
          <h2 className="text-2xl font-semibold">FAQ</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {faqs.map((f) => (
              <div
                key={f.q}
                className="
                  rounded-3xl border p-6
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card) / 0.6)]
                "
              >
                <div className="text-sm font-semibold">{f.q}</div>
                <p className="mt-2 text-sm text-[rgb(var(--muted))]">{f.a}</p>
              </div>
            ))}
          </div>

          <div
            className="
              mt-10 rounded-3xl border p-8
              border-[rgb(var(--border))]
              bg-gradient-to-r from-[rgb(var(--primary) / 0.16)] to-[rgb(var(--primary2) / 0.12)]
            "
          >
            <h3 className="text-xl font-semibold">Ready to make academic help feel easy?</h3>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">
              Join TutorLink with your USM email and start learning with peers today.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {/* ✅ correct path */}
              <Link
                href="/auth/register"
                className="
                  rounded-2xl px-5 py-3 text-sm font-semibold text-white
                  bg-[rgb(var(--primary))]
                  hover:opacity-90
                "
              >
                Join with USM Email
              </Link>

              <Link
                href="/apply-tutor"
                className="
                  rounded-2xl border px-5 py-3 text-sm font-semibold
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card) / 0.6)]
                  text-[rgb(var(--fg))]
                  hover:bg-[rgb(var(--card) / 0.9)]
                "
              >
                Become a Tutor
              </Link>
            </div>
          </div>

          <footer
            className="
              mt-10 flex flex-col gap-2 border-t pt-6 text-xs
              border-[rgb(var(--border))]
              text-[rgb(var(--muted2))]
              md:flex-row md:items-center md:justify-between
            "
          >
            <div>© {new Date().getFullYear()} TutorLink • Built for USM</div>
            <div className="flex gap-4">
              <a className="hover:text-[rgb(var(--fg))]" href="/privacy">
                Privacy
              </a>
              <a className="hover:text-[rgb(var(--fg))]" href="/terms">
                Terms
              </a>
              <a className="hover:text-[rgb(var(--fg))]" href="/contact">
                Contact
              </a>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
