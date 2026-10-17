"use client";

import * as React from "react";
import {
  CreditCard,
  Receipt,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Calendar,
  Briefcase,
  Coins,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PaymentMethodBadge,
  PaymentTypeBadge,
} from "@/components/clients/shared/ClientBadges";
import type { ClientPaymentItemDto } from "@/types/client-payment.types";

export interface ClientPaymentsTableProps {
  payments: ClientPaymentItemDto[];
  isLoading?: boolean;
  onEditPayment: (payment: ClientPaymentItemDto) => void;
  onDeletePayment: (payment: ClientPaymentItemDto) => void;
  onRecordNew: () => void;
  onResetFilters: () => void;
}

export function ClientPaymentsTable({
  payments,
  isLoading = false,
  onEditPayment,
  onDeletePayment,
  onRecordNew,
  onResetFilters,
}: ClientPaymentsTableProps) {
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".payment-action-menu-container")) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const formatAmount = (amount: number, currency: string = "BDT"): string => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Empty state
  if (!isLoading && payments.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-inner">
          <Coins className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-foreground">
            No Payment Records Found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No transactions match the selected filters or no payments have been registered for this client.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="rounded-xl text-xs"
          >
            Reset Filters
          </Button>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={onRecordNew}
            className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-muted-foreground border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-foreground font-semibold">
              <th className="py-3.5 px-4 font-serif">Payment Date & Receipt #</th>
              <th className="py-3.5 px-4 font-serif">Amount (BDT)</th>
              <th className="py-3.5 px-4">Method & Type</th>
              <th className="py-3.5 px-4">Case Reference & Notes</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {payments.map((p) => (
              <tr
                key={p.id}
                className="hover:bg-muted/30 transition-colors group"
              >
                {/* Date & Receipt Info */}
                <td className="py-3.5 px-4 align-top">
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gold-500" />
                      <span>{new Date(p.paymentDate).toLocaleDateString()}</span>
                    </span>
                    {p.moneyReceiptNumber && (
                      <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-gold-500/80" />
                        <span>MR: {p.moneyReceiptNumber}</span>
                      </span>
                    )}
                    {p.referenceNumber && (
                      <span className="font-mono text-[10px] text-muted-foreground block">
                        Ref: {p.referenceNumber}
                      </span>
                    )}
                  </div>
                </td>

                {/* Amount */}
                <td className="py-3.5 px-4 align-top">
                  <div className="space-y-0.5">
                    <span className="font-serif text-sm font-bold text-foreground">
                      {formatAmount(p.amount, p.currency)}
                    </span>
                    {p.receivedBy && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <UserCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>by {p.receivedBy.name}</span>
                      </span>
                    )}
                  </div>
                </td>

                {/* Method & Type Badges */}
                <td className="py-3.5 px-4 align-top">
                  <div className="flex flex-col items-start gap-1.5">
                    <PaymentMethodBadge method={p.paymentMethod} />
                    <PaymentTypeBadge type={p.paymentType} />
                  </div>
                </td>

                {/* Case Reference & Notes */}
                <td className="py-3.5 px-4 align-top max-w-xs">
                  <div className="space-y-1">
                    {p.caseReference ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-gold-600 dark:text-gold-400">
                        <Briefcase className="w-3 h-3" />
                        <span>{p.caseReference}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">
                        General Account
                      </span>
                    )}
                    {p.notes && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {p.notes}
                      </p>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 align-top text-right">
                  <div className="relative inline-block payment-action-menu-container">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.receiptUrl && (
                        <a
                          href={p.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="View Payment Receipt Voucher"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gold-500" />
                        </a>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setActiveMenuId(activeMenuId === p.id ? null : p.id)
                        }
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Dropdown Menu */}
                    {activeMenuId === p.id && (
                      <div className="absolute right-0 mt-1 w-40 rounded-xl bg-popover/95 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-lg py-1 z-30 animate-in fade-in-50 zoom-in-95">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onEditPayment(p);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gold-500" />
                          <span>Edit Payment</span>
                        </button>

                        <div className="h-px bg-border/40 my-1" />

                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            onDeletePayment(p);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Payment</span>
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-border/40">
        {payments.map((p) => (
          <div key={p.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="font-serif text-base font-bold text-foreground">
                  {formatAmount(p.amount, p.currency)}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gold-500" />
                    <span>{new Date(p.paymentDate).toLocaleDateString()}</span>
                  </span>
                  {p.moneyReceiptNumber && <span>• MR: {p.moneyReceiptNumber}</span>}
                  {p.receivedBy && (
                    <span className="flex items-center gap-1 text-[10px]">
                      <UserCheck className="w-3 h-3 text-emerald-500" />
                      <span>{p.receivedBy.name}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <PaymentMethodBadge method={p.paymentMethod} />
                <PaymentTypeBadge type={p.paymentType} />
              </div>
            </div>

            {p.caseReference && (
              <div className="text-xs font-mono text-gold-600 dark:text-gold-400 font-semibold flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{p.caseReference}</span>
              </div>
            )}

            {p.notes && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {p.notes}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
              {p.receiptUrl && (
                <a
                  href={p.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gold-500 mr-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Receipt</span>
                </a>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditPayment(p)}
                className="rounded-xl text-xs h-7 px-3 gap-1"
              >
                <Edit2 className="w-3 h-3 text-gold-500" />
                <span>Edit</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDeletePayment(p)}
                className="rounded-xl text-xs h-7 px-2 border-destructive/40 text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
