"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Options = {
  /** called when focus id is present (use to expand the card) */
  onFocus?: (id: string) => void;
  /** how long the glow should last (and when to clear focus param) */
  clearAfterMs?: number;
  /** prefix used in DOM id="session-<id>" */
  domIdPrefix?: string;
};

export function useFocusSession(options: Options = {}) {
  const {
    onFocus,
    clearAfterMs = 3000,
    domIdPrefix = "session-",
  } = options;

  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const focusId = sp.get("focus");

  useEffect(() => {
    if (!focusId) return;

    // 1) Expand card (parent controls)
    onFocus?.(focusId);

    // 2) Scroll to the element
    const el = document.getElementById(`${domIdPrefix}${focusId}`);
    if (el) {
      // small delay so list renders + expand state applies
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("focus-glow");
      });
    }

    // 3) Remove glow + clear focus param
    const t = window.setTimeout(() => {
      const el2 = document.getElementById(`${domIdPrefix}${focusId}`);
      if (el2) el2.classList.remove("focus-glow");

      const next = new URLSearchParams(sp.toString());
      next.delete("focus");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, clearAfterMs);

    return () => window.clearTimeout(t);
    // IMPORTANT: sp is stable but can change; keep dependencies safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, pathname, router]);
}
