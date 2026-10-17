"use client";

import * as React from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/hooks/case-expenses";
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
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
  }

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

    try {
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
        };

        await createMutation.mutateAsync(payload);

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
        };

        await updateMutation.mutateAsync({
          id,
          data: payload,
        });

        toast.success("Case expense updated successfully", {
          description: `Disbursement record has been revised in chamber accounts.`,
        });

        router.push("/dashboard/financials");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "An unexpected error occurred while saving case expense.";
      toast.error("Failed to save expense", { description: msg });
    }
  };

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

          {/* Section 3: Notes & Description */}
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

              {existingExpense.receiptUrl && (
                <a
                  href={existingExpense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gold-600 dark:text-gold-400 font-medium hover:underline"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>View Receipt Voucher</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
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
                <span>Saving Record...</span>
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
  );
}

export default CaseExpenseFormPage;
