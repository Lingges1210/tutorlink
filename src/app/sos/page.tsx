import { Suspense } from "react";
import { getSessionUser } from "@/lib/getSessionUser";
import SosPageClient from "./SosPageClient";

function SosPageFallback() {
  return (
    <div className="pt-10 pb-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header skeleton */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{ border: "1px solid rgb(var(--border))", background: "rgb(var(--card2))" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <div className="h-3 w-32 rounded-full animate-pulse" style={{ background: "rgb(var(--border))" }} />
            </div>
            <div className="space-y-2">
              <div className="h-9 w-44 rounded-xl animate-pulse" style={{ background: "rgb(var(--border))" }} />
              <div className="h-4 w-72 rounded-lg animate-pulse" style={{ background: "rgb(var(--border))", opacity: 0.6 }} />
            </div>
          </div>
          <div className="hidden sm:block h-10 w-28 rounded-xl animate-pulse" style={{ background: "rgb(var(--border))" }} />
        </div>

        {/* Main card skeleton */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ border: "1px solid rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)" }} />
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgb(var(--border))" }}>
            <div className="flex items-center gap-2">
              <div className="h-8 w-28 rounded-xl animate-pulse" style={{ background: "rgb(var(--border))" }} />
              <div className="h-8 w-24 rounded-xl animate-pulse" style={{ background: "rgb(var(--border))", opacity: 0.5 }} />
            </div>
            <div className="h-8 w-20 rounded-xl animate-pulse" style={{ background: "rgb(var(--border))" }} />
          </div>
          <div className="p-5 space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-5"
                style={{ border: "1px solid rgb(var(--border))", background: "rgb(var(--card2))" }}
              >
                <div className="flex justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-2/5 rounded-lg animate-pulse" style={{ background: "rgb(var(--border))" }} />
                    <div className="h-3 w-3/5 rounded-lg animate-pulse" style={{ background: "rgb(var(--border))", opacity: 0.7 }} />
                    <div className="h-3 w-1/4 rounded-lg animate-pulse" style={{ background: "rgb(var(--border))", opacity: 0.5 }} />
                  </div>
                  <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: "rgb(var(--border))" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.35), transparent)" }} />
        </div>
      </div>
    </div>
  );
}

async function SosPageInner() {
  const dbUser = await getSessionUser();

  if (!dbUser || dbUser.isDeactivated) {
    return <SosPageClient authed={false} verified={false} />;
  }

  const verified = dbUser.verificationStatus === "AUTO_VERIFIED";
  return <SosPageClient authed={true} verified={verified} />;
}

export default function SosPage() {
  return (
    <Suspense fallback={<SosPageFallback />}>
      <SosPageInner />
    </Suspense>
  );
}