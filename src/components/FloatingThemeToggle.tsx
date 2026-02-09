"use client";

import ThemeToggle from "@/components/ThemeToggle";

export default function FloatingThemeToggle() {
  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      <ThemeToggle />
    </div>
  );
}
