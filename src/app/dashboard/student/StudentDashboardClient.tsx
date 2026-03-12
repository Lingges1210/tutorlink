"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type VerificationStatus = "AUTO_VERIFIED" | "PENDING_REVIEW";

type Props = {
  user: {
    email: string;
    name: string | null;
    role: string;
    verificationStatus: VerificationStatus | string;
  };
  isTutor: boolean;
};

function DashboardSwitcher({
  isTutor,
  active,
}: {
  isTutor: boolean;
  active: "student" | "tutor";
}) {
  if (!isTutor) return null;

  return (
    <div className="inline-flex overflow-hidden rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))]">
      <Link
        href="/dashboard/student"
        className={[
          "px-4 py-1.5 text-xs font-semibold transition-all duration-200",
          active === "student"
            ? "bg-[rgb(var(--primary))] text-white shadow-sm"
            : "text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]",
        ].join(" ")}
      >
        Student
      </Link>
      <Link
        href="/dashboard/tutor"
        className={[
          "px-4 py-1.5 text-xs font-semibold transition-all duration-200 border-l border-[rgb(var(--border))]",
          active === "tutor"
            ? "bg-[rgb(var(--primary))] text-white shadow-sm"
            : "text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]",
        ].join(" ")}
      >
        Tutor
      </Link>
    </div>
  );
}

function VerificationBadge({ status }: { status: VerificationStatus | string }) {
  const verified = status === "AUTO_VERIFIED";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border",
        verified
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      ].join(" ")}
    >
      <span
        className={[
          "w-1.5 h-1.5 rounded-full shrink-0",
          verified ? "bg-emerald-500" : "bg-amber-500 animate-pulse",
        ].join(" ")}
      />
      {verified ? "Verified" : "Pending"}
    </span>
  );
}

function PrimaryLinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="
        inline-flex items-center justify-center gap-1.5
        rounded-lg px-4 py-2 text-xs font-semibold text-white
        bg-[rgb(var(--primary))]
        transition-all duration-200
        hover:-translate-y-0.5
        hover:shadow-[0_6px_20px_rgb(var(--primary)/0.35)]
        active:translate-y-0 active:shadow-none
      "
    >
      {children}
    </Link>
  );
}

function DisabledButton({ children }: { children: ReactNode }) {
  return (
    <button
      disabled
      className="
        inline-flex items-center justify-center gap-1.5
        cursor-not-allowed rounded-lg px-4 py-2 text-xs font-semibold
        border border-[rgb(var(--border))]
        bg-[rgb(var(--card2))]
        text-[rgb(var(--muted2))]
        opacity-50
      "
      type="button"
    >
      {children}
    </button>
  );
}

/* ── SVG icon set (inline, no emoji) ── */
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="4.5" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" />
    </svg>
  );
}
function IconGradCap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" />
      <polyline points="6 11.5 6 17 12 20 18 17 18 11.5" />
    </svg>
  );
}
function IconTrendUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H3.5a2.5 2.5 0 0 0 0 5H6" />
      <path d="M18 9h2.5a2.5 2.5 0 0 1 0 5H18" />
      <path d="M6 3h12v10a6 6 0 0 1-12 0V3z" />
      <line x1="9" y1="21" x2="15" y2="21" />
      <line x1="12" y1="19" x2="12" y2="21" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="6" x2="10" y2="6" />
      <polyline points="7 3 10 6 7 9" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/* ── Stat pill ── */
function StatPill({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2">
      <span className="text-[rgb(var(--primary))] opacity-70">{icon}</span>
      <div>
        <p className="text-[0.6rem] text-[rgb(var(--muted2))] leading-none uppercase tracking-wide">{label}</p>
        <p className="text-xs font-semibold text-[rgb(var(--fg))] mt-0.5">{value}</p>
      </div>
    </div>
  );
}

/* ── Dashboard Card ── */
type DashboardCardProps = {
  iconEl: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
  locked?: boolean;
  badge?: string;
};

