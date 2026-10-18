"use client";

import * as React from "react";
import {
  Search,
  X,
  Filter,
  ArrowUpDown,
  FileText,
  Briefcase,
  Users,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DOCUMENT_SCOPES,
  DOCUMENT_SORT_OPTIONS,
  DOCUMENT_PAGE_LIMITS,
  DocumentScope,
  DocumentSortOption,
  DocumentPageLimit,
} from "@/const/document.const";
import {
  CASE_DOCUMENT_TYPE_LIST,
  CASE_DOCUMENT_TYPE_LABELS,
} from "@/const/case-document.const";
import {
  CLIENT_DOCUMENT_TYPE_LIST,
  CLIENT_DOCUMENT_TYPE_LABELS,
} from "@/const/client-document.const";
import type { DocumentStatsDto } from "@/types/document.types";

export interface DocumentToolbarProps {
  scope: DocumentScope;
  onScopeChange: (scope: DocumentScope) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  documentType: string;
  onDocumentTypeChange: (value: string) => void;
  sort: DocumentSortOption;
  onSortChange: (sort: DocumentSortOption) => void;
  limit: DocumentPageLimit;
  onLimitChange: (limit: DocumentPageLimit) => void;
  isConfidential?: boolean;
  onConfidentialChange?: (val?: boolean) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  stats?: DocumentStatsDto;
}

export function DocumentToolbar({
  scope,
  onScopeChange,
  searchTerm,
  onSearchChange,
  documentType,
  onDocumentTypeChange,
  sort,
  onSortChange,
  limit,
  onLimitChange,
  isConfidential,
  onConfidentialChange,
  onResetFilters,
  hasActiveFilters,
  stats,
}: DocumentToolbarProps) {
  // Collect document types based on active scope
  const availableDocTypes = React.useMemo(() => {
    if (scope === DOCUMENT_SCOPES.CASE) {
      return CASE_DOCUMENT_TYPE_LIST.map((type) => ({
        value: type,
        label: CASE_DOCUMENT_TYPE_LABELS[type] || type,
      }));
    }
    if (scope === DOCUMENT_SCOPES.CLIENT) {
      return CLIENT_DOCUMENT_TYPE_LIST.map((type) => ({
        value: type,
        label: CLIENT_DOCUMENT_TYPE_LABELS[type] || type,
      }));
    }
    // ALL scope: combine with entity indicators
    return [
      ...CASE_DOCUMENT_TYPE_LIST.map((type) => ({
        value: type,
        label: `Case: ${CASE_DOCUMENT_TYPE_LABELS[type] || type}`,
      })),
      ...CLIENT_DOCUMENT_TYPE_LIST.map((type) => ({
        value: type,
        label: `Client: ${CLIENT_DOCUMENT_TYPE_LABELS[type] || type}`,
      })),
    ];
  }, [scope]);

  return (
    <div className="space-y-3.5">
      {/* Top Bar: Scope Segmented Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Scope Tabs / Segmented Control */}
        <div className="inline-flex p-1 rounded-xl bg-muted/50 dark:bg-white/[0.04] border border-border/70 dark:border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onScopeChange(DOCUMENT_SCOPES.ALL)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              scope === DOCUMENT_SCOPES.ALL
                ? "bg-card text-foreground shadow-sm border border-border/60 dark:border-white/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Documents</span>
            {stats && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
                {stats.totalActive}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onScopeChange(DOCUMENT_SCOPES.CASE)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              scope === DOCUMENT_SCOPES.CASE
                ? "bg-card text-foreground shadow-sm border border-border/60 dark:border-white/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-500" />
            <span>Case Documents</span>
            {stats && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
                {stats.activeCaseDocs}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onScopeChange(DOCUMENT_SCOPES.CLIENT)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              scope === DOCUMENT_SCOPES.CLIENT
                ? "bg-card text-foreground shadow-sm border border-border/60 dark:border-white/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span>Client Documents</span>
            {stats && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
                {stats.activeClientDocs}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, exhibit, case, client..."
            className="pl-9 pr-8 h-9 text-xs rounded-xl bg-card/60 backdrop-blur-md border-border/70 dark:border-white/10 placeholder:text-muted-foreground/60"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Row: Category Filter, Confidential Toggle, Sorting & Limit */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Document Type Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0 hidden sm:block" />
            <select
              value={documentType}
              onChange={(e) => onDocumentTypeChange(e.target.value)}
              className="h-8.5 px-2.5 py-1 text-xs rounded-xl bg-card/70 border border-border/70 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            >
              <option value="ALL">All Categories</option>
              {availableDocTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Confidential filter (only visible for case or all scope) */}
          {scope !== DOCUMENT_SCOPES.CLIENT && onConfidentialChange && (
            <button
              type="button"
              onClick={() => onConfidentialChange(isConfidential === true ? undefined : true)}
              className={`h-8.5 px-3 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                isConfidential === true
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                  : "bg-card/70 text-muted-foreground border-border/70 dark:border-white/10 hover:text-foreground"
              }`}
            >
              <span>Confidential Only</span>
            </button>
          )}

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-8.5 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Right side: Sort and Page Size selector */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Sorting Control */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as DocumentSortOption)}
              className="h-8.5 px-2.5 py-1 text-xs rounded-xl bg-card/70 border border-border/70 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            >
              <option value={DOCUMENT_SORT_OPTIONS.NEWEST}>Newest Uploads</option>
              <option value={DOCUMENT_SORT_OPTIONS.OLDEST}>Oldest Uploads</option>
              <option value={DOCUMENT_SORT_OPTIONS.DATE_DESC}>Document Date (Newest)</option>
              <option value={DOCUMENT_SORT_OPTIONS.DATE_ASC}>Document Date (Oldest)</option>
              <option value={DOCUMENT_SORT_OPTIONS.TITLE_ASC}>Title (A to Z)</option>
              <option value={DOCUMENT_SORT_OPTIONS.TITLE_DESC}>Title (Z to A)</option>
            </select>
          </div>

          {/* Page Size Selector */}
          <select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value, 10) as DocumentPageLimit)}
            className="h-8.5 px-2 py-1 text-xs rounded-xl bg-card/70 border border-border/70 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40 font-mono"
            title="Page Size"
          >
            {DOCUMENT_PAGE_LIMITS.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default DocumentToolbar;
