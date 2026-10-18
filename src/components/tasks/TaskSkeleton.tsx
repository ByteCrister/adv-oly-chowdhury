"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TaskSkeleton() {
  return (
    <div className="space-y-3.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-white/70 dark:bg-card/40 backdrop-blur-xl p-4 sm:p-5 shadow-2xs"
        >
          {/* Accent strip placeholder */}
          <div className="absolute left-0 top-0 bottom-0 w-1.25 bg-muted/60 dark:bg-white/10" />

          {/* Top specular hairline */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/15 to-transparent pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pl-2">
            <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
              {/* Checkbox circular placeholder */}
              <Skeleton className="w-5 h-5 rounded-full shrink-0" />

              <div className="space-y-2 flex-1 min-w-0">
                {/* Badges and timestamp placeholders */}
                <div className="flex items-center gap-2">
                  <Skeleton className="w-16 h-5 rounded-full" />
                  <Skeleton className="w-20 h-5 rounded-full" />
                  <Skeleton className="w-28 h-5 rounded-md hidden sm:block" />
                </div>
                {/* Title placeholder */}
                <Skeleton className="h-5 w-3/4 max-w-md rounded-md" />
                {/* Metadata chips placeholder */}
                <div className="flex items-center gap-2 pt-0.5">
                  <Skeleton className="w-36 h-4.5 rounded-lg" />
                  <Skeleton className="w-28 h-4.5 rounded-lg hidden sm:block" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <Skeleton className="w-8.5 h-8.5 rounded-xl" />
              <Skeleton className="w-8.5 h-8.5 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TaskSkeleton;
