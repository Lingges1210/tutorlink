"use client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function RoleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const isStudent = pathname.startsWith("/dashboard/student");
  const [animating, setAnimating] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const studentRef = useRef<HTMLButtonElement>(null);
  const tutorRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeRef = isStudent ? studentRef : tutorRef;
    const btn = activeRef.current;
    const track = trackRef.current;
    if (!btn || !track) return;

    const trackRect = track.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    setIndicatorStyle({
      width: btnRect.width,
      transform: `translateX(${btnRect.left - trackRect.left - 3}px)`,
    });
  }, [isStudent]);

  const handleSwitch = (to: "student" | "tutor") => {
    if (animating) return;
    if (to === "student" && isStudent) return;
    if (to === "tutor" && !isStudent) return;

    setAnimating(true);
    setTimeout(() => {
      router.push(to === "student" ? "/dashboard/student" : "/dashboard/tutor");
      setAnimating(false);
    }, 220);
  };

  return (
    <div className="mb-5">
      <style>{`
        .rs-label {
          font-size: 0.62rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgb(var(--muted));
          margin-bottom: 6px;
          font-weight: 500;
        }
        .rs-track {
          position: relative;
          display: flex;
          gap: 0;
          background: rgb(var(--card));
          border: 0.5px solid rgb(var(--border));
          border-radius: 10px;
          padding: 3px;
        }
        .rs-indicator {
          position: absolute;
          top: 3px;
          left: 3px;
          height: calc(100% - 6px);
          background: rgb(var(--card2));
          border: 0.5px solid rgb(var(--border));
          border-radius: 7px;
          transition: transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1),
                      width 0.28s cubic-bezier(0.34, 1.2, 0.64, 1);
          box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
          pointer-events: none;
          z-index: 0;
        }
        .rs-btn {
          flex: 1;
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 10px;
          border: none;
          background: transparent;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s ease, opacity 0.2s ease;
          white-space: nowrap;
          user-select: none;
        }
        .rs-btn.active {
          color: rgb(var(--fg));
        }
        .rs-btn.inactive {
          color: rgb(var(--muted2));
        }
        .rs-btn.inactive:hover {
          color: rgb(var(--fg));
        }
        .rs-btn:active {
          transform: scale(0.96);
          transition: transform 0.1s ease, color 0.2s ease;
        }
        .rs-icon {
          width: 13px;
          height: 13px;
          transition: transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
          flex-shrink: 0;
        }
        .rs-btn:hover .rs-icon {
          transform: scale(1.15);
        }
        .rs-btn.active .rs-icon {
          transform: scale(1.05);
        }
        .rs-fade-out {
          animation: rsFadeOut 0.18s ease forwards;
        }
        @keyframes rsFadeOut {
          to { opacity: 0.5; filter: blur(1px); }
        }
        .rs-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
          flex-shrink: 0;
          animation: rsPulse 2.5s ease-in-out infinite;
        }
        @keyframes rsPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>

      <p className="rs-label">Switch Role</p>

      <div ref={trackRef} className="rs-track">
        {/* Sliding pill indicator */}
        <div className="rs-indicator" style={indicatorStyle} />

        {/* Student button */}
        <button
          ref={studentRef}
          onClick={() => handleSwitch("student")}
          className={`rs-btn ${isStudent ? "active" : "inactive"} ${animating && isStudent ? "rs-fade-out" : ""}`}
          aria-pressed={isStudent}
        >
          {/* Person icon */}
          <svg className="rs-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="8" cy="5.5" r="2.5" />
            <path d="M2.5 13.5c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" />
          </svg>
          Student
          {isStudent && <span className="rs-dot" />}
        </button>

        {/* Tutor button */}
        <button
          ref={tutorRef}
          onClick={() => handleSwitch("tutor")}
          className={`rs-btn ${!isStudent ? "active" : "inactive"} ${animating && !isStudent ? "rs-fade-out" : ""}`}
          aria-pressed={!isStudent}
        >
          {/* Graduation cap icon */}
          <svg className="rs-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3L1 7l7 4 7-4-7-4z" />
            <path d="M4 8.5V12c0 1 1.8 2 4 2s4-1 4-2V8.5" />
            <line x1="14" y1="7" x2="14" y2="10.5" />
          </svg>
          Tutor
          {!isStudent && <span className="rs-dot" />}
        </button>
      </div>
    </div>
  );
}