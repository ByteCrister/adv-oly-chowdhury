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
  CLIENT_DOCUMENT_MAX_SIZE_BYTES,
} from "@/const/client-document.const";
import { validateDocumentFile } from "@/utils/document-compression";
import { useUploadClientDocument } from "@/hooks/clients";
import type { ClientDocumentItemDto } from "@/types/client-document.types";
import {
  RefreshCw,
  FileText,
  AlertCircle,
  Loader2,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";
import { updateClientDocumentSchema } from "@/utils/zod/client-document.validation";

export interface ClientDocumentReplaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  document: ClientDocumentItemDto | null;
  onSuccess?: () => void;
}

export function ClientDocumentReplaceDialog({
  isOpen,
  onClose,
  clientId,
  document,
  onSuccess,
}: ClientDocumentReplaceDialogProps) {
  // Track previous props to synchronize state during render
  const [prevDoc, setPrevDoc] = React.useState(document);
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);

  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState(document?.title || "");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { uploadAndReplaceDocument, isProcessing, overallProgress } = useUploadClientDocument();

  // Sync state during render when document or isOpen changes
  if (document !== prevDoc || isOpen !== prevIsOpen) {
    setPrevDoc(document);
    setPrevIsOpen(isOpen);
    if (document) {
      setTitle(document.title);
    }
    setFile(null);
    setValidationError(null);
  }

  if (!document) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      validateDocumentFile(selectedFile, CLIENT_DOCUMENT_MAX_SIZE_BYTES);
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : "Invalid file. Max size 2MB (PDF, Word, Images)."
      );
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setValidationError("Please select a new replacement file.");
      return;
    }

    const targetTitle = title.trim() || document.title;
    const validationResult = updateClientDocumentSchema.safeParse({ title: targetTitle });
    if (!validationResult.success) {
      const issueMsg = validationResult.error.issues[0]?.message || "Invalid document title";
      setValidationError(issueMsg);
      return;
    }

    try {
      await uploadAndReplaceDocument({
        clientId,
        docId: document.id,
        file,
        title: targetTitle,
      });

      toast.success("Document file replaced successfully", {
        description: `The physical asset for "${document.title}" has been updated safely.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to replace document file.";
      setValidationError(msg);
      toast.error("Replacement failed", { description: msg });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-blue-500 text-xs font-semibold uppercase tracking-wider">
            <RefreshCw className="w-4 h-4" />
            <span>Asset Lifecycle Replacement</span>
          </div>
          <DialogTitle className="text-xl mt-1">Replace Document File</DialogTitle>
          <DialogDescription>
            Substitute the underlying Cloudinary asset with a newly uploaded version while preserving audit history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Current File Info */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1">
              <span className="text-muted-foreground font-medium">Currently attached file:</span>
              <p className="font-semibold text-foreground flex items-center gap-1.5 font-mono">
                <FileText className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                <span className="truncate">{document.originalFileName}</span>
              </p>
            </div>

            {/* Replacement Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                file
                  ? "border-blue-500/50 bg-blue-500/5"
                  : "border-border/80 hover:border-blue-500/50 bg-background/50 hover:bg-muted/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                className="hidden"
                disabled={isProcessing}
              />

              {file ? (
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 mx-auto flex items-center justify-center border border-blue-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate max-w-xs mx-auto">
                    New File: {file.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB • Click to pick a different file
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    Click to select new replacement file
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Max: 2MB limit (PDF, Word, or image)
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {validationError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Optional Title Update */}
            <div className="space-y-1.5">
              <label htmlFor="replace-title" className="text-xs font-semibold text-foreground">
                Document Title
              </label>
              <Input
                id="replace-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            {/* Progress bar */}
            {isProcessing && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading replacement...</span>
                  </span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-blue-500/20 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border/50">
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
              variant="gold"
              disabled={isProcessing || !file}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Replacing File...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Confirm Replacement</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
