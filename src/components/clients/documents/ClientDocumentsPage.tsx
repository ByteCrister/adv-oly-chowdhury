"use client";

import * as React from "react";
import Link from "next/link";
import { FadeInUp } from "@/components/wrappers/Motion";
import { useClientDetails, useClientDocumentList } from "@/hooks/clients";
import { useClientDocumentStore } from "@/store/useClientDocumentStore";
import { ClientDocumentsHeader } from "./ClientDocumentsHeader";
import { ClientDocumentsToolbar } from "./ClientDocumentsToolbar";
import { ClientDocumentsTable } from "./ClientDocumentsTable";
import { ClientDocumentsPagination } from "./ClientDocumentsPagination";
import { ClientDocumentsSkeleton } from "./ClientDocumentsSkeleton";
import { ClientDocumentUploadDialog } from "./ClientDocumentUploadDialog";
import { ClientDocumentReplaceDialog } from "./ClientDocumentReplaceDialog";
import { ClientDocumentEditDialog } from "./ClientDocumentEditDialog";
import { ClientDocumentDeleteDialog } from "./ClientDocumentDeleteDialog";
import type { ClientDocumentItemDto } from "@/types/client-document.types";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ClientDocumentsPageProps {
  clientId: string;
}

export function ClientDocumentsPage({ clientId }: ClientDocumentsPageProps) {
  // Store params
  const page = useClientDocumentStore((s) => s.page);
  const limit = useClientDocumentStore((s) => s.limit);
  const search = useClientDocumentStore((s) => s.search);
  const documentType = useClientDocumentStore((s) => s.documentType);
  const startDate = useClientDocumentStore((s) => s.startDate);
  const endDate = useClientDocumentStore((s) => s.endDate);
  const sort = useClientDocumentStore((s) => s.sort);
  const setPage = useClientDocumentStore((s) => s.setPage);
  const setLimit = useClientDocumentStore((s) => s.setLimit);
  const resetFilters = useClientDocumentStore((s) => s.resetFilters);

  const filterParams = React.useMemo(
    () => ({
      page,
      limit,
      sort,
      search: search.trim() ? search.trim() : undefined,
      documentType: documentType !== "ALL" ? documentType : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, limit, sort, search, documentType, startDate, endDate]
  );

  // Queries
  const {
    data: client,
    isLoading: isClientLoading,
    isError: isClientError,
    error: clientError,
  } = useClientDetails(clientId);

  const {
    data: docsData,
    isLoading: isDocsLoading,
    isError: isDocsError,
    error: docsError,
    refetch,
    isFetching,
  } = useClientDocumentList(clientId, filterParams);

  // Dialog states
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [replacingDoc, setReplacingDoc] = React.useState<ClientDocumentItemDto | null>(null);
  const [editingDoc, setEditingDoc] = React.useState<ClientDocumentItemDto | null>(null);
  const [deletingDoc, setDeletingDoc] = React.useState<ClientDocumentItemDto | null>(null);

  if (isClientLoading) {
    return <ClientDocumentsSkeleton />;
  }

  if (isClientError || !client) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">
          Client Dossier Not Found
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {(clientError as Error)?.message ||
            `The requested client profile with identifier "${clientId}" could not be located.`}
        </p>
        <Link href="/dashboard/clients">
          <Button type="button" variant="gold" size="sm" className="rounded-xl text-xs gap-1.5 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Directory</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Client Backlink & Upload Button */}
      <FadeInUp delay={0.05}>
        <ClientDocumentsHeader
          client={client}
          totalDocuments={docsData?.total ?? client.stats.totalDocuments}
          onUploadClick={() => setIsUploadOpen(true)}
        />
      </FadeInUp>

      {/* 2. Filter Toolbar */}
      <FadeInUp delay={0.1}>
        <ClientDocumentsToolbar />
      </FadeInUp>

      {/* 3. Main Documents Content */}
      {isDocsLoading ? (
        <ClientDocumentsSkeleton />
      ) : isDocsError ? (
        <FadeInUp delay={0.15}>
          <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              Unable to Load Document Vault
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {(docsError as Error)?.message || "Failed to retrieve client document records."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        </FadeInUp>
      ) : (
        <FadeInUp delay={0.15} className="space-y-4">
          <ClientDocumentsTable
            documents={docsData?.items || []}
            isLoading={isFetching}
            onEditDocument={(doc) => setEditingDoc(doc)}
            onReplaceDocument={(doc) => setReplacingDoc(doc)}
            onDeleteDocument={(doc) => setDeletingDoc(doc)}
            onUploadNew={() => setIsUploadOpen(true)}
            onResetFilters={resetFilters}
          />

          {docsData && docsData.total > 0 && (
            <ClientDocumentsPagination
              page={docsData.page}
              limit={docsData.limit}
              total={docsData.total}
              totalPages={docsData.totalPages}
              isLoading={isFetching}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </FadeInUp>
      )}

      {/* Upload Dialog */}
      <ClientDocumentUploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        clientId={client.id}
        onSuccess={() => refetch()}
      />

      {/* Replace Dialog */}
      <ClientDocumentReplaceDialog
        isOpen={Boolean(replacingDoc)}
        onClose={() => setReplacingDoc(null)}
        clientId={client.id}
        document={replacingDoc}
        onSuccess={() => refetch()}
      />

      {/* Edit Metadata Dialog */}
      <ClientDocumentEditDialog
        isOpen={Boolean(editingDoc)}
        onClose={() => setEditingDoc(null)}
        clientId={client.id}
        document={editingDoc}
        onSuccess={() => refetch()}
      />

      {/* Delete Dialog */}
      <ClientDocumentDeleteDialog
        isOpen={Boolean(deletingDoc)}
        onClose={() => setDeletingDoc(null)}
        clientId={client.id}
        document={deletingDoc}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
