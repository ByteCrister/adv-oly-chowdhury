"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CaseDetailDto } from "@/types/case.types";

export interface CaseDocumentsHeaderProps {
  caseData: CaseDetailDto;
  totalDocuments: number;
  onUploadClick: () => void;
  onRefresh?: () => void;
  isFetching?: boolean;
}

export function CaseDocumentsHeader({
  caseData,
  totalDocuments,
  onUploadClick,
  onRefresh,
  isFetching = false,
}: CaseDocumentsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/cases/${caseData.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Case Dossier</span>
          </Link>
          <span className="text-border">/</span>
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/25">
            {caseData.caseNumber || caseData.internalReference}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
            Case Document Vault
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/30 shrink-0">
            {totalDocuments} {totalDocuments === 1 ? "File" : "Files"}
          </span>
        </div>

        <p className="text-xs text-muted-foreground truncate max-w-2xl">
          Matter: <span className="font-medium text-foreground">{caseData.title}</span> • Client:{" "}
          <span className="font-medium text-foreground">{caseData.client?.name || "Unassigned"}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
        {onRefresh && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="rounded-xl text-xs gap-1.5 border-border/70 text-muted-foreground hover:text-foreground"
            title="Refresh documents list"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-gold-500" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        )}

        <Button
          type="button"
          variant="gold"
          size="sm"
          onClick={onUploadClick}
          className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Document</span>
        </Button>
      </div>
    </div>
  );
}

export default CaseDocumentsHeader;
