import { Suspense } from "react";
import StudyPageClient from "./StudyPageClient";

function StudyPageFallback() {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          Loading study page...
        </div>
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<StudyPageFallback />}>
      <StudyPageClient />
    </Suspense>
  );
}