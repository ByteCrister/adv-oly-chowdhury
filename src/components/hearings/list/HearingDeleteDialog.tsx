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
import { useDeleteHearingMutation } from "@/hooks/hearings";
import { useToast } from "@/components/shared/use-toast";
import type { HearingListItemDto } from "@/types/hearing.types";

export interface HearingDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hearing: HearingListItemDto | null;
  onSuccess?: () => void;
}

export function HearingDeleteDialog({
  isOpen,
  onClose,
  hearing,
  onSuccess,
}: HearingDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteHearingMutation();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  if (!hearing) return null;

  const hearingDateFormatted = new Date(hearing.hearingDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleDelete = async () => {
    setErrorMessage(null);
    try {
      await deleteMutation.mutateAsync(hearing.id);
      toast({
        title: "Hearing Removed",
        description: `The hearing on ${hearingDateFormatted} for ${hearing.case.caseNumber || hearing.case.internalReference} was removed successfully.`,
        variant: "gold",
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        "Failed to delete the hearing record.";
      setErrorMessage(msg);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto sm:mx-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <DialogTitle>Delete Hearing Appearance?</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to remove the scheduled court hearing for{" "}
            <strong className="text-foreground">
              {hearing.case.caseNumber || hearing.case.internalReference}
            </strong>{" "}
            ({hearing.case.title}) set on{" "}
            <strong className="text-foreground">{hearingDateFormatted}</strong>?
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-xs leading-relaxed">
            {errorMessage}
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5 text-muted-foreground">
          <div className="flex justify-between">
            <span>Proceeding Type:</span>
            <span className="font-semibold text-foreground">
              {hearing.hearingType || "Regular Hearing"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-semibold text-foreground">{hearing.statusLabel}</span>
          </div>
          {hearing.court && (
            <div className="flex justify-between">
              <span>Court Bench:</span>
              <span className="text-foreground">{hearing.court.name}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            {deleteMutation.isPending && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            <span>Confirm Deletion</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HearingDeleteDialog;
