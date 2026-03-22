// src/app/messaging/page.tsx
import { Suspense } from "react";
import MessagingClient from "./MessagingClient";

function MessagingSkeleton() {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3 gap-2">
        {/* Search bar */}
        <div className="h-8 w-full rounded-md bg-[rgb(var(--muted-bg))] animate-pulse" />

        {/* Conversation items */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="h-9 w-9 shrink-0 rounded-full bg-[rgb(var(--muted-bg))] animate-pulse" />
            <div className="flex flex-1 flex-col gap-1.5">
              <div
                className="h-3 rounded bg-[rgb(var(--muted-bg))] animate-pulse"
                style={{ width: `${55 + (i * 17) % 35}%` }}
              />
              <div
                className="h-2.5 rounded bg-[rgb(var(--muted-bg))] animate-pulse opacity-60"
                style={{ width: `${40 + (i * 11) % 40}%` }}
              />
            </div>
          </div>
        ))}
      </aside>

      {/* Chat area */}
      <main className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[rgb(var(--border))] px-5 py-3">
          <div className="h-9 w-9 rounded-full bg-[rgb(var(--muted-bg))] animate-pulse" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3.5 w-32 rounded bg-[rgb(var(--muted-bg))] animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-[rgb(var(--muted-bg))] animate-pulse opacity-60" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-5 py-4">
          {[
            { align: "left",  widths: ["72%", "48%"] },
            { align: "right", widths: ["55%"] },
            { align: "left",  widths: ["65%", "38%", "52%"] },
            { align: "right", widths: ["42%", "60%"] },
            { align: "left",  widths: ["70%"] },
          ].map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${msg.align === "right" ? "flex-row-reverse" : "flex-row"}`}
            >
              {msg.align === "left" && (
                <div className="mt-1 h-7 w-7 shrink-0 rounded-full bg-[rgb(var(--muted-bg))] animate-pulse" />
              )}
              <div
                className={`flex max-w-[60%] flex-col gap-1.5 ${msg.align === "right" ? "items-end" : "items-start"}`}
              >
                {msg.widths.map((w, j) => (
                  <div
                    key={j}
                    className="h-4 rounded-2xl bg-[rgb(var(--muted-bg))] animate-pulse"
                    style={{ width: w }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="border-t border-[rgb(var(--border))] px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] px-3 py-2.5">
            <div className="h-4 flex-1 rounded bg-[rgb(var(--muted-bg))] animate-pulse opacity-50" />
            <div className="h-7 w-7 rounded-lg bg-[rgb(var(--muted-bg))] animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MessagingPage() {
  return (
    <Suspense fallback={<MessagingSkeleton />}>
      <MessagingClient />
    </Suspense>
  );
}