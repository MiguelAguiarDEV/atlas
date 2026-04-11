"use client";

import { useState, useEffect } from "react";

/**
 * Shared desktop breakpoint hook.
 * Returns true when viewport width >= 768px.
 * NOTE: initial render is always `false` (mobile-first). Hydration will upgrade.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}
