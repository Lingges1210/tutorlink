import { Suspense } from "react";
import SosPageClient from "./SosPageClient";

function SosPageFallback() {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Animated pulse skeleton that matches SOS urgency theme */}
        <div className="space-y-6">
          
          {/* Header skeleton */}
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
            <div className="flex items-center gap-4 mb-4">
              {/* Pulsing SOS icon placeholder */}
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10">
                <div className="h-6 w-6 animate-ping rounded-full bg-red-500/40" />
                <div className="absolute h-4 w-4 rounded-full bg-red-500/60" />
              </div>
              <div className="space-y-2 flex-1">
                <div className="h-7 w-48 rounded-xl bg-[rgb(var(--border))] animate-pulse" />
                <div className="h-4 w-72 rounded-lg bg-[rgb(var(--border))]/60 animate-pulse" />
              </div>
            </div>
            {/* Shimmer bar */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
          </div>

          {/* Cards skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 space-y-3"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[rgb(var(--border))] animate-pulse" />
                  <div className="h-4 w-32 rounded-lg bg-[rgb(var(--border))] animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-[rgb(var(--border))]/60 animate-pulse" />
                  <div className="h-3 w-4/5 rounded bg-[rgb(var(--border))]/60 animate-pulse" />
                  <div className="h-3 w-3/5 rounded bg-[rgb(var(--border))]/60 animate-pulse" />
                </div>
                <div className="h-9 w-full rounded-xl bg-[rgb(var(--border))]/80 animate-pulse" />
              </div>
            ))}
          </div>

          {/* Bottom section skeleton */}
          <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
            <div className="h-4 w-40 rounded-lg bg-[rgb(var(--border))] animate-pulse mb-4" />
            <div className="grid gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3 border border-[rgb(var(--border))]/50">
                  <div className="h-8 w-8 rounded-lg bg-[rgb(var(--border))] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-36 rounded bg-[rgb(var(--border))] animate-pulse" />
                    <div className="h-2.5 w-24 rounded bg-[rgb(var(--border))]/60 animate-pulse" />
                  </div>
                  <div className="h-7 w-16 rounded-lg bg-[rgb(var(--border))]/80 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SosPage() {
  return (
    <Suspense fallback={<SosPageFallback />}>
      <SosPageClient />
    </Suspense>
  );
}