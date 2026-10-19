"use client";

import * as React from "react";
import { AlertTriangle, Trash2, Loader2, ShieldAlert } from "lucide-react";
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
import { toast } from "@/components/shared";
import { useDeleteCourtMutation } from "@/hooks/courts";
import type { CourtListItemDto } from "@/types/court.types";

export interface CourtDeleteDialogProps {
  court: CourtListItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

export function CourtDeleteDialog({
  court,
  open,
  onOpenChange,
  onSuccess,
}: CourtDeleteDialogProps) {
  const deleteMutation = useDeleteCourtMutation();

  if (!court) return null;

  const isDeletable = court.isDeletable;

  const handleDelete = async () => {
    if (!isDeletable) return;

    try {
      const res = await deleteMutation.mutateAsync(court.id);
      toast.success(res.message || `Court "${court.name}" was permanently deleted.`);
      onSuccess?.(court.id);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error).message ||
        "Failed to delete the court.";
      toast.error("Deletion Prevented", { description: message });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto sm:mx-0 ${
              isDeletable
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
            }`}
          >
            {isDeletable ? (
              <Trash2 className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <AlertDialogTitle className="text-lg font-serif font-bold text-foreground">
              {isDeletable
                ? `Delete "${court.name}"?`
                : "Cannot Delete Referenced Bench"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {isDeletable ? (
                <span>
                  Are you sure you want to permanently delete this court? This action cannot be
                  undone and will remove the bench from all chamber registries.
                </span>
              ) : (
                <span>
                  This bench cannot be deleted because it is currently associated with active judicial
                  records in the chamber database.
                </span>
              )}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {/* Association breakdown if deletion is blocked */}
        {!isDeletable && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2 text-amber-900 dark:text-amber-200">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Active Associations Found:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-800 dark:text-amber-300">
              {court.totalCases > 0 && (
                <li>
                  <strong>{court.totalCases}</strong> active litigation case file(s) assigned
                </li>
              )}
              {court.totalHearings > 0 && (
                <li>
                  <strong>{court.totalHearings}</strong> scheduled cause list hearing(s)
                </li>
              )}
              {court.totalAssets > 0 && (
                <li>
                  <strong>{court.totalAssets}</strong> attached court document(s) or exhibit(s)
                </li>
              )}
            </ul>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 pt-1 border-t border-amber-500/20">
              Please reassign these case files or hearings to another bench before attempting deletion.
            </p>
          </div>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel
            disabled={deleteMutation.isPending}
            className="text-xs rounded-xl"
          >
            {isDeletable ? "Cancel" : "Close"}
          </AlertDialogCancel>

          {isDeletable && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              className="text-xs font-semibold rounded-xl min-w-28"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  <span>Deleting...</span>
                </>
              ) : (
                "Delete Permanently"
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CourtDeleteDialog;
