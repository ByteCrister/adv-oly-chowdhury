"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, CalendarDays, ShieldCheck } from "lucide-react";

export interface ChamberBannerProps {
  advocateName?: string;
  hearingCount?: number;
  urgentTaskCount?: number;
  chamberLocation?: string;
}

export function ChamberBanner({
  advocateName = "Advocate Oly Chowdhury",
  hearingCount = 0,
  urgentTaskCount = 0,
  chamberLocation = "Chamber No. 323 • Bar Hall 02 • Judge's Court, Sylhet",
}: ChamberBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-card via-card/90 to-primary/10 border border-border/70 dark:border-white/10 p-6 sm:p-8 shadow-xl">
      {/* Decorative subtle gold glow */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-600 dark:text-gold-300 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-md sm:max-w-xl">{chamberLocation}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight">
            Welcome back, {advocateName}
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Court session is active. You have{" "}
            <span className="font-semibold text-gold-600 dark:text-gold-400">
              {hearingCount} court {hearingCount === 1 ? "appearance" : "appearances"}
            </span>{" "}
            on today&apos;s cause list and{" "}
            <span className="font-semibold text-foreground">
              {urgentTaskCount} urgent {urgentTaskCount === 1 ? "deadline" : "deadlines"}
            </span>
            .
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/dashboard/cases/new"
            className="btn-gold-gloss inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-midnight-950 text-xs font-semibold shadow-md transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Case</span>
          </Link>

          <Link
            href="/dashboard/hearings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border/80 hover:border-gold-500/50 hover:bg-muted text-foreground text-xs font-semibold transition-all"
          >
            <CalendarDays className="w-4 h-4 text-gold-500" />
            <span>Today&apos;s Cause List</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ChamberBanner;
