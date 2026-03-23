"use client";

/**
 * AvatarWithBorder
 *
 * avatarBorder === "ANIMATED"  → spinning rainbow conic-gradient ring
 * avatarBorder === null/other  → standard static primary-color ring
 *
 * Works at any size — pass size in px (default 72).
 */

type Props = {
  avatarUrl?: string | null;
  initials: string;
  size?: number;
  avatarBorder?: string | null;
  className?: string;
  showOnlineDot?: boolean;
};

export default function AvatarWithBorder({
  avatarUrl,
  initials,
  size = 72,
  avatarBorder,
  className = "",
  showOnlineDot = false,
}: Props) {
  const isAnimated = avatarBorder === "ANIMATED";

  // Scale helper — border thickness, gap, dot size all scale with avatar size
  const borderW  = Math.max(2, Math.round(size * 0.04));   // spinning ring thickness
  const gapW     = Math.max(1, Math.round(size * 0.015));  // white gap between ring and inner
  const innerOff = borderW + gapW;                          // margin for inner div
  const innerSz  = size - innerOff * 2;                     // inner circle size
  const dotSz    = Math.max(8, Math.round(size * 0.175));   // online dot diameter
  const dotOff   = isAnimated ? borderW + 1 : 2;            // dot inset from edge
  const fontSize = Math.round(size * 0.25);

  const uid = `ab-${size}-${isAnimated ? "anim" : "std"}`;

  return (
    <>
      <style>{`
        @keyframes avatar-border-spin-${uid} {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .${uid}-root {
          position: relative;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        /* Animated: spinning conic ring via ::before, white gap via ::after */
        .${uid}-root.animated::before {
          content: "";
          position: absolute;
          inset: -${borderW}px;
          border-radius: 50%;
          background: conic-gradient(
            #7c3aed, #2563eb, #06b6d4, #10b981,
            #f59e0b, #ef4444, #ec4899, #7c3aed
          );
          animation: avatar-border-spin-${uid} 2.8s linear infinite;
          z-index: 0;
        }
        .${uid}-root.animated::after {
          content: "";
          position: absolute;
          inset: ${gapW}px;
          border-radius: 50%;
          background: rgb(var(--card, 255 255 255));
          z-index: 1;
        }
        /* Standard: gradient ring via padding + background */
        .${uid}-root.standard {
          padding: ${borderW}px;
          background: linear-gradient(
            135deg,
            rgb(var(--primary, 124 58 237)),
            rgba(124, 58, 237, 0.7),
            rgba(124, 58, 237, 0.3)
          );
          box-shadow:
            0 0 0 2px rgb(var(--card, 255 255 255)),
            0 0 0 ${borderW + 4}px rgba(124, 58, 237, 0.25),
            0 4px 20px rgba(124, 58, 237, 0.28);
        }
        .${uid}-inner {
          position: relative;
          z-index: 2;
          border-radius: 50%;
          overflow: hidden;
          background: rgb(var(--card2, 240 240 240));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: ${fontSize}px;
          color: rgb(var(--fg, 20 20 20));
        }
        .${uid}-root.animated .${uid}-inner {
          width: ${innerSz}px;
          height: ${innerSz}px;
          margin: ${innerOff}px;
        }
        .${uid}-root.standard .${uid}-inner {
          width: 100%;
          height: 100%;
        }
        .${uid}-dot {
          position: absolute;
          width: ${dotSz}px;
          height: ${dotSz}px;
          bottom: ${dotOff}px;
          right: ${dotOff}px;
          border-radius: 50%;
          background: #34d399;
          border: 2px solid rgb(var(--card, 255 255 255));
          z-index: 3;
        }
      `}</style>

      <div
        className={`${uid}-root ${isAnimated ? "animated" : "standard"} ${className}`}
      >
        <div className={`${uid}-inner`}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>

        {showOnlineDot && <span className={`${uid}-dot`} />}
      </div>
    </>
  );
}