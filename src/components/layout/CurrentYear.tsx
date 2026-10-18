"use client";

import * as React from "react";

const emptySubscribe = () => () => {};

export interface CurrentYearProps {
  fallback?: number;
  className?: string;
}

/**
 * Hydration-safe dynamic year component for Next.js 16+.
 * Uses useSyncExternalStore to return a stable fallback during server prerendering
 * (preventing Next.js 16 "blocking-prerender-current-time" errors),
 * and dynamically reads the client's current year upon hydration without cascading re-renders.
 */
export function CurrentYear({ fallback = 2026, className }: CurrentYearProps) {
  const year = React.useSyncExternalStore(
    emptySubscribe,
    () => new Date().getFullYear(),
    () => fallback
  );

  return (
    <span suppressHydrationWarning className={className}>
      {year}
    </span>
  );
}

export default CurrentYear;
