"use client";

import * as React from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Calendar,
  Briefcase,
  User,
  ShieldCheck,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { formatByteSize } from "@/utils/document-compression";

export interface DocumentViewerTarget {
  id: string;
  title: string;
  fileUrl: string | null;
  originalFileName?: string;
  mimeType: string;
  format?: string | null;
  sizeBytes?: number;
  documentDate?: string | null;
  expiryDate?: string | null;
  entityType?: "CASE" | "CLIENT";
  isConfidential?: boolean;
  notes?: string | null;
  description?: string | null;
}

export interface DocumentViewerDialogProps {
  document: DocumentViewerTarget | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentViewerDialog({
  document,
  isOpen,
  onClose,
}: DocumentViewerDialogProps) {
  const [zoomLevel, setZoomLevel] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);
  const [hasLoadError, setHasLoadError] = React.useState(false);
  const [prevDocId, setPrevDocId] = React.useState<string | null>(null);

  // Reset zoom & rotation during render when document switches (React 19 pattern)
  const currentDocId = document?.id || null;
  if (currentDocId !== prevDocId) {
    setPrevDocId(currentDocId);
    setZoomLevel(100);
    setRotation(0);
    setHasLoadError(false);
  }

  if (!document) return null;

  const isPdf =
    document.mimeType === "application/pdf" ||
    document.format?.toLowerCase() === "pdf" ||
    document.originalFileName?.toLowerCase().endsWith(".pdf") ||
    document.fileUrl?.toLowerCase().includes(".pdf");

  const isImage =
    document.mimeType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp"].includes(document.format?.toLowerCase() || "");

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(250, prev + 25));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(50, prev - 25));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetView = () => {
    setZoomLevel(100);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!document.fileUrl) return;
    const link = window.document.createElement("a");
    link.href = document.fileUrl;
    link.download = document.originalFileName || document.title || "document";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] h-[88vh] flex flex-col p-0 overflow-hidden border border-border/80 dark:border-white/10 shadow-2xl">
        {/* Top Gold Accent Border */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-gold-500 to-transparent shrink-0" />

        {/* Header Bar */}
        <DialogHeader className="p-4 sm:px-6 sm:py-3.5 border-b border-border/60 bg-card/60 backdrop-blur-md shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
          <div className="space-y-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              {document.entityType && (
                <Badge
                  variant={document.entityType === "CASE" ? "gold" : "secondary"}
                  className="text-[10px] uppercase font-semibold tracking-wider gap-1"
                >
                  {document.entityType === "CASE" ? (
                    <>
                      <Briefcase className="w-3 h-3" />
                      <span>Case Document</span>
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3" />
                      <span>Client Document</span>
                    </>
                  )}
                </Badge>
              )}

              <Badge variant="outline" className="text-[10px] font-mono uppercase">
                {document.format || (isPdf ? "PDF" : "IMAGE")}
              </Badge>

              {document.isConfidential && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Privileged</span>
                </Badge>
              )}
            </div>

            <DialogTitle className="font-serif text-lg font-bold truncate text-foreground">
              {document.title}
            </DialogTitle>

            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 truncate">
              <span>{document.originalFileName || "Legal Asset"}</span>
              <span>•</span>
              <span className="font-mono">{formatByteSize(document.sizeBytes || 0)}</span>
              {document.documentDate && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(document.documentDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </>
              )}
            </DialogDescription>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            {isImage && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-xs"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[11px] font-mono px-1 min-w-[42px] text-center text-muted-foreground">
                  {zoomLevel}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-xs"
                  onClick={handleZoomIn}
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-xs"
                  onClick={handleRotate}
                  title="Rotate 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-xs"
                  onClick={handleResetView}
                  title="Reset View"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-xs gap-1.5 ml-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>

            {document.fileUrl && (
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-8 px-2.5 rounded-xl border border-border/80 hover:bg-muted text-xs gap-1.5 transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Full Window</span>
              </a>
            )}
          </div>
        </DialogHeader>

        {/* Document Content View Area */}
        <div className="flex-1 bg-muted/30 dark:bg-black/40 overflow-auto relative flex items-center justify-center p-2 sm:p-4">
          {!document.fileUrl ? (
            <div className="text-center p-8 space-y-2 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
              <p className="font-semibold text-sm">Document File Unavailable</p>
              <p className="text-xs">No active CDN storage URL was found for this document record.</p>
            </div>
          ) : hasLoadError ? (
            <div className="text-center p-8 space-y-3 text-muted-foreground">
              <AlertCircle className="w-10 h-10 mx-auto text-destructive" />
              <p className="font-semibold text-sm text-foreground">Failed to render preview</p>
              <p className="text-xs max-w-sm mx-auto">
                The document could not be previewed directly in the browser frame.
              </p>
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={handleDownload}
                className="text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Document File</span>
              </Button>
            </div>
          ) : isPdf ? (
            /* PDF Viewer Frame (Renders high-fidelity PDF with built-in page rendering) */
            <div className="w-full h-full rounded-xl overflow-hidden border border-border/60 bg-background shadow-inner">
              <iframe
                src={`${document.fileUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                title={document.title}
                className="w-full h-full border-none"
                onError={() => setHasLoadError(true)}
              />
            </div>
          ) : isImage ? (
            /* Image Scan / Exhibit Preview (Interactive Zoom & Rotation) */
            <div
              className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
              }}
            >
              <div className="relative max-w-[80vw] max-h-[70vh] rounded-xl overflow-hidden shadow-2xl border border-border/80 dark:border-white/10 bg-background">
                <Image
                  src={document.fileUrl}
                  alt={document.title}
                  width={1400}
                  height={1400}
                  className="object-contain max-h-[70vh] w-auto h-auto select-none"
                  unoptimized
                  onError={() => setHasLoadError(true)}
                />
              </div>
            </div>
          ) : (
            /* Fallback generic document view */
            <div className="text-center p-8 space-y-3 text-muted-foreground">
              <FileCheck className="w-12 h-12 mx-auto text-gold-500" />
              <p className="font-semibold text-sm text-foreground">{document.originalFileName}</p>
              <p className="text-xs">Preview is optimized for PDF and image scans.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </Button>
            </div>
          )}
        </div>

        {/* Footer Notes & Security Tag */}
        {(document.notes || document.description) && (
          <div className="px-6 py-2.5 bg-muted/40 dark:bg-card/30 border-t border-border/60 text-xs text-muted-foreground flex items-center gap-2 shrink-0">
            <span className="font-semibold text-foreground shrink-0">Remarks:</span>
            <span className="truncate">{document.notes || document.description}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DocumentViewerDialog;
