"use client";

import * as React from "react";
import {
  Users,
  UserCheck,
  Building2,
  Briefcase,
  Coins,
  RefreshCw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberCounter } from "@/components/shared/number-counter";
import { useClientStats } from "@/hooks/clients";
import { Skeleton } from "@/components/ui/skeleton";

export interface ClientsStatsHeaderProps {
  onAddNew: () => void;
}

export function ClientsStatsHeader({ onAddNew }: ClientsStatsHeaderProps) {
  const { data: stats, isLoading, isFetching, refetch } = useClientStats();

  return (
    <div className="space-y-4">
      {/* Top Action & Subtitle Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Clients Directory
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage legal clientele, identity dossiers, case associations, and billing ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl text-xs gap-1.5 border-border/70 text-muted-foreground hover:text-foreground"
            title="Refresh client statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-gold-500" : ""}`} />
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
            <span>New Client</span>
          </Button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Clients */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-gold-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">Total Clients</span>
            <div className="w-7 h-7 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-20 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                <NumberCounter value={stats?.totalClients ?? 0} />
              </span>
              {(stats?.newClientsThisMonth ?? 0) > 0 && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  +{stats?.newClientsThisMonth} this mo
                </span>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Active Clients */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">Active Retainers</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                <NumberCounter value={stats?.activeClients ?? 0} />
              </span>
              <span className="text-[10px] text-muted-foreground">
                {stats?.totalClients
                  ? `${Math.round(((stats.activeClients ?? 0) / stats.totalClients) * 100)}%`
                  : "0%"}
              </span>
            </div>
          )}
        </div>

        {/* Card 3: Individuals vs Corporate */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-sapphire-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">Entity Breakdown</span>
            <div className="w-7 h-7 rounded-lg bg-sapphire-500/10 text-sapphire-600 dark:text-sapphire-400 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-24 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-1.5 text-xs text-foreground font-semibold">
              <span className="text-sapphire-600 dark:text-sapphire-400">
                {stats?.individualClients ?? 0} Indiv
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-gold-600 dark:text-gold-400">
                {stats?.corporateClients ?? 0} Corp
              </span>
            </div>
          )}
        </div>

        {/* Card 4: Clients With Active Cases */}
        <div className="relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-gold-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">In Litigation</span>
            <div className="w-7 h-7 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-16 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold text-foreground">
                <NumberCounter value={stats?.clientsWithActiveCases ?? 0} />
              </span>
              <span className="text-[10px] text-muted-foreground">with active suits</span>
            </div>
          )}
        </div>

        {/* Card 5: Total Revenue */}
        <div className="col-span-2 sm:col-span-1 relative overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3.5 shadow-sm transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-[11px] font-medium tracking-wide uppercase">Revenue Collected</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && !stats ? (
            <Skeleton className="h-7 w-24 rounded-md" />
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                <NumberCounter
                  value={stats?.totalRevenueCollected ?? 0}
                  prefix="৳ "
                  formatter={(v) => `৳ ${v.toLocaleString("en-BD")}`}
                />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientsStatsHeader;
