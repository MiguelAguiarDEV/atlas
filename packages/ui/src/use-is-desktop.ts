"use client";

import { useState, useEffect } from "react";

/**
 * Shared desktop breakpoint hook.
 * Returns true when viewport width >= 768px.
 *
 * HYDRATION SAFETY:
 * - First render (SSR + client first render) returns `false` deterministically.
 * - After mount, useEffect reads window.matchMedia and upgrades.
 * - `mounted` flag lets callers skip rendering viewport-dependent UI until
 *   the client has hydrated, so they can match server HTML exactly.
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

/**
 * Returns `true` only after the component has mounted on the client.
 * Use this to gate rendering of any output that depends on `window`,
 * `Date`, `localStorage`, or `matchMedia`, so the first render matches
 * the server-rendered HTML exactly.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
