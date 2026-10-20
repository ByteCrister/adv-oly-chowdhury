"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Receipt,
  Briefcase,
  Save,
  Trash2,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Coins,
  Clock,
  UserCheck,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Eye,
  RefreshCw,
  X,
  Undo2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ItemSelect } from "@/components/shared/ItemSelect";
import { toast } from "@/components/shared/use-toast";
import { DROPDOWN_TYPES } from "@/const/dropdown.const";
import {
  CASE_EXPENSE_CATEGORIES,
  CASE_EXPENSE_CATEGORY_LIST,
  CASE_EXPENSE_CATEGORY_LABELS,
  CaseExpenseCategory,
} from "@/const/case-expense.const";
import {
  useCaseExpenseDetails,
  useCreateCaseExpenseMutation,
  useUpdateCaseExpenseMutation,
  useUploadCaseExpenseReceipt,
} from "@/hooks/case-expenses";
import {
  DocumentViewerDialog,
  type DocumentViewerTarget,
} from "@/components/documents/DocumentViewerDialog";
import { formatByteSize } from "@/utils/document-compression";
import {
  createCaseExpenseSchema,
  updateCaseExpenseSchema,
} from "@/utils/zod/case-expense.validation";
import { CaseExpenseDeleteDialog } from "./CaseExpenseDeleteDialog";
import type { CreateCaseExpenseInput, UpdateCaseExpenseInput } from "@/types/case-expense.types";

export interface CaseExpenseFormPageProps {
  id: string; // "new" or a 24-character Mongo ObjectId
}

