"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function DocumentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-card/60 border border-border/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-16 rounded" />
            <Skeleton className="h-2.5 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Skeleton className="h-9 w-72 rounded-xl" />
          <Skeleton className="h-9 w-full sm:w-80 rounded-xl" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8.5 w-36 rounded-xl" />
            <Skeleton className="h-8.5 w-28 rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8.5 w-36 rounded-xl" />
            <Skeleton className="h-8.5 w-20 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-border/70 bg-card/60 overflow-hidden">
        <div className="p-4 border-b border-border/60">
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        <div className="divide-y divide-border/40 p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between pt-3 first:pt-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-44 rounded" />
                  <Skeleton className="h-2.5 w-28 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-24 rounded-full hidden sm:block" />
              <Skeleton className="h-5 w-28 rounded-full hidden md:block" />
              <Skeleton className="h-4 w-16 rounded hidden lg:block" />
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DocumentSkeleton;
