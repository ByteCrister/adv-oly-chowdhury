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
import { useDeleteClientDocumentMutation } from "@/hooks/clients";
import type { ClientDocumentItemDto } from "@/types/client-document.types";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

export interface ClientDocumentDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  document: ClientDocumentItemDto | null;
  onSuccess?: () => void;
}

export function ClientDocumentDeleteDialog({
  isOpen,
  onClose,
  clientId,
  document,
  onSuccess,
}: ClientDocumentDeleteDialogProps) {
  const deleteMutation = useDeleteClientDocumentMutation();
  const isDeleting = deleteMutation.isPending;

  if (!document) return null;

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({
        clientId,
        docId: document.id,
      });

      toast.success("Document removed", {
        description: `"${document.title}" has been deleted from this client's vault.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to delete document record.";
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
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs space-y-2 pt-1 text-muted-foreground">
            <span>
              Are you sure you want to remove{" "}
              <strong className="text-foreground font-semibold">&ldquo;{document.title}&rdquo;</strong>{" "}
              from the client vault?
            </span>
            <span className="block text-[11px] text-muted-foreground/90 font-mono">
              File: {document.originalFileName}
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
                <span>Removing...</span>
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
