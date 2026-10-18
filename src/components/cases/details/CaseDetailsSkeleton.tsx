"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CaseDetailsSkeleton() {
  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb Skeleton */}
      <Skeleton className="h-4 w-64 rounded-md" />

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border/70 dark:border-white/10 bg-card">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-60 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>

      {/* Navigation Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>

      {/* Overview Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>

      {/* Hearing Section Skeleton */}
      <div className="p-6 rounded-2xl border border-border/70 bg-card space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2.5 pt-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default CaseDetailsSkeleton;
