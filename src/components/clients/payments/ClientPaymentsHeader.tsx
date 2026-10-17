"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Coins, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClientDetailDto } from "@/types/client.types";

export interface ClientPaymentsHeaderProps {
  client: ClientDetailDto;
  totalPayments: number;
  onRecordClick: () => void;
}

export function ClientPaymentsHeader({
  client,
  totalPayments,
  onRecordClick,
}: ClientPaymentsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Back to Client Profile */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <Link
          href={`/dashboard/clients/${client.id}`}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-gold-500" />
          <span>Back to {client.name}&apos;s Profile</span>
        </Link>

        <span className="text-[11px] font-mono text-muted-foreground">
          {client.clientNumber}
        </span>
      </div>

      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold text-xl shrink-0">
              <Coins className="w-6 h-6" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  Payment Ledger & Billing
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {totalPayments} Transactions
                </span>
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                {client.organizationName ? (
                  <Building2 className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                )}
                <span>Client:</span>
                <strong className="text-foreground font-semibold">{client.name}</strong>
                {client.organizationName && <span>({client.organizationName})</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={onRecordClick}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
