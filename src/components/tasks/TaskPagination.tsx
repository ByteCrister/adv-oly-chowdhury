"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TASK_PAGE_LIMITS, TaskPageLimit } from "@/const/task.const";

export interface TaskPaginationProps {
  page: number;
  limit: TaskPageLimit;
  total: number;
  totalPages: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: TaskPageLimit) => void;
  isFetching?: boolean;
}

export function TaskPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  isFetching = false,
}: TaskPaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3">
      {/* Range text & limit selector */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground order-2 sm:order-1">
        <span>
          Showing <strong className="text-foreground font-mono">{start}</strong> to{" "}
          <strong className="text-foreground font-mono">{end}</strong> of{" "}
          <strong className="text-foreground font-mono">{total}</strong> chamber tasks
        </span>

        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-border/60">
          <span className="text-[11px]">Show</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value, 10) as TaskPageLimit)}
            disabled={isFetching}
            className="h-7 px-2 text-xs rounded-lg bg-card/70 border border-border/70 dark:border-white/10 text-foreground font-mono focus:outline-none"
          >
            {TASK_PAGE_LIMITS.map((sz) => (
              <option key={sz} value={sz}>
                {sz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page navigation buttons */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isFetching}
          className="h-8 px-2.5 rounded-lg text-xs gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">
                  …
                </span>
              );
            }
            const isCurrent = p === page;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p as number)}
                disabled={isFetching || isCurrent}
                className={`min-w-8 h-8 px-2 rounded-lg text-xs font-mono font-medium transition-all ${
                  isCurrent
                    ? "bg-gold-500 text-midnight-950 font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isFetching}
          className="h-8 px-2.5 rounded-lg text-xs gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default TaskPagination;
