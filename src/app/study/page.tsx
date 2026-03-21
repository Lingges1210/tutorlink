import { Suspense } from "react";
import { getSessionUser } from "@/lib/getSessionUser";
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

async function StudyPageInner() {
  const dbUser = await getSessionUser();

  if (!dbUser || dbUser.isDeactivated) {
    return <StudyPageClient authed={false} verified={false} />;
  }

  const verified = dbUser.verificationStatus === "AUTO_VERIFIED";
  return <StudyPageClient authed={true} verified={verified} />;
}

export default function StudyPage() {
  return (
    <Suspense fallback={<StudyPageFallback />}>
      <StudyPageInner />
    </Suspense>
  );
}