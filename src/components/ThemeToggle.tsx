"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = theme === "system" ? systemTheme : theme;
  const isDark = current === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-xl border border-[rgb(var(--border) / 0.2)] bg-[rgb(var(--card) / 0.6)] px-3 py-2 text-xs font-semibold hover:opacity-90"
      aria-label="Toggle theme"
      type="button"
    >
      {isDark ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
