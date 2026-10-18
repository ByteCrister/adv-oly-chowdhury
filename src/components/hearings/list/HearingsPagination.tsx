"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HEARING_PAGE_LIMITS, type HearingPageLimit } from "@/const/hearing.const";

export interface HearingsPaginationProps {
  page: number;
  limit: HearingPageLimit;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: HearingPageLimit) => void;
  isLoading?: boolean;
}

export function HearingsPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  isLoading = false,
}: HearingsPaginationProps) {
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 pb-1 border-t border-border/40 text-xs">
      {/* Record info & Page limit selector */}
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>
          Showing <strong className="text-foreground">{startRecord}</strong>–
          <strong className="text-foreground">{endRecord}</strong> of{" "}
          <strong className="text-foreground">{total}</strong> hearings
        </span>

        <span className="text-border">|</span>

        <div className="flex items-center gap-1.5">
          <span>Rows:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value) as HearingPageLimit)}
            disabled={isLoading}
            className="h-8 rounded-lg border border-input bg-background/80 dark:bg-card/60 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
          >
            {HEARING_PAGE_LIMITS.map((lim) => (
              <option key={lim} value={lim}>
                {lim}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1 self-center sm:self-auto">
        {/* First Page */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || isLoading}
          className="h-8 w-8 p-0 rounded-lg text-muted-foreground disabled:opacity-30"
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Previous Page */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="h-8 w-8 p-0 rounded-lg text-muted-foreground disabled:opacity-30"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Page Number Chips */}
        <div className="flex items-center gap-1 px-1">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-muted-foreground">
                  ...
                </span>
              );
            }

            const isCurrent = p === page;
            return (
              <Button
                key={p}
                type="button"
                variant={isCurrent ? "gold" : "ghost"}
                size="sm"
                onClick={() => onPageChange(p as number)}
                disabled={isLoading}
                className={`h-8 w-8 p-0 rounded-lg font-semibold text-xs ${
                  isCurrent ? "shadow-xs" : "text-muted-foreground hover:text-foreground"
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
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="h-8 w-8 p-0 rounded-lg text-muted-foreground disabled:opacity-30"
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        {/* Last Page */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || isLoading}
          className="h-8 w-8 p-0 rounded-lg text-muted-foreground disabled:opacity-30"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default HearingsPagination;
