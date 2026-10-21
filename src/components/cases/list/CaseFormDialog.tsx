"use client";

import * as React from "react";
import { Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CaseForm } from "@/components/cases/shared/CaseForm";
import type { CaseListItemDto, CaseDetailDto } from "@/types/case.types";

export interface CaseFormDialogProps {
  caseItem?: CaseListItemDto | CaseDetailDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CaseFormDialog({
  caseItem,
  isOpen,
  onClose,
  onSuccess,
}: CaseFormDialogProps) {
  const isEditing = Boolean(caseItem);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-border/80 dark:border-white/10 bg-card p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <DialogTitle className="font-serif text-lg font-bold text-foreground">
              {isEditing ? "Edit Case Dossier" : "Register New Legal Case"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Update litigation information, status, opposing details, and court jurisdiction."
              : "Create a new legal matter, assign the client and presiding court, and set proceeding priorities."}
          </DialogDescription>
        </DialogHeader>

        <CaseForm
          caseItem={caseItem}
          isDialog={true}
          onSuccess={() => {
            onSuccess?.();
            onClose();
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

export default CaseFormDialog;
