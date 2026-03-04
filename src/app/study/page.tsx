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
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold border transition-all duration-200",
        active
          ? [
              "border-[rgb(var(--border))]",
              "bg-gradient-to-r from-[rgb(var(--primary) / 0.18)] to-[rgb(var(--primary2) / 0.14)]",
              "text-[rgb(var(--fg))]",
              "shadow-[0_10px_28px_rgb(var(--shadow)/0.18)]",
            ].join(" ")
          : [
              "border-[rgb(var(--border))]",
              "bg-[rgb(var(--card) / 0.6)]",
              "text-[rgb(var(--fg))]",
              "hover:bg-[rgb(var(--card) / 0.9)]",
              "hover:shadow-[0_10px_26px_rgb(var(--shadow)/0.16)]",
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
}: {
  num: number;
  title: string;
  desc: string;
  icon: any;
  accentClass: string;
}) {
  return (
    <div
      className="
        rounded-3xl border p-5
        border-[rgb(var(--border))]
        bg-[rgb(var(--card) / 0.6)]
        transition-all duration-300 ease-out
        hover:-translate-y-1
        hover:bg-[rgb(var(--card) / 0.9)]
        hover:shadow-[0_12px_40px_rgb(var(--shadow) / 0.25)]
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <div
            className={[
              "h-10 w-10 rounded-2xl border inline-flex items-center justify-center",
              "border-[rgb(var(--border))]",
              "bg-[rgb(var(--card2) / 0.55)]",
              "shadow-[0_10px_26px_rgb(var(--shadow)/0.18)]",
              accentClass,
            ].join(" ")}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="text-xs font-semibold text-[rgb(var(--muted2))]">
            Step {num}
          </div>
        </div>

        <span
          className="
            text-[10px] rounded-full border px-2 py-1
            border-[rgb(var(--border))]
            bg-[rgb(var(--card2) / 0.5)]
            text-[rgb(var(--muted2))]
          "
        >
          {num}
        </span>
      </div>

      <div className="mt-3 text-sm font-semibold text-[rgb(var(--fg))]">
        {title}
      </div>
      <p className="mt-2 text-xs text-[rgb(var(--muted))] leading-relaxed">
        {desc}
      </p>

      <div className="mt-4 h-[2px] w-full rounded-full bg-[rgb(var(--border))] overflow-hidden">
        <div className={`h-full w-1/2 ${accentClass} opacity-80`} />
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
  tagClass,
}: {
  title: string;
  desc: string;
  icon: any;
  href: string;
  tag: string;
  accentClass: string;
  tagClass: string;
}) {
  return (
    <Link
      href={href}
      className="
        group rounded-3xl border p-5
        border-[rgb(var(--border))]
        bg-[rgb(var(--card) / 0.6)]
        transition-all duration-300 ease-out
        hover:-translate-y-1
        hover:bg-[rgb(var(--card) / 0.9)]
        hover:shadow-[0_12px_40px_rgb(var(--shadow) / 0.25)]
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            "h-10 w-10 rounded-2xl border inline-flex items-center justify-center",
            "border-[rgb(var(--border))]",
            "bg-[rgb(var(--card2) / 0.55)]",
            "shadow-[0_10px_26px_rgb(var(--shadow)/0.18)]",
            accentClass,
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>

        <span
          className={[
            "text-[10px] rounded-full border px-2 py-1",
            "border-[rgb(var(--border))]",
            "bg-[rgb(var(--card2) / 0.5)]",
            tagClass,
          ].join(" ")}
        >
          {tag}
        </span>
      </div>

      <div className="mt-3 text-sm font-semibold text-[rgb(var(--fg))]">
        {title}
      </div>
      <p className="mt-2 text-xs text-[rgb(var(--muted))] leading-relaxed">
        {desc}
      </p>

      <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[rgb(var(--primary))]">
        Get started{" "}
        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
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
      {/* subtle background glow (works in light + dark) */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="
            absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full blur-3xl
            bg-[rgb(var(--shadow) / 0.22)]
          "
        />
        <div
          className="
            absolute top-40 right-[-6rem] h-72 w-72 rounded-full blur-3xl
            bg-[rgb(var(--primary2) / 0.18)]
          "
        />
      </div>

      <div className="relative pt-10 pb-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Top header */}
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className="
                  inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card) / 0.6)]
                  text-[rgb(var(--fg))]
                "
              >
                <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-300" />
                AI Learning Suite
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                Simple. Powerful. Intelligent.
              </h1>
              <p className="mt-2 text-sm text-[rgb(var(--muted))] max-w-2xl leading-relaxed">
                Upload or paste content → AI creates study materials → you practice
                → you master. Now with a second mode: AI-generated weekly study
                plans.
              </p>

              {/* Tabs */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <TabButton active={tab === "hub"} onClick={() => setTab("hub")}>
                  <BookOpen className="h-4 w-4" />
                  Study Hub
                </TabButton>
                <TabButton active={tab === "plan"} onClick={() => setTab("plan")}>
                  <CalendarClock className="h-4 w-4" />
                  Study Plan Generator
                </TabButton>
                <span className="text-xs text-[rgb(var(--muted2))] ml-1">
                  • {title}
                </span>
              </div>
            </div>

            {/* Primary action */}
            <div className="flex items-center gap-2">
              <Link
                href="/study/hub/upload"
                className="
                  inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-white
                  bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary2))]
                  hover:opacity-90
                  shadow-[0_10px_30px_rgb(var(--shadow)/0.22)]
                "
              >
                <Plus className="h-4 w-4" />
                Add Material
              </Link>
            </div>
          </header>

          {/* “How it works” */}
          <section
            className="
              rounded-3xl border p-6
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2) / 0.45)]
            "
          >
            <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4">
              <div className="text-sm font-semibold text-[rgb(var(--fg))] inline-flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-[rgb(var(--primary))]" />
                How it Works 
              </div>
              <div className="text-xs text-[rgb(var(--muted2))]">
                Choose a Mode → Follow the steps
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
              <StepCard
                num={1}
                title="Upload Content"
                desc="Upload a PDF or paste notes. Best for text PDFs (slides exported)."
                icon={Plus}
                accentClass="text-cyan-600 dark:text-cyan-300"
              />
              <StepCard
                num={2}
                title="AI Processing"
                desc="AI extracts & organizes: summary, concepts, flashcards, quizzes."
                icon={Brain}
                accentClass="text-fuchsia-600 dark:text-fuchsia-300"
              />
              <StepCard
                num={3}
                title="Study Materials"
                desc="Use your study pack instantly inside Study Hub."
                icon={BookOpen}
                accentClass="text-emerald-600 dark:text-emerald-300"
              />
              <StepCard
                num={4}
                title="Master"
                desc="Practice & follow a weekly study plan for consistent progress."
                icon={CalendarClock}
                accentClass="text-rose-600 dark:text-rose-300"
              />
            </div>
          </section>

          {/* Quick Actions */}
          <section
            className="
              rounded-3xl border p-6
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2) / 0.45)]
            "
          >
            <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                Quick Actions
              </div>
              <div className="text-xs text-[rgb(var(--muted2))]">Pick a workflow</div>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickCard
                title="Active Recall Study Hub"
                desc="Browse your materials, generate study packs, and quiz yourself."
                icon={BookOpen}
                href="/study/hub"
                tag="Essential"
                accentClass="text-emerald-600 dark:text-emerald-300"
                tagClass="text-emerald-600 dark:text-emerald-300"
              />
              <QuickCard
                title="AI Study Plan Generator"
                desc="Generate a weekly plan based on exam date + available time."
                icon={CalendarClock}
                href="/study/plan"
                tag="New"
                accentClass="text-cyan-600 dark:text-cyan-300"
                tagClass="text-cyan-600 dark:text-cyan-300"
              />
              <QuickCard
                title="Upload New Material"
                desc="Add lecture notes or a PDF to create a study pack."
                icon={Plus}
                href="/study/hub/upload"
                tag="Fast"
                accentClass="text-rose-600 dark:text-rose-300"
                tagClass="text-rose-600 dark:text-rose-300"
              />
            </div>
          </section>

          {/* Below: show the selected tab’s content (light preview) */}
          <section
            className="
              rounded-3xl border p-6
              border-[rgb(var(--border))]
              bg-[rgb(var(--card2) / 0.45)]
            "
          >
            <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] pb-4">
              <div className="text-sm font-semibold text-[rgb(var(--fg))]">
                {tab === "hub" ? "Go to Study Hub" : "Go to Study Plan Generator"}
              </div>

              <Link
                href={tab === "hub" ? "/study/hub" : "/study/plan"}
                className="
                  inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-semibold
                  border-[rgb(var(--border))]
                  bg-[rgb(var(--card) / 0.6)]
                  text-[rgb(var(--fg))]
                  hover:bg-[rgb(var(--card) / 0.9)]
                  hover:shadow-[0_10px_26px_rgb(var(--shadow)/0.16)]
                "
              >
                Open <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-4 text-sm text-[rgb(var(--muted))] leading-relaxed">
              {tab === "hub" ? (
                <>
                  Study Hub is where your subjects + materials live. From a material
                  page, you’ll generate the AI study pack (summary, concepts,
                  flashcards, quiz).
                </>
              ) : (
                <>
                  Study Plan Generator will create a weekly schedule based on your
                  exam date, difficulty, and available hours. (We’ll build the AI
                  logic next.)
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}