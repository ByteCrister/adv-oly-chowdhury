"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FINANCIAL_PAGE_LIMITS,
  FinancialPageLimit,
} from "@/const/financial.const";
import { cn } from "@/lib/utils";

export interface FinancialsPaginationProps {
  page: number;
  limit: FinancialPageLimit;
  total: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: FinancialPageLimit) => void;
  className?: string;
}

export function FinancialsPagination({
  page,
  limit,
  total,
  totalPages,
  isLoading = false,
  onPageChange,
  onLimitChange,
  className,
}: FinancialsPaginationProps) {
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) pages.push("...");
      if (totalPages > 1) pages.push(totalPages);
    }

    return pages;
  };

  if (total === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 text-xs text-muted-foreground",
        className
      )}
    >
      {/* Items Count & Page Size Selector */}
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-semibold text-foreground">{startItem}</span> to{" "}
          <span className="font-semibold text-foreground">{endItem}</span> of{" "}
          <span className="font-semibold text-foreground">{total}</span> records
        </span>

        <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
          <span>Rows:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value) as FinancialPageLimit)}
            disabled={isLoading}
            className="h-8 rounded-lg border border-input bg-card/60 backdrop-blur-md px-2 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-gold-500/40 cursor-pointer"
          >
            {FINANCIAL_PAGE_LIMITS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || isLoading}
          className="h-8 w-8 p-0 rounded-lg"
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
          className="h-8 w-8 p-0 rounded-lg"
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Numeric Page Buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((pageNum, idx) => {
            if (pageNum === "...") {
              return (
                <span key={`dots-${idx}`} className="px-1 text-muted-foreground">
                  ...
                </span>
              );
            }

            const isCurrent = pageNum === page;
            return (
              <Button
                key={`page-${pageNum}`}
                type="button"
                variant={isCurrent ? "gold" : "outline"}
                size="sm"
                onClick={() => onPageChange(Number(pageNum))}
                disabled={isLoading}
                className={cn(
                  "h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold",
                  isCurrent && "shadow-sm pointer-events-none"
                )}
              >
                {pageNum}
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
          className="h-8 w-8 p-0 rounded-lg"
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
          className="h-8 w-8 p-0 rounded-lg"
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default FinancialsPagination;
