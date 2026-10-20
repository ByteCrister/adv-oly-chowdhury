"use client";

import * as React from "react";
import {
  FileText,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
  MoreVertical,
  Calendar,
  UploadCloud,
  FileCheck,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientDocumentTypeBadge } from "@/components/clients/shared/ClientBadges";
import type { ClientDocumentItemDto } from "@/types/client-document.types";

export interface ClientDocumentsTableProps {
  documents: ClientDocumentItemDto[];
  isLoading?: boolean;
  onEditDocument: (doc: ClientDocumentItemDto) => void;
  onReplaceDocument: (doc: ClientDocumentItemDto) => void;
  onDeleteDocument: (doc: ClientDocumentItemDto) => void;
  onUploadNew: () => void;
  onResetFilters: () => void;
  onViewDocument?: (doc: ClientDocumentItemDto) => void;
}

export function ClientDocumentsTable({
  documents,
  isLoading = false,
  onEditDocument,
  onReplaceDocument,
  onDeleteDocument,
  onUploadNew,
  onResetFilters,
  onViewDocument,
}: ClientDocumentsTableProps) {
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".doc-action-menu-container")) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Check if document is expired or expiring soon (< 30 days)
  const getExpiryStatus = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return null;
    const now = new Date();
    const expiry = new Date(expiryDateStr);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: "Expired", className: "text-destructive bg-destructive/10 border-destructive/20" };
    }
    if (diffDays <= 30) {
      return {
        label: `Expiring in ${diffDays}d`,
        className: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      };
    }
    return null;
  };

  // Empty State
  if (!isLoading && documents.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shadow-inner">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-foreground">
            No Documents Found in Vault
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No document records match your current filter parameters or none have been uploaded yet.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="rounded-xl text-xs"
          >
            Reset Filters
          </Button>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={onUploadNew}
            className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-muted-foreground border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-foreground font-semibold">
              <th className="py-3.5 px-4 font-serif">Document Title & Details</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">File Size & Format</th>
              <th className="py-3.5 px-4">Dates & Validity</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {documents.map((doc) => {
              const expiryStatus = getExpiryStatus(doc.expiryDate);

              return (
                <tr
                  key={doc.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  {/* Title & File Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20 mt-0.5">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 min-w-0 max-w-xs sm:max-w-sm">
                        {onViewDocument ? (
                          <button
                            type="button"
                            onClick={() => onViewDocument(doc)}
                            className="font-semibold text-foreground text-xs block truncate hover:text-gold-500 transition-colors text-left"
                            title="Click to preview document"
                          >
                            {doc.title}
                          </button>
                        ) : (
                          <span className="font-semibold text-foreground text-xs block truncate">
                            {doc.title}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground font-mono block truncate">
                          {doc.originalFileName}
                        </span>
                        {doc.notes && (
                          <p className="text-[10px] text-muted-foreground/80 line-clamp-1 italic">
                            &ldquo;{doc.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Document Type Badge */}
                  <td className="py-3.5 px-4 align-top">
                    <ClientDocumentTypeBadge type={doc.documentType} />
                  </td>

                  {/* Size & Format */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="space-y-0.5">
                      <span className="font-mono text-foreground font-medium">
                        {formatSize(doc.sizeBytes)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground uppercase">
                        {doc.format || doc.mimeType.split("/")[1] || "FILE"}
                      </span>
                    </div>
                  </td>

                  {/* Document & Expiry Dates */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3 h-3 text-gold-500/80" />
                        <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                      {doc.documentDate && (
                        <div className="text-[10px] text-muted-foreground">
                          Dated: {new Date(doc.documentDate).toLocaleDateString()}
                        </div>
                      )}
                      {expiryStatus && (
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold border ${expiryStatus.className}`}
                        >
                          {expiryStatus.label}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 align-top text-right">
                    <div className="relative inline-block doc-action-menu-container">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Interactive In-App Document Preview */}
                        {onViewDocument && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDocument(doc)}
                            className="p-1.5 h-8 w-8 rounded-lg border border-border/70 hover:bg-gold-500/10 text-muted-foreground hover:text-gold-500 transition-colors"
                            title="Preview Document"
                          >
                            <Eye className="w-3.5 h-3.5 text-gold-500" />
                          </Button>
                        )}

                        {/* Direct File View Link */}
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-border/70 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Open / Download Document"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-gold-500" />
                          </a>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActiveMenuId(activeMenuId === doc.id ? null : doc.id)
                          }
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Dropdown Menu */}
                      {activeMenuId === doc.id && (
                        <div className="absolute right-0 mt-1 w-44 rounded-xl bg-popover/95 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-lg py-1 z-30 animate-in fade-in-50 zoom-in-95 text-left">
                          {onViewDocument && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                onViewDocument(doc);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-gold-500" />
                              <span>Preview Document</span>
                            </button>
                          )}

                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/80 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-gold-500" />
                              <span>View / Download</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onReplaceDocument(doc);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                            <span>Replace File</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onEditDocument(doc);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gold-500" />
                            <span>Edit Metadata</span>
                          </button>

                          <div className="h-px bg-border/40 my-1" />

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onDeleteDocument(doc);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Record</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-border/40">
        {documents.map((doc) => {
          const expiryStatus = getExpiryStatus(doc.expiryDate);

          return (
            <div key={doc.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-xs">
                      {doc.title}
                    </span>
                    <ClientDocumentTypeBadge type={doc.documentType} />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono block truncate">
                    {doc.originalFileName} ({formatSize(doc.sizeBytes)})
                  </span>
                </div>

                {doc.fileUrl && (
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-border/70 text-gold-500"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Uploaded: {new Date(doc.createdAt).toLocaleDateString()}</span>
                {expiryStatus && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${expiryStatus.className}`}
                  >
                    {expiryStatus.label}
                  </span>
                )}
              </div>

              {/* Action Buttons for Mobile */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                {onViewDocument && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDocument(doc)}
                    className="flex-1 rounded-xl text-[11px] h-7 gap-1"
                  >
                    <Eye className="w-3 h-3 text-gold-500" />
                    <span>Preview</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReplaceDocument(doc)}
                  className="flex-1 rounded-xl text-[11px] h-7 gap-1"
                >
                  <RefreshCw className="w-3 h-3 text-blue-500" />
                  <span>Replace</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEditDocument(doc)}
                  className="flex-1 rounded-xl text-[11px] h-7 gap-1"
                >
                  <Edit2 className="w-3 h-3 text-gold-500" />
                  <span>Edit</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteDocument(doc)}
                  className="rounded-xl text-[11px] h-7 px-2 border-destructive/40 text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