export function CaseExpenseFormPage({ id }: CaseExpenseFormPageProps) {
  const router = useRouter();
  const isCreateMode = id === "new";

  // Queries & Mutations
  const {
    data: existingExpense,
    isLoading: isExpenseLoading,
    isError: isExpenseError,
  } = useCaseExpenseDetails(id);

  const createMutation = useCreateCaseExpenseMutation();
  const updateMutation = useUpdateCaseExpenseMutation();

  const {
    uploadReceipt,
    validateReceipt,
    cleanupUploadedReceipt,
    isProcessing: isUploadingReceipt,
    stage: uploadStage,
    overallProgress: uploadProgress,
  } = useUploadCaseExpenseReceipt();

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending || isUploadingReceipt;

  // Form State
  const [selectedClientId, setSelectedClientId] = React.useState<string>("");
  const [caseId, setCaseId] = React.useState<string>("");
  const [expenseDate, setExpenseDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [category, setCategory] = React.useState<CaseExpenseCategory>(
    CASE_EXPENSE_CATEGORIES.COURT_FEES
  );
  const [amount, setAmount] = React.useState<string>("");
  const [currency, setCurrency] = React.useState<string>("BDT");
  const [description, setDescription] = React.useState<string>("");

  // Receipt Management State
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = React.useState<string | null>(null);
  const [isReceiptRemoved, setIsReceiptRemoved] = React.useState(false);
  const [receiptError, setReceiptError] = React.useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = React.useState<DocumentViewerTarget | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Validation errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Synchronize state when existingExpense is fetched in edit mode
  const [syncedId, setSyncedId] = React.useState<string | null>(null);
  if (!isCreateMode && existingExpense && syncedId !== existingExpense.id) {
    setSyncedId(existingExpense.id);
    setCaseId(existingExpense.caseId || "");
    setSelectedClientId(existingExpense.clientId || "");
    setExpenseDate(
      existingExpense.expenseDate
        ? existingExpense.expenseDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    );
    setCategory(existingExpense.category || CASE_EXPENSE_CATEGORIES.COURT_FEES);
    setAmount(String(existingExpense.amount ?? ""));
    setCurrency(existingExpense.currency || "BDT");
    setDescription(existingExpense.description || "");

    setPendingFile(null);
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
      setPendingPreviewUrl(null);
    }
    setIsReceiptRemoved(false);
    setReceiptError(null);
    setViewingDocument(null);
  }

  // Memory cleanup for object URLs on unmount / change
  React.useEffect(() => {
    return () => {
      if (pendingPreviewUrl) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    };
  }, [pendingPreviewUrl]);

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
    if (!existingExpense?.receiptUrl) return;

    const isPdf =
      existingExpense.receiptAssetType === "pdf" ||
      existingExpense.receiptMimeType === "application/pdf" ||
      existingExpense.receiptFileName?.toLowerCase().endsWith(".pdf") ||
      existingExpense.receiptUrl.toLowerCase().includes(".pdf");

    setViewingDocument({
      id: existingExpense.receiptAssetReferenceId || existingExpense.id,
      title: `Expense Receipt: ${existingExpense.categoryLabel} - BDT ${existingExpense.amount}`,
      fileUrl: existingExpense.receiptUrl,
      originalFileName: existingExpense.receiptFileName || "expense-receipt",
      mimeType: existingExpense.receiptMimeType || (isPdf ? "application/pdf" : "image/jpeg"),
      format: isPdf ? "PDF" : "IMAGE",
      sizeBytes: existingExpense.receiptSizeBytes || undefined,
      documentDate: existingExpense.expenseDate,
      entityType: "CASE",
      notes: existingExpense.description || `${existingExpense.categoryLabel} voucher`,
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
      documentDate: expenseDate,
      entityType: "CASE",
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

    const parsedDate = expenseDate ? new Date(expenseDate) : null;
    const isDateValid = parsedDate !== null && !isNaN(parsedDate.getTime());

    const rawPayload = {
      caseId: caseId.trim(),
      expenseDate: isDateValid && parsedDate ? parsedDate.toISOString() : expenseDate.trim(),
      category,
      description: description.trim() || null,
      amount: parsedAmount,
      currency: currency.trim() || "BDT",
    };

    const schema = isCreateMode ? createCaseExpenseSchema : updateCaseExpenseSchema;
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

    if (!caseId.trim()) {
      errs.caseId = "Please select a legal case for this expense";
    }

    if (!rawAmount) {
      errs.amount = "Expense amount is required";
    } else if (isNaN(parsedAmount) || parsedAmount < 0) {
      errs.amount = "Please enter a valid, non-negative expense amount";
    }

    if (!expenseDate.trim()) {
      errs.expenseDate = "Expense date is required";
    } else if (!isDateValid) {
      errs.expenseDate = "Invalid expense date format";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let uploadedReferenceId: string | null = null;

    try {
      // 1. If a new receipt file is selected, upload it with client-side compression
      if (pendingFile) {
        const uploadRes = await uploadReceipt(pendingFile, {
          caseId: caseId.trim(),
          memo: description.trim() || `${CASE_EXPENSE_CATEGORY_LABELS[category]} voucher`,
        });
        uploadedReferenceId = uploadRes.fileId;
      }

      const parsedDate = new Date(expenseDate);
      const isoExpenseDate = !isNaN(parsedDate.getTime())
        ? parsedDate.toISOString()
        : new Date().toISOString();

      if (isCreateMode) {
        const payload: CreateCaseExpenseInput = {
          caseId: caseId.trim(),
          expenseDate: isoExpenseDate,
          category,
          description: description.trim() || null,
          amount: Number(amount),
          currency: currency.trim() || "BDT",
          receiptAssetReferenceId: uploadedReferenceId || null,
        };

        try {
          await createMutation.mutateAsync(payload);
        } catch (createErr) {
          // If expense creation failed after upload, safely clean up newly created reference
          if (uploadedReferenceId) {
            await cleanupUploadedReceipt(uploadedReferenceId);
          }
          throw createErr;
        }

        toast.success("Case expense recorded successfully", {
          description: `Disbursement of BDT ${amount} has been logged under ${CASE_EXPENSE_CATEGORY_LABELS[category]}.`,
        });

        router.push("/dashboard/financials");
      } else {
        const payload: UpdateCaseExpenseInput = {
          caseId: caseId.trim(),
          expenseDate: isoExpenseDate,
          category,
          description: description.trim() || null,
          amount: Number(amount),
          currency: currency.trim() || "BDT",
          ...(uploadedReferenceId
            ? { receiptAssetReferenceId: uploadedReferenceId }
            : isReceiptRemoved
            ? { receiptAssetReferenceId: null }
            : {}),
        };

        try {
          await updateMutation.mutateAsync({
            id,
            data: payload,
          });
        } catch (updateErr) {
          // If expense update failed after upload, safely clean up newly created reference
          if (uploadedReferenceId) {
            await cleanupUploadedReceipt(uploadedReferenceId);
          }
          throw updateErr;
        }

        toast.success("Case expense updated successfully", {
          description: `Disbursement record has been revised in chamber accounts.`,
        });

        router.push("/dashboard/financials");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : "An unexpected error occurred while saving case expense.");
      toast.error("Failed to save expense", { description: msg });
    }
  };

  const isSavedReceiptPdf = Boolean(
    existingExpense?.receiptAssetType === "pdf" ||
      existingExpense?.receiptMimeType === "application/pdf" ||
      existingExpense?.receiptFileName?.toLowerCase().endsWith(".pdf") ||
      existingExpense?.receiptUrl?.toLowerCase().includes(".pdf")
  );

  const isPendingFilePdf = Boolean(
    pendingFile &&
      (pendingFile.type === "application/pdf" ||
        pendingFile.name.toLowerCase().endsWith(".pdf"))
  );

  // Loading state for edit mode
  if (!isCreateMode && isExpenseLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <div className="p-6 rounded-2xl border border-border/70 bg-card/60 space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Error state for edit mode
  if (!isCreateMode && (isExpenseError || !existingExpense)) {
    return (
      <div className="max-w-xl mx-auto text-center p-12 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 shadow-sm space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-bold text-foreground">
            Case Expense Not Found
          </h2>
          <p className="text-xs text-muted-foreground">
            The requested litigation expense record does not exist or has been removed.
          </p>
        </div>
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/financials")}
            className="rounded-xl text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Financial Dashboard</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <Receipt className="w-4 h-4 text-rose-500" />
              <span>Litigation Accounting</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {isCreateMode ? "Record Case Expense" : "Manage Case Expense"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isCreateMode
                ? "Log court fees, process fees (talbana), stamp duty, or photocopy disbursements incurred for a legal matter."
                : `Review or modify litigation disbursement record #${id.slice(-6).toUpperCase()}.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/financials")}
              className="rounded-xl text-xs gap-1.5 h-9"
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>

            {!isCreateMode && existingExpense && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="rounded-xl text-xs gap-1.5 h-9"
                disabled={isSubmitting}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Expense</span>
              </Button>
            )}
          </div>
        </div>

        {/* Main Form Card */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 backdrop-blur-md shadow-sm space-y-5">
            {/* Section 1: Matter & Client Relationship */}
            <div className="space-y-4 pb-4 border-b border-border/50">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gold-600 dark:text-gold-400 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" />
                <span>Legal Case Assignment</span>
              </h3>

              {/* Optional Client Pre-filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <ItemSelect
                    id="expense-client-filter"
                    label="Filter by Client (Optional)"
                    type={DROPDOWN_TYPES.CLIENT}
                    value={selectedClientId}
                    onChange={(val) => {
                      setSelectedClientId(val);
                      setCaseId("");
                    }}
                    placeholder="All Clients"
                    searchPlaceholder="Filter client directory..."
                    emptyMessage="No clients found."
                    disabled={isSubmitting}
                    clearable
                  />
                </div>

                {/* Case Selection (Required) */}
                <div className="space-y-1">
                  <ItemSelect
                    id="expense-case"
                    label="Target Legal Matter *"
                    required
                    type={DROPDOWN_TYPES.CASE}
                    filterParams={selectedClientId ? { clientId: selectedClientId } : undefined}
                    value={caseId}
                    onChange={(val) => {
                      setCaseId(val);
                      if (errors.caseId) setErrors((prev) => ({ ...prev, caseId: "" }));
                    }}
                    placeholder="Select legal case for this expense..."
                    searchPlaceholder="Search cases by title, case number, or reference..."
                    emptyMessage={
                      selectedClientId
                        ? "No cases found for this selected client"
                        : "No legal matters found"
                    }
                    disabled={isSubmitting}
                    error={errors.caseId}
                    clearable
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Expense Logistics & Financial Values */}
            <div className="space-y-4 pb-4 border-b border-border/50">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                <span>Financial & Categorization</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Category */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-semibold text-foreground">
                    Expense Category <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CaseExpenseCategory)}
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
                  >
                    {CASE_EXPENSE_CATEGORY_LIST.map((c) => (
                      <option key={c} value={c}>
                        {CASE_EXPENSE_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label htmlFor="expense-amount" className="text-xs font-semibold text-foreground">
                    Amount (BDT) <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-gold-500 font-serif">
                      ৳
                    </span>
                    <Input
                      id="expense-amount"
                      type="number"
                      min="0"
                      step="any"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
                      }}
                      placeholder="3500"
                      disabled={isSubmitting}
                      className={`pl-8 ${
                        errors.amount ? "border-destructive focus-visible:ring-destructive/30" : ""
                      }`}
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-[11px] text-destructive">{errors.amount}</p>
                  )}
                </div>

                {/* Expense Date */}
                <div className="space-y-1.5 sm:col-span-1">
                  <label htmlFor="expense-date" className="text-xs font-semibold text-foreground">
                    Expense Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => {
                      setExpenseDate(e.target.value);
                      if (errors.expenseDate) setErrors((prev) => ({ ...prev, expenseDate: "" }));
                    }}
                    disabled={isSubmitting}
                    className={errors.expenseDate ? "border-destructive" : ""}
                  />
                  {errors.expenseDate && (
                    <p className="text-[11px] text-destructive">{errors.expenseDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Official Receipt Media Voucher Workflow */}
            <div className="space-y-2 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-gold-500" />
                  <span>Official Receipt / Bill Voucher</span>
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
                        <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                          {pendingFile.name}
                        </p>
                        <Badge
                          variant={!isCreateMode && existingExpense?.receiptUrl ? "amber" : "emerald"}
                          className="text-[9px] py-0 px-1.5"
                        >
                          {!isCreateMode && existingExpense?.receiptUrl ? "Replacing" : "Ready"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>{formatByteSize(pendingFile.size)}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Lossless WebP & PDF compaction applied on save
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
                      title="Preview voucher"
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
                        !isCreateMode && existingExpense?.receiptUrl
                          ? "Cancel replacement (keep original)"
                          : "Remove selected file"
                      }
                      disabled={isSubmitting}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : !isCreateMode && existingExpense?.receiptUrl ? (
                /* State B: Existing saved receipt */
                isReceiptRemoved ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-xs text-destructive">
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="font-semibold">Voucher marked for removal</p>
                        <p className="text-[10px] text-muted-foreground">
                          The receipt will be detached from this expense upon saving.
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
                        <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                          {existingExpense.receiptFileName || "Attached Expense Voucher"}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="text-[8px] py-0 px-1 font-mono uppercase">
                            {isSavedReceiptPdf ? "PDF" : "IMAGE"}
                          </Badge>
                          {existingExpense.receiptSizeBytes && (
                            <span>{formatByteSize(existingExpense.receiptSizeBytes)}</span>
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
                        className="h-8 px-2.5 text-xs text-foreground gap-1"
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
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1"
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
                  className={`rounded-xl border border-dashed p-5 text-center cursor-pointer transition-all ${
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

            {/* Section 4: Notes & Description */}
            <div className="space-y-2">
              <label htmlFor="expense-desc" className="text-xs font-semibold text-foreground">
                Accounting Description & Expense Memo
              </label>
              <textarea
                id="expense-desc"
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="e.g. Plaint court fee stamps, advocate clerk expenses for summons issuance, or certified copy fees..."
                disabled={isSubmitting}
                className={`w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-none ${
                  errors.description ? "border-destructive" : ""
                }`}
              />
              {errors.description && (
                <p className="text-[11px] text-destructive">{errors.description}</p>
              )}
            </div>

            {/* Existing Metadata in Edit Mode */}
            {!isCreateMode && existingExpense && (
              <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {existingExpense.recordedBy && (
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Recorded by {existingExpense.recordedBy.name}</span>
                    </span>
                  )}
                  {existingExpense.createdAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Logged {new Date(existingExpense.createdAt).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>

                {existingExpense.receiptUrl && !isReceiptRemoved && (
                  <button
                    type="button"
                    onClick={handleViewSavedReceipt}
                    className="inline-flex items-center gap-1 text-gold-600 dark:text-gold-400 font-medium hover:underline cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>View Receipt Document ({existingExpense.receiptFileName || "Voucher"})</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/financials")}
              disabled={isSubmitting}
              className="rounded-xl text-xs h-10 px-5"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="gold"
              disabled={isSubmitting}
              className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-6 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {isUploadingReceipt
                      ? uploadStage === "optimizing"
                        ? "Compressing Voucher..."
                        : `Uploading (${uploadProgress}%)...`
                      : "Saving Record..."}
                  </span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isCreateMode ? "Record Expense" : "Save Changes"}</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Delete Confirmation Dialog */}
        {!isCreateMode && existingExpense && (
          <CaseExpenseDeleteDialog
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            expense={existingExpense}
            onSuccess={() => {
              router.push("/dashboard/financials");
            }}
          />
        )}
      </div>

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

export default CaseExpenseFormPage;
