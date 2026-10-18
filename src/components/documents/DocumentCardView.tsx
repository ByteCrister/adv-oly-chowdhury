"use client";

import * as React from "react";
import {
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
  Calendar,
  Lock,
  Briefcase,
  User,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_ENTITY_TYPES } from "@/const/document.const";
import type { UnifiedDocumentItemDto } from "@/types/document.types";

export interface DocumentCardViewProps {
  documents: UnifiedDocumentItemDto[];
  onEditDocument: (doc: UnifiedDocumentItemDto) => void;
  onReplaceDocument: (doc: UnifiedDocumentItemDto) => void;
  onDeleteDocument: (doc: UnifiedDocumentItemDto) => void;
}

export function DocumentCardView({
  documents,
  onEditDocument,
  onReplaceDocument,
  onDeleteDocument,
}: DocumentCardViewProps) {
  const [activeMenuId, setActiveMenuId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".doc-action-card-menu")) {
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
      {documents.map((doc) => {
        const isCase = doc.entityType === DOCUMENT_ENTITY_TYPES.CASE;

        return (
          <div
            key={doc.id}
            className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-3 relative overflow-hidden"
          >
            {/* Header: Title + Context Menu */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                    isCase
                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  }`}
                >
                  {isCase ? (
                    <Briefcase className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="font-semibold text-xs text-foreground truncate">
                    {doc.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {doc.originalFileName}
                  </p>
                </div>
              </div>

              {/* Card Context Menu */}
              <div className="relative doc-action-card-menu shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === doc.id ? null : doc.id);
                  }}
                >
                  <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>

                {activeMenuId === doc.id && (
                  <div className="absolute right-0 mt-1 w-44 rounded-xl bg-card/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-xl py-1 z-50">
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted/80 transition-colors"
                        onClick={() => setActiveMenuId(null)}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                        <span>View Document</span>
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
                      <span>Archive</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Badges: Category & Confidentiality */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] bg-muted/40">
                {doc.documentTypeLabel}
              </Badge>
              {doc.isConfidential && (
                <Badge variant="destructive" className="text-[9px] gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Confidential</span>
                </Badge>
              )}
              {doc.exhibitNumber && (
                <Badge variant="amber" className="text-[9px] font-mono">
                  {doc.exhibitNumber}
                </Badge>
              )}
            </div>

            {/* Relation Info */}
            <div className="p-2 rounded-xl bg-muted/30 border border-border/40 text-[11px] space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {isCase ? "Case Reference" : "Client Reference"}
                </span>
                <span className="font-semibold text-foreground truncate max-w-[140px]">
                  {isCase
                    ? doc.caseDetails?.caseNumber || "Case Dossier"
                    : doc.clientDetails?.clientNumber || "Client File"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground truncate">
                {isCase ? doc.caseDetails?.title : doc.clientDetails?.name}
              </p>
            </div>

            {/* Footer: Date & File Specs */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(doc.documentDate || doc.createdAt)}</span>
              </span>
              <span className="font-mono">{formatSize(doc.sizeBytes)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DocumentCardView;
