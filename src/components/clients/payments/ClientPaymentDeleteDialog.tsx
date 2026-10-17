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
import { useDeleteClientPaymentMutation } from "@/hooks/clients";
import type { ClientPaymentItemDto } from "@/types/client-payment.types";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

export interface ClientPaymentDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  payment: ClientPaymentItemDto | null;
  onSuccess?: () => void;
}

export function ClientPaymentDeleteDialog({
  isOpen,
  onClose,
  clientId,
  payment,
  onSuccess,
}: ClientPaymentDeleteDialogProps) {
  const deleteMutation = useDeleteClientPaymentMutation();
  const isDeleting = deleteMutation.isPending;

  if (!payment) return null;

  const formattedAmount = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: payment.currency || "BDT",
    maximumFractionDigits: 0,
  }).format(payment.amount);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({
        clientId,
        paymentId: payment.id,
      });

      toast.success("Payment deleted successfully", {
        description: `Payment entry of ${formattedAmount} on ${new Date(payment.paymentDate).toLocaleDateString()} has been removed.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to delete payment record.";
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
            <AlertDialogTitle>Delete Payment Entry</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs space-y-2 pt-1 text-muted-foreground">
            <span>
              Are you sure you want to delete payment of{" "}
              <strong className="text-foreground font-semibold">{formattedAmount}</strong> recorded
              on {new Date(payment.paymentDate).toLocaleDateString()}?
            </span>
            {payment.moneyReceiptNumber && (
              <span className="block text-[11px] text-muted-foreground/90 font-mono">
                Money Receipt: {payment.moneyReceiptNumber}
              </span>
            )}
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
