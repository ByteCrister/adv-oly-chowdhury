"use client";

import * as React from "react";
import {
  FileText,
  FileCheck,
  Edit2,
  Trash2,
  RefreshCw,
  Lock,
  Calendar,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CaseDocumentItemDto } from "@/types/case-document.types";

export interface CaseDocumentsTableProps {
  documents: CaseDocumentItemDto[];
  isLoading?: boolean;
  onEdit: (doc: CaseDocumentItemDto) => void;
  onReplace: (doc: CaseDocumentItemDto) => void;
  onDelete: (doc: CaseDocumentItemDto) => void;
  onUploadNew: () => void;
  onResetFilters?: () => void;
  isFiltered?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function CaseDocumentsTable({
  documents,
  isLoading = false,
  onEdit,
  onReplace,
  onDelete,
  onUploadNew,
  onResetFilters,
  isFiltered = false,
}: CaseDocumentsTableProps) {
  if (!isLoading && documents.length === 0) {
    return (
      <div className="p-10 rounded-2xl border border-dashed border-border/80 bg-card/40 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
          <FileText className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-foreground">
            {isFiltered ? "No Matching Documents Found" : "Document Vault is Empty"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {isFiltered
              ? "We couldn't locate any legal documents matching your active search query or type filters. Try clearing your filters."
              : "Upload relevant petitions, deeds, powers of attorney, written statements, or judgments to safely archive them in this case vault."}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          {isFiltered && onResetFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="rounded-xl text-xs"
            >
              Clear Active Filters
            </Button>
          ) : (
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={onUploadNew}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Add First Document</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card overflow-hidden shadow-sm">
      <div className="divide-y divide-border/50">
        {documents.map((doc) => {
          const isPdf = doc.mimeType?.includes("pdf") || doc.format?.toLowerCase() === "pdf";

          return (
            <div
              key={doc.id}
              className="group p-4 sm:p-5 hover:bg-muted/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Document Identity & Metadata */}
              <div className="flex items-start gap-3.5 min-w-0">
                {/* File Icon Box */}
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex flex-col items-center justify-center shrink-0 text-gold-600 dark:text-gold-400">
                  {isPdf ? <FileCheck className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  <span className="text-[9px] font-mono font-bold uppercase mt-0.5 leading-none">
                    {doc.format || "DOC"}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-sm sm:text-base font-bold text-foreground truncate max-w-sm sm:max-w-md">
                      {doc.title}
                    </span>

                    <Badge variant="secondary">{doc.documentTypeLabel}</Badge>

                    {doc.isConfidential && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/25">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Confidential</span>
                      </span>
                    )}

                    {doc.exhibitNumber && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/60">
                        Exhibit #{doc.exhibitNumber}
                      </span>
                    )}
                  </div>

                  {/* Metadata Row: Date, Size, Original Name */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono text-[11px] truncate max-w-[200px]" title={doc.originalFileName}>
                      {doc.originalFileName}
                    </span>
                    <span className="text-border">•</span>
                    <span>{formatBytes(doc.sizeBytes)}</span>
                    {doc.documentDate && (
                      <>
                        <span className="text-border">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gold-500 shrink-0" />
                          <span>
                            Doc Date: {new Date(doc.documentDate).toLocaleDateString("en-GB")}
                          </span>
                        </span>
                      </>
                    )}
                    <span className="text-border">•</span>
                    <span>
                      Uploaded {new Date(doc.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </div>

                  {/* Optional Description */}
                  {doc.description && (
                    <p className="text-xs text-muted-foreground/90 line-clamp-2 pt-0.5">
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0 self-start md:self-center">
                {/* View Document */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(doc.fileUrl, "_blank")}
                  className="rounded-xl text-xs gap-1 border-border/70 hover:border-gold-500/40 text-foreground"
                  title="Open file in browser"
                >
                  <Eye className="w-3.5 h-3.5 text-gold-500" />
                  <span className="hidden sm:inline">View</span>
                </Button>

                {/* Edit Metadata */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(doc)}
                  className="rounded-xl text-xs gap-1 border-border/70 text-muted-foreground hover:text-foreground"
                  title="Edit metadata"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>

                {/* Replace File */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onReplace(doc)}
                  className="rounded-xl text-xs gap-1 border-border/70 text-muted-foreground hover:text-foreground"
                  title="Replace underlying media file"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Replace</span>
                </Button>

                {/* Delete Document */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(doc)}
                  className="rounded-xl text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  title="Archive document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CaseDocumentsTable;
