"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { FadeInUp } from "@/components/wrappers/Motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCaseDetail, useCaseEvents } from "@/hooks/cases";
import { useDebounce } from "@/hooks/ui";
import { CaseEventsHeader } from "./CaseEventsHeader";
import { CaseEventsTimeline } from "./CaseEventsTimeline";
import { CaseEventFormDialog } from "./CaseEventFormDialog";
import { CaseEventDeleteDialog } from "./CaseEventDeleteDialog";
import { CaseEventsSkeleton } from "./CaseEventsSkeleton";
import type { CaseEventItemDto } from "@/types/case-event.types";
import {
  CASE_EVENT_TYPE_LIST,
  CASE_EVENT_TYPE_LABELS,
  CASE_EVENT_PAGE_LIMITS,
  CaseEventType,
  CaseEventSortOption,
  CaseEventPageLimit,
} from "@/const/case-event.const";

export interface CaseEventsPageProps {
  caseId: string;
}

export function CaseEventsPage({ caseId }: CaseEventsPageProps) {
  // Filter & Pagination State
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [eventType, setEventType] = React.useState<CaseEventType | "ALL">("ALL");
  const [sort, setSort] = React.useState<CaseEventSortOption>("date_desc");
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState<CaseEventPageLimit>(20);

  // Reset page when filters change
  const filterKey = `${debouncedSearch}-${eventType}-${sort}`;
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
      eventType: eventType !== "ALL" ? eventType : undefined,
    }),
    [page, limit, sort, debouncedSearch, eventType]
  );

  // Queries
  const {
    data: caseData,
    isLoading: isCaseLoading,
    isError: isCaseError,
    error: caseError,
  } = useCaseDetail(caseId);

  const {
    data: eventsData,
    isLoading: isEventsLoading,
    isError: isEventsError,
    error: eventsError,
    refetch,
    isFetching,
  } = useCaseEvents(caseId, filterParams);

  // Dialog State
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CaseEventItemDto | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingEvent, setDeletingEvent] = React.useState<CaseEventItemDto | null>(null);

  const isFiltered = Boolean(search.trim() || eventType !== "ALL");

  const handleResetFilters = () => {
    setSearch("");
    setEventType("ALL");
    setSort("date_desc");
    setPage(1);
  };

  if (isCaseLoading) {
    return <CaseEventsSkeleton />;
  }

  if (isCaseError || !caseData) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">
          Case Dossier Not Found
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {(caseError as Error)?.message ||
            `The requested legal case (${caseId}) could not be located in the repository.`}
        </p>
        <Link href="/dashboard/cases">
          <Button type="button" variant="gold" size="sm" className="rounded-xl text-xs gap-1.5 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Cases</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header with Stats & Actions */}
      <FadeInUp delay={0.05}>
        <CaseEventsHeader
          caseData={caseData}
          stats={eventsData?.stats}
          isLoadingStats={isEventsLoading}
          onAddEventClick={() => {
            setEditingEvent(null);
            setIsFormOpen(true);
          }}
          onRefresh={() => refetch()}
          isFetching={isFetching}
        />
      </FadeInUp>

      {/* 2. Filter Bar */}
      <FadeInUp delay={0.1}>
        <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search milestones by title or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 rounded-xl text-xs bg-background/50 border-border/70"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="w-full md:w-56">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as CaseEventType | "ALL")}
              className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-sapphire-500/30"
            >
              <option value="ALL">All Event Classifications</option>
              {CASE_EVENT_TYPE_LIST.map((t) => (
                <option key={t} value={t}>
                  {CASE_EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-44">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as CaseEventSortOption)}
              className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-sapphire-500/30"
            >
              <option value="date_desc">Event Date (Latest First)</option>
              <option value="date_asc">Event Date (Earliest First)</option>
              <option value="newest">Recently Recorded</option>
            </select>
          </div>

          <div className="w-full md:w-28">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) as CaseEventPageLimit)}
              className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-2 text-foreground focus:outline-none focus:ring-2 focus:ring-sapphire-500/30"
            >
              {CASE_EVENT_PAGE_LIMITS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      </FadeInUp>

      {/* 3. Main Timeline Content */}
      {isEventsLoading ? (
        <CaseEventsSkeleton />
      ) : isEventsError ? (
        <FadeInUp delay={0.15}>
          <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              Unable to Load Case Events
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {(eventsError as Error)?.message || "Failed to retrieve milestones for this case."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Query</span>
            </Button>
          </div>
        </FadeInUp>
      ) : (
        <FadeInUp delay={0.15} className="space-y-4">
          <CaseEventsTimeline
            events={eventsData?.items || []}
            isLoading={isFetching}
            onEdit={(ev) => {
              setEditingEvent(ev);
              setIsFormOpen(true);
            }}
            onDelete={(ev) => {
              setDeletingEvent(ev);
              setIsDeleteOpen(true);
            }}
            onAddNew={() => {
              setEditingEvent(null);
              setIsFormOpen(true);
            }}
            onResetFilters={handleResetFilters}
            isFiltered={isFiltered}
          />

          {/* Pagination */}
          {eventsData && eventsData.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
              <span>
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, eventsData.total)} of{" "}
                <span className="font-semibold text-foreground">{eventsData.total}</span> milestones
              </span>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-2 font-medium text-foreground">
                  {page} / {eventsData.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(eventsData.totalPages, p + 1))}
                  disabled={page >= eventsData.totalPages || isFetching}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </FadeInUp>
      )}

      {/* Record / Edit Dialog */}
      <CaseEventFormDialog
        caseId={caseId}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingEvent(null);
        }}
        eventItem={editingEvent}
        onSuccess={() => refetch()}
      />

      {/* Delete Dialog */}
      <CaseEventDeleteDialog
        caseId={caseId}
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingEvent(null);
        }}
        eventItem={deletingEvent}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default CaseEventsPage;
