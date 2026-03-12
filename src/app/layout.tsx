// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import NavbarActions from "@/components/NavbarActions";
import Image from "next/image";
import UserPresenceBeacon from "@/components/presence/UserPresenceBeacon";

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
          <UserPresenceBeacon />
          <div className="relative flex min-h-screen flex-col">

            {/* GLOBAL HEADER */}
            <header className="sticky top-0 z-50">
              {/* Thin animated gradient accent line at very top */}
              <div className="h-[2.5px] w-full bg-gradient-to-r from-[rgb(var(--primary))] via-[rgb(var(--primary2,var(--primary)))] to-[rgb(var(--primary))] opacity-80" />

              <div className="border-b border-[rgb(var(--border))]/60 bg-[rgb(var(--bg))]/50 backdrop-blur-xl">
                <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">

                  {/* Brand */}
                  <Link href="/" className="flex items-center group">
                    <div className="relative h-9 w-[155px] flex-shrink-0 transition-opacity group-hover:opacity-85">
                      <Image
                        src="/logo.png"
                        alt="TutorLink Logo"
                        width={130}
                        height={32}
                        className="h-10 w-auto object-contain flex-shrink-0"
                        priority
                      />
                    </div>
                  </Link>

                  {/* Right side */}
                  <div className="flex items-center gap-1.5">

                    {/* Nav links */}
                    <div className="hidden items-center gap-1 md:flex">
                      <Link
                        href="/"
                        className="nav-link relative rounded-xl px-3 py-2 text-sm font-medium text-[rgb(var(--muted2))] transition-colors hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
                      >
                        Home
                      </Link>

                      <Link
                        href="/find-tutor"
                        className="nav-link relative rounded-xl px-3 py-2 text-sm font-medium text-[rgb(var(--muted2))] transition-colors hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
                      >
                        Find Tutor
                      </Link>

                      {/* AI Hub — subtle shimmer badge */}
                      <Link
                        href="/study"
                        className="nav-link group/ai relative rounded-xl px-3 py-2 text-sm font-medium text-[rgb(var(--muted2))] transition-colors hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
                        title="AI-powered study tools"
                      >
                        <span className="flex items-center gap-1.5">
                          AI Hub
                          <span className="inline-flex items-center rounded-full bg-[rgb(var(--primary))]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--primary))] transition-colors group-hover/ai:bg-[rgb(var(--primary))]/25">
                            New
                          </span>
                        </span>
                      </Link>

                      {/* SOS Help — vivid gradient pill */}
                      <Link
                        href="/sos"
                        className="
                          relative ml-1 overflow-hidden rounded-xl px-4 py-2
                          text-sm font-semibold text-white
                          bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary2,var(--primary)))]
                          shadow-[0_4px_14px_rgba(0,0,0,0.18)]
                          transition-all duration-200
                          hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)]
                          hover:scale-[1.03]
                          active:scale-[0.98]
                        "
                        title="Request urgent academic help"
                      >
                        <span className="flex items-center gap-1.5">
                          {/* Pulsing dot */}
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                          </span>
                          SOS Help
                        </span>
                      </Link>
                    </div>

                    {/* Theme toggle — between nav and profile */}
                    <ThemeToggle />

                    {/* Auth actions */}
                    <NavbarActions />
                  </div>
                </nav>
              </div>
            </header>

            {/* PAGE CONTENT */}
            <main className="flex-1">{children}</main>

            {/* GLOBAL FOOTER */}
            <footer className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))]/60">
              <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-[rgb(var(--muted2))] md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                  © {new Date().getFullYear()} TutorLink • Built for USM
                </div>
                <div className="flex gap-4">
                  <Link className="hover:text-[rgb(var(--fg))] transition-colors" href="/privacy">Privacy</Link>
                  <Link className="hover:text-[rgb(var(--fg))] transition-colors" href="/terms">Terms</Link>
                  <Link className="hover:text-[rgb(var(--fg))] transition-colors" href="/contact">Contact</Link>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}