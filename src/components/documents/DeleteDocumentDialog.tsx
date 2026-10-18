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
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/shared/use-toast";
import { useDeleteDocumentMutation } from "@/hooks/documents";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { UnifiedDocumentItemDto } from "@/types/document.types";

export interface DeleteDocumentDialogProps {
  document: UnifiedDocumentItemDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteDocumentDialog({
  document,
  isOpen,
  onClose,
  onSuccess,
}: DeleteDocumentDialogProps) {
  const deleteMutation = useDeleteDocumentMutation();

  if (!document) return null;

  const handleDelete = async () => {
    try {
      const res = await deleteMutation.mutateAsync({
        id: document.id,
        entityType: document.entityType,
      });

      toast({
        title: "Document Archived",
        description: res.message || `Document "${document.title}" was soft-deleted successfully.`,
        variant: "gold",
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to soft-delete document.";
      toast({
        title: "Archival Failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !deleteMutation.isPending && !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 mb-1">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <AlertDialogTitle className="font-serif text-lg">
            Archive Legal Document
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs space-y-2 text-muted-foreground">
            <p>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">&ldquo;{document.title}&rdquo;</strong> from active
              case and client views?
            </p>
            <p className="text-[11px] text-muted-foreground/90 bg-muted/40 p-2.5 rounded-xl border border-border/60">
              This document will be soft-deleted. The underlying file and historical audit logs will be
              retained in compliance with Bar Council and chamber record-keeping rules.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="pt-2">
          <AlertDialogCancel
            disabled={deleteMutation.isPending}
            onClick={onClose}
            className="rounded-xl text-xs"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleteMutation.isPending}
            onClick={handleDelete}
            className="rounded-xl text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm gap-1.5"
          >
            {deleteMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{deleteMutation.isPending ? "Archiving..." : "Archive Document"}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteDocumentDialog;
