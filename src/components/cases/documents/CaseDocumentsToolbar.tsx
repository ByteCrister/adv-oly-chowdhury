"use client";

import * as React from "react";
import { Search, X, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CASE_DOCUMENT_TYPE_LIST,
  CASE_DOCUMENT_TYPE_LABELS,
  CASE_DOCUMENT_PAGE_LIMITS,
  CaseDocumentType,
  CaseDocumentSortOption,
  CaseDocumentPageLimit,
} from "@/const/case-document.const";

export interface CaseDocumentsToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  documentType: CaseDocumentType | "ALL";
  onDocumentTypeChange: (type: CaseDocumentType | "ALL") => void;
  isConfidential: boolean | undefined;
  onConfidentialChange: (confidential: boolean | undefined) => void;
  sort: CaseDocumentSortOption;
  onSortChange: (sort: CaseDocumentSortOption) => void;
  limit: CaseDocumentPageLimit;
  onLimitChange: (limit: CaseDocumentPageLimit) => void;
  onReset: () => void;
  isFiltered: boolean;
}

export function CaseDocumentsToolbar({
  search,
  onSearchChange,
  documentType,
  onDocumentTypeChange,
  isConfidential,
  onConfidentialChange,
  sort,
  onSortChange,
  limit,
  onLimitChange,
  onReset,
  isFiltered,
}: CaseDocumentsToolbarProps) {
  return (
    <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3 sm:p-4 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents by title, exhibit number, or description..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 rounded-xl text-xs bg-background/50 border-border/70 focus-visible:ring-gold-500/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Document Type Dropdown */}
        <div className="w-full md:w-48">
          <select
            value={documentType}
            onChange={(e) => onDocumentTypeChange(e.target.value as CaseDocumentType | "ALL")}
            className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          >
            <option value="ALL">All Document Types</option>
            {CASE_DOCUMENT_TYPE_LIST.map((t) => (
              <option key={t} value={t}>
                {CASE_DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Confidentiality Filter */}
        <div className="w-full md:w-36">
          <select
            value={
              isConfidential === undefined
                ? "ALL"
                : isConfidential
                ? "CONFIDENTIAL"
                : "PUBLIC"
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === "ALL") onConfidentialChange(undefined);
              else if (val === "CONFIDENTIAL") onConfidentialChange(true);
              else onConfidentialChange(false);
            }}
            className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          >
            <option value="ALL">All Visibility</option>
            <option value="CONFIDENTIAL">Confidential Only</option>
            <option value="PUBLIC">Public Only</option>
          </select>
        </div>

        {/* Sort Selector */}
        <div className="w-full md:w-44">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as CaseDocumentSortOption)}
            className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          >
            <option value="newest">Uploaded (Newest)</option>
            <option value="oldest">Uploaded (Oldest)</option>
            <option value="date_desc">Doc Date (Newest)</option>
            <option value="date_asc">Doc Date (Oldest)</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
          </select>
        </div>

        {/* Page Limit Selector */}
        <div className="w-full md:w-28">
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value) as CaseDocumentPageLimit)}
            className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          >
            {CASE_DOCUMENT_PAGE_LIMITS.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export default CaseDocumentsToolbar;
