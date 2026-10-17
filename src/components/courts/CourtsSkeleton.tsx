"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function CourtsHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Top breadcrumb skeleton */}
      <div className="h-5 w-48 rounded-md bg-muted/60 animate-pulse" />

      {/* Title & Action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-xl bg-muted/80 animate-pulse" />
          <div className="h-4 w-96 max-w-full rounded-md bg-muted/60 animate-pulse" />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-9 w-24 rounded-xl bg-muted/70 animate-pulse" />
          <div className="h-9 w-36 rounded-xl bg-gold-500/20 border border-gold-500/30 animate-pulse" />
        </div>
      </div>

      {/* Metrics Ribbon Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-card/85 dark:bg-card/60 border border-border/70 dark:border-white/10 space-y-2"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-14 rounded-lg" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CourtsToolbarSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-4 rounded-2xl bg-card/85 dark:bg-card/60 border border-border/70 dark:border-white/10 space-y-3",
        className
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        {/* Search Input skeleton */}
        <div className="sm:col-span-2 lg:col-span-4">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        {/* Court Type select skeleton */}
        <div className="lg:col-span-3">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        {/* District/Division select skeleton */}
        <div className="lg:col-span-2">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        {/* Status filter skeleton */}
        <div className="lg:col-span-2">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        {/* Reset / Actions skeleton */}
        <div className="lg:col-span-1">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>

      {/* Secondary filter chips row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-28 rounded-lg" />
          <Skeleton className="h-6 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-6 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function CourtsTableSkeleton({
  rowCount = 6,
  className,
}: {
  rowCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 dark:border-white/10 bg-card/85 dark:bg-card/60 overflow-hidden shadow-sm",
        className
      )}
    >
      {/* Table Header skeleton */}
      <div className="px-5 py-3.5 bg-muted/40 border-b border-border/60 flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-36 hidden md:block" />
        <Skeleton className="h-4 w-24 hidden lg:block" />
        <Skeleton className="h-4 w-20 hidden sm:block" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Table Rows skeleton */}
      <div className="divide-y divide-border/50">
        {Array.from({ length: rowCount }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            {/* Bench & Location */}
            <div className="space-y-2 max-w-sm w-full">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
              <Skeleton className="h-3 w-36 rounded ml-7" />
            </div>

            {/* Type & District */}
            <div className="space-y-1.5 w-40 hidden md:block">
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>

            {/* Judge Title */}
            <div className="space-y-1.5 w-36 hidden lg:block">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>

            {/* Case & Hearing Counts */}
            <div className="flex items-center gap-2 w-32 hidden sm:flex">
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>

            {/* Status */}
            <div className="w-20">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CourtsPaginationSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card/60 border border-border/70 dark:border-white/10",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="flex items-center gap-1.5 self-center sm:self-auto">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

export function CourtsPageSkeleton() {
  return (
    <div className="space-y-6">
      <CourtsHeaderSkeleton />
      <CourtsToolbarSkeleton />
      <CourtsTableSkeleton rowCount={6} />
      <CourtsPaginationSkeleton />
    </div>
  );
}

export default CourtsPageSkeleton;
