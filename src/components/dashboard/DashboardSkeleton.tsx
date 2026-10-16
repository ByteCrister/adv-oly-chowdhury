"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ChamberBannerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl bg-card/85 dark:bg-card/60 border border-border/70 dark:border-white/10 p-6 sm:p-8 shadow-xl",
        className
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl w-full">
          {/* Badge skeleton */}
          <div className="h-6 w-64 rounded-full bg-muted/70 dark:bg-white/[0.06] animate-pulse" />
          {/* Heading skeleton */}
          <div className="h-8 sm:h-9 w-3/4 rounded-xl bg-muted/80 dark:bg-white/[0.08] animate-pulse" />
          {/* Subtext skeleton */}
          <div className="space-y-1.5 pt-1">
            <div className="h-4 w-full rounded-lg bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
            <div className="h-4 w-2/3 rounded-lg bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
          </div>
        </div>

        {/* Buttons skeleton */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-10 w-36 rounded-xl bg-gold-500/20 animate-pulse border border-gold-500/30" />
          <div className="h-10 w-36 rounded-xl bg-muted/70 dark:bg-white/[0.06] animate-pulse border border-border/60" />
        </div>
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6", className)}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-card/85 dark:bg-card/60 border border-border/70 dark:border-white/10 shadow-sm space-y-4"
        >
          {/* Top Label & Icon */}
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded-md bg-muted/70 dark:bg-white/[0.06] animate-pulse" />
            <div className="h-8 w-8 rounded-xl bg-muted/80 dark:bg-white/[0.08] animate-pulse" />
          </div>

          {/* Large Number */}
          <div className="h-9 w-20 rounded-xl bg-muted/90 dark:bg-white/[0.1] animate-pulse" />

          {/* Subtext */}
          <div className="pt-2 border-t border-border/50">
            <div className="h-3 w-32 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TodayCauseListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 rounded-lg bg-muted/70 dark:bg-white/[0.06] animate-pulse" />
        <div className="h-4 w-24 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-2.5 flex-1">
              {/* Badges */}
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 rounded bg-muted/80 dark:bg-white/[0.08] animate-pulse" />
                <div className="h-5 w-16 rounded bg-gold-500/15 animate-pulse" />
              </div>

              {/* Title */}
              <div className="h-5 w-3/4 rounded-lg bg-muted/90 dark:bg-white/[0.1] animate-pulse" />

              {/* Court Details */}
              <div className="h-4 w-1/2 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />

              {/* Purpose */}
              <div className="h-3.5 w-2/3 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
            </div>

            {/* Time Badge & Link */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
              <div className="h-8 w-24 rounded-xl bg-gold-500/15 animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChamberTasksSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="h-6 w-36 rounded-lg bg-muted/70 dark:bg-white/[0.06] animate-pulse" />
        <div className="h-4 w-16 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-card border border-border/70 dark:border-white/10 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
              <div className="h-4 w-14 rounded bg-muted/80 dark:bg-white/[0.08] animate-pulse" />
            </div>
            <div className="h-4 w-full rounded bg-muted/90 dark:bg-white/[0.09] animate-pulse" />
            <div className="pt-1 border-t border-border/40">
              <div className="h-3 w-28 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuickActionsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "p-5 rounded-2xl bg-card border border-border/70 dark:border-white/10 space-y-3",
        className
      )}
    >
      <div className="h-5 w-40 rounded-lg bg-muted/70 dark:bg-white/[0.06] animate-pulse" />
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-10 rounded-xl bg-muted/60 dark:bg-white/[0.05] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export function RecentCasesSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 rounded-lg bg-muted/70 dark:bg-white/[0.06] animate-pulse" />
        <div className="h-4 w-28 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/70 dark:border-white/10 bg-card">
        <div className="min-w-[650px] p-4 space-y-3">
          {/* Header row */}
          <div className="grid grid-cols-7 gap-3 py-2 border-b border-border/60">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-4 rounded bg-muted/70 dark:bg-white/[0.06] animate-pulse" />
            ))}
          </div>

          {/* Body rows */}
          {[1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-7 gap-3 py-3 border-b border-border/40 last:border-0">
              <div className="h-4 rounded bg-muted/80 dark:bg-white/[0.08] animate-pulse" />
              <div className="h-4 rounded bg-muted/90 dark:bg-white/[0.09] animate-pulse col-span-2" />
              <div className="h-4 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
              <div className="h-4 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
              <div className="h-4 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-emerald-500/15 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Chamber Status & Welcome Banner */}
      <ChamberBannerSkeleton />

      {/* 2. Key Metrics Grid */}
      <DashboardStatsSkeleton />

      {/* 3. Cause List & Chamber Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2">
          <TodayCauseListSkeleton />
        </div>
        <div className="space-y-6">
          <ChamberTasksSkeleton />
          <QuickActionsSkeleton />
        </div>
      </div>

      {/* 4. Recent Case Matters */}
      <RecentCasesSkeleton />
    </div>
  );
}

export default DashboardOverviewSkeleton;
