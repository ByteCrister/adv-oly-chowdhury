"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientPaymentsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* 1. Header Banner Skeleton */}
      <div className="p-6 rounded-2xl bg-card/60 border border-border/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-56 rounded" />
          </div>
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* 2. Financial Summary Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={`pay-skel-stat-${i}`}
            className="p-4 rounded-2xl bg-card/60 border border-border/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-28 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* 3. Toolbar Skeleton */}
      <div className="p-4 rounded-2xl bg-card/60 border border-border/70 dark:border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <Skeleton className="h-10 w-full lg:w-80 rounded-xl" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-48 rounded-xl" />
        </div>
      </div>

      {/* 4. Table Rows Skeleton */}
      <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 overflow-hidden">
        <div className="h-11 px-4 border-b border-border/60 bg-muted/30 flex items-center justify-between">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>

        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={`pay-row-skel-${i}`}
              className="px-4 py-3.5 flex items-center justify-between gap-4"
            >
              <div className="w-1/4 space-y-1.5">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>

              <div className="w-24">
                <Skeleton className="h-5 w-20 rounded" />
              </div>

              <div className="w-28 space-y-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>

              <div className="w-1/3 space-y-1">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>

              <div className="w-16 flex justify-end">
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Pagination Skeleton */}
      <div className="p-3.5 rounded-2xl bg-card/60 border border-border/70 flex items-center justify-between">
        <Skeleton className="h-4 w-40 rounded" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
