"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CasesListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-48 sm:w-64 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                  <Skeleton className="h-3.5 w-40 rounded-md" />
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-28 rounded-md hidden sm:block" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CasesListSkeleton;