function DashboardCard({ iconEl, title, description, action, locked, badge }: DashboardCardProps) {
  return (
    <div
      className={[
        "group relative rounded-3xl border overflow-hidden p-6",
        "border-[rgb(var(--border))]",
        "bg-[rgb(var(--card)/0.75)]",
        "shadow-[0_2px_12px_rgb(var(--shadow)/0.06)]",
        "transition-all duration-300",
        !locked
          ? "hover:-translate-y-1 hover:shadow-[0_20px_56px_rgb(var(--shadow)/0.13)]"
          : "opacity-75",
      ].join(" ")}
    >
      {/* top accent line */}
      <div
        className={[
          "absolute inset-x-0 top-0 h-[1.5px]",
          locked
            ? "bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
            : "bg-gradient-to-r from-transparent via-[rgb(var(--primary)/0.55)] to-transparent",
        ].join(" ")}
      />

      {badge && (
        <span className="absolute top-4 right-4 rounded-full bg-[rgb(var(--primary)/0.1)] text-[rgb(var(--primary))] px-2 py-0.5 text-[0.6rem] font-semibold border border-[rgb(var(--primary)/0.18)] uppercase tracking-wide">
          {badge}
        </span>
      )}

      <div className="flex items-start gap-3 mb-4">
        <div
          className={[
            "flex items-center justify-center w-9 h-9 rounded-xl shrink-0 border",
            locked
              ? "bg-[rgb(var(--card2))] border-[rgb(var(--border))] text-[rgb(var(--muted2))]"
              : "bg-[rgb(var(--primary)/0.1)] border-[rgb(var(--primary)/0.2)] text-[rgb(var(--primary))]",
          ].join(" ")}
        >
          {iconEl}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))] leading-snug">{title}</h2>
          <p className="mt-0.5 text-xs text-[rgb(var(--muted))] leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {action}
        {locked && (
          <span className="inline-flex items-center gap-1 text-[0.65rem] text-[rgb(var(--muted2))]">
            <IconLock />
            Unlocks after verification
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Section label ── */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[rgb(var(--muted2))]">
      {children}
    </p>
  );
}

