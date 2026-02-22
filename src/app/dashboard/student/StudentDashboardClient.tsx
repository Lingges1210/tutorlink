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
          "px-3 py-2 text-xs font-semibold transition",
          active === "student"
            ? "bg-[rgb(var(--primary)/0.14)] text-[rgb(var(--primary))]"
            : "text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
        ].join(" ")}
      >
        Student
      </Link>

      <Link
        href="/dashboard/tutor"
        className={[
          "px-3 py-2 text-xs font-semibold transition border-l border-[rgb(var(--border))]",
          active === "tutor"
            ? "bg-[rgb(var(--primary)/0.14)] text-[rgb(var(--primary))]"
            : "text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]",
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
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border",
        verified
          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-500"
          : "border-amber-500/30 bg-amber-500/15 text-amber-500",
      ].join(" ")}
    >
      {verified ? "Verified" : "Pending verification"}
    </span>
  );
}

function PrimaryLinkButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="
        inline-flex items-center justify-center
        rounded-md px-3 py-2 text-xs font-semibold text-white
        bg-[rgb(var(--primary))]
        transition-all duration-200
        hover:-translate-y-0.5
        hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.35)]
      "
    >
      {children}
    </Link>
  );
}

function DisabledButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      disabled
      className="
        inline-flex items-center justify-center
        cursor-not-allowed rounded-md px-3 py-2 text-xs font-semibold
        border border-[rgb(var(--border))]
        bg-[rgb(var(--card2))]
        text-[rgb(var(--muted2))]
        opacity-70
      "
      type="button"
    >
      {children}
    </button>
  );
}

export default function StudentDashboardClient({ user, isTutor }: Props) {
  const isVerified = user.verificationStatus === "AUTO_VERIFIED";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="
          rounded-3xl border p-6
          border-[rgb(var(--border))]
          bg-[rgb(var(--card) / 0.7)]
          shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]
        "
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">
              Student Dashboard
            </h1>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">
              Welcome, {user.name ?? "Student"}. Manage your learning and sessions
              here.
            </p>
            <p className="mt-1 text-xs text-[rgb(var(--muted2))]">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DashboardSwitcher isTutor={isTutor} active="student" />
            <VerificationBadge status={user.verificationStatus} />
          </div>
        </div>
      </div>

      {/* Pending banner */}
      {!isVerified && (
        <div
          className="
            rounded-3xl border p-5
            border-amber-500/30
            bg-amber-500/10
            text-[rgb(var(--fg))]
          "
        >
          <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            ⚠️ Pending verification
          </div>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Your matric card is under review. Some features are disabled until
            TutorLink admin verifies your account.
          </p>
        </div>
      )}

      {/* Main cards */}
      <section className="grid gap-4 md:grid-cols-[2fr,1.2fr]">
        {/* Find tutor */}
        <div
          className="
            rounded-3xl border p-6
            border-[rgb(var(--border))]
            bg-[rgb(var(--card) / 0.7)]
            shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]
            transition-all duration-200
            hover:-translate-y-0.5
            hover:shadow-[0_28px_80px_rgb(var(--shadow)/0.14)]
          "
        >
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
            Need help with a subject?
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--muted))]">
            Use matching to find peers who can help.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {isVerified ? (
              <PrimaryLinkButton href="/find-tutor">
                Find a Tutor
              </PrimaryLinkButton>
            ) : (
              <DisabledButton>Find a Tutor</DisabledButton>
            )}
          </div>

          {!isVerified && (
            <p className="mt-3 text-[0.7rem] text-[rgb(var(--muted2))]">
              This feature unlocks after verification.
            </p>
          )}
        </div>

        {/* Apply tutor card (hide if already tutor) */}
        {!isTutor && (
          <div
            className="
              rounded-3xl border p-6
              border-[rgb(var(--border))]
              bg-[rgb(var(--card) / 0.7)]
              shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]
              transition-all duration-200
              hover:-translate-y-0.5
              hover:shadow-[0_28px_80px_rgb(var(--shadow)/0.14)]
            "
          >
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
              Want to become a tutor?
            </h2>
            <p className="mt-1 text-xs text-[rgb(var(--muted))]">
              Apply and admins will review your application.
            </p>

            <div className="mt-4">
              {isVerified ? (
                <PrimaryLinkButton href="/dashboard/student/apply-tutor">
                  Apply as Tutor
                </PrimaryLinkButton>
              ) : (
                <DisabledButton>Apply as Tutor</DisabledButton>
              )}
            </div>

            <p className="mt-3 text-[0.7rem] text-[rgb(var(--muted2))]">
              Requires verification.
            </p>
          </div>
        )}
      </section>

      {/*  NEW: Progress Tracking card (inside dashboard) */}
      <section className="grid gap-4 md:grid-cols-2">
        <div
          className="
            rounded-3xl border p-6
            border-[rgb(var(--border))]
            bg-[rgb(var(--card) / 0.7)]
            shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]
            transition-all duration-200
            hover:-translate-y-0.5
            hover:shadow-[0_28px_80px_rgb(var(--shadow)/0.14)]
          "
        >
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
            Progress Tracking
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--muted))]">
            View your progress by subject, study streak, and topics covered.
            Export a progress report anytime.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {isVerified ? (
              <PrimaryLinkButton href="/dashboard/student/progress">
                View Progress
              </PrimaryLinkButton>
            ) : (
              <DisabledButton>View Progress</DisabledButton>
            )}
          </div>

          {!isVerified && (
            <p className="mt-3 text-[0.7rem] text-[rgb(var(--muted2))]">
              Unlocks after verification.
            </p>
          )}
        </div>

        {/* optional second card placeholder (if you want later) */}
        <div
          className="
            rounded-3xl border p-6
            border-[rgb(var(--border))]
            bg-[rgb(var(--card) / 0.7)]
            shadow-[0_20px_60px_rgb(var(--shadow)/0.08)]
          "
        >
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">
            Session History
          </h2>
          <p className="mt-1 text-xs text-[rgb(var(--muted))]">
            Quickly review what you learned in past sessions.
          </p>

          <div className="mt-4">
            {isVerified ? (
              <Link
                href="/dashboard/student/progress?tab=history"
                className="inline-flex items-center justify-center rounded-md px-3 py-2 text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-[rgb(var(--fg))] hover:bg-[rgb(var(--card)/0.6)]"
              >
                Open History
              </Link>
            ) : (
              <DisabledButton>Open History</DisabledButton>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}