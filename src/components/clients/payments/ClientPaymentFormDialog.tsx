"use client";

import * as React from "react";
import Image from "next/image";
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
import { Badge } from "@/components/ui/badge";
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
  useUploadClientPaymentReceipt,
} from "@/hooks/clients";
import {
  DocumentViewerDialog,
  type DocumentViewerTarget,
} from "@/components/documents/DocumentViewerDialog";
import { formatByteSize } from "@/utils/document-compression";
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
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Eye,
  RefreshCw,
  Trash2,
  X,
  Undo2,
  AlertCircle,
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
  clientId?: string;
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
  const [selectedClientId, setSelectedClientId] = React.useState(
    clientId || payment?.clientId || ""
  );
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

  // Receipt Management State
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = React.useState<string | null>(null);
  const [isReceiptRemoved, setIsReceiptRemoved] = React.useState(false);
  const [receiptError, setReceiptError] = React.useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = React.useState<DocumentViewerTarget | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const createMutation = useCreateClientPaymentMutation();
  const updateMutation = useUpdateClientPaymentMutation();
  const {
    uploadReceipt,
    validateReceipt,
    cleanupUploadedReceipt,
    isProcessing: isUploadingReceipt,
    stage: uploadStage,
    overallProgress: uploadProgress,
  } = useUploadClientPaymentReceipt();

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || isUploadingReceipt;

  // Sync state during render when payment prop or dialog open status changes
  if (payment !== prevPayment || isOpen !== prevIsOpen) {
    setPrevPayment(payment);
    setPrevIsOpen(isOpen);
    setSelectedClientId(clientId || payment?.clientId || "");
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
    setPendingFile(null);
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
      setPendingPreviewUrl(null);
    }
    setIsReceiptRemoved(false);
    setReceiptError(null);
    setViewingDocument(null);
    setErrors({});
  }

  // Memory cleanup for object URLs on unmount / change
  React.useEffect(() => {
    return () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    };
  }, [pendingPreviewUrl]);

  const effectiveClientId = clientId || selectedClientId;

  const handleFileSelect = (selected: File) => {
    setReceiptError(null);
    try {
      validateReceipt(selected);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid file format or size.";
      setReceiptError(msg);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
      setPendingPreviewUrl(null);
    }

    setPendingFile(selected);
    setIsReceiptRemoved(false);

    if (selected.type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(selected);
      setPendingPreviewUrl(objectUrl);
    }
  };

  const handleCancelPendingFile = () => {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
      setPendingPreviewUrl(null);
    }
    setPendingFile(null);
    setReceiptError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleViewSavedReceipt = () => {
    if (!payment?.receiptUrl) return;

    const isPdf =
      payment.receiptAssetType === "pdf" ||
      payment.receiptMimeType === "application/pdf" ||
      payment.receiptFileName?.toLowerCase().endsWith(".pdf") ||
      payment.receiptUrl.toLowerCase().includes(".pdf");

    setViewingDocument({
      id: payment.receiptAssetreferenceId || payment.id,
      title: `Payment Receipt: ${payment.moneyReceiptNumber ? `MR #${payment.moneyReceiptNumber}` : payment.paymentMethodLabel} - BDT ${payment.amount}`,
      fileUrl: payment.receiptUrl,
      originalFileName: payment.receiptFileName || "payment-receipt",
      mimeType: payment.receiptMimeType || (isPdf ? "application/pdf" : "image/jpeg"),
      format: isPdf ? "PDF" : "IMAGE",
      sizeBytes: payment.receiptSizeBytes || undefined,
      documentDate: payment.paymentDate,
      entityType: "CLIENT",
      notes: payment.notes || (payment.moneyReceiptNumber ? `MR: ${payment.moneyReceiptNumber}` : null),
    });
  };

  const handleViewPendingFile = () => {
    if (!pendingFile) return;

    const isPdf =
      pendingFile.type === "application/pdf" ||
      pendingFile.name.toLowerCase().endsWith(".pdf");

    const previewUrl = pendingPreviewUrl || URL.createObjectURL(pendingFile);

    setViewingDocument({
      id: "pending_receipt_preview",
      title: `Selected Receipt Preview: ${pendingFile.name}`,
      fileUrl: previewUrl,
      originalFileName: pendingFile.name,
      mimeType: pendingFile.type || (isPdf ? "application/pdf" : "image/jpeg"),
      format: isPdf ? "PDF" : "IMAGE",
      sizeBytes: pendingFile.size,
      documentDate: paymentDate,
      entityType: "CLIENT",
      notes: "Pending upload preview",
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSubmitting) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isSubmitting) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

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

    if (!effectiveClientId) {
      errs.clientId = "Client selection is required";
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
    if (!effectiveClientId) return;

    let uploadedReferenceId: string | null = null;

    try {
      // 1. If a new receipt file is selected, upload it with client-side compression
      if (pendingFile) {
        const uploadRes = await uploadReceipt(pendingFile, {
          clientId: effectiveClientId,
          memo: notes.trim() || moneyReceiptNumber.trim() || "Client payment receipt voucher",
        });
        uploadedReferenceId = uploadRes.fileId;
      }

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
          ...(uploadedReferenceId
            ? { receiptAssetreferenceId: uploadedReferenceId }
            : isReceiptRemoved
            ? { receiptAssetreferenceId: null }
            : {}),
        };

        try {
          await updateMutation.mutateAsync({
            clientId: effectiveClientId,
            paymentId: payment.id,
            data: payload,
          });
        } catch (updateErr) {
          // If the payment update failed after the receipt was uploaded, clean up the newly created reference
          if (uploadedReferenceId) {
            await cleanupUploadedReceipt(uploadedReferenceId);
          }
          throw updateErr;
        }

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
          receiptAssetreferenceId: uploadedReferenceId || null,
        };

        try {
          await createMutation.mutateAsync({
            clientId: effectiveClientId,
            data: payload,
          });
        } catch (createErr) {
          // If the payment creation failed after the receipt was uploaded, clean up the newly created reference
          if (uploadedReferenceId) {
            await cleanupUploadedReceipt(uploadedReferenceId);
          }
          throw createErr;
        }

        toast.success("Payment recorded successfully", {
          description: `Payment of BDT ${amount} has been logged in the client ledger.`,
        });

        onSuccess?.();
        onClose();
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : "An unexpected error occurred while saving payment.");
      toast.error("Failed to save payment", { description: msg });
    }
  };

  const isSavedReceiptPdf = Boolean(
    payment?.receiptAssetType === "pdf" ||
      payment?.receiptMimeType === "application/pdf" ||
      payment?.receiptFileName?.toLowerCase().endsWith(".pdf") ||
      payment?.receiptUrl?.toLowerCase().includes(".pdf")
  );

  const isPendingFilePdf = Boolean(
    pendingFile &&
      (pendingFile.type === "application/pdf" ||
        pendingFile.name.toLowerCase().endsWith(".pdf"))
  );

  return (
    <>
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
              {/* Client Selector (when opened without a pre-bound client) */}
              {!clientId && (
                <ItemSelect
                  id="pay-client"
                  label="Client"
                  required
                  type={DROPDOWN_TYPES.CLIENT}
                  value={selectedClientId}
                  onChange={(val) => {
                    setSelectedClientId(val);
                    setCaseId("");
                    if (errors.clientId) setErrors((prev) => ({ ...prev, clientId: "" }));
                  }}
                  placeholder="Select client for this payment..."
                  searchPlaceholder="Search clients by name, number, or phone..."
                  emptyMessage="No matching clients found."
                  disabled={isSubmitting}
                  error={errors.clientId}
                />
              )}

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
                      className={`pl-8 ${
                        errors.amount ? "border-destructive focus-visible:ring-destructive/30" : ""
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-[11px] text-destructive">{errors.amount}</p>
                  )}
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
                      if (errors.paymentDate)
                        setErrors((prev) => ({ ...prev, paymentDate: "" }));
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
                filterParams={effectiveClientId ? { clientId: effectiveClientId } : undefined}
                options={fallbackCaseOptions}
                value={caseId}
                onChange={(val) => {
                  setCaseId(val);
                  if (errors.caseId) setErrors((prev) => ({ ...prev, caseId: "" }));
                }}
                placeholder="General Chamber Retainer (No specific case)"
                searchPlaceholder="Search client matters by title, case #, or reference..."
                emptyMessage={
                  effectiveClientId
                    ? "No legal cases found for this client"
                    : "Please select a client first"
                }
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

              {/* Official Receipt Media Workflow Section */}
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-gold-500" />
                    <span>Official Receipt Voucher</span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (Optional)
                    </span>
                  </label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    PDF, JPG, PNG, WebP (Max 2MB)
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  disabled={isSubmitting}
                />

                {/* State A: A new file is selected for upload/replacement */}
                {pendingFile ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {isPendingFilePdf ? (
                        <div className="w-11 h-11 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 flex flex-col items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                          <span className="text-[8px] font-bold uppercase tracking-wider">PDF</span>
                        </div>
                      ) : pendingPreviewUrl ? (
                        <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-emerald-500/30 shrink-0 bg-background">
                          <Image
                            src={pendingPreviewUrl}
                            alt="Receipt preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                            {pendingFile.name}
                          </p>
                          <Badge
                            variant={isEditMode && payment?.receiptUrl ? "amber" : "emerald"}
                            className="text-[9px] py-0 px-1.5"
                          >
                            {isEditMode && payment?.receiptUrl ? "Replacing" : "Ready"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                          <span>{formatByteSize(pendingFile.size)}</span>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Client-compressed upon save
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleViewPendingFile}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        title="Preview document"
                        disabled={isSubmitting}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelPendingFile}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                        title={
                          isEditMode && payment?.receiptUrl
                            ? "Cancel replacement (keep original)"
                            : "Remove selected file"
                        }
                        disabled={isSubmitting}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : isEditMode && payment?.receiptUrl ? (
                  /* State B: Existing saved receipt */
                  isReceiptRemoved ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-destructive">
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="font-semibold">Voucher marked for removal</p>
                          <p className="text-[10px] text-muted-foreground">
                            The receipt will be detached from this payment upon saving.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsReceiptRemoved(false)}
                        className="rounded-lg text-xs h-8 gap-1"
                        disabled={isSubmitting}
                      >
                        <Undo2 className="w-3 h-3" />
                        <span>Undo</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/70 dark:border-white/10 bg-muted/20 dark:bg-card/40 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {isSavedReceiptPdf ? (
                          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 flex flex-col items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                            <span className="text-[7px] font-bold uppercase">PDF</span>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gold-500/10 text-gold-500 border border-gold-500/20 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}

                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-semibold text-foreground truncate max-w-[200px]">
                            {payment.receiptFileName || "Attached Receipt Voucher"}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Badge variant="outline" className="text-[8px] py-0 px-1 font-mono uppercase">
                              {isSavedReceiptPdf ? "PDF" : "IMAGE"}
                            </Badge>
                            {payment.receiptSizeBytes && (
                              <span>{formatByteSize(payment.receiptSizeBytes)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleViewSavedReceipt}
                          className="h-8 px-2 text-xs text-foreground gap-1"
                          title="View receipt voucher"
                          disabled={isSubmitting}
                        >
                          <Eye className="w-3.5 h-3.5 text-gold-500" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                          title="Replace with new receipt file"
                          disabled={isSubmitting}
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                          <span className="hidden sm:inline">Replace</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsReceiptRemoved(true)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                          title="Remove attached voucher"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  /* State C: Empty upload dropzone */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isSubmitting && fileInputRef.current?.click()}
                    className={`rounded-xl border border-dashed p-4 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-gold-500 bg-gold-500/10 scale-[0.99]"
                        : "border-border/70 dark:border-white/10 hover:border-gold-500/50 hover:bg-muted/40"
                    } ${isSubmitting ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-9 h-9 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-medium text-foreground">
                        <span className="text-gold-600 dark:text-gold-400 font-semibold hover:underline">
                          Browse files
                        </span>{" "}
                        or drag receipt voucher here
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Lossless WebP & PDF compaction applied automatically
                      </p>
                    </div>
                  </div>
                )}

                {/* Upload Progress Bar */}
                {isUploadingReceipt && (
                  <div className="space-y-1.5 pt-1 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gold-600 dark:text-gold-400 font-medium flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {uploadStage === "optimizing"
                          ? "Optimizing voucher (compressing)..."
                          : `Uploading voucher (${uploadProgress}%)...`}
                      </span>
                      <span className="font-mono text-muted-foreground">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold-500 transition-all duration-200"
                        style={{
                          width: `${uploadStage === "optimizing" ? 35 : Math.max(uploadProgress, 40)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Receipt Error Message */}
                {receiptError && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{receiptError}</span>
                  </p>
                )}
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
                    <span>
                      {isUploadingReceipt
                        ? uploadStage === "optimizing"
                          ? "Compressing Voucher..."
                          : `Uploading (${uploadProgress}%)...`
                        : "Saving Payment..."}
                    </span>
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

export default ClientPaymentFormDialog;
