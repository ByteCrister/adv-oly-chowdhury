"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { FadeInUp } from "@/components/wrappers/Motion";
import { Button } from "@/components/ui/button";
import { useCaseDetail, useCaseDocuments } from "@/hooks/cases";
import { useDebounce } from "@/hooks/ui";
import { CaseDocumentsHeader } from "./CaseDocumentsHeader";
import { CaseDocumentsToolbar } from "./CaseDocumentsToolbar";
import { CaseDocumentsTable } from "./CaseDocumentsTable";
import { CaseDocumentsSkeleton } from "./CaseDocumentsSkeleton";
import {
  CreateCaseDocumentDialog,
  EditDocumentDialog,
  ReplaceDocumentDialog,
  DeleteDocumentDialog,
} from "@/components/documents";
import type { CaseDocumentItemDto } from "@/types/case-document.types";
import type { UnifiedDocumentItemDto } from "@/types/document.types";
import {
  CaseDocumentType,
  CaseDocumentSortOption,
  CaseDocumentPageLimit,
  CASE_DOCUMENT_SORT_OPTIONS,
} from "@/const/case-document.const";

export interface CaseDocumentsPageProps {
  caseId: string;
}

function toUnifiedDocument(doc: CaseDocumentItemDto): UnifiedDocumentItemDto {
  return {
    ...doc,
    entityType: "CASE",
  };
}

export function CaseDocumentsPage({ caseId }: CaseDocumentsPageProps) {
  // Filters & Pagination State
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [documentType, setDocumentType] = React.useState<CaseDocumentType | "ALL">("ALL");
  const [isConfidential, setIsConfidential] = React.useState<boolean | undefined>(undefined);
  const [sort, setSort] = React.useState<CaseDocumentSortOption>(CASE_DOCUMENT_SORT_OPTIONS.NEWEST);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState<CaseDocumentPageLimit>(20);

  // Reset page when filters change
  const filterKey = `${debouncedSearch}-${documentType}-${isConfidential}-${sort}`;
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
      documentType: documentType !== "ALL" ? documentType : undefined,
      isConfidential,
    }),
    [page, limit, sort, debouncedSearch, documentType, isConfidential]
  );

  // Queries
  const {
    data: caseData,
    isLoading: isCaseLoading,
    isError: isCaseError,
    error: caseError,
  } = useCaseDetail(caseId);

  const {
    data: docsData,
    isLoading: isDocsLoading,
    isError: isDocsError,
    error: docsError,
    refetch,
    isFetching,
  } = useCaseDocuments(caseId, filterParams);

  // Dialog States
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [editingDoc, setEditingDoc] = React.useState<UnifiedDocumentItemDto | null>(null);
  const [replacingDoc, setReplacingDoc] = React.useState<UnifiedDocumentItemDto | null>(null);
  const [deletingDoc, setDeletingDoc] = React.useState<UnifiedDocumentItemDto | null>(null);

  const isFiltered = Boolean(
    search.trim() || documentType !== "ALL" || isConfidential !== undefined
  );

  const handleResetFilters = () => {
    setSearch("");
    setDocumentType("ALL");
    setIsConfidential(undefined);
    setSort(CASE_DOCUMENT_SORT_OPTIONS.NEWEST);
    setPage(1);
  };

  if (isCaseLoading) {
    return <CaseDocumentsSkeleton />;
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
      {/* 1. Header with Case Navigation & Upload Button */}
      <FadeInUp delay={0.05}>
        <CaseDocumentsHeader
          caseData={caseData}
          totalDocuments={docsData?.total ?? caseData.counts.documents}
          onUploadClick={() => setIsUploadOpen(true)}
          onRefresh={() => refetch()}
          isFetching={isFetching}
        />
      </FadeInUp>

      {/* 2. Filter Toolbar */}
      <FadeInUp delay={0.1}>
        <CaseDocumentsToolbar
          search={search}
          onSearchChange={setSearch}
          documentType={documentType}
          onDocumentTypeChange={setDocumentType}
          isConfidential={isConfidential}
          onConfidentialChange={setIsConfidential}
          sort={sort}
          onSortChange={setSort}
          limit={limit}
          onLimitChange={setLimit}
          onReset={handleResetFilters}
          isFiltered={isFiltered}
        />
      </FadeInUp>

      {/* 3. Main Documents Content */}
      {isDocsLoading ? (
        <CaseDocumentsSkeleton />
      ) : isDocsError ? (
        <FadeInUp delay={0.15}>
          <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              Unable to Load Case Documents
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {(docsError as Error)?.message || "Failed to retrieve documents for this case."}
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
          <CaseDocumentsTable
            documents={docsData?.items || []}
            isLoading={isFetching}
            onEdit={(doc) => setEditingDoc(toUnifiedDocument(doc))}
            onReplace={(doc) => setReplacingDoc(toUnifiedDocument(doc))}
            onDelete={(doc) => setDeletingDoc(toUnifiedDocument(doc))}
            onUploadNew={() => setIsUploadOpen(true)}
            onResetFilters={handleResetFilters}
            isFiltered={isFiltered}
          />

          {/* Pagination Controls */}
          {docsData && docsData.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
              <span>
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, docsData.total)} of{" "}
                <span className="font-semibold text-foreground">{docsData.total}</span> documents
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
                  {page} / {docsData.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(docsData.totalPages, p + 1))}
                  disabled={page >= docsData.totalPages || isFetching}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </FadeInUp>
      )}

      {/* Upload Dialog using existing Cloudinary & SHA-256 pipeline */}
      <CreateCaseDocumentDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        defaultCaseId={caseId}
        onSuccess={() => refetch()}
      />

      {/* Edit Metadata Dialog */}
      <EditDocumentDialog
        document={editingDoc}
        isOpen={Boolean(editingDoc)}
        onClose={() => setEditingDoc(null)}
        onSuccess={() => refetch()}
      />

      {/* Replace Document Dialog */}
      <ReplaceDocumentDialog
        document={replacingDoc}
        isOpen={Boolean(replacingDoc)}
        onClose={() => setReplacingDoc(null)}
        onSuccess={() => refetch()}
      />

      {/* Delete Document Dialog */}
      <DeleteDocumentDialog
        document={deletingDoc}
        isOpen={Boolean(deletingDoc)}
        onClose={() => setDeletingDoc(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default CaseDocumentsPage;
