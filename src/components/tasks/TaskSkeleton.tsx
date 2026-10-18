"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TaskSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 backdrop-blur-md p-4 sm:p-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Checkbox placeholder */}
              <Skeleton className="w-5 h-5 rounded-md shrink-0" />
              {/* Status and Priority badges */}
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="w-16 h-5 rounded-full" />
                <Skeleton className="w-14 h-5 rounded-full" />
              </div>
              {/* Title */}
              <Skeleton className="h-5 w-48 sm:w-72 rounded-md" />
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {/* Due date tag */}
              <Skeleton className="w-24 h-5 rounded-md" />
              {/* Action button */}
              <Skeleton className="w-7 h-7 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TaskSkeleton;
