// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "TutorLink – USM Peer Tutoring",
  description:
    "TutorLink is a campus-exclusive peer tutoring platform for Universiti Sains Malaysia students.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
        <ThemeProvider>
          <div className="relative flex min-h-screen flex-col">
            {/* GLOBAL HEADER */}
            <header className="sticky top-0 z-50 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg) / 0.75)] backdrop-blur">
              <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--primary2))]" />
                  <div className="leading-tight">
                    <div className="text-sm font-semibold">TutorLink</div>
                    <div className="text-[11px] text-[rgb(var(--muted2))]">
                      USM Peer Tutoring
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  <div className="hidden items-center gap-6 text-sm text-[rgb(var(--muted))] md:flex">
                    <Link href="/" className="hover:text-[rgb(var(--fg))]">
                      Home
                    </Link>
                    <Link href="/find-tutor" className="hover:text-[rgb(var(--fg))]">
                      Find Tutor
                    </Link>
                  </div>

                  <ThemeToggle />

                  <Link
                    href="/auth/login"
                    className="
                      rounded-xl border px-3 py-2 text-sm
                      border-[rgb(var(--border))]
                      bg-[rgb(var(--card) / 0.65)]
                      hover:bg-[rgb(var(--card) / 0.9)]
                    "
                  >
                    Log in
                  </Link>

                  <Link
                    href="/auth/register"
                    className="
                      rounded-xl px-3 py-2 text-sm font-semibold text-white
                      bg-[rgb(var(--primary))]
                      hover:opacity-90
                    "
                  >
                    Join
                  </Link>
                </div>
              </nav>
            </header>

            {/* PAGE CONTENT */}
            <main className="flex-1">
              {children}
            </main>

            {/* GLOBAL FOOTER */}
            <footer className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg) / 0.6)]">
              <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-[rgb(var(--muted2))] md:flex-row md:items-center md:justify-between">
                <div>© {new Date().getFullYear()} TutorLink • Built for USM</div>
                <div className="flex gap-4">
                  <Link className="hover:text-[rgb(var(--fg))]" href="/privacy">
                    Privacy
                  </Link>
                  <Link className="hover:text-[rgb(var(--fg))]" href="/terms">
                    Terms
                  </Link>
                  <Link className="hover:text-[rgb(var(--fg))]" href="/contact">
                    Contact
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
