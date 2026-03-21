import { Suspense } from "react";
import { getSessionUser } from "@/lib/getSessionUser";
import StudyPageClient from "./StudyPageClient";

// ─── Skeleton shimmer atoms ───────────────────────────────────────────────────

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[rgb(var(--border))]/40 ${className}`}
    />
  );
}

function StudyPageSkeleton() {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      {/* Top nav strip */}
      <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--card))]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Shimmer className="h-6 w-32" />
          <div className="flex items-center gap-3">
            <Shimmer className="h-8 w-8 rounded-full" />
            <Shimmer className="h-8 w-24" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero heading area */}
        <div className="mb-8 space-y-3">
          <Shimmer className="h-9 w-56" />
          <Shimmer className="h-5 w-80" />
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Primary card */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <Shimmer className="h-6 w-40" />
                <Shimmer className="h-8 w-20 rounded-full" />
              </div>
              <div className="space-y-3">
                {[100, 85, 92, 70, 78].map((w, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Shimmer className="h-14 w-14 shrink-0 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Shimmer className={`h-4 w-[${w}%]`} />
                      <Shimmer className="h-3 w-2/3" />
                    </div>
                    <Shimmer className="h-8 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
              <Shimmer className="mb-4 h-5 w-28" />
              <div className="space-y-3">
                {[75, 60, 88].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Shimmer className="h-10 w-10 shrink-0 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Shimmer className="h-3.5 w-3/4" />
                      <Shimmer className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
              <Shimmer className="mb-3 h-5 w-24" />
              <Shimmer className="h-28 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inner async component ─────────────────────────────────────────────────────

async function StudyPageInner() {
  const dbUser = await getSessionUser();

  if (!dbUser || dbUser.isDeactivated) {
    return <StudyPageClient authed={false} verified={false} />;
  }

  const verified = dbUser.verificationStatus === "AUTO_VERIFIED";
  return <StudyPageClient authed={true} verified={verified} />;
}

// ─── Public export ─────────────────────────────────────────────────────────────

export default function StudyPage() {
  return (
    <Suspense fallback={<StudyPageSkeleton />}>
      <StudyPageInner />
    </Suspense>
  );
}