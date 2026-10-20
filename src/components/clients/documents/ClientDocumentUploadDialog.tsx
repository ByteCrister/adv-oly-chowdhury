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
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_TYPE_LIST,
  CLIENT_DOCUMENT_TYPE_LABELS,
  ClientDocumentType,
} from "@/const/client-document.const";
import { validateDocumentFile } from "@/utils/document-compression";
import { useUploadClientDocument } from "@/hooks/clients";
import {
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { createClientDocumentSchema } from "@/utils/zod/client-document.validation";

export interface ClientDocumentUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess?: () => void;
}

export function ClientDocumentUploadDialog({
  isOpen,
  onClose,
  clientId,
  onSuccess,
}: ClientDocumentUploadDialogProps) {
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);

  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [documentType, setDocumentType] = React.useState<ClientDocumentType>(
    CLIENT_DOCUMENT_TYPES.OTHER
  );
  const [documentDate, setDocumentDate] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { uploadAndCreateDocument, isProcessing, overallProgress } = useUploadClientDocument();

  // Reset form during render when dialog opens/closes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setFile(null);
      setTitle("");
      setDocumentType(CLIENT_DOCUMENT_TYPES.OTHER);
      setDocumentDate("");
      setExpiryDate("");
      setNotes("");
      setValidationError(null);
    }
  }

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
          : "Invalid file. Max size 2MB (PDF and Image files only)."
      );
      return;
    }

    setFile(selectedFile);

    // Auto-populate title if empty
    if (!title.trim()) {
      const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(fileNameWithoutExt);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setValidationError(null);
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    try {
      validateDocumentFile(droppedFile, CLIENT_DOCUMENT_MAX_SIZE_BYTES);
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : "Invalid file. Max size 2MB (PDF and Image files only)."
      );
      return;
    }

    setFile(droppedFile);
    if (!title.trim()) {
      setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setValidationError("Please select or drop a valid document file.");
      return;
    }

    const metadataPayload = {
      title: title.trim(),
      documentType,
      documentDate: documentDate ? new Date(documentDate).toISOString() : null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      notes: notes.trim() || null,
    };

    const validationResult = createClientDocumentSchema
      .omit({ assetReferenceId: true })
      .safeParse(metadataPayload);

    if (!validationResult.success) {
      setValidationError(validationResult.error.issues[0]?.message || "Invalid document details");
      return;
    }

    try {
      await uploadAndCreateDocument({
        clientId,
        file,
        title: validationResult.data.title,
        documentType: validationResult.data.documentType,
        documentDate: validationResult.data.documentDate ?? null,
        expiryDate: validationResult.data.expiryDate ?? null,
        notes: validationResult.data.notes ?? null,
      });

      toast.success("Document uploaded successfully", {
        description: `"${title}" has been securely stored in the client vault.`,
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload document.";
      setValidationError(msg);
      toast.error("Upload failed", { description: msg });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-gold-500 text-xs font-semibold uppercase tracking-wider">
            <UploadCloud className="w-4 h-4" />
            <span>Vault Asset Ingestion</span>
          </div>
          <DialogTitle className="text-xl mt-1">Upload Client Document</DialogTitle>
          <DialogDescription>
            Securely upload legal documents, identity records, or evidentiary files into the vault.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* File Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                file
                  ? "border-gold-500/50 bg-gold-500/5"
                  : "border-border/80 hover:border-gold-500/50 bg-background/50 hover:bg-muted/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept=".pdf,image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                disabled={isProcessing}
              />

              {file ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-500 mx-auto flex items-center justify-center border border-gold-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground truncate max-w-xs mx-auto">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB • Click or drop another to replace
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Click to choose file or drag and drop
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      PDF, PNG, JPG, or WebP (Maximum 2 MB • Lossless Compressed)
                    </p>
                  </div>
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

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="upload-title" className="text-xs font-semibold text-foreground">
                Document Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="upload-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. National ID Card Copy / Power of Attorney"
                disabled={isProcessing}
              />
            </div>

            {/* Document Type & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Document Type</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as ClientDocumentType)}
                  disabled={isProcessing}
                  className="h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
                >
                  {CLIENT_DOCUMENT_TYPE_LIST.map((t) => (
                    <option key={t} value={t}>
                      {CLIENT_DOCUMENT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="upload-doc-date" className="text-xs font-semibold text-foreground">
                  Document Date
                </label>
                <Input
                  id="upload-doc-date"
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <label htmlFor="upload-expiry-date" className="text-xs font-semibold text-foreground">
                Validity / Expiry Date (Optional)
              </label>
              <Input
                id="upload-expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="upload-notes" className="text-xs font-semibold text-foreground">
                Document Notes & Cross-References
              </label>
              <textarea
                id="upload-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Evidentiary notes, notary registration number, or issuance chamber notes..."
                disabled={isProcessing}
                className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-none"
              />
            </div>

            {/* Progress Bar during upload */}
            {isProcessing && (
              <div className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gold-600 dark:text-gold-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing upload & Cloudinary signature...</span>
                  </span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gold-500/20 overflow-hidden">
                  <div
                    className="h-full bg-gold-500 transition-all duration-300"
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
              disabled={isProcessing || !file || !title.trim()}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading Asset...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
