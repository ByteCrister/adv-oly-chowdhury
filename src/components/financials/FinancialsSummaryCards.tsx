"use client";

import * as React from "react";
import {
  Receipt,
  Scale,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { NumberCounter } from "@/components/shared/number-counter";
import type { FinancialSummaryStats } from "@/types/financial.types";

export interface FinancialsSummaryCardsProps {
  summary: FinancialSummaryStats;
}

export function FinancialsSummaryCards({ summary }: FinancialsSummaryCardsProps) {
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isNetPositive = summary.netBalance >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Client Payments Received */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Revenue Collected
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="font-serif text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {formatAmount(summary.totalIncome)}
          </div>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Client fee receipts</span>
          </span>
          <span className="font-semibold text-foreground">
            <NumberCounter value={summary.paymentCount} /> entries
          </span>
        </div>
      </div>

      {/* 2. Total Case Expenses */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-rose-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Case Expenses
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 group-hover:scale-105 transition-transform">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="font-serif text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 truncate">
            {formatAmount(summary.totalExpense)}
          </div>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5 text-rose-500" />
            <span>Litigation disbursements</span>
          </span>
          <span className="font-semibold text-foreground">
            <NumberCounter value={summary.expenseCount} /> entries
          </span>
        </div>
      </div>

      {/* 3. Net Financial Balance */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-gold-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Net Chamber Balance
          </span>
          <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20 group-hover:scale-105 transition-transform">
            <Scale className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3">
          <div
            className={`font-serif text-xl sm:text-2xl font-bold truncate ${
              isNetPositive
                ? "text-gold-600 dark:text-gold-400"
                : "text-destructive"
            }`}
          >
            {formatAmount(summary.netBalance)}
          </div>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              isNetPositive ? "bg-emerald-500" : "bg-destructive"
            }`}
          />
          <span>{isNetPositive ? "Chamber operating surplus" : "Operating deficit"}</span>
        </div>
      </div>

      {/* 4. Ledger Record Activity */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Ledger Entries
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="font-serif text-2xl font-bold text-foreground">
            <NumberCounter value={summary.totalCount} />
          </div>
          <span className="text-xs text-muted-foreground">total transactions</span>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex items-center justify-between">
          <span>{summary.paymentCount} Incomes</span>
          <span>•</span>
          <span>{summary.expenseCount} Expenses</span>
        </div>
      </div>
    </div>
  );
}

export default FinancialsSummaryCards;
