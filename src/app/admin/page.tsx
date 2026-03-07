// src/app/admin/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type QueueUser = {
  id: string;
  email: string;
  name: string | null;
  matricNo: string | null;
  matricCardUrl: string | null;
  verificationStatus: string;
  createdAt?: string;
  ocrMatchedMatric?: boolean;
  ocrMatchedName?: boolean;
};

type TutorAppRow = {
  id: string;
  subjects: string;
  cgpa: number | null;
  availability: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  createdAt: string;
  reviewedAt: string | null;
  rejectionReason?: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    matricNo: string | null;
  };
};

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();

  if (s === "AUTO_VERIFIED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        Verified
      </span>
    );
  }

  if (s === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-400">
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
      Pending
    </span>
  );
}


export default function AdminPage() {
  

  // --- Verification queue state ---
  const [queue, setQueue] = useState<QueueUser[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // --- Tutor applications state (preview only) ---
  const [tutorApps, setTutorApps] = useState<TutorAppRow[]>([]);
  const [tutorLoading, setTutorLoading] = useState(true);
  const [tutorError, setTutorError] = useState<string | null>(null);

  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const pendingVerificationCount = useMemo(
    () => queue.filter((u) => u.verificationStatus === "PENDING_REVIEW").length,
    [queue]
  );

  const pendingTutorCount = useMemo(
    () => tutorApps.filter((a) => String(a.status || "").toUpperCase() === "PENDING").length,
    [tutorApps]
  );

  const verificationPreview = useMemo(
    () => queue.filter((u) => u.verificationStatus === "PENDING_REVIEW").slice(0, 5),
    [queue]
  );

  const tutorPreview = useMemo(
    () => tutorApps.filter((a) => String(a.status || "").toUpperCase() === "PENDING").slice(0, 5),
    [tutorApps]
  );

  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [activeTutors, setActiveTutors] = useState<number>(0);

  const [weeklySessions, setWeeklySessions] = useState<{ day: string; value: number }[]>([]);
  const [subjectDemand, setSubjectDemand] = useState<{ name: string; value: number }[]>([]);
  const [sessionsThisWeek, setSessionsThisWeek] = useState<number>(0);
  const [sosRequestsThisWeek, setSosRequestsThisWeek] = useState<number>(0);

  const maxSessions = Math.max(1, ...weeklySessions.map((s) => s.value));
  const maxSubjectDemand = Math.max(1, ...subjectDemand.map((s) => s.value));

  useEffect(() => {
  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setTotalUsers(data.totalUsers ?? 0);
        setActiveTutors(data.activeTutors ?? 0);
        setSessionsThisWeek(data.sessionsThisWeek ?? 0);
        setSosRequestsThisWeek(data.sosRequestsThisWeek ?? 0);
      }
    } catch {
      console.error("Failed to load stats");
    }
  };

  fetchStats();
}, []);

useEffect(() => {
  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setWeeklySessions(Array.isArray(data.weeklySessions) ? data.weeklySessions : []);
        setSubjectDemand(Array.isArray(data.subjectDemand) ? data.subjectDemand : []);
      }
    } catch {
      console.error("Failed to load analytics");
    }
  };

  fetchAnalytics();
}, []);



