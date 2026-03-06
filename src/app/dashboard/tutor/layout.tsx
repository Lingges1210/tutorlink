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
            <header className="sticky top-0 z-50 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg) / 0.75)] backdrop-blur">
              <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                {/* Brand */}
                <Link href="/" className="flex items-center">
                  <div className="relative h-9 w-[155px] flex-shrink-0">
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
                <div className="flex items-center gap-2">
                  <ThemeToggle />

                  <div className="hidden items-center gap-2 md:flex">
                    <Link
                      href="/"
                      className="rounded-xl px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--card)/0.9)]"
                    >
                      Home
                    </Link>

                    <Link
                      href="/find-tutor"
                      className="rounded-xl px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--card)/0.9)]"
                    >
                      Find Tutor
                    </Link>

                    <Link
                      href="/study"
                      className="rounded-xl px-3 py-2 text-sm font-medium hover:bg-[rgb(var(--card)/0.9)]"
                      title="AI-powered study tools"
                    >
                      AI Hub
                    </Link>

                    <Link
                      href="/sos"
                      className="
                        rounded-xl px-3 py-2 text-sm font-semibold text-white
                        bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary2))]
                        shadow-[0_8px_20px_rgba(0,0,0,0.25)]
                        hover:opacity-95
                        transition
                      "
                      title="Request urgent academic help"
                    >
                      SOS Help
                    </Link>
                  </div>

                  <NavbarActions />
                </div>
              </nav>
            </header>

            {/* PAGE CONTENT */}
            <main className="flex-1">{children}</main>

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