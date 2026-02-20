"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";

type Resp = {
  ok: boolean;
  avg?: number;
  count?: number;
};

export default function TutorRatingPill({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const res = await fetch("/api/tutor/ratings/summary", {
          cache: "no-store",
        });
        const data: Resp = await res.json().catch(() => ({ ok: false }));

        if (!alive) return;

        if (res.ok && data?.ok) {
          const a = typeof data.avg === "number" ? data.avg : 0;
          const c = typeof data.count === "number" ? data.count : 0;

          // ✅ format to 1 decimal
          setAvg(Math.round(a * 10) / 10);
          setCount(c);
        } else {
          // not tutor / not verified -> hide
          setAvg(null);
          setCount(null);
        }
      } catch {
        // fail silently
        setAvg(null);
        setCount(null);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  // hide if no ratings yet OR not allowed
  if (avg === null || count === null) return null;

  const avgText = avg.toFixed(1);
  const countText = `${count} rating${count === 1 ? "" : "s"}`;

  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-1.5",
        className,
      ].join(" ")}
      title={`${avgText} (${countText})`}
    >
      <Star size={16} className="fill-current" />
      <div className="text-xs font-semibold text-[rgb(var(--fg))]">
        {compact ? (
          <>
            {avgText} <span className="text-[rgb(var(--muted2))]">({count})</span>
          </>
        ) : (
          <>
            {avgText} <span className="text-[rgb(var(--muted2))]">({countText})</span>
          </>
        )}
      </div>
    </div>
  );
}