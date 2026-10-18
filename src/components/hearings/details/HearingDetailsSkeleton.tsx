"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function HearingDetailsSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Breadcrumb Skeleton */}
      <Skeleton className="h-9 w-72 rounded-xl" />

      {/* Top Header Card */}
      <div className="p-6 rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Main Grid: Left Details & Right Sidebars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default HearingDetailsSkeleton;
