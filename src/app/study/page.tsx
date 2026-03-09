// src/app/study/page.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Wand2,
  CalendarClock,
  BookOpen,
  Brain,
  ArrowRight,
  Plus,
} from "lucide-react";

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-300",
        active
          ? [
              "bg-[rgb(var(--fg))]",
              "text-[rgb(var(--bg))]",
              "shadow-[0_4px_20px_rgb(var(--shadow)/0.25)]",
              "scale-[1.02]",
            ].join(" ")
          : [
              "bg-transparent",
              "border border-[rgb(var(--border))]",
              "text-[rgb(var(--muted))]",
              "hover:text-[rgb(var(--fg))]",
              "hover:border-[rgb(var(--fg)/0.3)]",
            ].join(" "),
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StepCard({
  num,
  title,
  desc,
  icon: Icon,
  accentClass,
  lineClass,
}: {
  num: number;
  title: string;
  desc: string;
  icon: any;
  accentClass: string;
  lineClass: string;
}) {
  return (
    <div
      className="
        group relative rounded-2xl border p-5 overflow-hidden
        border-[rgb(var(--border))]
        bg-[rgb(var(--card)/0.5)]
        backdrop-blur-sm
        transition-all duration-300 ease-out
        hover:-translate-y-1.5
        hover:border-[rgb(var(--border)/0.8)]
        hover:bg-[rgb(var(--card)/0.85)]
        hover:shadow-[0_16px_48px_rgb(var(--shadow)/0.22)]
      "
    >
      {/* Corner number watermark */}
      <span
        className="
          absolute -right-1 -top-3 text-[5rem] font-black leading-none
          text-[rgb(var(--fg)/0.04)]
          select-none pointer-events-none
          group-hover:text-[rgb(var(--fg)/0.07)]
          transition-colors duration-300
        "
      >
        {num}
      </span>

      <div className="relative flex items-start gap-3">
        <div
          className={[
            "h-9 w-9 shrink-0 rounded-xl inline-flex items-center justify-center",
            "bg-[rgb(var(--card2)/0.7)]",
            "border border-[rgb(var(--border))]",
            accentClass,
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--muted2))] mt-2">
          Step {num}
        </div>
      </div>

      <div className="relative mt-4 text-sm font-semibold text-[rgb(var(--fg))] leading-snug">
        {title}
      </div>
      <p className="relative mt-1.5 text-xs text-[rgb(var(--muted))] leading-relaxed">
        {desc}
      </p>

      {/* Bottom accent line */}
      <div className="relative mt-5 h-px w-full overflow-hidden rounded-full bg-[rgb(var(--border))]">
        <div
          className={`h-full w-0 group-hover:w-3/4 transition-all duration-500 ease-out rounded-full ${lineClass}`}
        />
      </div>
    </div>
  );
}

