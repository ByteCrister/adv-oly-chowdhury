"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StaggerContainer,
  StaggerItem,
} from "@/components/wrappers/Motion";

export function ProfileSkeleton() {
  return (
    <StaggerContainer
      className="space-y-6"
      delay={0.02}
      staggerDelay={0.05}
      viewport={{ once: true, margin: "0px" }}
    >
      {/* 1. Breadcrumb Skeleton */}
      <StaggerItem yOffset={6}>
        <div className="h-10 w-64 rounded-xl bg-card/40 border border-border/40 p-2">
          <Skeleton className="h-5 w-48 rounded-lg" />
        </div>
      </StaggerItem>

      {/* 2. Hero Header Card Skeleton */}
      <StaggerItem yOffset={8}>
        <div className="p-6 sm:p-8 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/70 dark:border-white/10 space-y-6 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar circle skeleton */}
              <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-full shrink-0 ring-4 ring-border/30" />

              <div className="space-y-2.5 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-32 rounded-full" />
                </div>
                <Skeleton className="h-8 w-64 sm:w-80 rounded-xl mx-auto sm:mx-0" />
                <Skeleton className="h-4 w-48 rounded mx-auto sm:mx-0" />
                <Skeleton className="h-3.5 w-60 rounded mx-auto sm:mx-0" />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>

          {/* Quick contact pills skeleton */}
          <div className="pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
        </div>
      </StaggerItem>

      {/* 3. Tab Navigation Skeleton */}
      <StaggerItem yOffset={6}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={`profile-tab-skel-${i}`} className="h-10 w-36 rounded-xl shrink-0" />
          ))}
        </div>
      </StaggerItem>

      {/* 4. Main Tab Body Skeleton */}
      <StaggerItem yOffset={8}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left main info card skeleton */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-card/60 border border-border/70 dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-44 rounded-lg" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={`field-skel-${i}`} className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-2">
                  <Skeleton className="h-3.5 w-20 rounded" />
                  <Skeleton className="h-5 w-40 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Right side summary cards skeleton */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-card/60 border border-border/70 dark:border-white/10 space-y-4">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>

            <div className="p-6 rounded-2xl bg-card/60 border border-border/70 dark:border-white/10 space-y-4">
              <Skeleton className="h-5 w-32 rounded" />
              <div className="space-y-2.5">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </StaggerItem>
    </StaggerContainer>
  );
}

export default ProfileSkeleton;
