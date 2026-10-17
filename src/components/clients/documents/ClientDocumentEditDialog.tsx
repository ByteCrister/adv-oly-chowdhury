"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/shared/use-toast";
import {
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_TYPE_LIST,
  CLIENT_DOCUMENT_TYPE_LABELS,
  ClientDocumentType,
} from "@/const/client-document.const";
import { useUpdateClientDocumentMutation } from "@/hooks/clients";
import type { ClientDocumentItemDto } from "@/types/client-document.types";
import { Edit2, Loader2, Save } from "lucide-react";
import { updateClientDocumentSchema } from "@/utils/zod/client-document.validation";

export interface ClientDocumentEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  document: ClientDocumentItemDto | null;
  onSuccess?: () => void;
}

export function ClientDocumentEditDialog({
  isOpen,
  onClose,
  clientId,
  document,
  onSuccess,
}: ClientDocumentEditDialogProps) {
  // Track previous props to synchronize form state during render
  const [prevDoc, setPrevDoc] = React.useState(document);
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);

  const [title, setTitle] = React.useState(document?.title || "");
  const [documentType, setDocumentType] = React.useState<ClientDocumentType>(
    document?.documentType || CLIENT_DOCUMENT_TYPES.OTHER
  );
  const [documentDate, setDocumentDate] = React.useState(
    document?.documentDate ? document.documentDate.slice(0, 10) : ""
  );
  const [expiryDate, setExpiryDate] = React.useState(
    document?.expiryDate ? document.expiryDate.slice(0, 10) : ""
  );
  const [notes, setNotes] = React.useState(document?.notes || "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const updateMutation = useUpdateClientDocumentMutation();
  const isSubmitting = updateMutation.isPending;

  // Sync state during render when document or isOpen changes
  if (document !== prevDoc || isOpen !== prevIsOpen) {
    setPrevDoc(document);
    setPrevIsOpen(isOpen);
    if (document) {
      setTitle(document.title);
      setDocumentType(document.documentType);
      setDocumentDate(document.documentDate ? document.documentDate.slice(0, 10) : "");
      setExpiryDate(document.expiryDate ? document.expiryDate.slice(0, 10) : "");
      setNotes(document.notes || "");
    }
    setErrors({});
  }

  if (!document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawPayload = {
      title: title.trim(),
      documentType,
      documentDate: documentDate ? new Date(documentDate).toISOString() : null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      notes: notes.trim() || null,
    };

    const validationResult = updateClientDocumentSchema.safeParse(rawPayload);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const field = String(issue.path[0]);
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      await updateMutation.mutateAsync({
        clientId,
        docId: document.id,
        data: validationResult.data,
      });

      toast.success("Document updated", {
        description: `Metadata for "${title}" has been saved.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update document metadata.";
      toast.error("Update failed", { description: msg });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-gold-500 text-xs font-semibold uppercase tracking-wider">
            <Edit2 className="w-4 h-4" />
            <span>Document Metadata</span>
          </div>
          <DialogTitle className="text-xl mt-1">Edit Document Info</DialogTitle>
          <DialogDescription>
            Update legal classification, validity periods, or cross-referencing notes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="edit-doc-title" className="text-xs font-semibold text-foreground">
                Document Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="edit-doc-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
                }}
                className={errors.title ? "border-destructive focus-visible:ring-destructive/30" : ""}
                disabled={isSubmitting}
              />
              {errors.title && <p className="text-[11px] text-destructive">{errors.title}</p>}
            </div>

            {/* Document Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as ClientDocumentType)}
                disabled={isSubmitting}
                className="h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
              >
                {CLIENT_DOCUMENT_TYPE_LIST.map((t) => (
                  <option key={t} value={t}>
                    {CLIENT_DOCUMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Date & Expiry Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="edit-doc-date" className="text-xs font-semibold text-foreground">
                  Document Date
                </label>
                <Input
                  id="edit-doc-date"
                  type="date"
                  value={documentDate}
                  onChange={(e) => {
                    setDocumentDate(e.target.value);
                    if (errors.documentDate) setErrors((prev) => ({ ...prev, documentDate: "" }));
                  }}
                  className={errors.documentDate ? "border-destructive focus-visible:ring-destructive/30" : ""}
                  disabled={isSubmitting}
                />
                {errors.documentDate && <p className="text-[11px] text-destructive">{errors.documentDate}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-expiry-date" className="text-xs font-semibold text-foreground">
                  Expiry Date
                </label>
                <Input
                  id="edit-expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => {
                    setExpiryDate(e.target.value);
                    if (errors.expiryDate) setErrors((prev) => ({ ...prev, expiryDate: "" }));
                  }}
                  className={errors.expiryDate ? "border-destructive focus-visible:ring-destructive/30" : ""}
                  disabled={isSubmitting}
                />
                {errors.expiryDate && <p className="text-[11px] text-destructive">{errors.expiryDate}</p>}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="edit-doc-notes" className="text-xs font-semibold text-foreground">
                Document Notes
              </label>
              <textarea
                id="edit-doc-notes"
                rows={3}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  if (errors.notes) setErrors((prev) => ({ ...prev, notes: "" }));
                }}
                disabled={isSubmitting}
                className={`w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-none ${
                  errors.notes ? "border-destructive focus:ring-destructive/30" : ""
                }`}
              />
              {errors.notes && <p className="text-[11px] text-destructive">{errors.notes}</p>}
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="gold"
              disabled={isSubmitting || !title.trim()}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Metadata</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