function QuickCard({
  title,
  desc,
  icon: Icon,
  href,
  tag,
  accentClass,
  tagBg,
  tagText,
}: {
  title: string;
  desc: string;
  icon: any;
  href: string;
  tag: string;
  accentClass: string;
  tagBg: string;
  tagText: string;
}) {
  return (
    <Link
      href={href}
      className="
        group relative rounded-2xl border p-5 overflow-hidden flex flex-col
        border-[rgb(var(--border))]
        bg-[rgb(var(--card)/0.5)]
        backdrop-blur-sm
        transition-all duration-300 ease-out
        hover:-translate-y-1.5
        hover:bg-[rgb(var(--card)/0.85)]
        hover:shadow-[0_16px_48px_rgb(var(--shadow)/0.22)]
        hover:border-[rgb(var(--border)/0.8)]
      "
    >
      {/* Subtle gradient wash on hover */}
      <div
        className="
          absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
          bg-gradient-to-br from-[rgb(var(--primary)/0.04)] to-transparent
        "
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={[
            "h-9 w-9 rounded-xl inline-flex items-center justify-center shrink-0",
            "border border-[rgb(var(--border))]",
            "bg-[rgb(var(--card2)/0.7)]",
            accentClass,
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>

        <span
          className={[
            "text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-1",
            tagBg,
            tagText,
          ].join(" ")}
        >
          {tag}
        </span>
      </div>

      <div className="relative mt-4 text-sm font-semibold text-[rgb(var(--fg))] leading-snug">
        {title}
      </div>
      <p className="relative mt-1.5 text-xs text-[rgb(var(--muted))] leading-relaxed flex-1">
        {desc}
      </p>

      <div className="relative mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[rgb(var(--primary))]">
        Get started
        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-200" />
      </div>
    </Link>
  );
}

export default function StudyMain() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp.get("tab") ?? "hub") as "hub" | "plan";

  const title = useMemo(() => {
    return tab === "hub" ? "Active Recall Engine" : "AI Study Plan Generator";
  }, [tab]);

  function setTab(next: "hub" | "plan") {
    router.push(`/study?tab=${next}`);
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      {/* Background atmosphere */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="
            absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full blur-3xl
            bg-[rgb(var(--shadow)/0.18)]
          "
        />
        <div
          className="
            absolute top-1/3 right-[-8rem] h-96 w-96 rounded-full blur-3xl
            bg-[rgb(var(--primary2)/0.12)]
          "
        />
        <div
          className="
            absolute bottom-0 left-[-6rem] h-64 w-64 rounded-full blur-3xl
            bg-[rgb(var(--primary)/0.08)]
          "
        />
      </div>

      <div className="relative pt-10 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-5">

          {/* ── Header ── */}
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {/* Badge */}
              <div
                className="
                  inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card)/0.6)]
                  text-[rgb(var(--muted))]
                  backdrop-blur-sm
                "
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                AI Learning Suite
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight leading-tight">
                Simple.{" "}
                <span className="text-[rgb(var(--muted))]">Powerful.</span>{" "}
                Intelligent.
              </h1>
              <p className="mt-2.5 text-sm text-[rgb(var(--muted))] max-w-xl leading-relaxed">
                Upload or paste content → AI creates study materials → you practice
                → you master. With a second mode: AI-generated weekly study plans.
              </p>

              {/* Tabs */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card)/0.5)] backdrop-blur-sm p-1">
                  <TabButton active={tab === "hub"} onClick={() => setTab("hub")}>
                    <BookOpen className="h-3.5 w-3.5" />
                    Study Hub
                  </TabButton>
                  <TabButton active={tab === "plan"} onClick={() => setTab("plan")}>
                    <CalendarClock className="h-3.5 w-3.5" />
                    Study Plan
                  </TabButton>
                </div>
                <span className="text-[11px] text-[rgb(var(--muted2))] pl-1">
                  — {title}
                </span>
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/study/hub/upload"
              className="
                shrink-0 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white
                bg-[rgb(var(--fg))]
                hover:opacity-85 active:scale-95
                shadow-[0_8px_24px_rgb(var(--shadow)/0.2)]
                transition-all duration-200
              "
            >
              <Plus className="h-3.5 w-3.5" />
              Add Material
            </Link>
          </header>

          {/* ── How it Works ── */}
          <section
            className="
              rounded-2xl border p-6
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2)/0.4)]
              backdrop-blur-sm
            "
          >
            <div className="flex items-center justify-between gap-3 pb-5 border-b border-[rgb(var(--border))]">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[rgb(var(--fg))]">
                <div className="h-6 w-6 rounded-lg bg-[rgb(var(--fg))] flex items-center justify-center">
                  <Wand2 className="h-3.5 w-3.5 text-[rgb(var(--bg))]" />
                </div>
                How it Works
              </div>
              <div className="text-[11px] text-[rgb(var(--muted2))] font-medium">
                Choose a Mode → Follow the steps
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
              <StepCard
                num={1}
                title="Upload Content"
                desc="Upload a PDF or paste notes. Best for text PDFs (slides exported)."
                icon={Plus}
                accentClass="text-sky-500 dark:text-sky-400"
                lineClass="bg-sky-400"
              />
              <StepCard
                num={2}
                title="AI Processing"
                desc="AI extracts & organizes: summary, concepts, flashcards, quizzes."
                icon={Brain}
                accentClass="text-violet-500 dark:text-violet-400"
                lineClass="bg-violet-400"
              />
              <StepCard
                num={3}
                title="Study Materials"
                desc="Use your study pack instantly inside Study Hub."
                icon={BookOpen}
                accentClass="text-emerald-500 dark:text-emerald-400"
                lineClass="bg-emerald-400"
              />
              <StepCard
                num={4}
                title="Master"
                desc="Practice & follow a weekly study plan for consistent progress."
                icon={CalendarClock}
                accentClass="text-rose-500 dark:text-rose-400"
                lineClass="bg-rose-400"
              />
            </div>
          </section>

          {/* ── Quick Actions ── */}
          <section
            className="
              rounded-2xl border p-6
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2)/0.4)]
              backdrop-blur-sm
            "
          >
            <div className="flex items-center justify-between gap-3 pb-5 border-b border-[rgb(var(--border))]">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                Quick Actions
              </div>
              <div className="text-[11px] text-[rgb(var(--muted2))] font-medium">
                Pick a workflow
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <QuickCard
                title="Active Recall Study Hub"
                desc="Browse your materials, generate study packs, and quiz yourself."
                icon={BookOpen}
                href="/study/hub"
                tag="Essential"
                accentClass="text-emerald-500 dark:text-emerald-400"
                tagBg="bg-emerald-500/10"
                tagText="text-emerald-600 dark:text-emerald-400"
              />
              <QuickCard
                title="AI Study Plan Generator"
                desc="Generate a weekly plan based on exam date + available time."
                icon={CalendarClock}
                href="/study/plan"
                tag="New"
                accentClass="text-sky-500 dark:text-sky-400"
                tagBg="bg-sky-500/10"
                tagText="text-sky-600 dark:text-sky-400"
              />
              <QuickCard
                title="Upload New Material"
                desc="Add lecture notes or a PDF to create a study pack."
                icon={Plus}
                href="/study/hub/upload"
                tag="Fast"
                accentClass="text-rose-500 dark:text-rose-400"
                tagBg="bg-rose-500/10"
                tagText="text-rose-600 dark:text-rose-400"
              />
            </div>
          </section>

          {/* ── Tab preview ── */}
          <section
            className="
              rounded-2xl border p-6
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2)/0.4)]
              backdrop-blur-sm
            "
          >
            <div className="flex items-center justify-between gap-3 pb-5 border-b border-[rgb(var(--border))]">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                {tab === "hub" ? "Go to Study Hub" : "Go to Study Plan Generator"}
              </div>

              <Link
                href={tab === "hub" ? "/study/hub" : "/study/plan"}
                className="
                  group inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card)/0.6)]
                  text-[rgb(var(--fg))]
                  hover:bg-[rgb(var(--card)/0.9)]
                  hover:shadow-[0_8px_24px_rgb(var(--shadow)/0.14)]
                  transition-all duration-200
                "
              >
                Open
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
            </div>

            <p className="mt-4 text-sm text-[rgb(var(--muted))] leading-relaxed max-w-2xl">
              {tab === "hub" ? (
                <>
                  Study Hub is where your subjects + materials live. From a material
                  page, you'll generate the AI study pack (summary, concepts,
                  flashcards, quiz).
                </>
              ) : (
                <>
                  Study Plan Generator will create a weekly schedule based on your
                  exam date, difficulty, and available hours. (We'll build the AI
                  logic next.)
                </>
              )}
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}