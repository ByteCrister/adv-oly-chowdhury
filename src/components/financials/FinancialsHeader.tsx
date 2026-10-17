"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Coins,
  CreditCard,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FinancialsHeaderProps {
  onRecordPayment: () => void;
  onRefresh: () => void;
  isFetching?: boolean;
}

export function FinancialsHeader({
  onRecordPayment,
  onRefresh,
  isFetching = false,
}: FinancialsHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400">
          <Coins className="w-4 h-4 text-gold-500" />
          <span>Chamber Accounts & Ledger</span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Financial Management
        </h1>
        <p className="text-xs text-muted-foreground max-w-2xl">
          Unified ledger tracking client retainer fee receipts, professional billing, and litigation case disbursements.
        </p>
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isFetching}
          className="rounded-xl text-xs font-medium gap-1.5 h-9"
          title="Refresh Financial Ledger"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-gold-500" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {/* Record Case Expense Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/financials/case-expense/new")}
          className="rounded-xl text-xs font-semibold gap-1.5 h-9 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50 transition-colors shadow-sm"
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Record Expense</span>
        </Button>

        {/* Record Client Payment Button */}
        <Button
          type="button"
          variant="gold"
          size="sm"
          onClick={onRecordPayment}
          className="rounded-xl text-xs font-semibold gap-1.5 h-9 shadow-sm"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Record Payment</span>
        </Button>
      </div>
    </div>
  );
}

export default FinancialsHeader;
