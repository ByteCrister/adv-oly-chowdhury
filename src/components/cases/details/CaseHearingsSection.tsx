"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Gavel,
  Calendar,
  Clock,
  Building2,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberCounter } from "@/components/shared/number-counter";
import { useCaseHearings } from "@/hooks/cases";
import { useDebounce } from "@/hooks/ui";
import {
  HEARING_STATUS_BADGE_VARIANTS,
  HEARING_PAGE_LIMITS,
  HEARING_SORT_OPTIONS,
  HearingPageLimit,
  HearingSortOption,
} from "@/const/hearing.const";

export interface CaseHearingsSectionProps {
  caseId: string;
}

export function CaseHearingsSection({ caseId }: CaseHearingsSectionProps) {
  const router = useRouter();

  // Local search, sorting, and pagination state
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [sort, setSort] = React.useState<HearingSortOption>(HEARING_SORT_OPTIONS.DATE_ASC);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState<HearingPageLimit>(10);

  // Reset page when search or sort changes
  const filterKey = `${debouncedSearch}-${sort}`;
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const filterParams = React.useMemo(
    () => ({
      page,
      limit,
      sort,
      search: debouncedSearch.trim() || undefined,
    }),
    [page, limit, sort, debouncedSearch]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useCaseHearings(
    caseId,
    filterParams
  );

  const hearings = data?.items || [];
  const stats = data?.stats;

  const handleAddNewHearing = () => {
    router.push(`/dashboard/hearings/new?caseId=${caseId}`);
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-border/70 dark:border-white/10 bg-card shadow-sm space-y-5">
      {/* 1. Section Header with Cause List Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-gold-500" />
            <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Court Hearings & Cause List
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Chronological cause list appearances, bench hearings, and daily courtroom schedule for this case.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-xl text-xs gap-1.5 border-border/70 text-muted-foreground hover:text-foreground"
            title="Refresh hearings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-gold-500" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={handleAddNewHearing}
            className="rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Hearing</span>
          </Button>
        </div>
      </div>

      {/* 2. Case Hearing Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Case Hearings */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
          <span className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground block mb-1">
            Total Hearings
          </span>
          {isLoading && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-foreground">
              <NumberCounter value={stats?.total ?? 0} />
            </span>
          )}
        </div>

        {/* Upcoming */}
        <div className="p-3 rounded-xl bg-gold-500/5 border border-gold-500/20">
          <span className="text-[10px] font-medium tracking-wide uppercase text-gold-700 dark:text-gold-400 block mb-1">
            Upcoming
          </span>
          {isLoading && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-gold-600 dark:text-gold-400">
              <NumberCounter value={stats?.upcoming ?? 0} />
            </span>
          )}
        </div>

        {/* Today */}
        <div className="p-3 rounded-xl bg-sapphire-500/5 border border-sapphire-500/20">
          <span className="text-[10px] font-medium tracking-wide uppercase text-sapphire-700 dark:text-sapphire-400 block mb-1">
            Today
          </span>
          {isLoading && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-sapphire-600 dark:text-sapphire-400">
              <NumberCounter value={stats?.today ?? 0} />
            </span>
          )}
        </div>

        {/* Past / Completed */}
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <span className="text-[10px] font-medium tracking-wide uppercase text-emerald-700 dark:text-emerald-400 block mb-1">
            Past Records
          </span>
          {isLoading && !stats ? (
            <Skeleton className="h-6 w-12 rounded-md" />
          ) : (
            <span className="font-serif text-xl font-bold text-emerald-600 dark:text-emerald-400">
              <NumberCounter value={stats?.past ?? 0} />
            </span>
          )}
        </div>
      </div>

      {/* 3. Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search hearings by purpose, bench, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-7 h-8 text-xs rounded-xl bg-background/60 border-border/70"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as HearingSortOption)}
            className="h-8 rounded-xl text-xs bg-background border border-border/70 px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
          >
            <option value="date_asc">Hearing Date (Upcoming First)</option>
            <option value="date_desc">Hearing Date (Latest First)</option>
            <option value="created_desc">Recently Created</option>
          </select>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) as HearingPageLimit)}
            className="h-8 rounded-xl text-xs bg-background border border-border/70 px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
          >
            {HEARING_PAGE_LIMITS.map((size) => (
              <option key={size} value={size}>
                {size}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Hearings List, Empty States, or Skeletons */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-18 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/5 text-center space-y-2">
          <AlertCircle className="w-5 h-5 mx-auto text-destructive" />
          <p className="text-xs text-destructive font-semibold">
            {(error as Error)?.message || "Failed to load hearings for this case."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="rounded-xl text-xs h-7 gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </Button>
        </div>
      ) : hearings.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-bold text-foreground">
              {search.trim() ? "No Matching Hearings Found" : "No Hearings Scheduled Yet"}
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search.trim()
                ? "No hearing records match your search criteria. Try a different query."
                : "Schedule a court appearance date to start logging cause list outcomes and proceedings."}
            </p>
          </div>
          {!search.trim() && (
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={handleAddNewHearing}
              className="rounded-xl text-xs font-semibold gap-1.5 h-8"
            >
              <Plus className="w-3 h-3" />
              <span>Schedule First Hearing</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {hearings.map((h) => {
            const hearingDate = new Date(h.hearingDate);
            const dayStr = hearingDate.toLocaleDateString("en-GB", { day: "2-digit" });
            const monthYearStr = hearingDate.toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            });
            const statusBadgeVariant =
              (HEARING_STATUS_BADGE_VARIANTS[h.status] as BadgeProps["variant"]) || "gold";

            return (
              <div
                key={h.id}
                onClick={() => router.push(`/dashboard/hearings/${h.id}`)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 dark:border-white/10 bg-background hover:border-gold-500/40 hover:bg-card/80 transition-all cursor-pointer shadow-xs"
                title="View Hearing Record"
              >
                {/* Left Date + Purpose + Court */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  {/* Date Badge */}
                  <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/25 flex flex-col items-center justify-center shrink-0 text-center">
                    <span className="font-serif text-base font-bold text-gold-600 dark:text-gold-400 leading-none">
                      {dayStr}
                    </span>
                    <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase mt-0.5 leading-none">
                      {monthYearStr}
                    </span>
                  </div>

                  {/* Hearing Information */}
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-sm font-bold text-foreground group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors truncate max-w-xs sm:max-w-md">
                        {h.purpose || h.hearingType || "Court Proceeding"}
                      </span>
                      <Badge variant={statusBadgeVariant}>{h.statusLabel}</Badge>
                      {h.startTime && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-gold-500 shrink-0" />
                          <span>{h.startTime}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {h.court && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                          <span>{h.court.name}</span>
                        </span>
                      )}
                      {h.outcome && (
                        <span className="truncate max-w-xs italic text-foreground/80">
                          Outcome: {h.outcome}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Navigate action */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 text-xs font-semibold text-gold-600 dark:text-gold-400 group-hover:translate-x-0.5 transition-transform">
                  <span>Hearing Dossier</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Pagination */}
      {data && data.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
          <span>
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.total)} of{" "}
            <span className="font-semibold text-foreground">{data.total}</span> hearings
          </span>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
              className="h-7 w-7 rounded-lg"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="px-2 font-medium text-foreground">
              {page} / {data.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages || isFetching}
              className="h-7 w-7 rounded-lg"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CaseHearingsSection;
