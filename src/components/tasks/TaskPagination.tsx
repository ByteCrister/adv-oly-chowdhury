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
    <div className="relative overflow-hidden p-3.5 sm:px-5 sm:py-3.5 rounded-2xl bg-white/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
      {/* Specular hairline top sheen */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gold-400/30 to-transparent pointer-events-none" />

      {/* Range text & limit selector */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground order-2 sm:order-1 font-mono">
        <span>
          Showing <strong className="text-foreground">{start}</strong>–<strong className="text-foreground">{end}</strong> of{" "}
          <strong className="text-foreground">{total}</strong> chamber tasks
        </span>

        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border/70 dark:border-white/10">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold">Show</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(parseInt(e.target.value, 10) as TaskPageLimit)}
            disabled={isFetching}
            className="h-7.5 px-2.5 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-gold-500/40 shadow-2xs transition-all"
          >
            {TASK_PAGE_LIMITS.map((sz) => (
              <option key={sz} value={sz}>
                {sz} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Page navigation buttons */}
      <div className="flex items-center gap-1.5 order-1 sm:order-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isFetching}
          className="h-8.5 px-3 rounded-xl text-xs gap-1 border-border/80 dark:border-white/10 hover:border-gold-500/30 disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">Prev</span>
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground font-mono">
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
                className={`min-w-8.5 h-8.5 px-2.5 rounded-xl text-xs font-mono transition-all duration-200 select-none ${
                  isCurrent
                    ? "bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 text-midnight-950 font-bold shadow-xs shadow-gold-500/30 scale-105"
                    : "border border-border/70 dark:border-white/10 bg-white/50 dark:bg-card/40 text-muted-foreground hover:text-foreground hover:border-gold-500/40 font-medium"
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
          className="h-8.5 px-3 rounded-xl text-xs gap-1 border-border/80 dark:border-white/10 hover:border-gold-500/30 disabled:opacity-40"
        >
          <span className="hidden sm:inline font-medium">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default TaskPagination;
