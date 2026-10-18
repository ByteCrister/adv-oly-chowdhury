"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CaseDocumentsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center pb-4 border-b border-border/40">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-md" />
        </div>
        <Skeleton className="h-8 w-32 rounded-xl" />
      </div>

      {/* Toolbar Skeleton */}
      <Skeleton className="h-14 rounded-2xl" />

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/40">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CaseDocumentsSkeleton;
