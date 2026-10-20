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
import { toast } from "@/components/shared/use-toast";
import { DOCUMENT_MAX_SIZE_BYTES } from "@/const/document.const";
import { validateDocumentFile } from "@/utils/document-compression";
import { useUploadDocument } from "@/hooks/documents";
import {
  RefreshCw,
  UploadCloud,
  AlertCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { UnifiedDocumentItemDto } from "@/types/document.types";

export interface ReplaceDocumentDialogProps {
  document: UnifiedDocumentItemDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ReplaceDocumentDialog({
  document,
  isOpen,
  onClose,
  onSuccess,
}: ReplaceDocumentDialogProps) {
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  const [file, setFile] = React.useState<File | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { uploadAndReplaceDocument, isProcessing, overallProgress } = useUploadDocument();

  // Reset file on open/close (React 19 pattern)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setFile(null);
      setValidationError(null);
    }
  }

  if (!document) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      validateDocumentFile(selectedFile, DOCUMENT_MAX_SIZE_BYTES);
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : "Invalid file. Max size 2MB (PDF and Image files only)."
      );
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!file) {
      setValidationError("Please select a new replacement file.");
      return;
    }

    try {
      const res = await uploadAndReplaceDocument({
        docId: document.id,
        entityType: document.entityType,
        file,
        documentType: document.documentType,
        ownerId: document.caseId || document.clientId || undefined,
      });

      toast({
        title: "File Replaced Successfully",
        description: res.message || `Document file updated to "${file.name}".`,
        variant: "gold",
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to replace document file.";
      setValidationError(msg);
      toast({
        title: "Replacement Failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 mb-1">
            <RefreshCw className="w-5 h-5" />
          </div>
          <DialogTitle className="font-serif text-xl">Replace Document File</DialogTitle>
          <DialogDescription className="text-xs">
            Upload a revised or corrected file. Metadata and legal relationships will be preserved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {validationError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Current file summary */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Currently Attached File
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-medium text-foreground truncate max-w-[200px]">
                {document.originalFileName}
              </span>
              <span className="text-muted-foreground font-mono">
                {(document.sizeBytes / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>

          {/* Replacement Warning Banner */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Replacing this file will archive the previous version and bind the new file to this record.
              All existing case or client associations will remain intact.
            </p>
          </div>

          {/* Replacement File Dropzone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              New File <span className="text-destructive">*</span>
            </label>

            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center ${
                file
                  ? "border-emerald-500/50 bg-emerald-500/[0.03]"
                  : "border-border/70 dark:border-white/10 hover:border-emerald-500/40 bg-muted/20"
              } ${isProcessing ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,image/jpeg,image/png,image/webp,image/jpg"
                disabled={isProcessing}
              />

              <div className="w-10 h-10 mx-auto rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
                <UploadCloud className="w-5 h-5" />
              </div>

              {file ? (
                <div className="space-y-1">
                  <span className="font-semibold text-xs text-foreground block truncate max-w-sm mx-auto">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Click to select a different replacement
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    Click or drag new replacement file
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PDF, PNG, JPG, or WebP (Maximum 2 MB • Lossless Compressed)
                  </p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isProcessing && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Uploading replacement file...</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300 rounded-full"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isProcessing || !file}
              className="rounded-xl text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isProcessing ? "Replacing File..." : "Confirm Replacement"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ReplaceDocumentDialog;
