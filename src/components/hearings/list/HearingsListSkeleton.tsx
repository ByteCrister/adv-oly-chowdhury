"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function HearingsListSkeleton() {
  return (
    <div className="space-y-4">
      {/* 5 Skeleton Accordion Cards */}
      {[1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-16 h-14 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40 rounded-md" />
                <Skeleton className="h-3 w-56 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          </div>
          <div className="flex items-center gap-4 pt-1 border-t border-border/40">
            <Skeleton className="h-3 w-32 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-3 w-36 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default HearingsListSkeleton;
