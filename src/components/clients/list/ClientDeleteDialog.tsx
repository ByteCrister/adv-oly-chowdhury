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
import { useDeleteClientMutation } from "@/hooks/clients";
import type { ClientListItemDto, ClientDetailDto } from "@/types/client.types";
import { AlertTriangle, Trash2, Loader2, ShieldAlert } from "lucide-react";

export interface ClientDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientListItemDto | ClientDetailDto | null;
  onSuccess?: () => void;
}

export function ClientDeleteDialog({
  isOpen,
  onClose,
  client,
  onSuccess,
}: ClientDeleteDialogProps) {
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  const [conflictError, setConflictError] = React.useState<string | null>(null);

  const deleteMutation = useDeleteClientMutation();
  const isDeleting = deleteMutation.isPending;

  // Reset conflict error during render when dialog opens or closes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setConflictError(null);
  }

  if (!client) return null;

  const handleDelete = async () => {
    setConflictError(null);
    try {
      await deleteMutation.mutateAsync(client.id);

      toast.success("Client deleted successfully", {
        description: `Client record for "${client.name}" (${client.clientNumber}) has been removed.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const errorData = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response;
      if (errorData?.status === 409) {
        setConflictError(
          errorData.data?.message ||
            "Cannot delete client: There are active legal cases or recorded payments associated with this client record."
        );
      } else {
        const errorMsg =
          errorData?.data?.message || "Failed to delete client due to an unexpected server error.";
        toast.error("Deletion failed", {
          description: errorMsg,
        });
      }
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
            <AlertDialogTitle>Delete Client Record</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs space-y-2 pt-1 text-muted-foreground">
            <span>
              Are you sure you want to delete{" "}
              <strong className="text-foreground font-semibold">{client.name}</strong>{" "}
              <span className="text-gold-600 dark:text-gold-400 font-mono">
                ({client.clientNumber})
              </span>
              ?
            </span>

            <span className="block text-[11px] text-muted-foreground/90">
              This action will mark the client as deleted in the database.
            </span>
          </AlertDialogDescription>

          {/* Conflict Warning Alert if 409 */}
          {conflictError && (
            <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-1 animate-in fade-in-50">
              <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Deletion Blocked by Data Integrity Guard</span>
              </div>
              <p className="text-[11px] leading-relaxed text-destructive/90">{conflictError}</p>
            </div>
          )}
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
