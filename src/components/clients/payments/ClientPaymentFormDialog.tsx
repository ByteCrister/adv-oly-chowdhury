"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/shared/use-toast";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LIST,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LIST,
  PAYMENT_TYPE_LABELS,
  PaymentMethod,
  PaymentType,
} from "@/const/client-payment.const";
import {
  useCreateClientPaymentMutation,
  useUpdateClientPaymentMutation,
} from "@/hooks/clients";
import type {
  ClientPaymentItemDto,
  CreateClientPaymentInput,
  UpdateClientPaymentInput,
} from "@/types/client-payment.types";
import type { ClientCaseSummaryDto } from "@/types/client.types";
import {
  CreditCard,
  Coins,
  Receipt,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  createClientPaymentSchema,
  updateClientPaymentSchema,
} from "@/utils/zod/client-payment.validation";
import { ItemSelect } from "@/components/shared/ItemSelect";
import { DROPDOWN_TYPES } from "@/const/dropdown.const";

export interface ClientPaymentFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  payment?: ClientPaymentItemDto | null;
  cases?: ClientCaseSummaryDto[];
  onSuccess?: () => void;
}

export function ClientPaymentFormDialog({
  isOpen,
  onClose,
  clientId,
  payment,
  cases = [],
  onSuccess,
}: ClientPaymentFormDialogProps) {
  const isEditMode = Boolean(payment);

  const fallbackCaseOptions = React.useMemo(() => {
    return cases.map((c) => ({
      id: c.id,
      name: c.title,
      subText: c.caseNumber ? `${c.caseNumber} (${c.internalReference})` : c.internalReference,
      metadata: { caseStatus: c.caseStatus },
    }));
  }, [cases]);

  // Track previous props to synchronize form state during render
  const [prevPayment, setPrevPayment] = React.useState(payment);
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);

  // Form State
  const [amount, setAmount] = React.useState(payment ? String(payment.amount) : "");
  const [paymentDate, setPaymentDate] = React.useState(
    payment?.paymentDate
      ? payment.paymentDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(
    payment?.paymentMethod || PAYMENT_METHODS.CASH
  );
  const [paymentType, setPaymentType] = React.useState<PaymentType>(
    payment?.paymentType || PAYMENT_TYPES.CASE_PROFESSIONAL_FEE
  );
  const [caseId, setCaseId] = React.useState(payment?.caseId || "");
  const [moneyReceiptNumber, setMoneyReceiptNumber] = React.useState(
    payment?.moneyReceiptNumber || ""
  );
  const [referenceNumber, setReferenceNumber] = React.useState(
    payment?.referenceNumber || ""
  );
  const [notes, setNotes] = React.useState(payment?.notes || "");

  // Errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const createMutation = useCreateClientPaymentMutation();
  const updateMutation = useUpdateClientPaymentMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Sync state during render when payment prop or dialog open status changes
  if (payment !== prevPayment || isOpen !== prevIsOpen) {
    setPrevPayment(payment);
    setPrevIsOpen(isOpen);
    if (payment) {
      setAmount(String(payment.amount));
      setPaymentDate(payment.paymentDate ? payment.paymentDate.slice(0, 10) : "");
      setPaymentMethod(payment.paymentMethod || PAYMENT_METHODS.CASH);
      setPaymentType(payment.paymentType || PAYMENT_TYPES.CASE_PROFESSIONAL_FEE);
      setCaseId(payment.caseId || "");
      setMoneyReceiptNumber(payment.moneyReceiptNumber || "");
      setReferenceNumber(payment.referenceNumber || "");
      setNotes(payment.notes || "");
    } else {
      setAmount("");
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod(PAYMENT_METHODS.CASH);
      setPaymentType(PAYMENT_TYPES.CASE_PROFESSIONAL_FEE);
      setCaseId("");
      setMoneyReceiptNumber("");
      setReferenceNumber("");
      setNotes("");
    }
    setErrors({});
  }

  const validate = (): boolean => {
    const rawAmount = amount.trim();
    const parsedAmount = rawAmount === "" ? NaN : Number(rawAmount);

    const parsedDate = paymentDate ? new Date(paymentDate) : null;
    const isDateValid = parsedDate !== null && !isNaN(parsedDate.getTime());

    const rawPayload = {
      amount: parsedAmount,
      currency: "BDT",
      paymentDate: isDateValid && parsedDate ? parsedDate.toISOString() : paymentDate.trim(),
      paymentMethod,
      paymentType,
      caseId: caseId.trim() ? caseId.trim() : null,
      moneyReceiptNumber: moneyReceiptNumber.trim() || null,
      referenceNumber: referenceNumber.trim() || null,
      notes: notes.trim() || null,
    };

    const schema = isEditMode ? updateClientPaymentSchema : createClientPaymentSchema;
    const result = schema.safeParse(rawPayload);
    const errs: Record<string, string> = {};

    if (!result.success) {
      for (const issue of result.error.issues) {
        const fieldName = String(issue.path[0]);
        if (!errs[fieldName]) {
          errs[fieldName] = issue.message;
        }
      }
    }

    // Explicit user-facing clarity checks
    if (!rawAmount) {
      errs.amount = "Payment amount is required";
    } else if (isNaN(parsedAmount) || parsedAmount < 0) {
      errs.amount = "Please enter a valid, non-negative payment amount";
    }

    if (!paymentDate.trim()) {
      errs.paymentDate = "Payment date is required";
    } else if (!isDateValid) {
      errs.paymentDate = "Invalid payment date format";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const parsedDate = new Date(paymentDate);
      const isoPaymentDate = !isNaN(parsedDate.getTime())
        ? parsedDate.toISOString()
        : new Date().toISOString();

      if (isEditMode && payment) {
        const payload: UpdateClientPaymentInput = {
          amount: Number(amount),
          paymentDate: isoPaymentDate,
          paymentMethod,
          paymentType,
          caseId: caseId.trim() ? caseId.trim() : null,
          moneyReceiptNumber: moneyReceiptNumber.trim() || null,
          referenceNumber: referenceNumber.trim() || null,
          notes: notes.trim() || null,
        };

        await updateMutation.mutateAsync({
          clientId,
          paymentId: payment.id,
          data: payload,
        });

        toast.success("Payment updated successfully", {
          description: `Transaction for BDT ${amount} has been revised.`,
        });

        onSuccess?.();
        onClose();
      } else {
        const payload: CreateClientPaymentInput = {
          amount: Number(amount),
          currency: "BDT",
          paymentDate: isoPaymentDate,
          paymentMethod,
          paymentType,
          caseId: caseId.trim() ? caseId.trim() : null,
          moneyReceiptNumber: moneyReceiptNumber.trim() || null,
          referenceNumber: referenceNumber.trim() || null,
          notes: notes.trim() || null,
        };

        await createMutation.mutateAsync({
          clientId,
          data: payload,
        });

        toast.success("Payment recorded successfully", {
          description: `Payment of BDT ${amount} has been logged in the client ledger.`,
        });

        onSuccess?.();
        onClose();
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "An unexpected error occurred while saving payment.";
      toast.error("Failed to save payment", { description: msg });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-emerald-500 text-xs font-semibold uppercase tracking-wider">
            <Coins className="w-4 h-4" />
            <span>Chamber Financial Ledger</span>
          </div>
          <DialogTitle className="text-xl mt-1">
            {isEditMode ? "Modify Payment Entry" : "Record New Payment"}
          </DialogTitle>
          <DialogDescription>
            Log client retainer fees, legal consultation charges, or litigation court disbursements.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="pay-amount" className="text-xs font-semibold text-foreground">
                  Amount (BDT) <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gold-500 font-serif">
                    ৳
                  </span>
                  <Input
                    id="pay-amount"
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
                    }}
                    placeholder="25000"
                    className={`pl-8 ${errors.amount ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.amount && <p className="text-[11px] text-destructive">{errors.amount}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pay-date" className="text-xs font-semibold text-foreground">
                  Payment Date <span className="text-destructive">*</span>
                </label>
                <Input
                  id="pay-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => {
                    setPaymentDate(e.target.value);
                    if (errors.paymentDate) setErrors((prev) => ({ ...prev, paymentDate: "" }));
                  }}
                  className={errors.paymentDate ? "border-destructive" : ""}
                  disabled={isSubmitting}
                />
                {errors.paymentDate && (
                  <p className="text-[11px] text-destructive">{errors.paymentDate}</p>
                )}
              </div>
            </div>

            {/* Payment Method & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  disabled={isSubmitting}
                  className="h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
                >
                  {PAYMENT_METHOD_LIST.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Payment / Fee Type</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                  disabled={isSubmitting}
                  className="h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
                >
                  {PAYMENT_TYPE_LIST.map((t) => (
                    <option key={t} value={t}>
                      {PAYMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Associated Case (Optional) via ItemSelect Searchable Combobox */}
            <ItemSelect
              id="pay-case"
              label="Linked Legal Matter (Optional)"
              type={DROPDOWN_TYPES.CASE}
              filterParams={{ clientId }}
              options={fallbackCaseOptions}
              value={caseId}
              onChange={(val) => {
                setCaseId(val);
                if (errors.caseId) setErrors((prev) => ({ ...prev, caseId: "" }));
              }}
              placeholder="General Chamber Retainer (No specific case)"
              searchPlaceholder="Search client matters by title, case #, or reference..."
              emptyMessage="No legal cases found for this client"
              disabled={isSubmitting}
              clearable
              error={errors.caseId}
            />

            {/* Money Receipt # & Reference # */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="pay-mr" className="text-xs font-semibold text-foreground">
                  Money Receipt # (MR No.)
                </label>
                <div className="relative">
                  <Receipt className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="pay-mr"
                    value={moneyReceiptNumber}
                    onChange={(e) => {
                      setMoneyReceiptNumber(e.target.value);
                      if (errors.moneyReceiptNumber)
                        setErrors((prev) => ({ ...prev, moneyReceiptNumber: "" }));
                    }}
                    placeholder="e.g. MR-2026-084"
                    disabled={isSubmitting}
                    className={`pl-9 ${
                      errors.moneyReceiptNumber
                        ? "border-destructive focus-visible:ring-destructive/30"
                        : ""
                    }`}
                  />
                </div>
                {errors.moneyReceiptNumber && (
                  <p className="text-[11px] text-destructive">{errors.moneyReceiptNumber}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pay-ref" className="text-xs font-semibold text-foreground">
                  Transaction / Cheque Ref. #
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="pay-ref"
                    value={referenceNumber}
                    onChange={(e) => {
                      setReferenceNumber(e.target.value);
                      if (errors.referenceNumber)
                        setErrors((prev) => ({ ...prev, referenceNumber: "" }));
                    }}
                    placeholder="e.g. TRX-9J28A1 / CQ #049281"
                    disabled={isSubmitting}
                    className={`pl-9 ${
                      errors.referenceNumber
                        ? "border-destructive focus-visible:ring-destructive/30"
                        : ""
                    }`}
                  />
                </div>
                {errors.referenceNumber && (
                  <p className="text-[11px] text-destructive">{errors.referenceNumber}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="pay-notes" className="text-xs font-semibold text-foreground">
                Payment Memo & Accounting Notes
              </label>
              <textarea
                id="pay-notes"
                rows={2}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (errors.notes) setErrors((prev) => ({ ...prev, notes: "" }));
                }}
                placeholder="High Court Division hearing fee, filing costs advance, or balance settlement..."
                disabled={isSubmitting}
                className={`w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-none ${
                  errors.notes ? "border-destructive focus:ring-destructive/30" : ""
                }`}
              />
              {errors.notes && (
                <p className="text-[11px] text-destructive">{errors.notes}</p>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="gold"
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Payment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEditMode ? "Save Changes" : "Record Payment"}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
