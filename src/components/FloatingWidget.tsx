"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const StudyPalPage = dynamic(() => import("@/app/studypal/page"), {
  ssr: false,
});

// Min/max panel dimensions
const MIN_W = 320;
const MAX_W = 640;
const MIN_H = 400;

export default function FloatingWidget({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [width, setWidth] = useState(420);
  const [height, setHeight] = useState<number | null>(null); // null = default (dvh-based)

  const panelRef   = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const resizing   = useRef<{ edge: "left" | "top" | "corner"; startX: number; startY: number; startW: number; startH: number } | null>(null);

  useEffect(() => {
    if (open) setPulse(false);
  }, [open]);

  // ── Resize logic ──────────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    const r = resizing.current;
    if (!r) return;
    const dx = r.startX - e.clientX; // dragging left = wider
    const dy = r.startY - e.clientY; // dragging up = taller

    if (r.edge === "left" || r.edge === "corner") {
      const newW = Math.min(MAX_W, Math.max(MIN_W, r.startW + dx));
      setWidth(newW);
    }
    if (r.edge === "top" || r.edge === "corner") {
      const maxH = window.innerHeight - 112;
      const newH = Math.min(maxH, Math.max(MIN_H, r.startH + dy));
      setHeight(newH);
    }
  }, []);

  const onMouseUp = useCallback(() => {
    resizing.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  function startResize(e: React.MouseEvent, edge: "left" | "top" | "corner") {
    e.preventDefault();
    const panel = panelRef.current;
    const currentH = panel ? panel.getBoundingClientRect().height : (height ?? window.innerHeight - 112);
    resizing.current = { edge, startX: e.clientX, startY: e.clientY, startW: width, startH: currentH };
    document.body.style.userSelect = "none";
    document.body.style.cursor = edge === "left" ? "ew-resize" : edge === "top" ? "ns-resize" : "nwse-resize";
  }

  // ── Auto-scroll to pet ────────────────────────────────────────
  // StudyPalPage calls this via a custom event when feed is triggered
  useEffect(() => {
    function handleScrollToPet() {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.addEventListener("sp:scroll-to-pet", handleScrollToPet);
    return () => window.removeEventListener("sp:scroll-to-pet", handleScrollToPet);
  }, []);

  if (!isLoggedIn) return null;
  if (pathname.startsWith("/auth") || pathname.startsWith("/admin")) return null;

  const panelH = height ?? undefined; // undefined = CSS calc fallback

  return (
    <>
      <style>{`
        @keyframes fw-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30%       { transform: translateY(-6px) scale(1.06); }
          60%       { transform: translateY(-2px) scale(0.98); }
        }
        @keyframes fw-ping {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes fw-wiggle {
          0%,100% { transform: rotate(0deg);   }
          20%     { transform: rotate(-12deg);  }
          40%     { transform: rotate(10deg);   }
          60%     { transform: rotate(-8deg);   }
          80%     { transform: rotate(6deg);    }
        }
        .fw-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 10000;
          width: 54px;
          height: 54px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #7C6AFF 0%, #5E4FD4 100%);
          box-shadow: 0 4px 18px rgba(107,88,240,0.45), 0 1px 4px rgba(0,0,0,0.15);
          transition: box-shadow 0.2s ease, background 0.2s ease;
          animation: fw-bounce 2.8s ease-in-out infinite;
        }
        .fw-btn:hover {
          background: linear-gradient(135deg, #8B7AFF 0%, #6B5AE0 100%);
          box-shadow: 0 6px 24px rgba(107,88,240,0.6), 0 2px 6px rgba(0,0,0,0.18);
          animation: fw-wiggle 0.5s ease forwards;
        }
        .fw-btn.open {
          background: linear-gradient(135deg, #5E4FD4 0%, #4A3EC0 100%);
          box-shadow: 0 4px 18px rgba(107,88,240,0.35);
          animation: none;
        }
        .fw-btn.open:hover {
          background: linear-gradient(135deg, #6B5AE0 0%, #5549CC 100%);
          animation: none;
        }
        .fw-ping {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(124,106,255,0.45);
          animation: fw-ping 1.8s ease-out infinite;
        }
        .fw-panel {
          position: fixed;
          bottom: 88px;
          right: 16px;
          z-index: 9999;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(107,88,240,0.12);
          border: 1px solid rgba(107,88,240,0.18);
          transition: opacity 0.25s ease, transform 0.28s cubic-bezier(.34,1.4,.64,1);
          /* default size — overridden by inline style */
          max-width: calc(100vw - 32px);
          max-height: calc(100dvh - 112px);
        }
        .fw-panel.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .fw-panel.closed {
          opacity: 0;
          transform: translateY(18px) scale(0.96);
          pointer-events: none;
        }
        .fw-scroll {
          width: 100%;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: rgba(107,88,240,0.3) transparent;
        }

        /* ── Resize handles ── */
        .fw-handle-left {
          position: absolute;
          left: 0; top: 12px; bottom: 12px;
          width: 6px;
          cursor: ew-resize;
          z-index: 10;
          border-radius: 3px 0 0 3px;
        }
        .fw-handle-left::after {
          content: "";
          position: absolute;
          left: 1px; top: 50%; transform: translateY(-50%);
          width: 3px; height: 32px;
          border-radius: 2px;
          background: rgba(107,88,240,0.35);
          transition: background 0.15s;
        }
        .fw-handle-left:hover::after { background: rgba(107,88,240,0.7); }

        .fw-handle-top {
          position: absolute;
          top: 0; left: 12px; right: 12px;
          height: 6px;
          cursor: ns-resize;
          z-index: 10;
          border-radius: 24px 24px 0 0;
        }
        .fw-handle-top::after {
          content: "";
          position: absolute;
          top: 1px; left: 50%; transform: translateX(-50%);
          height: 3px; width: 32px;
          border-radius: 2px;
          background: rgba(107,88,240,0.35);
          transition: background 0.15s;
        }
        .fw-handle-top:hover::after { background: rgba(107,88,240,0.7); }

        .fw-handle-corner {
          position: absolute;
          top: 0; left: 0;
          width: 18px; height: 18px;
          cursor: nwse-resize;
          z-index: 11;
          border-radius: 24px 0 0 0;
        }
        .fw-handle-corner::after {
          content: "";
          position: absolute;
          top: 3px; left: 3px;
          width: 8px; height: 8px;
          border-top: 2px solid rgba(107,88,240,0.4);
          border-left: 2px solid rgba(107,88,240,0.4);
          border-radius: 2px 0 0 0;
          transition: border-color 0.15s;
        }
        .fw-handle-corner:hover::after { border-color: rgba(107,88,240,0.85); }
      `}</style>

      {/* Toggle button */}
      <button
        className={`fw-btn${open ? " open" : ""}`}
        onClick={() => setOpen(o => !o)}
        title={open ? "Close companion" : "Open Study Companion"}
      >
        {pulse && !open && <span className="fw-ping" />}

        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <line x1="2" y1="2" x2="16" y2="16" />
            <line x1="16" y1="2" x2="2" y2="16" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="4"  r="2" />
            <circle cx="18" cy="8"  r="2" />
            <circle cx="20" cy="16" r="2" />
            <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fw-panel ${open ? "open" : "closed"}`}
        style={{
          width,
          height: panelH ?? `calc(100dvh - 112px)`,
        }}
      >
        {/* Resize handles */}
        <div className="fw-handle-corner" onMouseDown={(e) => startResize(e, "corner")} />
        <div className="fw-handle-left"   onMouseDown={(e) => startResize(e, "left")} />
        <div className="fw-handle-top"    onMouseDown={(e) => startResize(e, "top")} />

        <div className="fw-scroll" ref={scrollRef}>
          <StudyPalPage />
        </div>
      </div>
    </>
  );
}