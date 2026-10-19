"use client";

import * as React from "react";
import {
  History,
  Calendar,
  ArrowUpDown,
  Filter,
  RefreshCw,
  AlertCircle,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AUDIT_ACTION_LIST,
  AUDIT_ACTION_LABELS,
  AUDIT_SORT_OPTIONS,
  AUDIT_DEFAULT_PAGE_LIMIT,
  AuditAction,
  AuditPageLimit,
  AuditSortOption,
} from "@/const/audit-log.const";
import { useAuditHistory } from "@/hooks/profile/queries/useAuditHistory";
import { AuditHistoryItem } from "./AuditHistoryItem";
import { AuditHistoryPagination } from "./AuditHistoryPagination";
import { StaggerContainer, StaggerItem } from "@/components/wrappers/Motion";
import { cn } from "@/lib/utils";

export interface AuditHistorySectionProps {
  className?: string;
}

export function AuditHistorySection({ className }: AuditHistorySectionProps) {
  // Filter & pagination states
  const [action, setAction] = React.useState<AuditAction | "ALL">("ALL");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [sort, setSort] = React.useState<AuditSortOption>(AUDIT_SORT_OPTIONS.NEWEST);
  const [page, setPage] = React.useState<number>(1);
  const [limit, setLimit] = React.useState<AuditPageLimit>(AUDIT_DEFAULT_PAGE_LIMIT);

  // TanStack Query for server-side filtered & paginated user audit history
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useAuditHistory({
    action: action === "ALL" ? undefined : action,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sort,
    page,
    limit,
  });

  // Handle filter changes and reset pagination to page 1
  const handleActionChange = React.useCallback((newAction: AuditAction | "ALL") => {
    setAction(newAction);
    setPage(1);
  }, []);

  const handleStartDateChange = React.useCallback((val: string) => {
    setStartDate(val);
    setPage(1);
  }, []);

  const handleEndDateChange = React.useCallback((val: string) => {
    setEndDate(val);
    setPage(1);
  }, []);

  const handleClearDateFilter = React.useCallback(() => {
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, []);

  const handleSortChange = React.useCallback((newSort: AuditSortOption) => {
    setSort(newSort);
    setPage(1);
  }, []);

  const handleLimitChange = React.useCallback((newLimit: AuditPageLimit) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handlePageChange = React.useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleResetAllFilters = React.useCallback(() => {
    setAction("ALL");
    setStartDate("");
    setEndDate("");
    setSort(AUDIT_SORT_OPTIONS.NEWEST);
    setPage(1);
  }, []);

  const hasActiveFilters = action !== "ALL" || Boolean(startDate) || Boolean(endDate);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <section
      aria-labelledby="audit-history-heading"
      className={cn(
        "p-6 sm:p-8 rounded-3xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-6",
        className
      )}
    >
      {/* ── 1. Section Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-600 dark:text-gold-400">
              <History className="w-4 h-4" />
            </div>
            <h2
              id="audit-history-heading"
              className="font-serif text-lg sm:text-xl font-bold text-foreground"
            >
              Audit History & Compliance Activity
            </h2>
          </div>
          <p className="text-xs text-muted-foreground pl-10">
            Immutable timeline of account updates, profile modifications, and security actions.
          </p>
        </div>

        <div className="flex items-center gap-2 pl-10 sm:pl-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-muted/40 text-muted-foreground border border-border/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Strict User Scoped</span>
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-8 rounded-xl text-xs gap-1.5 border-border/70 hover:bg-gold-500/10 hover:border-gold-500/40"
            title="Refresh audit history"
            aria-label="Refresh audit history"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isRefetching && "animate-spin text-gold-500")}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Focused Filter Controls (Action, Date, Sorting) ───── */}
      <div className="p-4 rounded-2xl bg-muted/30 dark:bg-card/30 border border-border/60 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Control 1: Action-Type Filter (Col span 4) */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-1">
            <label
              htmlFor="audit-action-filter"
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
            >
              <Filter className="w-3 h-3 text-gold-500" />
              <span>Action Type</span>
            </label>
            <select
              id="audit-action-filter"
              value={action}
              onChange={(e) => handleActionChange(e.target.value as AuditAction | "ALL")}
              className="h-9 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
            >
              <option value="ALL">All Actions ({AUDIT_ACTION_LIST.length})</option>
              {AUDIT_ACTION_LIST.map((act) => (
                <option key={act} value={act}>
                  {AUDIT_ACTION_LABELS[act] || act}
                </option>
              ))}
            </select>
          </div>

          {/* Control 2: Date Filter (Col span 5: From & To inputs) */}
          <div className="sm:col-span-2 lg:col-span-5 space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="audit-filter-start-date"
                className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
              >
                <Calendar className="w-3 h-3 text-gold-500" />
                <span>Date Range</span>
              </label>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={handleClearDateFilter}
                  className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 cursor-pointer"
                  title="Clear date filter"
                >
                  <X className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="audit-filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                placeholder="From"
                className="h-9 text-xs rounded-xl bg-background/80 dark:bg-card/60"
                aria-label="Filter from date"
              />
              <Input
                id="audit-filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                placeholder="To"
                className="h-9 text-xs rounded-xl bg-background/80 dark:bg-card/60"
                aria-label="Filter to date"
              />
            </div>
          </div>

          {/* Control 3: Sorting (Col span 3) */}
          <div className="sm:col-span-2 lg:col-span-3 space-y-1">
            <label
              htmlFor="audit-sort-select"
              className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"
            >
              <ArrowUpDown className="w-3 h-3 text-gold-500" />
              <span>Sorting</span>
            </label>
            <select
              id="audit-sort-select"
              value={sort}
              onChange={(e) => handleSortChange(e.target.value as AuditSortOption)}
              className="h-9 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
            >
              <option value={AUDIT_SORT_OPTIONS.NEWEST}>Timestamp (Newest First)</option>
              <option value={AUDIT_SORT_OPTIONS.OLDEST}>Timestamp (Oldest First)</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips & Reset All */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 text-xs">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active Filters:
            </span>

            {action !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/25 text-[11px]">
                <span>Action: {AUDIT_ACTION_LABELS[action] || action}</span>
                <button
                  type="button"
                  onClick={() => handleActionChange("ALL")}
                  className="hover:text-destructive p-0.5 cursor-pointer"
                  aria-label="Remove action filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/25 text-[11px]">
                <span>
                  Date: {startDate || "Earliest"} → {endDate || "Latest"}
                </span>
                <button
                  type="button"
                  onClick={handleClearDateFilter}
                  className="hover:text-destructive p-0.5 cursor-pointer"
                  aria-label="Remove date filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetAllFilters}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1 ml-auto"
            >
              <span>Reset All</span>
            </Button>
          </div>
        )}
      </div>

      {/* ── 3. Content Area: Loading / Error / Empty / Feed ────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-4 rounded-2xl bg-card/40 border border-border/60 space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <div className="flex items-center gap-4 pt-2 border-t border-border/40">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="h-3 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 rounded-2xl bg-destructive/5 border border-destructive/20 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-foreground">
              Unable to Retrieve Audit Records
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {error?.message ||
                "Failed to fetch your audit logs from the server. Please verify your connection and session."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="p-10 rounded-2xl bg-muted/20 border border-border/60 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground mx-auto">
            <History className="w-6 h-6 text-muted-foreground/60" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm text-foreground">No Audit Logs Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {hasActiveFilters
                ? "No audit events match your selected action type or date range. Try clearing your filters."
                : "You do not have any recorded audit events yet. Changes to your profile or password will appear here."}
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetAllFilters}
              className="rounded-xl text-xs gap-1.5"
            >
              <span>Clear Filter Criteria</span>
            </Button>
          )}
        </div>
      ) : (
        <StaggerContainer
          delay={0.02}
          staggerDelay={0.03}
          viewport={{ once: true, margin: "0px" }}
          className="space-y-3"
        >
          {items.map((log) => (
            <StaggerItem key={log.id} yOffset={6}>
              <AuditHistoryItem item={log} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {/* ── 4. Pagination Controls ───────────────────────────────── */}
      {!isLoading && !isError && total > 0 && (
        <AuditHistoryPagination
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          isLoading={isLoading || isRefetching}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}
    </section>
  );
}

export default AuditHistorySection;
