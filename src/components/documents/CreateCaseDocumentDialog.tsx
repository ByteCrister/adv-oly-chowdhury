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
  CASE_DOCUMENT_TYPES,
  CASE_DOCUMENT_TYPE_LIST,
  CASE_DOCUMENT_TYPE_LABELS,
  CaseDocumentType,
} from "@/const/case-document.const";
import { DOCUMENT_MAX_SIZE_BYTES } from "@/const/document.const";
import { validateDocumentFile } from "@/utils/document-compression";
import { useUploadDocument } from "@/hooks/documents";
import {
  UploadCloud,
  AlertCircle,
  Loader2,
  Lock,
  Briefcase,
} from "lucide-react";

export interface CreateCaseDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultCaseId?: string;
}

export function CreateCaseDocumentDialog({
  isOpen,
  onClose,
  onSuccess,
  defaultCaseId = "",
}: CreateCaseDocumentDialogProps) {
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);

  const [caseId, setCaseId] = React.useState(defaultCaseId);
  const [file, setFile] = React.useState<File | null>(null);
  const [title, setTitle] = React.useState("");
  const [documentType, setDocumentType] = React.useState<CaseDocumentType>(
    CASE_DOCUMENT_TYPES.PLAINT_OR_PETITION
  );
  const [documentDate, setDocumentDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [exhibitNumber, setExhibitNumber] = React.useState("");
  const [isConfidential, setIsConfidential] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { uploadAndCreateCaseDocument, isProcessing, overallProgress } = useUploadDocument();

  // Reset form during render when dialog opens/closes
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setCaseId(defaultCaseId);
      setFile(null);
      setTitle("");
      setDocumentType(CASE_DOCUMENT_TYPES.PLAINT_OR_PETITION);
      setDocumentDate("");
      setDescription("");
      setExhibitNumber("");
      setIsConfidential(false);
      setValidationError(null);
    }
  }

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

    if (!caseId.trim()) {
      setValidationError("Please select an associated legal case.");
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
      const res = await uploadAndCreateCaseDocument({
        caseId,
        file,
        title: title.trim(),
        documentType,
        documentDate: documentDate.trim() || null,
        description: description.trim() || null,
        exhibitNumber: exhibitNumber.trim() || null,
        isConfidential,
      });

      toast({
        title: "Document Vault Updated",
        description: res.message || `Case document "${title}" uploaded successfully.`,
        variant: "gold",
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload case document.";
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
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 mb-1">
            <Briefcase className="w-5 h-5" />
          </div>
          <DialogTitle className="font-serif text-xl">New Case Document</DialogTitle>
          <DialogDescription className="text-xs">
            Upload and index legal briefs, petitions, court orders, or exhibits into the case dossier.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {validationError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Case Selector via ItemSelect */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Associated Legal Case <span className="text-destructive">*</span>
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CASE}
              value={caseId}
              onChange={(val) => {
                setCaseId(val);
                setValidationError(null);
              }}
              placeholder="Search and select case by title or number..."
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
                  ? "border-gold-500/50 bg-gold-500/[0.03]"
                  : "border-border/70 dark:border-white/10 hover:border-gold-500/40 bg-muted/20"
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
                  <p className="text-[10px] text-gold-600 dark:text-gold-400">
                    Click to choose a different file
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    Click or drag file to upload
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PDF, DOC, DOCX, PNG, JPG (up to 2 MB)
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
                    className="h-full bg-gradient-to-r from-gold-500 to-gold-400 transition-all duration-300 rounded-full"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Title & Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Document Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Writ Petition Plaint"
                disabled={isProcessing}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Document Type <span className="text-destructive">*</span>
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as CaseDocumentType)}
                disabled={isProcessing}
                className="w-full h-9 px-3 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500"
              >
                {CASE_DOCUMENT_TYPE_LIST.map((type) => (
                  <option key={type} value={type}>
                    {CASE_DOCUMENT_TYPE_LABELS[type] || type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Exhibit Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Document / Filing Date
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
                Exhibit / Mark Number
              </label>
              <Input
                value={exhibitNumber}
                onChange={(e) => setExhibitNumber(e.target.value)}
                placeholder="e.g. Ext. 1, Mark A"
                disabled={isProcessing}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Description / Chamber Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context regarding this document, annexures, or court presentation notes..."
              rows={2}
              disabled={isProcessing}
              className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500 resize-none"
            />
          </div>

          {/* Confidentiality Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isConfidential"
              checked={isConfidential}
              onChange={(e) => setIsConfidential(e.target.checked)}
              disabled={isProcessing}
              className="rounded border-border text-gold-500 focus:ring-gold-500/40 w-4 h-4 cursor-pointer"
            />
            <label
              htmlFor="isConfidential"
              className="text-xs font-medium text-foreground cursor-pointer flex items-center gap-1.5 select-none"
            >
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>Mark as confidential legal brief (restricted access)</span>
            </label>
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
              variant="gold"
              disabled={isProcessing || !file || !caseId}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isProcessing ? "Uploading File..." : "Save to Case Vault"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateCaseDocumentDialog;
