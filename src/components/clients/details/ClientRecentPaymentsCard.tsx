"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, ArrowRight, Receipt, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PaymentMethodBadge,
  PaymentTypeBadge,
} from "@/components/clients/shared/ClientBadges";
import type { ClientPaymentSummaryDto } from "@/types/client.types";

export interface ClientRecentPaymentsCardProps {
  payments: ClientPaymentSummaryDto[];
  clientId: string;
}

export function ClientRecentPaymentsCard({
  payments,
  clientId,
}: ClientRecentPaymentsCardProps) {
  const formatAmount = (amount: number, currency: string = "BDT"): string => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Recent Financial Payments
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Chamber fees, retainers, and litigation disbursement receipts.
            </p>
          </div>
        </div>

        <Link href={`/dashboard/clients/${clientId}/payments`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 h-8 border-border/80 text-foreground hover:bg-gold-500/10 hover:border-gold-500/40"
          >
            <span>Manage Payments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {payments.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            No payments have been recorded for this client yet.
          </p>
          <Link href={`/dashboard/clients/${clientId}/payments`}>
            <Button type="button" variant="gold" size="sm" className="rounded-xl text-xs mt-2">
              Record First Payment
            </Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {payments.map((p) => (
            <div
              key={p.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 first:pt-0 last:pb-0"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif text-sm font-bold text-foreground">
                    {formatAmount(p.amount, p.currency)}
                  </span>
                  <PaymentMethodBadge method={p.paymentMethod} />
                  <PaymentTypeBadge type={p.paymentType} />
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                  <span>{new Date(p.paymentDate).toLocaleDateString()}</span>
                  {p.moneyReceiptNumber && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Receipt className="w-3 h-3 text-gold-500" />
                        MR: {p.moneyReceiptNumber}
                      </span>
                    </>
                  )}
                  {p.caseReference && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-gold-600 dark:text-gold-400">
                        {p.caseReference}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {p.referenceNumber && (
                <div className="self-end sm:self-center shrink-0 text-[11px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
                  Ref: {p.referenceNumber}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
