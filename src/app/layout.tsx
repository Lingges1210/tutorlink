import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import NavbarActions from "@/components/NavbarActions";
import Image from "next/image";
import UserPresenceBeacon from "@/components/presence/UserPresenceBeacon";
import FloatingAdminHomeButton from "@/components/admin/FloatingAdminHomeButton";

import { supabaseServerComponent } from "@/lib/supabaseServerComponent";
import { prisma } from "@/lib/prisma";
import FloatingWidget from "@/components/FloatingWidget";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "TutorLink – USM Peer Tutoring",
  description:
    "TutorLink is a campus-exclusive peer tutoring platform for Universiti Sains Malaysia students.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🔐 Get logged-in user
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🔐 Check admin role
  let isAdmin = false;

  if (user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true },
    });

    isAdmin = dbUser?.role === "ADMIN";
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
        <ThemeProvider>
          <FloatingWidget isLoggedIn={!isAdmin} />
          <UserPresenceBeacon />

          

          <div className="relative flex min-h-screen flex-col">
            {/* GLOBAL HEADER */}
            <header className="sticky top-0 z-50">
              {/* Top gradient line */}
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
                    <div className="hidden items-center gap-1 md:flex">
                      <ThemeToggle />

                      <Link
                        href="/"
                        className="nav-link rounded-xl px-3 py-2 text-sm font-medium text-[rgb(var(--muted2))] transition-colors hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
                      >
                        Home
                      </Link>

                      <Link
                        href="/find-tutor"
                        prefetch
                        className="nav-link rounded-xl px-3 py-2 text-sm font-medium text-[rgb(var(--muted2))] transition-colors hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
                      >
                        Find Tutor
                      </Link>

                      {/* AI Hub */}
                      <Link
                        href="/study"
                        className="nav-link group/ai rounded-xl px-3 py-2 text-sm font-medium text-[rgb(var(--muted2))] transition-colors hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]"
                      >
                        <span className="flex items-center gap-1.5">
                          AI Hub
                          <span className="rounded-full bg-[rgb(var(--primary))]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--primary))]">
                            New
                          </span>
                        </span>
                      </Link>

                      {/* SOS */}
                      <Link
                        href="/sos"
                        prefetch
                        className="ml-1 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary2,var(--primary)))] shadow hover:scale-[1.03] active:scale-[0.98] transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute h-full w-full animate-ping rounded-full bg-white opacity-60" />
                            <span className="relative h-2 w-2 rounded-full bg-white" />
                          </span>
                          SOS Help
                        </span>
                      </Link>
                    </div>

                    <NavbarActions />
                  </div>
                </nav>
              </div>
            </header>

            {/* CONTENT */}
            <main className="flex-1">{children}</main>

            {/* FOOTER */}
            <footer className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))]/60">
              <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-[rgb(var(--muted2))] md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                  © {new Date().getFullYear()} TutorLink • Built for USM
                </div>
                <div className="flex gap-4">
                  <span className="cursor-default">Privacy</span>
                  <span className="cursor-default">Terms</span>
                  <span className="cursor-default">Contact</span>
                </div>
              </div>
            </footer>
          </div>
          <FloatingAdminHomeButton isAdmin={isAdmin} />
        </ThemeProvider>
      </body>
    </html>
  );
}