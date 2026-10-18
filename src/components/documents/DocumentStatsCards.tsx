"use client";

import * as React from "react";
import {
  FileText,
  Briefcase,
  Users,
  Clock,
} from "lucide-react";
import { NumberCounter } from "@/components/shared";
import type { DocumentStatsDto } from "@/types/document.types";

export interface DocumentStatsCardsProps {
  stats?: DocumentStatsDto;
  isLoading?: boolean;
}

export function DocumentStatsCards({
  stats,
  isLoading = false,
}: DocumentStatsCardsProps) {
  const cards = [
    {
      label: "Total Legal Documents",
      value: stats?.totalActive ?? 0,
      subtext: "Chamber digital archives",
      icon: FileText,
      accent: "text-gold-500 dark:text-gold-400",
      bgAccent: "bg-gold-500/10",
      borderAccent: "border-gold-500/20 dark:border-gold-500/30",
    },
    {
      label: "Case Pleadings & Exhibits",
      value: stats?.activeCaseDocs ?? 0,
      subtext: "Petitions, orders & evidence",
      icon: Briefcase,
      accent: "text-blue-500 dark:text-blue-400",
      bgAccent: "bg-blue-500/10",
      borderAccent: "border-blue-500/20 dark:border-blue-500/30",
    },
    {
      label: "Client KYC & Identity",
      value: stats?.activeClientDocs ?? 0,
      subtext: "Passports, NIDs & licenses",
      icon: Users,
      accent: "text-emerald-500 dark:text-emerald-400",
      bgAccent: "bg-emerald-500/10",
      borderAccent: "border-emerald-500/20 dark:border-emerald-500/30",
    },
    {
      label: "Recently Added",
      value: stats?.recentCount ?? 0,
      subtext: "Last 30 days filings",
      icon: Clock,
      accent: "text-amber-500 dark:text-amber-400",
      bgAccent: "bg-amber-500/10",
      borderAccent: "border-amber-500/20 dark:border-amber-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label || idx}
            className={`relative overflow-hidden p-4 sm:p-4.5 rounded-2xl bg-card/60 backdrop-blur-md border ${card.borderAccent} shadow-sm hover:shadow-md transition-all duration-200 group`}
          >
            {/* Top specular hairline sheen */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">
                {card.label}
              </span>
              <div
                className={`w-8 h-8 rounded-xl ${card.bgAccent} ${card.accent} flex items-center justify-center shrink-0 border border-white/5 transition-transform duration-200 group-hover:scale-110`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-7 w-16 bg-muted/60 dark:bg-white/[0.08] animate-pulse rounded-lg" />
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

export default DocumentStatsCards;
