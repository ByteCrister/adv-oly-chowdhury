"use client";

import * as React from "react";
import { Search, X, RotateCcw, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CLIENT_DOCUMENT_TYPE_LIST,
  CLIENT_DOCUMENT_TYPE_LABELS,
  CLIENT_DOCUMENT_SORT_OPTIONS,
  ClientDocumentType,
  ClientDocumentSortOption,
} from "@/const/client-document.const";
import { useClientDocumentStore } from "@/store/useClientDocumentStore";
import { useDebounceCallback } from "@/hooks/ui/useDebounce";

const DOCUMENT_SORT_LABELS: Record<string, string> = {
  [CLIENT_DOCUMENT_SORT_OPTIONS.NEWEST]: "Newest Upload",
  [CLIENT_DOCUMENT_SORT_OPTIONS.OLDEST]: "Oldest Upload",
  [CLIENT_DOCUMENT_SORT_OPTIONS.TITLE_ASC]: "Title (A - Z)",
  [CLIENT_DOCUMENT_SORT_OPTIONS.TITLE_DESC]: "Title (Z - A)",
  [CLIENT_DOCUMENT_SORT_OPTIONS.EXPIRY_ASC]: "Expiry (Earliest First)",
  [CLIENT_DOCUMENT_SORT_OPTIONS.EXPIRY_DESC]: "Expiry (Latest First)",
};

export function ClientDocumentsToolbar() {
  const search = useClientDocumentStore((s) => s.search);
  const documentType = useClientDocumentStore((s) => s.documentType);
  const sort = useClientDocumentStore((s) => s.sort);
  const startDate = useClientDocumentStore((s) => s.startDate);
  const endDate = useClientDocumentStore((s) => s.endDate);

  const setSearch = useClientDocumentStore((s) => s.setSearch);
  const setDocumentType = useClientDocumentStore((s) => s.setDocumentType);
  const setSort = useClientDocumentStore((s) => s.setSort);
  const setDateRange = useClientDocumentStore((s) => s.setDateRange);
  const resetFilters = useClientDocumentStore((s) => s.resetFilters);

  // Local debounced search
  const [prevSearch, setPrevSearch] = React.useState(search);
  const [localSearch, setLocalSearch] = React.useState(search);

  // Sync external reset with local input during render
  if (search !== prevSearch) {
    setPrevSearch(search);
    setLocalSearch(search);
  }

  // Debounced search setter to avoid flooding API requests on keystrokes
  const debouncedSetSearch = useDebounceCallback((value: string) => {
    setSearch(value);
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearch(value);
    debouncedSetSearch(value);
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    debouncedSetSearch.clear();
    setSearch("");
  };

  const handleResetFilters = () => {
    setLocalSearch("");
    debouncedSetSearch.clear();
    resetFilters();
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    documentType !== "ALL" ||
    startDate !== null ||
    endDate !== null ||
    sort !== CLIENT_DOCUMENT_SORT_OPTIONS.NEWEST;

  return (
    <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
          <Input
            value={localSearch}
            onChange={handleSearchChange}
            placeholder="Search by title, original file name, or notes..."
            className="pl-9 pr-8 h-10 rounded-xl"
          />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Document Type Filter */}
          <div className="flex items-center gap-1.5">
            <select
              value={documentType}
              onChange={(e) =>
                setDocumentType(e.target.value as ClientDocumentType | "ALL")
              }
              className="h-9 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
            >
              <option value="ALL">All Document Types</option>
              {CLIENT_DOCUMENT_TYPE_LIST.map((type) => (
                <option key={type} value={type}>
                  {CLIENT_DOCUMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as ClientDocumentSortOption)
              }
              className="h-9 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
            >
              {Object.entries(CLIENT_DOCUMENT_SORT_OPTIONS).map(([key, val]) => (
                <option key={key} value={val}>
                  {DOCUMENT_SORT_LABELS[val] || key}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-background/80 dark:bg-card/60 border border-input rounded-xl px-2.5 h-9 text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="date"
              value={startDate || ""}
              onChange={(e) => setDateRange(e.target.value || null, endDate)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer w-24"
              title="Filter from document date"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={endDate || ""}
              onChange={(e) => setDateRange(startDate, e.target.value || null)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer w-24"
              title="Filter to document date"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 rounded-xl text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
