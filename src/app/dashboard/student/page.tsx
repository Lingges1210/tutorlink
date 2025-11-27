// src/app/dashboard/student/page.tsx
import Link from "next/link";

export default function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-50">
          Student Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-300 max-w-2xl">
          Welcome to TutorLink. From here, you can track your tutoring sessions,
          find help for difficult subjects, and – if you want – apply to become
          a peer tutor for other USM students.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Upcoming Sessions
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            This section will show your upcoming booked sessions once session
            booking is implemented.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Recent Subjects & Topics
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Here you&apos;ll see a history of which subjects you&apos;ve studied,
            including topics covered with peer tutors.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Study Consistency & Streaks
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Progress analytics like weekly session counts and streaks will be
            displayed in this area.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[2fr,1.2fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-sm font-semibold text-slate-100">
            Need help with a subject?
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            Use the TutorLink matching system to find seniors or peers who are
            confident in the subjects you&apos;re struggling with.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <Link
              href="/find-tutor"
              className="rounded-md bg-violet-600 px-3 py-2 font-medium text-slate-50 hover:bg-violet-500"
            >
              Find a Tutor
            </Link>
            <button
              type="button"
              className="rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-200 hover:border-violet-400 hover:text-violet-300"
            >
              SOS Help (Coming Soon)
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-sm font-semibold text-slate-100">
            Want to become a tutor?
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            If you enjoy explaining concepts to friends and have completed
            certain subjects with good results, you can apply to become a peer
            tutor. Admins will review your application.
          </p>
          <Link
            href="/dashboard/tutor"
            className="mt-3 inline-flex rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-slate-50 hover:bg-emerald-500"
          >
            Apply as Tutor
          </Link>
          <p className="mt-2 text-[0.7rem] text-slate-400">
            Once your application is approved, additional tutor tools and
            analytics will appear in your dashboard.
          </p>
        </div>
      </section>
    </div>
  );
}
