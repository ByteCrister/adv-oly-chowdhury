"use client";

import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useCourtStore } from "@/store/useCourtStore";
import { useCourtList } from "@/hooks/courts";
import {
  CourtsPageHeader,
  CourtsFilterToolbar,
  CourtsTable,
  CourtsPagination,
  CourtDetailDialog,
  CourtFormDialog,
  CourtDeleteDialog,
  CourtsPageSkeleton,
  CourtsTableSkeleton,
} from "@/components/courts";
import { FadeIn, FadeInUp } from "@/components/wrappers/Motion";
import { Button } from "@/components/ui/button";
import type { CourtListItemDto } from "@/types/court.types";
import type { CourtPageLimit } from "@/const/court.const";



export default function CourtsDashboardPage() {
  const store = useCourtStore();
  const filterParams = store.getFilterParams();

  // Fetch court list via TanStack Query
  const {
    data: courtData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useCourtList(filterParams);

  // Dialog State Management
  const [selectedCourtForDetail, setSelectedCourtForDetail] =
    React.useState<CourtListItemDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const [selectedCourtForEdit, setSelectedCourtForEdit] =
    React.useState<CourtListItemDto | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const [selectedCourtForDelete, setSelectedCourtForDelete] =
    React.useState<CourtListItemDto | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  // Handler for Opening View Details Modal
  const handleViewDetails = (court: CourtListItemDto) => {
    setSelectedCourtForDetail(court);
    setIsDetailOpen(true);
  };

  // Handler for Opening Edit Modal
  const handleEditCourt = (court: CourtListItemDto) => {
    setSelectedCourtForEdit(court);
    setIsFormOpen(true);
  };

  // Handler for Opening Create Modal
  const handleAddNew = () => {
    setSelectedCourtForEdit(null);
    setIsFormOpen(true);
  };

  // Handler for Opening Delete Confirmation
  const handleDeleteCourt = (court: CourtListItemDto) => {
    setSelectedCourtForDelete(court);
    setIsDeleteOpen(true);
  };

  // 1. Initial Loading Skeleton
  if (isLoading && !courtData) {
    return <CourtsPageSkeleton />;
  }

  // 2. Error Display State
  if (isError && !courtData) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-card border border-destructive/30 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-serif text-lg font-bold text-foreground">
            Unable to Retrieve Courts Registry
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error?.message ||
              "An error occurred while communicating with the judicial registry database. Please verify your connection or try again."}
          </p>
        </div>
        <Button
          type="button"
          variant="gold"
          size="sm"
          onClick={() => refetch()}
          className="rounded-xl text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span>Retry Connection</span>
        </Button>
      </div>
    );
  }

  const items = courtData?.items || [];
  const total = courtData?.total || 0;
  const page = courtData?.page || store.page;
  const limit = (courtData?.limit || store.limit) as CourtPageLimit;
  const totalPages = courtData?.totalPages || 1;
  const hasMore = courtData?.hasMore || false;


  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumbs & Metrics */}
      <FadeIn duration={0.35} delay={0}>
        <CourtsPageHeader
          items={items}
          total={total}
          isFetching={isFetching}
          onRefresh={() => refetch()}
          onAddNew={handleAddNew}
        />
      </FadeIn>

      {/* 2. Filter & Search Controls */}
      <FadeInUp duration={0.4} delay={0.08} yOffset={14}>
        <CourtsFilterToolbar />
      </FadeInUp>

      {/* 3. Courts Table or Loading State */}
      <FadeInUp duration={0.4} delay={0.16} yOffset={14}>
        {isFetching && isLoading ? (
          <CourtsTableSkeleton rowCount={limit > 10 ? 10 : limit} />
        ) : (
          <CourtsTable
            courts={items}
            isLoading={isFetching}
            onViewDetails={handleViewDetails}
            onEditCourt={handleEditCourt}
            onDeleteCourt={handleDeleteCourt}
            onAddNew={handleAddNew}
            onResetFilters={() => store.resetFilters()}
          />
        )}
      </FadeInUp>

      {/* 4. Pagination */}
      <FadeInUp duration={0.4} delay={0.24} yOffset={14}>
        <CourtsPagination
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          hasMore={hasMore}
          isLoading={isFetching}
          onPageChange={(newPage) => store.setPage(newPage)}
          onLimitChange={(newLimit) => store.setLimit(newLimit)}
        />
      </FadeInUp>

      {/* 5. Modals / Dialogs */}
      <CourtDetailDialog
        court={selectedCourtForDetail}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={(court) => {
          setSelectedCourtForEdit(court);
          setIsFormOpen(true);
        }}
        onDelete={(court) => {
          setSelectedCourtForDelete(court);
          setIsDeleteOpen(true);
        }}
      />

      <CourtFormDialog
        court={selectedCourtForEdit}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <CourtDeleteDialog
        court={selectedCourtForDelete}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </div>
  );
}
