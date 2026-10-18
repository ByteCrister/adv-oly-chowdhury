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
import { ItemSelect } from "@/components/shared";
import { DROPDOWN_TYPES } from "@/const/dropdown.const";
import {
  CLIENT_DOCUMENT_MAX_SIZE_BYTES,
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_TYPE_LIST,
  CLIENT_DOCUMENT_TYPE_LABELS,
  ClientDocumentType,
} from "@/const/client-document.const";
import { validateDocumentFile } from "@/utils/document-compression";
import { useUploadDocument } from "@/hooks/documents";
import {
  UploadCloud,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";

export interface CreateClientDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultClientId?: string;
}

export function CreateClientDocumentDialog({
  isOpen,
  onClose,
  onSuccess,
  defaultClientId = "",
}: CreateClientDocumentDialogProps) {
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);

  const [clientId, setClientId] = React.useState(defaultClientId);
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [documentType, setDocumentType] = React.useState<ClientDocumentType>(
    CLIENT_DOCUMENT_TYPES.NATIONAL_ID
  );
  const [documentDate, setDocumentDate] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { uploadAndCreateClientDocument, isProcessing, overallProgress } = useUploadDocument();

  // Reset form during render when dialog opens/closes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setClientId(defaultClientId);
      setFile(null);
      setTitle("");
      setDocumentType(CLIENT_DOCUMENT_TYPES.NATIONAL_ID);
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
          : "Invalid file. Max size 2MB (PDF, Word, Images)."
      );
      return;
    }

    setFile(selectedFile);

    // Auto-populate title if empty
    if (!title.trim()) {
      const cleanName = selectedFile.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!clientId.trim()) {
      setValidationError("Please select an associated client.");
      return;
    }

    if (!file) {
      setValidationError("Please select or drop a document file to upload.");
      return;
    }

    if (!title.trim()) {
      setValidationError("Document title is required.");
      return;
    }

    try {
      const res = await uploadAndCreateClientDocument({
        clientId,
        file,
        title: title.trim(),
        documentType,
        documentDate: documentDate.trim() || null,
        expiryDate: expiryDate.trim() || null,
        notes: notes.trim() || null,
      });

      toast({
        title: "Document Vault Updated",
        description: res.message || `Client document "${title}" uploaded successfully.`,
        variant: "gold",
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload client document.";
      setValidationError(msg);
      toast({
        title: "Upload Failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 mb-1">
            <Users className="w-5 h-5" />
          </div>
          <DialogTitle className="font-serif text-xl">New Client Document</DialogTitle>
          <DialogDescription className="text-xs">
            Upload and archive client identification, trade licenses, TIN/BIN certificates, or KYC dossiers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {validationError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Client Selector via ItemSelect */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Associated Client <span className="text-destructive">*</span>
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CLIENT}
              value={clientId}
              onChange={(val) => {
                setClientId(val);
                setValidationError(null);
              }}
              placeholder="Search and select client by name or number..."
              disabled={isProcessing}
              required
            />
          </div>

          {/* File Upload Dropzone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Document File <span className="text-destructive">*</span>
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
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
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
                    Click to choose a different file
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    Click or drag file to upload
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PDF, DOC, DOCX, PNG, JPG (up to 25 MB)
                  </p>
                </div>
              )}
            </div>

            {/* Realtime Upload Progress Bar */}
            {isProcessing && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Uploading & Deduplicating SHA-256...</span>
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

          {/* Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Document Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. National ID Card Copy"
                disabled={isProcessing}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Document Classification <span className="text-destructive">*</span>
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as ClientDocumentType)}
                disabled={isProcessing}
                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {CLIENT_DOCUMENT_TYPE_LIST.map((type) => (
                  <option key={type} value={type}>
                    {CLIENT_DOCUMENT_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue Date & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Issue / Document Date
              </label>
              <Input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                disabled={isProcessing}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Expiration Date (if applicable)
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={isProcessing}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Chamber Notes / Identification Memo
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Identification numbers, verification notes, or remarks..."
              rows={2}
              disabled={isProcessing}
              className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
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
              disabled={isProcessing || !file || !clientId}
              className="rounded-xl text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isProcessing ? "Uploading File..." : "Save to Client Dossier"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateClientDocumentDialog;
