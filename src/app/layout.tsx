// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TutorLink – USM Peer Tutoring",
  description:
    "TutorLink is a campus-exclusive peer tutoring platform for Universiti Sains Malaysia students.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div className="relative flex min-h-screen flex-col">
          {/* Navbar */}
          <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
            <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
              {/* Brand */}
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold">
                  TL
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-slate-50">
                    TutorLink
                  </span>
                  <span className="text-[0.65rem] text-slate-400">
                    USM Peer Tutoring
                  </span>
                </div>
              </Link>

              {/* Desktop links */}
              <div className="hidden items-center gap-6 text-xs font-medium text-slate-300 md:flex">
                <Link
                  href="/"
                  className="hover:text-violet-300 transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/find-tutor"
                  className="hover:text-violet-300 transition-colors"
                >
                  Find Tutor
                </Link>
                {/* Later, when we have real session, we’ll conditionally show Dashboard/Logout here */}
                <Link
                  href="/auth/login"
                  className="rounded-md bg-violet-600 px-3 py-1.5 text-slate-50 hover:bg-violet-500"
                >
                  Login
                </Link>
              </div>

              {/* Mobile simple menu – keep it minimal for now */}
              <div className="flex items-center gap-2 md:hidden">
                <Link
                  href="/find-tutor"
                  className="text-xs text-slate-300 hover:text-violet-300"
                >
                  Find Tutor
                </Link>
                <Link
                  href="/auth/login"
                  className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-slate-50 hover:bg-violet-500"
                >
                  Login
                </Link>
              </div>
            </nav>
          </header>

          {/* Page content */}
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>

          {/* Footer (simple) */}
          <footer className="border-t border-slate-800 bg-slate-950/90">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-[0.7rem] text-slate-500 sm:px-6 lg:px-8">
              <span>© {new Date().getFullYear()} TutorLink @ USM</span>
              <span>Built as FYP – Campus-exclusive peer tutoring</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
