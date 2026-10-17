"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/shared/use-toast";
import { useDeleteCaseExpenseMutation } from "@/hooks/case-expenses";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

export interface CaseExpenseDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    id: string;
    amount: number;
    currency?: string;
    categoryLabel?: string | null;
    expenseCategoryLabel?: string | null;
    expenseDate?: string;
    transactionDate?: string;
  } | null;
  onSuccess?: () => void;
}

export function CaseExpenseDeleteDialog({
  isOpen,
  onClose,
  expense,
  onSuccess,
}: CaseExpenseDeleteDialogProps) {
  const deleteMutation = useDeleteCaseExpenseMutation();
  const isDeleting = deleteMutation.isPending;

  if (!expense) return null;

  const formattedAmount = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: expense.currency || "BDT",
    maximumFractionDigits: 0,
  }).format(expense.amount);

  const rawDate = expense.expenseDate || expense.transactionDate || "";
  const dateFormatted = rawDate ? new Date(rawDate).toLocaleDateString() : "";
  const catLabel = expense.categoryLabel || expense.expenseCategoryLabel;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(expense.id);

      toast.success("Case expense deleted successfully", {
        description: `Expense record of ${formattedAmount} has been removed from chamber accounts.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to delete case expense record.";
      toast.error("Deletion failed", { description: msg });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete Case Expense</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs space-y-2 pt-1 text-muted-foreground">
            <span>
              Are you sure you want to delete the expense entry of{" "}
              <strong className="text-foreground font-semibold">{formattedAmount}</strong>
              {dateFormatted ? ` recorded on ${dateFormatted}` : ""}?
            </span>
            {catLabel && (
              <span className="block text-[11px] text-muted-foreground font-medium">
                Category: {catLabel}
              </span>
            )}
            <span className="block text-[11px] text-muted-foreground/80 italic">
              This action cannot be undone and will update the financial ledger balance.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            disabled={isDeleting}
            onClick={onClose}
            className="rounded-xl text-xs h-9"
          >
            Cancel
          </AlertDialogCancel>

          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-xl text-xs font-semibold gap-1.5 h-9 shadow-sm"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CaseExpenseDeleteDialog;
