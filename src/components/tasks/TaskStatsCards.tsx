"use client";

import * as React from "react";
import {
  CheckSquare,
  Clock,
  Flame,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { NumberCounter } from "@/components/shared";
import type { TaskStatsDto } from "@/types/task.types";

export interface TaskStatsCardsProps {
  stats?: TaskStatsDto;
  isLoading?: boolean;
}

export function TaskStatsCards({
  stats,
  isLoading = false,
}: TaskStatsCardsProps) {
  const overdueCount = stats?.overdue ?? 0;

  const cards = [
    {
      label: "Total Filtered Tasks",
      value: stats?.total ?? 0,
      subtext: "Chamber action items",
      icon: CheckSquare,
      accent: "text-gold-500 dark:text-gold-400",
      bgAccent: "bg-gold-500/10",
      borderAccent: "border-gold-500/20 dark:border-gold-500/30",
    },
    {
      label: "To Do / Pending",
      value: stats?.todo ?? 0,
      subtext: "Awaiting commencement",
      icon: Clock,
      accent: "text-amber-500 dark:text-amber-400",
      bgAccent: "bg-amber-500/10",
      borderAccent: "border-amber-500/20 dark:border-amber-500/30",
    },
    {
      label: "In Progress",
      value: stats?.inProgress ?? 0,
      subtext: "Active drafting & filings",
      icon: Flame,
      accent: "text-blue-500 dark:text-blue-400",
      bgAccent: "bg-blue-500/10",
      borderAccent: "border-blue-500/20 dark:border-blue-500/30",
    },
    {
      label: "Overdue Deadlines",
      value: overdueCount,
      subtext: overdueCount > 0 ? "Requires urgent attention" : "All deadlines on schedule",
      icon: AlertTriangle,
      accent: overdueCount > 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground",
      bgAccent: overdueCount > 0 ? "bg-red-500/10" : "bg-muted/30",
      borderAccent:
        overdueCount > 0
          ? "border-red-500/30 dark:border-red-500/40 shadow-[0_0_15px_-3px_rgba(239,68,68,0.25)]"
          : "border-border/70 dark:border-white/10",
      pulse: overdueCount > 0,
    },
    {
      label: "Completed",
      value: stats?.completed ?? 0,
      subtext: "Concluded matters",
      icon: CheckCircle2,
      accent: "text-emerald-500 dark:text-emerald-400",
      bgAccent: "bg-emerald-500/10",
      borderAccent: "border-emerald-500/20 dark:border-emerald-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label || idx}
            className={`relative overflow-hidden p-4 rounded-2xl bg-card/60 backdrop-blur-md border ${card.borderAccent} shadow-sm hover:shadow-md transition-all duration-200 group`}
          >
            {/* Top specular hairline sheen */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">
                {card.label}
              </span>
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${card.bgAccent} ${card.accent} flex items-center justify-center shrink-0 border border-white/5 transition-transform duration-200 group-hover:scale-110 relative`}
              >
                <Icon className="w-4 h-4" />
                {card.pulse && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-7 w-14 bg-muted/60 dark:bg-white/[0.08] animate-pulse rounded-lg" />
              ) : (
                <NumberCounter
                  value={card.value}
                  className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                />
              )}
            </div>

            <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground/80 line-clamp-1">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default TaskStatsCards;
