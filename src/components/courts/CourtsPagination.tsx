"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COURT_PAGE_LIMITS, CourtPageLimit } from "@/const/court.const";

export interface CourtsPaginationProps {
  page: number;
  limit: CourtPageLimit;
  total: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: CourtPageLimit) => void;
  isLoading?: boolean;
}

export function CourtsPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  isLoading = false,
}: CourtsPaginationProps) {
  // Generate page numbers to display (window of pages around current page)
  const pageNumbers = React.useMemo(() => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) pages.push("...");

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) pages.push("...");

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [page, totalPages]);

  if (total === 0) return null;

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card/85 dark:bg-card/60 border border-border/70 dark:border-white/10 shadow-sm text-xs">
      {/* 1. Records Summary & Page Limit Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-muted-foreground font-medium">
          Showing{" "}
          <strong className="text-foreground font-semibold">
            {startRecord}–{endRecord}
          </strong>{" "}
          of <strong className="text-foreground font-semibold">{total}</strong> courts
        </span>

        <div className="flex items-center gap-1.5 pl-2 sm:border-l border-border/60">
          <span className="text-muted-foreground text-[11px]">Per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value) as CourtPageLimit)}
            disabled={isLoading}
            className="h-8 rounded-lg border border-input bg-background/80 dark:bg-card/60 px-2 py-0.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 cursor-pointer font-medium"
          >
            {COURT_PAGE_LIMITS.map((lim) => (
              <option key={lim} value={lim}>
                {lim}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Page Navigation Buttons */}
      <div className="flex items-center gap-1 self-center sm:self-auto">
        {/* First Page */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || isLoading}
          className="h-8 w-8 rounded-lg"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Previous Page */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="h-8 w-8 rounded-lg"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-muted-foreground select-none"
                >
                  …
                </span>
              );
            }

            const isActive = p === page;
            return (
              <Button
                key={`page-${p}`}
                type="button"
                variant={isActive ? "gold" : "outline"}
                size="icon"
                onClick={() => onPageChange(p as number)}
                disabled={isLoading}
                className={`h-8 w-8 rounded-lg text-xs font-semibold ${
                  isActive
                    ? "shadow-sm shadow-gold-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </Button>
            );
          })}
        </div>

        {/* Next Page */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="h-8 w-8 rounded-lg"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        {/* Last Page */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || isLoading}
          className="h-8 w-8 rounded-lg"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default CourtsPagination;
