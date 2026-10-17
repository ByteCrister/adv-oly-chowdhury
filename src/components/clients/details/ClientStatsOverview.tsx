"use client";

import * as React from "react";
import {
  Briefcase,
  FileText,
  CheckCircle2,
  Clock,
  Coins,
} from "lucide-react";
import { NumberCounter } from "@/components/shared/number-counter";
import type { ClientStatsSummary } from "@/types/client.types";

export interface ClientStatsOverviewProps {
  stats: ClientStatsSummary;
}

export function ClientStatsOverview({ stats }: ClientStatsOverviewProps) {
  const formattedPaidAmount = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(stats.totalPaidAmount);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Legal Cases Summary */}
      <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-gold-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Legal Retainers
          </span>
          <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20 group-hover:scale-105 transition-transform">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="font-serif text-2xl font-bold text-foreground">
            <NumberCounter value={stats.totalCases} />
          </div>
          <span className="text-xs text-muted-foreground">total matters</span>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40">
          <span className="flex items-center gap-1 text-gold-600 dark:text-gold-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
            {stats.activeCases} Active
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            {stats.closedCases} Disposed
          </span>
        </div>
      </div>

      {/* 2. Documents Vault */}
      <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-gold-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Document Vault
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="font-serif text-2xl font-bold text-foreground">
            <NumberCounter value={stats.totalDocuments} />
          </div>
          <span className="text-xs text-muted-foreground">verified assets</span>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500/80" />
          <span>Cloudinary secure reference</span>
        </div>
      </div>

      {/* 3. Total Financials & Payments */}
      <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-gold-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Paid (BDT)
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <Coins className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="font-serif text-xl sm:text-2xl font-bold text-foreground truncate">
            {formattedPaidAmount}
          </div>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex items-center justify-between">
          <span>{stats.totalPayments} transactions</span>
          {stats.lastPaymentDate && (
            <span className="text-[10px]">
              Last: {new Date(stats.lastPaymentDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* 4. Action Items & Chamber Tasks */}
      <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-gold-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pending Tasks
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="font-serif text-2xl font-bold text-foreground">
            <NumberCounter value={stats.pendingTasksCount} />
          </div>
          <span className="text-xs text-muted-foreground">open tasks</span>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          <span>Case hearings & drafting</span>
        </div>
      </div>
    </div>
  );
}
