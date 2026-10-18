"use client";

import * as React from "react";
import {
  Briefcase,
  Scale,
  Clock,
  AlertTriangle,
  RefreshCw,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberCounter } from "@/components/shared/number-counter";
import { Skeleton } from "@/components/ui/skeleton";
import type { CaseStatsDto } from "@/types/case.types";

export interface CasesStatsHeaderProps {
  stats?: CaseStatsDto;
  isLoading?: boolean;
  isFetching?: boolean;
  onRefetch?: () => void;
  onAddNew: () => void;
}

export function CasesStatsHeader({
  stats,
  isLoading = false,
  isFetching = false,
  onRefetch,
  onAddNew,
}: CasesStatsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top Banner with Title and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Cases & Files
            </h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/30">
              Active Practice
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Civil, criminal, writ, taxation, and land litigation dossiers and case management.
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
            title="Refresh cases data"
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
            <span>New Case</span>
          </Button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Cases */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-gold-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Total Cases
            </span>
            <div className="w-7 h-7 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5" />
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

        {/* Card 2: Active Practice */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-sapphire-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Active Cases
            </span>
            <div className="w-7 h-7 rounded-lg bg-sapphire-500/10 text-sapphire-600 dark:text-sapphire-400 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-sapphire-600 dark:text-sapphire-400">
                <NumberCounter value={stats?.active ?? 0} />
              </span>
              <span className="text-[10px] text-muted-foreground">in court</span>
            </div>
          )}
        </div>

        {/* Card 3: Hearing Staged */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-gold-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Hearing Staged
            </span>
            <div className="w-7 h-7 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-gold-600 dark:text-gold-400">
                <NumberCounter value={stats?.hearingStaged ?? 0} />
              </span>
              <span className="text-[10px] text-muted-foreground">scheduled</span>
            </div>
          )}
        </div>

        {/* Card 4: Urgent & High Priority */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-destructive/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Urgent Priority
            </span>
            <div className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-destructive">
                <NumberCounter value={stats?.urgentPriority ?? 0} />
              </span>
              <span className="text-[10px] text-muted-foreground">
                + {stats?.highPriority ?? 0} high
              </span>
            </div>
          )}
        </div>

        {/* Card 5: Disposed / Closed */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-emerald-500/30 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">
              Disposed / Closed
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
                <NumberCounter value={(stats?.disposed ?? 0) + (stats?.closed ?? 0)} />
              </span>
              <span className="text-[10px] text-muted-foreground">completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
