"use client";

import * as React from "react";
import {
  Briefcase,
  Users,
  FolderOpen,
} from "lucide-react";
import { DashboardBreadcrumb } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { FadeInUp } from "@/components/wrappers/Motion";
import {
  DOCUMENT_SCOPES,
  DOCUMENT_SORT_OPTIONS,
  DOCUMENT_DEFAULT_PAGE_LIMIT,
  DocumentScope,
  DocumentSortOption,
  DocumentPageLimit,
} from "@/const/document.const";
import {
  useDocumentsQuery,
} from "@/hooks/documents";
import { useDebounce } from "@/hooks/ui";

import { DocumentStatsCards } from "./DocumentStatsCards";
import { DocumentToolbar } from "./DocumentToolbar";
import { DocumentTable } from "./DocumentTable";
import { DocumentCardView } from "./DocumentCardView";
import { DocumentPagination } from "./DocumentPagination";
import { DocumentSkeleton } from "./DocumentSkeleton";
import { CreateCaseDocumentDialog } from "./CreateCaseDocumentDialog";
import { CreateClientDocumentDialog } from "./CreateClientDocumentDialog";
import { EditDocumentDialog } from "./EditDocumentDialog";
import { ReplaceDocumentDialog } from "./ReplaceDocumentDialog";
import { DeleteDocumentDialog } from "./DeleteDocumentDialog";
import type { UnifiedDocumentItemDto } from "@/types/document.types";

