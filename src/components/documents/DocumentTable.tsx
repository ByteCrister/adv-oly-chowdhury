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
  Lock,
  FileCheck,
  Briefcase,
  User,
  FileType,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_ENTITY_TYPES } from "@/const/document.const";
import type { UnifiedDocumentItemDto } from "@/types/document.types";

export interface DocumentTableProps {
  documents: UnifiedDocumentItemDto[];
  isLoading?: boolean;
  onEditDocument: (doc: UnifiedDocumentItemDto) => void;
  onReplaceDocument: (doc: UnifiedDocumentItemDto) => void;
  onDeleteDocument: (doc: UnifiedDocumentItemDto) => void;
  onUploadCaseDoc: () => void;
  onUploadClientDoc: () => void;
  onResetFilters: () => void;
}

export function DocumentTable({
  documents,
  isLoading = false,
  onEditDocument,
  onReplaceDocument,
  onDeleteDocument,
  onUploadCaseDoc,
  onUploadClientDoc,
  onResetFilters,
}: DocumentTableProps) {
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
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Empty State
  if (!isLoading && documents.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20 shadow-inner">
          <FileText className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-foreground">
            No Legal Documents Found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No records matched your search query or filter criteria in the digital vault.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
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
            onClick={onUploadCaseDoc}
            className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Add Case Document</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onUploadClientDoc}
            className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
          >
            <User className="w-3.5 h-3.5" />
            <span>Add Client Document</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-muted-foreground border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30 text-foreground font-semibold">
              <th className="py-3.5 px-4 font-serif">Document Title & Evidence</th>
              <th className="py-3.5 px-4">Entity & Dossier</th>
              <th className="py-3.5 px-4">Category / Classification</th>
              <th className="py-3.5 px-4">File Specs</th>
              <th className="py-3.5 px-4">Date & Timeline</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {documents.map((doc) => {
              const isCase = doc.entityType === DOCUMENT_ENTITY_TYPES.CASE;

              return (
                <tr
                  key={doc.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  {/* Document Title & File Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                          isCase
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        }`}
                      >
                        {isCase ? (
                          <FileCheck className="w-4 h-4" />
                        ) : (
                          <FileType className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 max-w-xs sm:max-w-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-foreground text-xs truncate max-w-[220px]">
                            {doc.title}
                          </span>
                          {doc.isConfidential && (
                            <Badge
                              variant="destructive"
                              className="text-[9px] px-1.5 py-0 gap-0.5"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Confidential</span>
                            </Badge>
                          )}
                          {doc.exhibitNumber && (
                            <Badge
                              variant="amber"
                              className="text-[9px] px-1.5 py-0 font-mono font-medium"
                            >
                              {doc.exhibitNumber}
                            </Badge>
                          )}
                        </div>

                        <span className="text-[11px] text-muted-foreground font-mono block truncate">
                          {doc.originalFileName}
                        </span>

                        {doc.description && (
                          <p className="text-[10px] text-muted-foreground/80 line-clamp-1 italic">
                            &ldquo;{doc.description}&rdquo;
                          </p>
                        )}
                        {doc.notes && (
                          <p className="text-[10px] text-muted-foreground/80 line-clamp-1 italic">
                            &ldquo;{doc.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Association: Case or Client */}
                  <td className="py-3.5 px-4 align-top">
                    {isCase ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                          <Briefcase className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {doc.caseDetails?.caseNumber || "Case Dossier"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                          {doc.caseDetails?.title || "Matter reference"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                          <User className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {doc.clientDetails?.name || "Client Dossier"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                          {doc.clientDetails?.clientNumber ||
                            doc.clientDetails?.organizationName ||
                            "Client file"}
                        </p>
                      </div>
                    )}
                  </td>

                  {/* Category / Type Badge */}
                  <td className="py-3.5 px-4 align-top">
                    <Badge
                      variant="outline"
                      className="gap-1 text-[10px] font-medium bg-muted/40 max-w-[170px]"
                    >
                      <span className="truncate">{doc.documentTypeLabel}</span>
                    </Badge>
                  </td>

                  {/* File Specs */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="space-y-0.5">
                      <span className="font-mono text-foreground font-medium block">
                        {formatSize(doc.sizeBytes)}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                        {doc.format || doc.mimeType.split("/")[1] || "RAW"}
                      </span>
                    </div>
                  </td>

                  {/* Dates */}
                  <td className="py-3.5 px-4 align-top">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-foreground">
                        <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>{formatDate(doc.documentDate)}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block">
                        Uploaded {formatDate(doc.createdAt)}
                      </span>
                    </div>
                  </td>

                  {/* Actions Dropdown */}
                  <td className="py-3.5 px-4 align-top text-right">
                    <div className="relative inline-block text-left doc-action-menu-container">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === doc.id ? null : doc.id);
                        }}
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        <span className="sr-only">Actions</span>
                      </Button>

                      {activeMenuId === doc.id && (
                        <div className="absolute right-0 mt-1 w-44 rounded-xl bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95">
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/80 transition-colors"
                              onClick={() => setActiveMenuId(null)}
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                              <span>View / Download</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onEditDocument(doc);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/80 transition-colors text-left"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gold-500" />
                            <span>Edit Metadata</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onReplaceDocument(doc);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/80 transition-colors text-left"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Replace File</span>
                          </button>

                          <div className="h-px bg-border/60 my-1" />

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onDeleteDocument(doc);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Archive Document</span>
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
    </div>
  );
}

export default DocumentTable;
