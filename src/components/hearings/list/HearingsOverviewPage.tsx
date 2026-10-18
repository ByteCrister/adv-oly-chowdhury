"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { FadeInUp } from "@/components/wrappers/Motion";
import { useHearingStore } from "@/store/useHearingStore";
import { useHearingList } from "@/hooks/hearings";
import { Button } from "@/components/ui/button";
import { HearingsStatsHeader } from "./HearingsStatsHeader";
import { HearingsFilterToolbar } from "./HearingsFilterToolbar";
import { HearingsAccordionList } from "./HearingsAccordionList";
import { HearingsPagination } from "./HearingsPagination";
import { HearingsListSkeleton } from "./HearingsListSkeleton";
import { HearingDeleteDialog } from "./HearingDeleteDialog";
import type { HearingListItemDto } from "@/types/hearing.types";

export function HearingsOverviewPage() {
  const router = useRouter();

  // Store state & actions
  const page = useHearingStore((s) => s.page);
  const limit = useHearingStore((s) => s.limit);
  const search = useHearingStore((s) => s.search);
  const status = useHearingStore((s) => s.status);
  const courtId = useHearingStore((s) => s.courtId);
  const caseId = useHearingStore((s) => s.caseId);
  const clientId = useHearingStore((s) => s.clientId);
  const hearingType = useHearingStore((s) => s.hearingType);
  const startDate = useHearingStore((s) => s.startDate);
  const endDate = useHearingStore((s) => s.endDate);
  const sort = useHearingStore((s) => s.sort);
  const setPage = useHearingStore((s) => s.setPage);
  const setLimit = useHearingStore((s) => s.setLimit);
  const resetFilters = useHearingStore((s) => s.resetFilters);

  // TanStack Query filter params
  const filterParams = React.useMemo(
    () => ({
      page,
      limit,
      sort,
      search: search.trim() ? search.trim() : undefined,
      status: status !== "ALL" ? status : undefined,
      courtId: courtId !== "ALL" && courtId.trim() ? courtId : undefined,
      caseId: caseId.trim() ? caseId : undefined,
      clientId: clientId.trim() ? clientId : undefined,
      hearingType: hearingType !== "ALL" && hearingType.trim() ? hearingType : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, limit, sort, search, status, courtId, caseId, clientId, hearingType, startDate, endDate]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useHearingList(filterParams);

  // Delete dialog state
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingHearing, setDeletingHearing] = React.useState<HearingListItemDto | null>(null);

  const handleAddNew = () => {
    router.push("/dashboard/hearings/new");
  };

  const handleEditHearing = (hearing: HearingListItemDto) => {
    router.push(`/dashboard/hearings/${hearing.id}?edit=true`);
  };

  const handleDeleteHearing = (hearing: HearingListItemDto) => {
    setDeletingHearing(hearing);
    setIsDeleteOpen(true);
  };

  const isFiltered = Boolean(
    search.trim() ||
      status !== "ALL" ||
      (courtId !== "ALL" && courtId.trim()) ||
      caseId.trim() ||
      clientId.trim() ||
      (hearingType !== "ALL" && hearingType.trim()) ||
      startDate ||
      endDate
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header with Filter-Aware Statistics */}
      <FadeInUp delay={0.05}>
        <HearingsStatsHeader
          stats={data?.stats}
          isLoading={isLoading}
          isFetching={isFetching}
          onRefetch={() => refetch()}
          onAddNew={handleAddNew}
        />
      </FadeInUp>

      {/* 2. Responsive Search, Filter & Sort Toolbar */}
      <FadeInUp delay={0.1}>
        <HearingsFilterToolbar />
      </FadeInUp>

      {/* 3. Main Body: Skeleton, Error, or Accordion List + Pagination */}
      {isLoading ? (
        <HearingsListSkeleton />
      ) : isError ? (
        <FadeInUp delay={0.15}>
          <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              Unable to Load Court Cause List
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {(error as Error)?.message ||
                "Failed to communicate with the court schedule registry. Please check your connection and retry."}
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
          <HearingsAccordionList
            hearings={data?.items || []}
            isLoading={isFetching}
            onEdit={handleEditHearing}
            onDelete={handleDeleteHearing}
            onAddNew={handleAddNew}
            onResetFilters={resetFilters}
            isFiltered={isFiltered}
          />

          {data && data.total > 0 && (
            <HearingsPagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              totalPages={data.totalPages}
              isLoading={isFetching}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </FadeInUp>
      )}

      {/* Confirmation Dialog for Hearing Deletion */}
      <HearingDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingHearing(null);
        }}
        hearing={deletingHearing}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default HearingsOverviewPage;
