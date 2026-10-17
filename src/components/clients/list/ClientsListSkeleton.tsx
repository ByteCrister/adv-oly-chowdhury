"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientsListSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* 1. Statistics Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={`stat-skel-${i}`}
            className="p-4 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-md space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-16 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* 2. Filter Toolbar Skeleton */}
      <div className="p-4 rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 backdrop-blur-md space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <Skeleton className="h-9 w-full lg:w-72 rounded-xl" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>

      {/* 3. Table Rows Skeleton */}
      <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 backdrop-blur-md overflow-hidden">
        {/* Table Header */}
        <div className="h-11 px-4 border-b border-border/60 bg-muted/40 flex items-center justify-between">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/40">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={`row-skel-${i}`}
              className="px-4 py-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 w-1/4">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="space-y-1.5 w-full">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>

              <div className="w-24">
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>

              <div className="w-1/4 space-y-1.5">
                <Skeleton className="h-3.5 w-4/5 rounded" />
                <Skeleton className="h-3 w-3/5 rounded" />
              </div>

              <div className="w-16">
                <Skeleton className="h-6 w-12 rounded-lg" />
              </div>

              <div className="w-20">
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>

              <div className="w-10 flex justify-end">
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Pagination Skeleton */}
      <div className="p-3.5 rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 backdrop-blur-md flex items-center justify-between">
        <Skeleton className="h-4 w-48 rounded" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
