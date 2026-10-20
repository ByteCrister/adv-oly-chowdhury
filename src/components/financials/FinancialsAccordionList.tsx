"use client";

import * as React from "react";
import Link from "next/link";
import {
  Coins,
  Receipt,
  Calendar,
  Briefcase,
  User,
  ExternalLink,
  Edit2,
  Trash2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  UserCheck,
  CreditCard,
  Tag,
  Hash,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PaymentMethodBadge } from "@/components/clients/shared/ClientBadges";
import {
  DocumentViewerDialog,
  type DocumentViewerTarget,
} from "@/components/documents/DocumentViewerDialog";
import type { UnifiedFinancialRecordDto } from "@/types/financial.types";
import type { ClientPaymentItemDto } from "@/types/client-payment.types";

export interface FinancialsAccordionListProps {
  records: UnifiedFinancialRecordDto[];
  isLoading?: boolean;
  onEditPayment: (payment: ClientPaymentItemDto) => void;
  onDeletePayment: (payment: ClientPaymentItemDto) => void;
  onEditExpense: (expenseId: string) => void;
  onDeleteExpense: (record: UnifiedFinancialRecordDto) => void;
  onRecordPayment: () => void;
  onRecordExpense: () => void;
  onResetFilters: () => void;
}

export function FinancialsAccordionList({
  records,
  isLoading = false,
  onEditPayment,
  onDeletePayment,
  onEditExpense,
  onDeleteExpense,
  onRecordPayment,
  onRecordExpense,
  onResetFilters,
}: FinancialsAccordionListProps) {
  const [viewingDocument, setViewingDocument] = React.useState<DocumentViewerTarget | null>(null);

  const formatAmount = (amount: number, currency: string = "BDT"): string => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toPaymentDto = (r: UnifiedFinancialRecordDto): ClientPaymentItemDto => ({
    id: r.id,
    clientId: r.clientId || "",
    caseId: r.caseId,
    caseReference: r.caseReference,
    caseTitle: r.caseTitle,
    paymentDate: r.transactionDate,
    amount: r.amount,
    currency: r.currency,
    paymentMethod: r.paymentMethod || "CASH",
    paymentMethodLabel: r.paymentMethodLabel || "Cash",
    paymentType: r.paymentType || "CASE_PROFESSIONAL_FEE",
    paymentTypeLabel: r.paymentTypeLabel || "Case Professional Fee",
    referenceNumber: r.referenceNumber,
    moneyReceiptNumber: r.moneyReceiptNumber,
    receiptAssetreferenceId: r.receiptAssetId,
    receiptUrl: r.receiptUrl,
    receiptFileName: r.receiptFileName,
    notes: r.description,
    receivedBy: r.recordedBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });

  const handleOpenReceipt = (r: UnifiedFinancialRecordDto) => {
    if (!r.receiptUrl) return;

    const isPdf =
      r.receiptAssetType === "pdf" ||
      r.receiptMimeType === "application/pdf" ||
      r.receiptFileName?.toLowerCase().endsWith(".pdf") ||
      r.receiptUrl.toLowerCase().includes(".pdf");

    setViewingDocument({
      id: r.receiptAssetId || r.id,
      title: `${r.recordType === "PAYMENT" ? "Payment Receipt" : "Expense Voucher"}: ${
        r.recordType === "PAYMENT"
          ? r.moneyReceiptNumber
            ? `MR #${r.moneyReceiptNumber}`
            : r.paymentMethodLabel || "Payment"
          : r.expenseCategoryLabel || "Case Expense"
      } - BDT ${r.amount}`,
      fileUrl: r.receiptUrl,
      originalFileName:
        r.receiptFileName || (r.recordType === "PAYMENT" ? "payment-receipt" : "expense-receipt"),
      mimeType: r.receiptMimeType || (isPdf ? "application/pdf" : "image/jpeg"),
      format: isPdf ? "PDF" : "IMAGE",
      sizeBytes: r.receiptSizeBytes || undefined,
      documentDate: r.transactionDate,
      entityType: r.recordType === "PAYMENT" ? "CLIENT" : "CASE",
      notes: r.description || null,
    });
  };

  // Empty state
  if (!isLoading && records.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20 shadow-inner">
          <Coins className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-foreground">
            No Financial Records Found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No transactions match the specified search or filter criteria. Try resetting filters or recording a new entry.
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
            variant="outline"
            size="sm"
            onClick={onRecordExpense}
            className="rounded-xl text-xs border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
          >
            <Receipt className="w-3.5 h-3.5 mr-1" />
            <span>Record Expense</span>
          </Button>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={onRecordPayment}
            className="rounded-xl text-xs font-semibold shadow-sm"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Accordion type="multiple" className="space-y-3">
      {records.map((r) => {
        const isPayment = r.recordType === "PAYMENT";
        const dateObj = new Date(r.transactionDate);
        const formattedDate = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : r.transactionDate;

        return (
          <AccordionItem
            key={`${r.recordType}-${r.id}`}
            value={r.id}
            className="group"
          >
            {/* Collapsed Trigger Bar */}
            <AccordionTrigger as="div" className="hover:no-underline py-3.5 px-4 sm:px-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                {/* Left: Indicator Icon + Type Badge + Date + Client/Case */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  {/* Visual Accent Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                      isPayment
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {isPayment ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  {/* Core Details */}
                  <div className="space-y-1 min-w-0 text-left">
                    <div className="flex items-center flex-wrap gap-2">
                      {/* Record Type Badge */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                          isPayment
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                        }`}
                      >
                        {isPayment ? "Client Fee Receipt" : "Case Expense"}
                      </span>

                      {/* Transaction Date */}
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gold-500" />
                        <span>{formattedDate}</span>
                      </span>

                      {/* Method or Category Tag */}
                      {isPayment && r.paymentMethod && (
                        <PaymentMethodBadge method={r.paymentMethod} />
                      )}
                      {!isPayment && r.expenseCategory && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <Tag className="w-2.5 h-2.5" />
                          <span>{r.expenseCategoryLabel || r.expenseCategory}</span>
                        </span>
                      )}
                    </div>

                    {/* Client & Matter Preview */}
                    <div className="flex items-center flex-wrap gap-x-2 text-xs text-muted-foreground truncate">
                      {r.clientName ? (
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <User className="w-3 h-3 text-muted-foreground/70" />
                          <span>{r.clientName}</span>
                          {r.clientNumber && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              ({r.clientNumber})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="italic">General Chamber Account</span>
                      )}

                      {r.caseReference && (
                        <>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-gold-600 dark:text-gold-400 font-medium">
                            <Briefcase className="w-3 h-3" />
                            <span>{r.caseReference}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Quick Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto shrink-0">
                  <div className="text-right">
                    <span
                      className={`font-serif text-base sm:text-lg font-bold block ${
                        isPayment
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isPayment ? "+" : "-"} {formatAmount(r.amount, r.currency)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      {isPayment ? "Chamber Credit" : "Case Disbursement"}
                    </span>
                  </div>

                  {/* Inline quick action buttons */}
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isPayment ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditPayment(toPaymentDto(r))}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                          title="Edit Payment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeletePayment(toPaymentDto(r))}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditExpense(r.id)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                          title="Manage Case Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteExpense(r)}
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                          title="Delete Case Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </AccordionTrigger>

            {/* Expanded Detailed Section */}
            <AccordionContent>
              <div className="pt-2 space-y-4">
                {/* 3-Column Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Card 1: Client Dossier */}
                  <div className="p-3.5 rounded-xl bg-background/50 dark:bg-card/40 border border-border/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      <User className="w-3.5 h-3.5 text-gold-500" />
                      <span>Client Details</span>
                    </div>
                    {r.clientName ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground text-xs">
                          {r.clientName}
                        </div>
                        {r.clientNumber && (
                          <div className="font-mono text-[11px] text-muted-foreground">
                            ID: {r.clientNumber}
                          </div>
                        )}
                        {r.clientId && (
                          <Link
                            href={`/dashboard/clients/${r.clientId}`}
                            className="inline-flex items-center gap-1 text-[11px] text-gold-600 dark:text-gold-400 hover:underline pt-1 font-medium"
                          >
                            <span>Open Client Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        Not associated with a registered client profile.
                      </div>
                    )}
                  </div>

                  {/* Card 2: Legal Matter Dossier */}
                  <div className="p-3.5 rounded-xl bg-background/50 dark:bg-card/40 border border-border/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      <Briefcase className="w-3.5 h-3.5 text-gold-500" />
                      <span>Legal Case Matter</span>
                    </div>
                    {r.caseTitle || r.caseReference ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground text-xs line-clamp-1">
                          {r.caseTitle || "Case Matter"}
                        </div>
                        {r.caseReference && (
                          <div className="font-mono text-[11px] text-gold-600 dark:text-gold-400 font-medium">
                            Ref: {r.caseReference}
                          </div>
                        )}
                        <Link
                          href="/dashboard/cases"
                          className="inline-flex items-center gap-1 text-[11px] text-gold-600 dark:text-gold-400 hover:underline pt-1 font-medium"
                        >
                          <span>View in Cases Directory</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        General chamber transaction (unlinked to specific case).
                      </div>
                    )}
                  </div>

                  {/* Card 3: Transaction Accounting Spec */}
                  <div className="p-3.5 rounded-xl bg-background/50 dark:bg-card/40 border border-border/60 space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground uppercase tracking-wider">
                      <Hash className="w-3.5 h-3.5 text-gold-500" />
                      <span>Accounting Records</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      {isPayment ? (
                        <>
                          {r.paymentType && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Type:</span>
                              <span className="font-medium text-foreground">
                                {r.paymentTypeLabel || r.paymentType}
                              </span>
                            </div>
                          )}
                          {r.moneyReceiptNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Receipt MR #:</span>
                              <span className="font-mono font-medium text-gold-600 dark:text-gold-400">
                                {r.moneyReceiptNumber}
                              </span>
                            </div>
                          )}
                          {r.referenceNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Trx / CQ Ref:</span>
                              <span className="font-mono font-medium text-foreground">
                                {r.referenceNumber}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-medium text-foreground">
                              {r.expenseCategoryLabel || r.expenseCategory}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Currency:</span>
                            <span className="font-mono font-medium text-foreground">
                              {r.currency}
                            </span>
                          </div>
                        </>
                      )}

                      {r.recordedBy && (
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <span className="text-muted-foreground">Logged By:</span>
                          <span className="font-medium text-foreground flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-emerald-500" />
                            <span>{r.recordedBy.name}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Memo / Description */}
                {r.description && (
                  <div className="p-3.5 rounded-xl bg-background/50 dark:bg-card/40 border border-border/60 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Description & Accounting Memo
                    </span>
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {r.description}
                    </p>
                  </div>
                )}

                {/* Bottom Bar: Receipt Voucher + Audit Timestamps + Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                  <div className="flex items-center flex-wrap gap-4">
                    {r.receiptUrl ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(r)}
                          className="inline-flex items-center gap-1.5 text-gold-600 dark:text-gold-400 font-semibold hover:underline cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>View Official Voucher ({r.receiptFileName || "Receipt"})</span>
                        </button>
                        <a
                          href={r.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground inline-flex items-center"
                          title="Open in new window"
                        >
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/70 italic flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>No voucher document attached</span>
                      </span>
                    )}

                    {r.createdAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          Created {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isPayment ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEditPayment(toPaymentDto(r))}
                          className="rounded-xl text-xs gap-1.5 h-8"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Modify Payment</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeletePayment(toPaymentDto(r))}
                          className="rounded-xl text-xs gap-1.5 h-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEditExpense(r.id)}
                          className="rounded-xl text-xs gap-1.5 h-8"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Manage Expense</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteExpense(r)}
                          className="rounded-xl text-xs gap-1.5 h-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>

      {/* Embedded Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewerDialog
          document={viewingDocument}
          isOpen={Boolean(viewingDocument)}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </>
  );
}

export default FinancialsAccordionList;
