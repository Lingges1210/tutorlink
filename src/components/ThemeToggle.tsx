"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const saved = window.localStorage.getItem("theme") as Theme | null;
  if (saved === "light" || saved === "dark") return saved;

  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

export default function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState<Theme>("dark");

  React.useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    window.localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative inline-flex h-9 w-16 items-center rounded-full border border-slate-300/70 bg-white/80 px-1 shadow-sm backdrop-blur transition
                 hover:shadow
                 dark:border-slate-700/80 dark:bg-slate-900/70"
    >
      {/* subtle hover glow */}
      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/10 to-indigo-500/10 opacity-0 transition group-hover:opacity-100" />

      {/* thumb */}
      <span
        className={[
          "relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-full shadow-md",
          "transition-all duration-300",
          isDark
            ? "translate-x-0 bg-slate-50 text-slate-900"
            : "translate-x-7 bg-slate-900 text-slate-50",
        ].join(" ")}
      >
        {/* When dark: show Sun (click -> light) */}
        <Sun
          size={16}
          className={[
            "absolute transition-all duration-300",
            isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50",
          ].join(" ")}
        />
        {/* When light: show Moon (click -> dark) */}
        <Moon
          size={16}
          className={[
            "absolute transition-all duration-300",
            isDark ? "opacity-0 -rotate-90 scale-50" : "opacity-100 rotate-0 scale-100",
          ].join(" ")}
        />
      </span>
    </button>
  );
}
