"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = theme === "system" ? systemTheme : theme;
  const isDark = current === "dark";

  const handleToggle = () => {
    setIsAnimating(true);
    setTheme(isDark ? "light" : "dark");
    setTimeout(() => setIsAnimating(false), 400);
  };

  return (
    <button
      onClick={handleToggle}
      aria-label="Toggle theme"
      type="button"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "0",
        background: "none",
        border: "none",
        cursor: "pointer",
        outline: "none",
      }}
    >
      {/* LIGHT label */}
      <span style={{
        fontSize: "9px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.45)",
        transition: "color 0.3s ease",
        fontFamily: "system-ui, sans-serif",
      }}>
        LIGHT
      </span>

      {/* Track */}
      <span style={{
        position: "relative",
        width: "44px",
        height: "24px",
        borderRadius: "999px",
        background: isDark
          ? "linear-gradient(135deg, #2a2f3e 0%, #1a1f2e 100%)"
          : "linear-gradient(135deg, #dce8f5 0%, #eef4fb 100%)",
        boxShadow: isDark
          ? "inset 0 1px 4px rgba(0,0,0,0.5)"
          : "inset 0 1px 4px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.8)",
        transition: "background 0.3s ease",
        flexShrink: 0,
        overflow: "hidden",
      }}>

        {/* Stars (dark mode) */}
        {isDark && <>
          <span style={{
            position: "absolute", top: "4px", left: "5px",
            fontSize: "4px", color: "#ffd700",
            animation: "twinkle 2s infinite",
            lineHeight: 1,
          }}>✦</span>
          <span style={{
            position: "absolute", bottom: "5px", left: "8px",
            fontSize: "3px", color: "#ffd700",
            animation: "twinkle 2.5s infinite 0.7s",
            lineHeight: 1,
          }}>✦</span>
        </>}

        {/* Clouds (light mode) */}
        {!isDark && <>
          <span style={{
            position: "absolute", top: "4px", right: "5px",
            fontSize: "6px", opacity: 0.45, lineHeight: 1,
          }}>☁️</span>
        </>}

        {/* Thumb */}
        <span style={{
          position: "absolute",
          top: "2px",
          left: isDark ? "22px" : "2px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle at 35% 35%, #5a6a8a, #1e2a42)"
            : "radial-gradient(circle at 40% 35%, #ffe566, #f97c00)",
          boxShadow: isDark
            ? "0 1px 6px rgba(0,0,0,0.5)"
            : "0 1px 8px rgba(249,124,0,0.45), 0 0 0 2px rgba(255,255,255,0.5)",
          transition: "left 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.35s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          transform: isAnimating ? "scale(0.85)" : "scale(1)",
          overflow: "hidden",
        }}>
          <span style={{
            display: "inline-block",
            animation: isAnimating ? "spin 0.35s ease" : "none",
          }}>
            {isDark ? "🌑" : "☀️"}
          </span>

          {/* Moon craters */}
          {isDark && <>
            <span style={{ position: "absolute", top: "3px", left: "4px", width: "4px", height: "4px", borderRadius: "50%", background: "rgba(0,0,0,0.3)" }} />
            <span style={{ position: "absolute", bottom: "4px", right: "3px", width: "3px", height: "3px", borderRadius: "50%", background: "rgba(0,0,0,0.25)" }} />
          </>}
        </span>
      </span>

      {/* DARK label */}
      <span style={{
        fontSize: "9px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.2)",
        transition: "color 0.3s ease",
        fontFamily: "system-ui, sans-serif",
      }}>
        DARK
      </span>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(0.6); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(0.7); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>
    </button>
  );
}