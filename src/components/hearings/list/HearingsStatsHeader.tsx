"use client";

import {
  Gavel,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberCounter } from "@/components/shared/number-counter";
import { Skeleton } from "@/components/ui/skeleton";
import type { HearingStatsDto } from "@/types/hearing.types";

export interface HearingsStatsHeaderProps {
  stats?: HearingStatsDto;
  isLoading?: boolean;
  isFetching?: boolean;
  onRefetch?: () => void;
  onAddNew: () => void;
}

export function HearingsStatsHeader({
  stats,
  isLoading = false,
  isFetching = false,
  onRefetch,
  onAddNew,
}: HearingsStatsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top Banner with Title and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Daily Cause List
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/30">
              Sylhet Courts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Court hearings schedule, bench cause lists, and daily appearance calendar.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRefetch?.()}
            disabled={isFetching}
            className="rounded-xl text-xs gap-1.5 border-border/70 text-muted-foreground hover:text-foreground"
            title="Refresh cause list data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-gold-500" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={onAddNew}
            className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Hearing</span>
          </Button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Matching Hearings */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-gold-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Total Hearings
            </span>
            <div className="w-7 h-7 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
              <Gavel className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                <NumberCounter value={stats?.total ?? 0} />
              </span>
              <span className="text-[10px] text-muted-foreground">in query</span>
            </div>
          )}
        </div>

        {/* Card 2: Today's Cause List */}
        <div className="relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gold-500/[0.03] dark:bg-gold-500/[0.05] p-3.5 shadow-sm transition-all hover:border-gold-500/60">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-semibold tracking-wide uppercase text-gold-600 dark:text-gold-400">
              Today&apos;s List
            </span>
            <div className="w-7 h-7 rounded-lg bg-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-gold-600 dark:text-gold-400">
                <NumberCounter value={stats?.today ?? 0} />
              </span>
              <span className="text-[10px] text-gold-600/80 dark:text-gold-400/80 font-medium">
                today
              </span>
            </div>
          )}
        </div>

        {/* Card 3: Upcoming Hearings */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-sapphire-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Upcoming
            </span>
            <div className="w-7 h-7 rounded-lg bg-sapphire-500/10 text-sapphire-600 dark:text-sapphire-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                <NumberCounter value={stats?.upcoming ?? 0} />
              </span>
              <span className="text-[10px] text-muted-foreground">scheduled</span>
            </div>
          )}
        </div>

        {/* Card 4: Adjourned Matters */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-amber-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Adjourned
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                <NumberCounter value={stats?.adjourned ?? 0} />
              </span>
              <span className="text-[10px] text-muted-foreground">next dates set</span>
            </div>
          )}
        </div>

        {/* Card 5: Completed Hearings */}
        <div className="col-span-2 sm:col-span-1 relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Completed
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                <NumberCounter value={stats?.completed ?? 0} />
              </span>
              <span className="text-[10px] text-muted-foreground">orders delivered</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HearingsStatsHeader;