const statCards = [
  { label: "Total Users", value: totalUsers, subtitle: "Registered TutorLink users" },
  { label: "Active Tutors", value: activeTutors, subtitle: "Approved peer tutors" },
  { label: "Sessions This Week", value: sessionsThisWeek, subtitle: "Completed peer tutoring sessions" },
  { label: "SOS Requests", value: sosRequestsThisWeek, subtitle: "Urgent academic help requests" },
];


  async function loadQueue() {
    setQueueLoading(true);
    setQueueError(null);

    try {
      const res = await fetch("/api/admin/verification-queue", { method: "GET" });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load verification queue");
      }

      setQueue(Array.isArray(data.users) ? data.users : []);
    } catch (err: any) {
      setQueueError(err?.message ?? "Failed to load queue");
    } finally {
      setQueueLoading(false);
    }
  }

  async function loadTutorApps() {
    setTutorLoading(true);
    setTutorError(null);

    try {
      const res = await fetch("/api/admin/tutor-applications", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load tutor applications");
      }

      setTutorApps(Array.isArray(data.applications) ? data.applications : []);
    } catch (err: any) {
      setTutorError(err?.message ?? "Failed to load tutor applications");
    } finally {
      setTutorLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
    loadTutorApps();
  }, []);

  async function verifyUser(userId: string, action: "APPROVE" | "REJECT") {
    setNotice(null);
    setActionUserId(userId);

    let reason: string | undefined = undefined;
    if (action === "REJECT") {
      const input = window.prompt(
        "Reject reason (optional). Example: Matric card unclear / name not visible"
      );
      reason = input?.trim() ? input.trim() : undefined;
    }

    try {
      const res = await fetch("/api/admin/verify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Action failed");

      setQueue((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, verificationStatus: action === "APPROVE" ? "AUTO_VERIFIED" : "REJECTED" }
            : u
        )
      );

      setNotice({
        type: "success",
        text: action === "APPROVE" ? "User approved + email sent " : "User rejected + email sent ",
      });
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message ?? "Something went wrong" });
    } finally {
      setActionUserId(null);
    }
  }

  const Card = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <section
      className={[
        "rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.72)]",
        "shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );

  const TinyPill = ({ children }: { children: React.ReactNode }) => (
    <span className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-2 py-1 text-[0.65rem] font-medium text-[rgb(var(--muted))]">
      {children}
    </span>
  );

  const ActionLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className="inline-flex items-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--primary))]"
  >
    {children}
  </Link>
);

  const ActionBtn = ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      type="button"
      disabled={disabled}
      className="inline-flex items-center rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-xs font-semibold text-[rgb(var(--fg))] hover:border-[rgb(var(--primary))] disabled:opacity-60"
    >
      {children}
    </button>
  );

  return (
    <div className="mx-auto mt-6 w-full max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">Admin Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">
              Overview of TutorLink users, activity, moderation workflows, and live platform trends.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
  <ActionLink href="/admin/verification-queue">
    Verification Queue
    {pendingVerificationCount > 0 && (
      <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700 dark:text-amber-400">
        {pendingVerificationCount}
      </span>
    )}
  </ActionLink>

  <ActionLink href="/admin/tutor-applications">
    Tutor Applications
    {pendingTutorCount > 0 && (
      <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700 dark:text-amber-400">
        {pendingTutorCount}
      </span>
    )}
  </ActionLink>

  <ActionLink href="/admin/users">Manage Users</ActionLink>
  <ActionLink href="/admin/audit-logs">Audit Logs</ActionLink>
</div>
        </header>

        {/* Notice */}
        {notice && (
  <div
    className={`rounded-2xl border px-4 py-3 text-xs ${
      notice.type === "success"
        ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        : "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400"
    }`}
  >
    {notice.text}
  </div>
)}


        {/* Top stats */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Today&apos;s Overview</h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="relative overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.72)] px-5 py-4 shadow-[0_20px_60px_rgb(var(--shadow)/0.10)]"
              >
                <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[rgb(var(--primary)/0.18)] blur-2xl" />
                <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-[rgb(var(--fg))]">{card.value}</p>
                <p className="mt-1 text-xs text-[rgb(var(--muted))]">{card.subtitle}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Charts row (2 columns so it doesn't look “empty”) */}
        <section className="grid gap-4 lg:grid-cols-2">
          {/* Weekly sessions bar chart */}
          <Card>
            <div className="px-5 py-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Weekly Tutoring Sessions</h2>
                  <p className="text-xs text-[rgb(var(--muted))]">
                    Completed tutoring sessions over the last 7 days.
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[0.65rem] font-semibold text-emerald-700 dark:text-emerald-300">
                  Live weekly data
                </span>
              </div>

              {weeklySessions.length === 0 || weeklySessions.every((s) => s.value === 0) ? (
  <div className="mt-4 flex h-52 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-sm text-[rgb(var(--muted))]">
    No completed sessions recorded in the last 7 days.
  </div>
) : (
  <div className="mt-4 flex h-52 items-end gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-4 pb-4 pt-3">
    {weeklySessions.map((s) => {
      const height = s.value > 0 ? Math.max((s.value / maxSessions) * 100, 12) : 0;
      return (
        <div key={s.day} className="flex h-full flex-1 flex-col items-center justify-end">
          <div
            className="mb-1 w-full rounded-t-lg bg-[rgb(var(--primary))] opacity-80"
            style={{ height: `${height}%` }}
          />
          <span className="mt-1 text-[0.65rem] font-semibold text-[rgb(var(--fg))]">
            {s.day}
          </span>
          <span className="text-[0.6rem] text-[rgb(var(--muted))]">{s.value} sessions</span>
        </div>
      );
    })}
  </div>
)}
            </div>
          </Card>

          {/* Subject demand */}
          <Card>
            <div className="px-5 py-4">
              <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Top Subjects by Demand</h2>
              <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                Top subjects based on completed tutoring activity.
              </p>

              {subjectDemand.length === 0 ? (
  <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] text-sm text-[rgb(var(--muted))]">
    No subject demand data available yet.
  </div>
) : (
  <div className="mt-4 space-y-3">
    {subjectDemand.map((item) => (
      <div key={item.name} className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[rgb(var(--fg))]">{item.name}</p>
          <p className="text-[0.7rem] text-[rgb(var(--muted))]">{item.value}</p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--border))]">
          <div
            className="h-full rounded-full bg-[rgb(var(--primary))] opacity-80"
            style={{ width: `${(item.value / maxSubjectDemand) * 100}%` }}
          />
        </div>
      </div>
    ))}
  </div>
)}

             
            </div>
          </Card>
        </section>

        {/* Satisfaction + platform health */}
        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <div className="px-5 py-4">
              <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Student Satisfaction (Mock Survey)</h2>
              <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                Sample survey results from students who used TutorLink.
              </p>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgb(var(--primary)/0.15)]">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-[rgb(var(--card2))] text-center text-sm font-bold text-emerald-700 dark:text-emerald-200">
                    4.6
                    <span className="ml-0.5 text-[0.6rem] font-semibold text-[rgb(var(--muted))]">/5</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[rgb(var(--muted))]">
                  <p className="font-semibold text-[rgb(var(--fg))]">Key highlights (sample data):</p>
                  <ul className="list-disc space-y-1 pl-4">
                    <li>92% found it easier to connect with a suitable tutor.</li>
                    <li>88% agreed sessions improved subject understanding.</li>
                    <li>85% would recommend TutorLink to a friend.</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="px-5 py-4">
              <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Platform Health Snapshot</h2>
              <p className="mt-1 text-xs text-[rgb(var(--muted))]">
                High-level mock indicators for system & usage health.
              </p>

              <div className="mt-4 grid gap-3 text-xs text-[rgb(var(--fg))]">
                <div className="flex items-center justify-between">
                  <span className="text-[rgb(var(--muted))]">System Uptime</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-200">99.3%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[rgb(var(--muted))]">Average Response Time</span>
                  <span className="font-bold text-[rgb(var(--primary))]">180 ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[rgb(var(--muted))]">Successful Bookings</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-200">95%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[rgb(var(--muted))]">Resolved Reports</span>
                  <span className="font-bold text-[rgb(var(--primary))]">81%</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-2 text-[0.7rem] leading-5 text-[rgb(var(--muted))]">
                This section is intentionally based on fake but realistic values to demonstrate how
                TutorLink&apos;s admin panel can support monitoring of performance, reliability and
                student experience.
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