/* ══════════════════════════════════════
   Main Component
══════════════════════════════════════ */
export default function StudentDashboardClient({ user, isTutor }: Props) {
  const isVerified = user.verificationStatus === "AUTO_VERIFIED";
  const firstName = user.name?.split(" ")[0] ?? "there";

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.8)] shadow-[0_4px_32px_rgb(var(--shadow)/0.09)] p-6">
        {/* BG blobs */}
        <div className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 rounded-full bg-[rgb(var(--primary)/0.07)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-0 w-40 h-40 rounded-full bg-[rgb(var(--primary)/0.04)] blur-2xl" />
        {/* Decorative dot grid top-right */}
        <svg className="pointer-events-none absolute top-4 right-4 opacity-[0.04] dark:opacity-[0.07]" width="80" height="80" viewBox="0 0 80 80">
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 5 }).map((_, col) => (
              <circle key={`${row}-${col}`} cx={col * 16 + 8} cy={row * 16 + 8} r="1.5" fill="rgb(var(--fg))" />
            ))
          )}
        </svg>

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          {/* Left: avatar + name */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-[rgb(var(--primary)/0.12)] border border-[rgb(var(--primary)/0.22)] text-[rgb(var(--primary))] font-bold text-lg shrink-0 select-none">
              {(user.name ?? "S").charAt(0).toUpperCase()}
              {isVerified && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[rgb(var(--card))] flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 5 4.5 7.5 8.5 3" />
                  </svg>
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-[rgb(var(--muted))] font-medium">{greeting}</p>
              <h1 className="text-xl font-bold text-[rgb(var(--fg))] leading-tight">{firstName}</h1>
              <p className="mt-0.5 text-[0.68rem] text-[rgb(var(--muted2))]">{user.email}</p>
            </div>
          </div>

          {/* Right: switcher + badge */}
          <div className="flex flex-wrap items-center gap-2">
            <DashboardSwitcher isTutor={isTutor} active="student" />
            <VerificationBadge status={user.verificationStatus} />
          </div>
        </div>

        {/* Quick stats */}
        <div className="relative mt-5 flex flex-wrap gap-2">
          <StatPill
            icon={<IconUser />}
            label="Role"
            value="Student"
          />
          <StatPill
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
            label="Status"
            value={isVerified ? "Verified" : "Pending review"}
          />
          <StatPill
            icon={<IconStar />}
            label="Platform"
            value="TutorLink"
          />
        </div>
      </div>

      {/* ── Pending Banner ── */}
      {!isVerified && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/8 dark:bg-amber-500/10 px-5 py-4">
          <span className="mt-0.5 shrink-0 text-amber-500">
            <IconWarning />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Verification pending</p>
            <p className="mt-0.5 text-xs text-[rgb(var(--muted))] leading-relaxed">
              Your matric card is under review. Some features are locked until a TutorLink admin verifies your account.
            </p>
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <section>
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid gap-4 md:grid-cols-[2fr_1.2fr]">
          <DashboardCard
            iconEl={<IconSearch />}
            title="Find a Tutor"
            description="Use smart matching to connect with verified peers who can help you with any subject."
            badge="Popular"
            action={
              isVerified
                ? (
                  <PrimaryLinkButton href="/find-tutor">
                    Find a Tutor <IconArrowRight />
                  </PrimaryLinkButton>
                )
                : <DisabledButton>Find a Tutor</DisabledButton>
            }
            locked={!isVerified}
          />

          {!isTutor && (
            <DashboardCard
              iconEl={<IconGradCap />}
              title="Become a Tutor"
              description="Apply to tutor your peers and build your profile while you learn."
              action={
                isVerified
                  ? (
                    <PrimaryLinkButton href="/dashboard/student/apply-tutor">
                      Apply Now <IconArrowRight />
                    </PrimaryLinkButton>
                  )
                  : <DisabledButton>Apply as Tutor</DisabledButton>
              }
              locked={!isVerified}
            />
          )}
        </div>
      </section>

      {/* ── Growth ── */}
      <section>
        <SectionLabel>Your Growth</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <DashboardCard
            iconEl={<IconTrendUp />}
            title="Progress Tracking"
            description="View study streaks, subject breakdowns, and topic coverage. Export a progress report anytime."
            action={
              isVerified
                ? (
                  <PrimaryLinkButton href="/dashboard/student/progress">
                    View Progress <IconArrowRight />
                  </PrimaryLinkButton>
                )
                : <DisabledButton>View Progress</DisabledButton>
            }
            locked={!isVerified}
          />
          <DashboardCard
            iconEl={<IconTrophy />}
            title="Achievements"
            description="Track your points, unlock badges, and climb the weekly leaderboard rankings."
            badge="New"
            action={
              isVerified
                ? (
                  <PrimaryLinkButton href="/dashboard/student/achievements">
                    View Achievements <IconArrowRight />
                  </PrimaryLinkButton>
                )
                : <DisabledButton>View Achievements</DisabledButton>
            }
            locked={!isVerified}
          />
        </div>
      </section>

      {/* ── History ── */}
      <section>
        <SectionLabel>History</SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          <DashboardCard
            iconEl={<IconClock />}
            title="Session History"
            description="Review notes, topics covered, and feedback from all your past tutoring sessions."
            action={
              isVerified
                ? (
                  <PrimaryLinkButton href="/dashboard/student/progress?tab=history">
                    Open History <IconArrowRight />
                  </PrimaryLinkButton>
                )
                : <DisabledButton>Open History</DisabledButton>
            }
            locked={!isVerified}
          />
        </div>
      </section>

    </div>
  );
}