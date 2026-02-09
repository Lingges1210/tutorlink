// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

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
      <body className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))] transition-colors">
        <div className="relative flex min-h-screen flex-col">
          {/* Navbar */}
          <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
            <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
              {/* Brand */}
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white">
                  TL
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    TutorLink
                  </span>
                  <span className="text-[0.65rem] text-slate-500 dark:text-slate-400">
                    USM Peer Tutoring
                  </span>
                </div>
              </Link>

              {/* Right side (single toggle only) */}
              <div className="flex items-center gap-3">
                {/* Links (desktop only) */}
                <div className="hidden items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300 md:flex">
                  <Link
                    href="/"
                    className="hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
                  >
                    Home
                  </Link>
                  <Link
                    href="/find-tutor"
                    className="hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
                  >
                    Find Tutor
                  </Link>
                </div>

                <ThemeToggle />

                <Link
                  href="/auth/login"
                  className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition"
                >
                  Login
                </Link>
              </div>
            </nav>
          </header>

          {/* Page content */}
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-[0.7rem] text-slate-600 dark:text-slate-500 sm:px-6 lg:px-8">
              <span>© {new Date().getFullYear()} TutorLink</span>
              <span>Campus-exclusive peer tutoring</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
