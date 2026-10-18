"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CaseEventsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center pb-4 border-b border-border/40">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-md" />
        </div>
        <Skeleton className="h-8 w-32 rounded-xl" />
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>

      {/* Timeline Skeleton */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 p-3.5 rounded-xl border border-border/40">
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-3 w-80 rounded-md" />
            </div>
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default CaseEventsSkeleton;
