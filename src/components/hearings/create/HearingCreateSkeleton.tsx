"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function HearingCreateSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <Skeleton className="h-9 w-64 rounded-xl" />
      <div className="p-6 rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default HearingCreateSkeleton;
