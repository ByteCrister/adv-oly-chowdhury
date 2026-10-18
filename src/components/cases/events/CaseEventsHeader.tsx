"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberCounter } from "@/components/shared/number-counter";
import { Skeleton } from "@/components/ui/skeleton";
import type { CaseDetailDto } from "@/types/case.types";
import type { CaseEventStatsDto } from "@/types/case-event.types";

export interface CaseEventsHeaderProps {
  caseData: CaseDetailDto;
  stats?: CaseEventStatsDto;
  isLoadingStats?: boolean;
  onAddEventClick: () => void;
  onRefresh?: () => void;
  isFetching?: boolean;
}

export function CaseEventsHeader({
  caseData,
  stats,
  isLoadingStats = false,
  onAddEventClick,
  onRefresh,
  isFetching = false,
}: CaseEventsHeaderProps) {
  return (
    <div className="space-y-4 pb-4 border-b border-border/40">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/cases/${caseData.id}`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Case Dossier</span>
            </Link>
            <span className="text-border">/</span>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/25">
              {caseData.caseNumber || caseData.internalReference}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
              Case Events & Milestones
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sapphire-500/10 text-sapphire-600 dark:text-sapphire-400 border border-sapphire-500/30 shrink-0">
              {stats?.total ?? caseData.counts.events} Milestones
            </span>
          </div>

          <p className="text-xs text-muted-foreground truncate max-w-2xl">
            Matter: <span className="font-medium text-foreground">{caseData.title}</span> • Court:{" "}
            <span className="font-medium text-foreground">{caseData.court?.name || "Unassigned"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
              className="rounded-xl text-xs gap-1.5 border-border/70 text-muted-foreground hover:text-foreground"
              title="Refresh events list"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-gold-500" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}

          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={onAddEventClick}
            className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Event</span>
          </Button>
        </div>
      </div>

      {/* Events Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {/* Total Events */}
        <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 shadow-xs">
          <span className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground block mb-1">
            Total Milestones
          </span>
          {isLoadingStats && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-foreground">
              <NumberCounter value={stats?.total ?? 0} />
            </span>
          )}
        </div>

        {/* Upcoming */}
        <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 shadow-xs">
          <span className="text-[10px] font-medium tracking-wide uppercase text-gold-600 dark:text-gold-400 block mb-1">
            Upcoming Deadlines
          </span>
          {isLoadingStats && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-gold-600 dark:text-gold-400">
              <NumberCounter value={stats?.upcoming ?? 0} />
            </span>
          )}
        </div>

        {/* Today */}
        <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 shadow-xs">
          <span className="text-[10px] font-medium tracking-wide uppercase text-sapphire-600 dark:text-sapphire-400 block mb-1">
            Today
          </span>
          {isLoadingStats && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-sapphire-600 dark:text-sapphire-400">
              <NumberCounter value={stats?.today ?? 0} />
            </span>
          )}
        </div>

        {/* With Attachments */}
        <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 shadow-xs">
          <span className="text-[10px] font-medium tracking-wide uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
            With Attachments
          </span>
          {isLoadingStats && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-emerald-600 dark:text-emerald-400">
              <NumberCounter value={stats?.withAttachment ?? 0} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default CaseEventsHeader;
