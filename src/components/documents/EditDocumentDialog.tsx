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
import { DOCUMENT_ENTITY_TYPES } from "@/const/document.const";
import {
  CASE_DOCUMENT_TYPE_LIST,
  CASE_DOCUMENT_TYPE_LABELS,
} from "@/const/case-document.const";
import {
  CLIENT_DOCUMENT_TYPE_LIST,
  CLIENT_DOCUMENT_TYPE_LABELS,
} from "@/const/client-document.const";
import { useUpdateDocumentMutation } from "@/hooks/documents";
import {
  Edit2,
  AlertCircle,
  Loader2,
  Lock,
} from "lucide-react";
import type { UnifiedDocumentItemDto } from "@/types/document.types";

export interface EditDocumentDialogProps {
  document: UnifiedDocumentItemDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditDocumentDialog({
  document,
  isOpen,
  onClose,
  onSuccess,
}: EditDocumentDialogProps) {
  const [title, setTitle] = React.useState("");
  const [documentType, setDocumentType] = React.useState("");
  const [documentDate, setDocumentDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [exhibitNumber, setExhibitNumber] = React.useState("");
  const [isConfidential, setIsConfidential] = React.useState(false);
  const [expiryDate, setExpiryDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const updateMutation = useUpdateDocumentMutation();
  const isCase = document?.entityType === DOCUMENT_ENTITY_TYPES.CASE;

  const [prevDocKey, setPrevDocKey] = React.useState<string | null>(null);
  const currentKey = isOpen && document ? `${document.id}-${document.updatedAt}` : null;

  // Sync state whenever document changes or modal opens (React 19 pattern)
  if (currentKey !== prevDocKey) {
    setPrevDocKey(currentKey);
    if (document && isOpen) {
      setTitle(document.title || "");
      setDocumentType(document.documentType || "");
      setDocumentDate(
        document.documentDate ? document.documentDate.split("T")[0] : ""
      );
      setDescription(document.description || "");
      setExhibitNumber(document.exhibitNumber || "");
      setIsConfidential(Boolean(document.isConfidential));
      setExpiryDate(document.expiryDate ? document.expiryDate.split("T")[0] : "");
      setNotes(document.notes || "");
      setValidationError(null);
    }
  }

  if (!document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError("Document title cannot be empty.");
      return;
    }

    try {
      const res = await updateMutation.mutateAsync({
        id: document.id,
        data: {
          entityType: document.entityType,
          title: title.trim(),
          documentType,
          documentDate: documentDate.trim() || null,
          ...(isCase
            ? {
                description: description.trim() || null,
                exhibitNumber: exhibitNumber.trim() || null,
                isConfidential,
              }
            : {
                expiryDate: expiryDate.trim() || null,
                notes: notes.trim() || null,
              }),
        },
      });

      toast({
        title: "Metadata Updated",
        description: res.message || `Document "${title}" updated successfully.`,
        variant: "gold",
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update document metadata.";
      setValidationError(msg);
      toast({
        title: "Update Failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !updateMutation.isPending && !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20 mb-1">
            <Edit2 className="w-5 h-5" />
          </div>
          <DialogTitle className="font-serif text-xl">Edit Document Metadata</DialogTitle>
          <DialogDescription className="text-xs">
            Update indexing attributes, dates, and classification for this {isCase ? "case" : "client"} record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {validationError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Current file readout */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Original File:</span>
            <span className="font-mono font-medium text-foreground truncate max-w-[240px]">
              {document.originalFileName}
            </span>
          </div>

          {/* Title & Classification */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Document Title <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={updateMutation.isPending}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Document Classification
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={updateMutation.isPending}
                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500"
              >
                {isCase
                  ? CASE_DOCUMENT_TYPE_LIST.map((type) => (
                      <option key={type} value={type}>
                        {CASE_DOCUMENT_TYPE_LABELS[type] || type}
                      </option>
                    ))
                  : CLIENT_DOCUMENT_TYPE_LIST.map((type) => (
                      <option key={type} value={type}>
                        {CLIENT_DOCUMENT_TYPE_LABELS[type] || type}
                      </option>
                    ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Document / Issue Date
              </label>
              <Input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                disabled={updateMutation.isPending}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Case specific fields */}
          {isCase && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Exhibit / Mark Number
                </label>
                <Input
                  value={exhibitNumber}
                  onChange={(e) => setExhibitNumber(e.target.value)}
                  placeholder="e.g. Ext. 1, Mark A"
                  disabled={updateMutation.isPending}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Description / Chamber Notes
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  disabled={updateMutation.isPending}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsConfidential"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  disabled={updateMutation.isPending}
                  className="rounded border-border text-gold-500 focus:ring-gold-500/40 w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="editIsConfidential"
                  className="text-xs font-medium text-foreground cursor-pointer flex items-center gap-1.5 select-none"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Mark as confidential legal brief (restricted access)</span>
                </label>
              </div>
            </>
          )}

          {/* Client specific fields */}
          {!isCase && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Expiration Date
                </label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={updateMutation.isPending}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Chamber Notes / Memo
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  disabled={updateMutation.isPending}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500 resize-none"
                />
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              disabled={updateMutation.isPending}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              {updateMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditDocumentDialog;