export function DocumentsOverviewPage() {
  // Query Filter State
  const [scope, setScope] = React.useState<DocumentScope>(DOCUMENT_SCOPES.ALL);
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [documentType, setDocumentType] = React.useState("ALL");
  const [isConfidential, setIsConfidential] = React.useState<boolean | undefined>(undefined);
  const [sort, setSort] = React.useState<DocumentSortOption>(DOCUMENT_SORT_OPTIONS.NEWEST);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState<DocumentPageLimit>(DOCUMENT_DEFAULT_PAGE_LIMIT);

  // Dialog State
  const [isCreateCaseOpen, setIsCreateCaseOpen] = React.useState(false);
  const [isCreateClientOpen, setIsCreateClientOpen] = React.useState(false);
  const [selectedEditDoc, setSelectedEditDoc] = React.useState<UnifiedDocumentItemDto | null>(null);
  const [selectedReplaceDoc, setSelectedReplaceDoc] = React.useState<UnifiedDocumentItemDto | null>(null);
  const [selectedDeleteDoc, setSelectedDeleteDoc] = React.useState<UnifiedDocumentItemDto | null>(null);

  // Reset page to 1 whenever filters or search change
  const handleScopeChange = (newScope: DocumentScope) => {
    setScope(newScope);
    setDocumentType("ALL");
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  const handleDocumentTypeChange = (val: string) => {
    setDocumentType(val);
    setPage(1);
  };

  const handleSortChange = (newSort: DocumentSortOption) => {
    setSort(newSort);
    setPage(1);
  };

  const handleLimitChange = (newLimit: DocumentPageLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleConfidentialChange = (val?: boolean) => {
    setIsConfidential(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDocumentType("ALL");
    setIsConfidential(undefined);
    setSort(DOCUMENT_SORT_OPTIONS.NEWEST);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      documentType !== "ALL" ||
      isConfidential !== undefined ||
      sort !== DOCUMENT_SORT_OPTIONS.NEWEST
  );

  // Query Data
  const {
    data: documentsData,
    isLoading: isDocsLoading,
    isFetching: isDocsFetching,
    refetch,
  } = useDocumentsQuery({
    scope,
    search: debouncedSearch.trim() || undefined,
    documentType: documentType !== "ALL" ? documentType : undefined,
    isConfidential,
    sort,
    page,
    limit,
  });

  const documents = documentsData?.items ?? [];
  const total = documentsData?.total ?? 0;
  const totalPages = documentsData?.totalPages ?? 1;
  const hasMore = documentsData?.hasMore ?? false;
  const statsData = documentsData?.stats;
  const isStatsLoading = isDocsLoading && !statsData;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <DashboardBreadcrumb />

      {/* Page Header */}
      <FadeInUp delay={0.05} duration={0.4}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20">
                <FolderOpen className="w-4 h-4" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Documents Vault
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Centralized repository for case pleadings, petitions, decrees, evidence exhibits, and client KYC identity records.
            </p>
          </div>

          {/* Creation Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateClientOpen(true)}
              className="rounded-xl text-xs gap-1.5 shadow-sm hover:border-gold-500/40"
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>+ New Client Document</span>
            </Button>

            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={() => setIsCreateCaseOpen(true)}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>+ New Case Document</span>
            </Button>
          </div>
        </div>
      </FadeInUp>

      {/* Document Statistics Section */}
      <FadeInUp delay={0.1} duration={0.4}>
        <DocumentStatsCards stats={statsData} isLoading={isStatsLoading} />
      </FadeInUp>

      {/* Main Content Area */}
      <FadeInUp delay={0.15} duration={0.4} className="space-y-4">
        {/* Toolbar */}
        <DocumentToolbar
          scope={scope}
          onScopeChange={handleScopeChange}
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          documentType={documentType}
          onDocumentTypeChange={handleDocumentTypeChange}
          sort={sort}
          onSortChange={handleSortChange}
          limit={limit}
          onLimitChange={handleLimitChange}
          isConfidential={isConfidential}
          onConfidentialChange={handleConfidentialChange}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          stats={statsData}
        />

        {/* Loading Skeleton vs Content */}
        {isDocsLoading ? (
          <DocumentSkeleton />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <DocumentTable
                documents={documents}
                isLoading={isDocsFetching}
                onEditDocument={(doc) => setSelectedEditDoc(doc)}
                onReplaceDocument={(doc) => setSelectedReplaceDoc(doc)}
                onDeleteDocument={(doc) => setSelectedDeleteDoc(doc)}
                onUploadCaseDoc={() => setIsCreateCaseOpen(true)}
                onUploadClientDoc={() => setIsCreateClientOpen(true)}
                onResetFilters={handleResetFilters}
              />
            </div>

            {/* Mobile / Tablet Card View */}
            <DocumentCardView
              documents={documents}
              onEditDocument={(doc) => setSelectedEditDoc(doc)}
              onReplaceDocument={(doc) => setSelectedReplaceDoc(doc)}
              onDeleteDocument={(doc) => setSelectedDeleteDoc(doc)}
            />

            {/* Pagination */}
            <DocumentPagination
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              hasMore={hasMore}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
              isFetching={isDocsFetching}
            />
          </div>
        )}
      </FadeInUp>

      {/* Dialogs */}
      <CreateCaseDocumentDialog
        isOpen={isCreateCaseOpen}
        onClose={() => setIsCreateCaseOpen(false)}
        onSuccess={() => refetch()}
      />

      <CreateClientDocumentDialog
        isOpen={isCreateClientOpen}
        onClose={() => setIsCreateClientOpen(false)}
        onSuccess={() => refetch()}
      />

      <EditDocumentDialog
        document={selectedEditDoc}
        isOpen={Boolean(selectedEditDoc)}
        onClose={() => setSelectedEditDoc(null)}
        onSuccess={() => refetch()}
      />

      <ReplaceDocumentDialog
        document={selectedReplaceDoc}
        isOpen={Boolean(selectedReplaceDoc)}
        onClose={() => setSelectedReplaceDoc(null)}
        onSuccess={() => refetch()}
      />

      <DeleteDocumentDialog
        document={selectedDeleteDoc}
        isOpen={Boolean(selectedDeleteDoc)}
        onClose={() => setSelectedDeleteDoc(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default DocumentsOverviewPage;
