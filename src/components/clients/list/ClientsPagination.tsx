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
  CLIENT_PAGE_LIMITS,
  ClientPageLimit,
} from "@/const/client.const";
import { cn } from "@/lib/utils";

export interface ClientsPaginationProps {
  page: number;
  limit: ClientPageLimit;
  total: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: ClientPageLimit) => void;
  className?: string;
}

export function ClientsPagination({
  page,
  limit,
  total,
  totalPages,
  isLoading = false,
  onPageChange,
  onLimitChange,
  className,
}: ClientsPaginationProps) {
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Generate pagination page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push("...");
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-card/60 backdrop-blur-md rounded-2xl border border-border/70 dark:border-white/10 shadow-sm",
        className
      )}
    >
      {/* Showing entries info & Page limit selector */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-1.5">
          <span>Showing</span>
          <span className="font-semibold text-foreground">
            {total > 0 ? `${startItem}-${endItem}` : "0"}
          </span>
          <span>of</span>
          <span className="font-semibold text-foreground">{total}</span>
          <span>clients</span>
        </div>

        <div className="flex items-center gap-2 pl-2 sm:border-l border-border/60">
          <label htmlFor="clients-per-page" className="sr-only">
            Clients per page
          </label>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">Per page:</span>
          <select
            id="clients-per-page"
            aria-label="Clients per page"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value) as ClientPageLimit)}
            disabled={isLoading}
            className="h-8 rounded-lg bg-background/80 dark:bg-card/80 border border-input px-2 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-gold-500/50 cursor-pointer disabled:opacity-50 transition-colors"
          >
            {CLIENT_PAGE_LIMITS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center gap-1.5 self-center sm:self-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || isLoading}
          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground border-border/70 disabled:opacity-30"
          title="First Page"
        >
          <ChevronsLeft className="h-4 w-4" />
          <span className="sr-only">First Page</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground border-border/70 disabled:opacity-30"
          title="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous Page</span>
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-1 text-xs text-muted-foreground select-none"
                >
                  …
                </span>
              );
            }

            const pageNum = p as number;
            const isCurrent = pageNum === page;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition-all select-none cursor-pointer",
                  isCurrent
                    ? "bg-gold-500 text-midnight-950 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-transparent hover:border-border/60"
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground border-border/70 disabled:opacity-30"
          title="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next Page</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || isLoading}
          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground border-border/70 disabled:opacity-30"
          title="Last Page"
        >
          <ChevronsRight className="h-4 w-4" />
          <span className="sr-only">Last Page</span>
        </Button>
      </div>
    </div>
  );
}
