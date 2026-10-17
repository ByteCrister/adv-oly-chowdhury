"use client";

import * as React from "react";
import { Coins, CreditCard, PieChart, TrendingUp, CheckCircle2 } from "lucide-react";
import { NumberCounter } from "@/components/shared/number-counter";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  PaymentMethod,
  PaymentType,
} from "@/const/client-payment.const";
import type { ClientPaymentSummaryStats } from "@/types/client-payment.types";

export interface ClientPaymentsSummaryCardsProps {
  summary: ClientPaymentSummaryStats;
}

export function ClientPaymentsSummaryCards({ summary }: ClientPaymentsSummaryCardsProps) {
  const formattedTotalAmount = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(summary.totalAmount);

  // Find top payment method
  const topMethod = Object.entries(summary.methodBreakdown || {}).sort(
    (a, b) => (b[1] || 0) - (a[1] || 0)
  )[0];

  // Find top payment type
  const topType = Object.entries(summary.typeBreakdown || {}).sort(
    (a, b) => (b[1] || 0) - (a[1] || 0)
  )[0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Amount Paid */}
      <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Collected
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <Coins className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="font-serif text-xl sm:text-2xl font-bold text-foreground truncate">
            {formattedTotalAmount}
          </div>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Receipted chamber revenue</span>
        </div>
      </div>

      {/* 2. Total Transactions */}
      <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-gold-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Transactions
          </span>
          <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20 group-hover:scale-105 transition-transform">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="font-serif text-2xl font-bold text-foreground">
            <NumberCounter value={summary.totalCount} />
          </div>
          <span className="text-xs text-muted-foreground">recorded payments</span>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40">
          <span>All payment methods combined</span>
        </div>
      </div>

      {/* 3. Primary Payment Channel */}
      <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Primary Channel
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="font-serif text-base sm:text-lg font-bold text-foreground truncate">
            {topMethod ? (
              PAYMENT_METHOD_LABELS[topMethod[0] as PaymentMethod] || topMethod[0]
            ) : (
              "None Recorded"
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {topMethod
              ? `${new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(topMethod[1])} total`
              : "No payment history"}
          </span>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40">
          <span>Leading settlement method</span>
        </div>
      </div>

      {/* 4. Top Fee Category */}
      <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden group hover:border-purple-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Fee Classification
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform">
            <PieChart className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="font-serif text-base sm:text-lg font-bold text-foreground truncate">
            {topType ? (
              PAYMENT_TYPE_LABELS[topType[0] as PaymentType] || topType[0]
            ) : (
              "None Recorded"
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {topType
              ? `${new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(topType[1])} allocated`
              : "No fees billed"}
          </span>
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground pt-2 border-t border-border/40">
          <span>Billing allocation breakdown</span>
        </div>
      </div>
    </div>
  );
}
