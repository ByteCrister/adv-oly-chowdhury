"use client";

import * as React from "react";
import {
  Building2,
  Plus,
  RefreshCw,
  Scale,
  Briefcase,
  Gavel,
  ShieldCheck,
} from "lucide-react";
import { DashboardBreadcrumb } from "@/components/shared";
import { NumberCounter } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { CourtListItemDto } from "@/types/court.types";

export interface CourtsPageHeaderProps {
  items: CourtListItemDto[];
  total: number;
  isFetching?: boolean;
  onRefresh: () => void;
  onAddNew: () => void;
}

export function CourtsPageHeader({
  items,
  total,
  isFetching = false,
  onRefresh,
  onAddNew,
}: CourtsPageHeaderProps) {
  // Aggregate active and relation metrics from loaded items
  const activeCount = React.useMemo(
    () => items.filter((c) => c.isActive).length,
    [items]
  );

  const totalCasesSum = React.useMemo(
    () => items.reduce((acc, curr) => acc + (curr.totalCases || 0), 0),
    [items]
  );

  const totalHearingsSum = React.useMemo(
    () => items.reduce((acc, curr) => acc + (curr.totalHearings || 0), 0),
    [items]
  );

  const statCards = [
    {
      label: "Registered Benches",
      value: total,
      subtext: "Total judicial registry",
      icon: Building2,
      accent: "text-gold-500",
      bgAccent: "bg-gold-500/10",
      borderAccent: "border-gold-500/20",
    },
    {
      label: "Active Courts",
      value: activeCount,
      subtext: `${activeCount} benches in current view`,
      icon: ShieldCheck,
      accent: "text-emerald-500",
      bgAccent: "bg-emerald-500/10",
      borderAccent: "border-emerald-500/20",
    },
    {
      label: "Associated Matters",
      value: totalCasesSum,
      subtext: "Linked case files",
      icon: Briefcase,
      accent: "text-sapphire-400",
      bgAccent: "bg-sapphire-500/10",
      borderAccent: "border-sapphire-500/20",
    },
    {
      label: "Cause List Hearings",
      value: totalHearingsSum,
      subtext: "Scheduled hearings",
      icon: Gavel,
      accent: "text-amber-500",
      bgAccent: "bg-amber-500/10",
      borderAccent: "border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumb */}
      <DashboardBreadcrumb />

      {/* 2. Main Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20 shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Courts & Judicial Benches
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-10 sm:pl-10">
            Registry of Sylhet District Judiciary benches, magistrate courts, revenue tribunals & appellate benches.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto pl-10 sm:pl-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="rounded-xl border-border/80 dark:border-white/10 hover:border-gold-500/30 text-xs font-semibold"
            title="Refresh courts list"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-gold-500" : "text-muted-foreground"}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={onAddNew}
            className="rounded-xl px-4 text-xs font-semibold shadow-md shadow-gold-500/15"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Bench</span>
          </Button>
        </div>
      </div>

      {/* 3. Quick Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative p-4 rounded-2xl bg-card/85 dark:bg-card/60 border border-border/70 dark:border-white/10 shadow-sm hover:shadow-md transition-all group overflow-hidden"
            >
              {/* Subtle top hairline highlight */}
              <div
                className="absolute top-0 inset-x-3 h-[1px] bg-gradient-to-r from-transparent via-gold-400/20 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {card.label}
                </span>
                <div
                  className={`p-1.5 rounded-lg ${card.bgAccent} ${card.accent} border ${card.borderAccent}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-serif text-2xl font-bold text-foreground tracking-tight">
                  <NumberCounter
                    value={card.value}
                    delay={0.08 * (idx + 1)}
                    className="font-serif font-bold text-foreground"
                  />
                </span>
              </div>

              <div className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                {card.subtext}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CourtsPageHeader;
