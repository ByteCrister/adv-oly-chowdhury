"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CASE_PAGE_LIMITS, type CasePageLimit } from "@/const/case.const";

export interface CasesPaginationProps {
  page: number;
  limit: CasePageLimit;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: CasePageLimit) => void;
  isLoading?: boolean;
}

export function CasesPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  isLoading = false,
}: CasesPaginationProps) {
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 border-t border-border/40">
      {/* Record info & page size */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground order-2 sm:order-1">
        <span>
          Showing <span className="font-semibold text-foreground">{startRecord}</span> to{" "}
          <span className="font-semibold text-foreground">{endRecord}</span> of{" "}
          <span className="font-semibold text-foreground">{total}</span> cases
        </span>

        <span className="text-border">•</span>

        <div className="flex items-center gap-1.5">
          <label htmlFor="case-page-size" className="text-[11px]">
            Rows:
          </label>
          <select
            id="case-page-size"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value) as CasePageLimit)}
            disabled={isLoading}
            className="h-7 rounded-lg text-[11px] bg-background border border-border/70 px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
          >
            {CASE_PAGE_LIMITS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || isLoading}
          className="h-8 w-8 rounded-lg border-border/70 text-muted-foreground hover:text-foreground"
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="h-8 w-8 rounded-lg border-border/70 text-muted-foreground hover:text-foreground"
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-xs text-muted-foreground select-none"
                >
                  ...
                </span>
              );
            }

            const isCurrent = p === page;
            return (
              <Button
                key={`page-${p}`}
                type="button"
                variant={isCurrent ? "gold" : "outline"}
                size="sm"
                onClick={() => onPageChange(p)}
                disabled={isLoading}
                className={`h-8 w-8 p-0 text-xs rounded-lg ${
                  isCurrent
                    ? "font-bold shadow-xs"
                    : "border-border/70 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </Button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="h-8 w-8 rounded-lg border-border/70 text-muted-foreground hover:text-foreground"
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || isLoading}
          className="h-8 w-8 rounded-lg border-border/70 text-muted-foreground hover:text-foreground"
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
