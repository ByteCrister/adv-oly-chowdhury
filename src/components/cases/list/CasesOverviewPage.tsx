"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { FadeInUp } from "@/components/wrappers/Motion";
import { useCaseStore } from "@/store/useCaseStore";
import { useCaseList } from "@/hooks/cases";
import { Button } from "@/components/ui/button";
import { CasesStatsHeader } from "./CasesStatsHeader";
import { CasesFilterToolbar } from "./CasesFilterToolbar";
import { CasesAccordionList } from "./CasesAccordionList";
import { CasesPagination } from "./CasesPagination";
import { CasesListSkeleton } from "./CasesListSkeleton";
import { CaseFormDialog } from "./CaseFormDialog";
import { CaseDeleteDialog } from "./CaseDeleteDialog";
import type { CaseListItemDto } from "@/types/case.types";

export function CasesOverviewPage() {
  // Store state & actions
  const page = useCaseStore((s) => s.page);
  const limit = useCaseStore((s) => s.limit);
  const search = useCaseStore((s) => s.search);
  const caseStatus = useCaseStore((s) => s.caseStatus);
  const caseType = useCaseStore((s) => s.caseType);
  const priority = useCaseStore((s) => s.priority);
  const courtId = useCaseStore((s) => s.courtId);
  const clientId = useCaseStore((s) => s.clientId);
  const filingYear = useCaseStore((s) => s.filingYear);
  const sort = useCaseStore((s) => s.sort);
  const setPage = useCaseStore((s) => s.setPage);
  const setLimit = useCaseStore((s) => s.setLimit);
  const resetFilters = useCaseStore((s) => s.resetFilters);

  // TanStack Query filter params
  const filterParams = React.useMemo(
    () => ({
      page,
      limit,
      sort,
      search: search.trim() ? search.trim() : undefined,
      caseStatus: caseStatus !== "ALL" ? caseStatus : undefined,
      caseType: caseType !== "ALL" ? caseType : undefined,
      priority: priority !== "ALL" ? priority : undefined,
      courtId: courtId !== "ALL" && courtId.trim() ? courtId.trim() : undefined,
      clientId: clientId !== "ALL" && clientId.trim() ? clientId.trim() : undefined,
      filingYear: filingYear.trim() ? filingYear.trim() : undefined,
    }),
    [page, limit, sort, search, caseStatus, caseType, priority, courtId, clientId, filingYear]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useCaseList(filterParams);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCase, setEditingCase] = React.useState<CaseListItemDto | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingCase, setDeletingCase] = React.useState<CaseListItemDto | null>(null);
  const router = useRouter();

  const handleAddNew = () => {
    router.push("/dashboard/cases/new");
  };

  const handleEditCase = (c: CaseListItemDto) => {
    setEditingCase(c);
    setIsFormOpen(true);
  };

  const handleDeleteCase = (c: CaseListItemDto) => {
    setDeletingCase(c);
    setIsDeleteOpen(true);
  };

  const isFiltered = Boolean(
    search.trim() ||
      caseStatus !== "ALL" ||
      caseType !== "ALL" ||
      priority !== "ALL" ||
      (courtId !== "ALL" && courtId.trim()) ||
      (clientId !== "ALL" && clientId.trim()) ||
      filingYear.trim()
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header with Live Filter-Aware Statistics */}
      <FadeInUp delay={0.05}>
        <CasesStatsHeader
          stats={data?.stats}
          isLoading={isLoading}
          isFetching={isFetching}
          onRefetch={() => refetch()}
          onAddNew={handleAddNew}
        />
      </FadeInUp>

      {/* 2. Responsive Search, Filter & Sort Toolbar */}
      <FadeInUp delay={0.1}>
        <CasesFilterToolbar />
      </FadeInUp>

      {/* 3. Main Cases Content: Skeleton, Error, or Accordion List + Pagination */}
      {isLoading ? (
        <CasesListSkeleton />
      ) : isError ? (
        <FadeInUp delay={0.15}>
          <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              Unable to Load Cases Repository
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {(error as Error)?.message ||
                "Failed to communicate with the case repository service. Please check your connection and retry."}
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
          <CasesAccordionList
            cases={data?.items || []}
            isLoading={isFetching}
            onEdit={handleEditCase}
            onDelete={handleDeleteCase}
            onAddNew={handleAddNew}
            onResetFilters={resetFilters}
            isFiltered={isFiltered}
          />

          {data && data.total > 0 && (
            <CasesPagination
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

      {/* Create / Edit Case Dialog */}
      <CaseFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCase(null);
        }}
        caseItem={editingCase}
        onSuccess={() => refetch()}
      />

      {/* Archive / Delete Confirmation Dialog */}
      <CaseDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingCase(null);
        }}
        caseItem={deletingCase}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default CasesOverviewPage;
