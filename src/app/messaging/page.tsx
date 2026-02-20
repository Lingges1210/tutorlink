// src/app/messaging/page.tsx
import { Suspense } from "react";
import MessagingClient from "./MessagingClient";

export default function MessagingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-[rgb(var(--muted))]">
          Loading chat…
        </div>
      }
    >
      <MessagingClient />
    </Suspense>
  );
}