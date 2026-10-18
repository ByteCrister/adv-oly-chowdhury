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
import { useDeleteCaseEventMutation } from "@/hooks/cases";
import { useToast } from "@/components/shared/use-toast";
import type { CaseEventItemDto } from "@/types/case-event.types";

export interface CaseEventDeleteDialogProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  eventItem: CaseEventItemDto | null;
  onSuccess?: () => void;
}

export function CaseEventDeleteDialog({
  caseId,
  isOpen,
  onClose,
  eventItem,
  onSuccess,
}: CaseEventDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteCaseEventMutation();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  if (!eventItem) return null;

  const handleDelete = async () => {
    setErrorMessage(null);
    try {
      await deleteMutation.mutateAsync({ caseId, eventId: eventItem.id });
      toast({
        title: "Milestone Removed",
        description: `Case event "${eventItem.title}" has been deleted from the timeline.`,
        variant: "gold",
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete the case milestone.";
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
            Delete Case Milestone
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to remove this milestone from the case timeline? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Milestone info */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1 my-2">
          <p className="font-semibold text-foreground truncate">{eventItem.title}</p>
          <p className="text-[11px] text-muted-foreground">
            {eventItem.eventTypeLabel} • {new Date(eventItem.eventDate).toLocaleDateString("en-GB")}
          </p>
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
                <span>Deleting...</span>
              </>
            ) : (
              <span>Confirm Delete</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CaseEventDeleteDialog;
