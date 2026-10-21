"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FadeInUp } from "@/components/wrappers/Motion";
import { useClientStore } from "@/store/useClientStore";
import { useClientList } from "@/hooks/clients";
import { ClientsStatsHeader } from "./ClientsStatsHeader";
import { ClientsFilterToolbar } from "./ClientsFilterToolbar";
import { ClientsTable } from "./ClientsTable";
import { ClientsPagination } from "./ClientsPagination";
import { ClientsListSkeleton } from "./ClientsListSkeleton";
import { ClientFormDialog } from "./ClientFormDialog";
import { ClientDeleteDialog } from "./ClientDeleteDialog";
import type { ClientListItemDto } from "@/types/client.types";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClientsOverviewPage() {
  // Store state & actions
  const page = useClientStore((s) => s.page);
  const limit = useClientStore((s) => s.limit);
  const search = useClientStore((s) => s.search);
  const clientType = useClientStore((s) => s.clientType);
  const status = useClientStore((s) => s.status);
  const startDate = useClientStore((s) => s.startDate);
  const endDate = useClientStore((s) => s.endDate);
  const sort = useClientStore((s) => s.sort);
  const setPage = useClientStore((s) => s.setPage);
  const setLimit = useClientStore((s) => s.setLimit);
  const resetFilters = useClientStore((s) => s.resetFilters);

  // TanStack Query
  const filterParams = React.useMemo(
    () => ({
      page,
      limit,
      sort,
      search: search.trim() ? search.trim() : undefined,
      clientType: clientType !== "ALL" ? clientType : undefined,
      status: status !== "ALL" ? status : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, limit, sort, search, clientType, status, startDate, endDate]
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useClientList(filterParams);

  const router = useRouter();

  // Dialog states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<ClientListItemDto | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingClient, setDeletingClient] = React.useState<ClientListItemDto | null>(null);

  const handleAddNew = () => {
    router.push("/dashboard/clients/new");
  };

  const handleEditClient = (client: ClientListItemDto) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClient = (client: ClientListItemDto) => {
    setDeletingClient(client);
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Live Stats & New Client Button */}
      <FadeInUp delay={0.05}>
        <ClientsStatsHeader
          stats={data?.stats}
          isLoading={isLoading}
          isFetching={isFetching}
          onRefetch={() => refetch()}
          onAddNew={handleAddNew}
        />
      </FadeInUp>

      {/* 2. Search, Filter & Sort Toolbar */}
      <FadeInUp delay={0.1}>
        <ClientsFilterToolbar />
      </FadeInUp>

      {/* 3. Main Content: Loading, Error, or Table + Pagination */}
      {isLoading ? (
        <ClientsListSkeleton />
      ) : isError ? (
        <FadeInUp delay={0.15}>
          <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              Unable to Load Clients Registry
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {(error as Error)?.message ||
                "Failed to communicate with the client management database. Please verify your connection or retry."}
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
          {/* Table Container */}
          <ClientsTable
            clients={data?.items || []}
            isLoading={isFetching}
            onEditClient={handleEditClient}
            onDeleteClient={handleDeleteClient}
            onAddNew={handleAddNew}
            onResetFilters={resetFilters}
          />

          {/* Pagination */}
          {data && data.total > 0 && (
            <ClientsPagination
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

      {/* Form Dialog for Create & Edit */}
      <ClientFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingClient(null);
        }}
        client={editingClient}
      />

      {/* Confirmation Dialog for Delete */}
      <ClientDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingClient(null);
        }}
        client={deletingClient}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
