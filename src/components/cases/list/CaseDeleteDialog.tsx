"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteCaseMutation } from "@/hooks/cases";
import { useToast } from "@/components/shared/use-toast";
import type { CaseListItemDto } from "@/types/case.types";

export interface CaseDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: CaseListItemDto | null;
  onSuccess?: () => void;
}

export function CaseDeleteDialog({
  isOpen,
  onClose,
  caseItem,
  onSuccess,
}: CaseDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteCaseMutation();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  if (!caseItem) return null;

  const handleDelete = async () => {
    setErrorMessage(null);
    try {
      await deleteMutation.mutateAsync(caseItem.id);
      toast({
        title: "Case Dossier Archived",
        description: `Case "${caseItem.title}" (${caseItem.caseNumber || caseItem.internalReference}) has been safely archived.`,
        variant: "gold",
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to archive the legal case record.";
      setErrorMessage(msg);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md rounded-2xl border-border/80 dark:border-white/10 bg-card p-6 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="w-11 h-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle className="font-serif text-lg font-bold text-foreground">
            Archive Legal Case Dossier
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to archive this case? This operation soft-deletes the case record while preserving all underlying documents, event history, and hearing transcripts for compliance and audit integrity.
          </DialogDescription>
        </DialogHeader>

        {/* Highlighted Case Summary */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5 my-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground truncate max-w-[280px]">
              {caseItem.title}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-background border border-border/60">
              {caseItem.caseNumber || caseItem.internalReference}
            </span>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
            {caseItem.client && <span>Client: {caseItem.client.name}</span>}
            {caseItem.court && <span>Court: {caseItem.court.name}</span>}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {errorMessage}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={deleteMutation.isPending}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="rounded-xl text-xs gap-1.5 font-semibold"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Archiving Case...</span>
              </>
            ) : (
              <span>Confirm Archive</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CaseDeleteDialog;
