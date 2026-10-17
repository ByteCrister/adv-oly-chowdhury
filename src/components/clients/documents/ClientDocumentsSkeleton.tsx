"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientDocumentsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* 1. Header Banner Skeleton */}
      <div className="p-6 rounded-2xl bg-card/60 border border-border/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-44 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-56 rounded" />
          </div>
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* 2. Toolbar Skeleton */}
      <div className="p-4 rounded-2xl bg-card/60 border border-border/70 dark:border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <Skeleton className="h-10 w-full lg:w-80 rounded-xl" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-48 rounded-xl" />
        </div>
      </div>

      {/* 3. Table Rows Skeleton */}
      <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 overflow-hidden">
        <div className="h-11 px-4 border-b border-border/60 bg-muted/30 flex items-center justify-between">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>

        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={`doc-row-skel-${i}`}
              className="px-4 py-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 w-1/3">
                <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
                <div className="space-y-1.5 w-full">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>

              <div className="w-24">
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>

              <div className="w-24 space-y-1">
                <Skeleton className="h-3.5 w-16 rounded" />
                <Skeleton className="h-2.5 w-10 rounded" />
              </div>

              <div className="w-32 space-y-1">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-2.5 w-20 rounded" />
              </div>

              <div className="w-16 flex justify-end gap-1.5">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="w-7 h-7 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Pagination Skeleton */}
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
