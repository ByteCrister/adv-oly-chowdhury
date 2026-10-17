"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientDocumentTypeBadge } from "@/components/clients/shared/ClientBadges";
import type { ClientDocumentSummaryDto } from "@/types/client.types";

export interface ClientRecentDocsCardProps {
  documents: ClientDocumentSummaryDto[];
  clientId: string;
}

export function ClientRecentDocsCard({ documents, clientId }: ClientRecentDocsCardProps) {
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Document Vault Records
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Deeds, authorizations, powers of attorney, and evidentiary files.
            </p>
          </div>
        </div>

        <Link href={`/dashboard/clients/${clientId}/documents`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 h-8 border-border/80 text-foreground hover:bg-gold-500/10 hover:border-gold-500/40"
          >
            <span>Manage Documents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            No documents have been uploaded for this client yet.
          </p>
          <Link href={`/dashboard/clients/${clientId}/documents`}>
            <Button type="button" variant="gold" size="sm" className="rounded-xl text-xs mt-2">
              Upload First Document
            </Button>
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 first:pt-0 last:pb-0"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {doc.title}
                  </span>
                  <ClientDocumentTypeBadge type={doc.documentType} />
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{formatSize(doc.fileSize)}</span>
                  <span>•</span>
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  {doc.expiryDate && (
                    <>
                      <span>•</span>
                      <span className="text-amber-500 font-medium">
                        Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {doc.fileUrl && (
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-border/80 hover:bg-muted text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-gold-500" />
                    <span>View File</span>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
