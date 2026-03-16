import { Suspense } from "react";
import SosPageClient from "./SosPageClient";

function SosPageFallback() {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          Loading SOS page...
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