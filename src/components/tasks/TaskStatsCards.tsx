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
      label: "Total Tasks",
      value: stats?.total ?? 0,
      subtext: "Chamber action items",
      icon: CheckSquare,
      glowColor: "rgba(192, 154, 78, 0.18)",
      iconGrad: "from-gold-400/20 via-gold-500/15 to-gold-600/5",
      iconColor: "text-gold-500 dark:text-gold-400",
      borderAccent: "border-gold-500/30 hover:border-gold-500/60 dark:border-gold-500/30 dark:hover:border-gold-400/60",
      haloRing: "ring-gold-500/20",
    },
    {
      label: "To Do / Pending",
      value: stats?.todo ?? 0,
      subtext: "Awaiting commencement",
      icon: Clock,
      glowColor: "rgba(245, 158, 11, 0.16)",
      iconGrad: "from-amber-400/20 via-amber-500/15 to-amber-600/5",
      iconColor: "text-amber-500 dark:text-amber-400",
      borderAccent: "border-amber-500/30 hover:border-amber-500/60 dark:border-amber-500/30 dark:hover:border-amber-400/60",
      haloRing: "ring-amber-500/20",
    },
    {
      label: "In Progress",
      value: stats?.inProgress ?? 0,
      subtext: "Active drafting & filings",
      icon: Flame,
      glowColor: "rgba(59, 130, 246, 0.16)",
      iconGrad: "from-blue-400/20 via-blue-500/15 to-blue-600/5",
      iconColor: "text-blue-500 dark:text-blue-400",
      borderAccent: "border-blue-500/30 hover:border-blue-500/60 dark:border-blue-500/30 dark:hover:border-blue-400/60",
      haloRing: "ring-blue-500/20",
    },
    {
      label: "Overdue Deadlines",
      value: overdueCount,
      subtext: overdueCount > 0 ? "Requires urgent attention" : "All deadlines on schedule",
      icon: AlertTriangle,
      glowColor: overdueCount > 0 ? "rgba(239, 68, 68, 0.22)" : "rgba(100, 116, 139, 0.08)",
      iconGrad: overdueCount > 0
        ? "from-red-500/25 via-red-500/15 to-rose-600/5"
        : "from-muted/40 via-muted/20 to-transparent",
      iconColor: overdueCount > 0 ? "text-red-500 dark:text-red-400" : "text-muted-foreground",
      borderAccent: overdueCount > 0
        ? "border-red-500/40 hover:border-red-500/70 dark:border-red-500/40 dark:hover:border-red-400/70 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.25)]"
        : "border-border/70 hover:border-border-strong dark:border-white/10 dark:hover:border-white/20",
      haloRing: overdueCount > 0 ? "ring-red-500/30" : "ring-white/5",
      pulse: overdueCount > 0,
    },
    {
      label: "Completed",
      value: stats?.completed ?? 0,
      subtext: "Concluded matters",
      icon: CheckCircle2,
      glowColor: "rgba(16, 185, 129, 0.18)",
      iconGrad: "from-emerald-400/20 via-emerald-500/15 to-emerald-600/5",
      iconColor: "text-emerald-500 dark:text-emerald-400",
      borderAccent: "border-emerald-500/30 hover:border-emerald-500/60 dark:border-emerald-500/30 dark:hover:border-emerald-400/60",
      haloRing: "ring-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label || idx}
            className={`relative overflow-hidden p-4 rounded-2xl bg-white/80 dark:bg-card/40 backdrop-blur-xl border ${card.borderAccent} shadow-[0_2px_12px_-4px_rgba(16,28,51,0.05)] dark:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.5)] hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group`}
          >
            {/* Specular top hairline sheen */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent pointer-events-none" />

            {/* Ambient radial glow from corner */}
            <div
              className="absolute -top-10 -right-10 w-24 h-24 rounded-full pointer-events-none blur-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              style={{ backgroundColor: card.glowColor }}
            />

            <div className="flex items-center justify-between gap-2 relative">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 font-mono line-clamp-1">
                {card.label}
              </span>
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.iconGrad} ${card.iconColor} ${card.haloRing} ring-1 flex items-center justify-center shrink-0 border border-white/40 dark:border-white/10 shadow-xs transition-transform duration-300 group-hover:scale-110 relative`}
              >
                <Icon className="w-4 h-4" />
                {card.pulse && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-sm" />
                  </span>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex items-baseline gap-2 relative">
              {isLoading ? (
                <div className="h-8 w-16 bg-muted/60 dark:bg-white/[0.08] animate-pulse rounded-lg" />
              ) : (
                <NumberCounter
                  value={card.value}
                  className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
                />
              )}
            </div>

            <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground/85 line-clamp-1 font-medium relative">
              {card.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default TaskStatsCards;
