"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberCounter } from "@/components/shared/number-counter";
import { Skeleton } from "@/components/ui/skeleton";
import type { CaseDetailDto } from "@/types/case.types";
import type { CasePartyStatsDto } from "@/types/case-party.types";

export interface CasePartiesHeaderProps {
  caseData: CaseDetailDto;
  stats?: CasePartyStatsDto;
  isLoadingStats?: boolean;
  onAddPartyClick: () => void;
  onRefresh?: () => void;
  isFetching?: boolean;
}

export function CasePartiesHeader({
  caseData,
  stats,
  isLoadingStats = false,
  onAddPartyClick,
  onRefresh,
  isFetching = false,
}: CasePartiesHeaderProps) {
  return (
    <div className="space-y-4 pb-4 border-b border-border/40">
      {/* Top Navigation & Action Row */}
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
              Litigants & Case Parties
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
              {stats?.total ?? caseData.counts.parties} Litigants
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
              title="Refresh parties list"
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
            onClick={onAddPartyClick}
            className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Party</span>
          </Button>
        </div>
      </div>

      {/* Parties Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {/* Total Litigants */}
        <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 shadow-xs">
          <span className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground block mb-1">
            Total Litigants
          </span>
          {isLoadingStats && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-foreground">
              <NumberCounter value={stats?.total ?? 0} />
            </span>
          )}
        </div>

        {/* Plaintiffs / Petitioners */}
        <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 shadow-xs">
          <span className="text-[10px] font-medium tracking-wide uppercase text-gold-600 dark:text-gold-400 block mb-1">
            Plaintiffs / Petitioners
          </span>
          {isLoadingStats && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-gold-600 dark:text-gold-400">
              <NumberCounter value={(stats?.plaintiff ?? 0) + (stats?.petitioner ?? 0)} />
            </span>
          )}
        </div>

        {/* Defendants / Respondents */}
        <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 shadow-xs">
          <span className="text-[10px] font-medium tracking-wide uppercase text-sapphire-600 dark:text-sapphire-400 block mb-1">
            Defendants / Respondents
          </span>
          {isLoadingStats && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-sapphire-600 dark:text-sapphire-400">
              <NumberCounter
                value={
                  (stats?.defendant ?? 0) +
                  (stats?.respondent ?? 0) +
                  (stats?.oppositeParty ?? 0)
                }
              />
            </span>
          )}
        </div>

        {/* Witnesses & Other */}
        <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 shadow-xs">
          <span className="text-[10px] font-medium tracking-wide uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
            Witnesses & Others
          </span>
          {isLoadingStats && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-emerald-600 dark:text-emerald-400">
              <NumberCounter value={(stats?.witness ?? 0) + (stats?.other ?? 0)} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default CasePartiesHeader;
