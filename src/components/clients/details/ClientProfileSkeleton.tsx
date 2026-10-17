"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientProfileSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* 1. Header Card Skeleton */}
      <div className="p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-lg" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-64 rounded-xl" />
              <Skeleton className="h-4 w-40 rounded" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      {/* 2. Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={`profile-skel-stat-${i}`}
            className="p-4 rounded-2xl bg-card/60 border border-border/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* 3. Main Body: Info Card Skeleton & Side Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Identity Dossier Skeleton */}
          <div className="p-6 rounded-2xl bg-card/60 border border-border/70 space-y-4">
            <Skeleton className="h-5 w-40 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={`dossier-skel-${i}`} className="space-y-1.5">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Contact Skeleton */}
          <div className="p-6 rounded-2xl bg-card/60 border border-border/70 space-y-4">
            <Skeleton className="h-5 w-36 rounded" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* Side Recent Items Skeleton */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-card/60 border border-border/70 space-y-4">
            <Skeleton className="h-5 w-32 rounded" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card/60 border border-border/70 space-y-4">
            <Skeleton className="h-5 w-32 rounded" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
