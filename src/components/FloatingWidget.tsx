"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const StudyPalPage = dynamic(() => import("@/app/studypal/page"), {
  ssr: false,
});

export default function FloatingWidget({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    if (open) setPulse(false);
  }, [open]);

  // Hide if not logged in, or on auth/admin pages
  if (!isLoggedIn) return null;
  if (pathname.startsWith("/auth") || pathname.startsWith("/admin")) return null;

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
          width: 420px;
          max-width: calc(100vw - 32px);
          height: calc(100dvh - 112px);
          max-height: 760px;
          z-index: 9999;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(107,88,240,0.12);
          border: 1px solid rgba(107,88,240,0.18);
          transition: opacity 0.25s ease, transform 0.28s cubic-bezier(.34,1.4,.64,1);
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
      `}</style>

      {/* Toggle button */}
      <button
        className={`fw-btn${open ? " open" : ""}`}
        onClick={() => setOpen(o => !o)}
        title={open ? "Close companion" : "Open Study Companion"}
      >
        {/* Attention ping — only before first open */}
        {pulse && !open && <span className="fw-ping" />}

        {open ? (
          /* Clean X — two lines, no rotation */
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"
            stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <line x1="2" y1="2" x2="16" y2="16" />
            <line x1="16" y1="2" x2="2" y2="16" />
          </svg>
        ) : (
          /* Paw icon */
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
      <div className={`fw-panel ${open ? "open" : "closed"}`}>
        <div className="fw-scroll">
          <StudyPalPage />
        </div>
      </div>
    </>
  );
}