"use client";

import Link from "next/link";
import { CalendarClock, Sparkles, ArrowLeft } from "lucide-react";

export default function StudyPlanPage() {
  return (
    <div className="pt-10 pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/study?tab=plan"
              className="inline-flex items-center gap-2 text-sm text-[rgb(var(--muted))] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to AI Learning Suite
            </Link>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card2))] px-3 py-1.5 text-xs text-[rgb(var(--muted2))]">
              <Sparkles className="h-4 w-4" />
              New Mode
            </div>

            <h1 className="mt-3 text-2xl font-semibold text-[rgb(var(--fg))]">
              Study Plan Generator
            </h1>
            <p className="text-sm text-[rgb(var(--muted))] max-w-2xl">
              Generate a weekly plan based on your exam date, topics, and available hours.
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
            <CalendarClock className="h-4 w-4" />
            Coming next
          </div>
          <p className="mt-2 text-sm text-[rgb(var(--muted))]">
            We’ll add the form (exam date, subjects, hours/day, difficulty), then the AI output (Mon–Sun schedule + tasks).
          </p>
          <div className="mt-4 text-xs text-[rgb(var(--muted2))]">
            Tell me what inputs you want (example: “2 hours weekday, 6 hours weekend, exam in 21 days”) and I’ll wire it.
          </div>
        </section>
      </div>
    </div>
  );
}