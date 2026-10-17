"use client";

import * as React from "react";
import Link from "next/link";
import { FadeInUp } from "@/components/wrappers/Motion";
import { useClientDetails, useClientPaymentList } from "@/hooks/clients";
import { useClientPaymentStore } from "@/store/useClientPaymentStore";
import { ClientPaymentsHeader } from "./ClientPaymentsHeader";
import { ClientPaymentsSummaryCards } from "./ClientPaymentsSummaryCards";
import { ClientPaymentsToolbar } from "./ClientPaymentsToolbar";
import { ClientPaymentsTable } from "./ClientPaymentsTable";
import { ClientPaymentsPagination } from "./ClientPaymentsPagination";
import { ClientPaymentsSkeleton } from "./ClientPaymentsSkeleton";
import { ClientPaymentFormDialog } from "./ClientPaymentFormDialog";
import { ClientPaymentDeleteDialog } from "./ClientPaymentDeleteDialog";
import type { ClientPaymentItemDto } from "@/types/client-payment.types";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ClientPaymentsPageProps {
  clientId: string;
}

export function ClientPaymentsPage({ clientId }: ClientPaymentsPageProps) {
  // Store params
  const page = useClientPaymentStore((s) => s.page);
  const limit = useClientPaymentStore((s) => s.limit);
  const search = useClientPaymentStore((s) => s.search);
  const paymentMethod = useClientPaymentStore((s) => s.paymentMethod);
  const paymentType = useClientPaymentStore((s) => s.paymentType);
  const caseId = useClientPaymentStore((s) => s.caseId);
  const startDate = useClientPaymentStore((s) => s.startDate);
  const endDate = useClientPaymentStore((s) => s.endDate);
  const sort = useClientPaymentStore((s) => s.sort);
  const setPage = useClientPaymentStore((s) => s.setPage);
  const setLimit = useClientPaymentStore((s) => s.setLimit);
  const resetFilters = useClientPaymentStore((s) => s.resetFilters);

  const filterParams = React.useMemo(
    () => ({
      page,
      limit,
      sort,
      search: search.trim() ? search.trim() : undefined,
      paymentMethod: paymentMethod !== "ALL" ? paymentMethod : undefined,
      paymentType: paymentType !== "ALL" ? paymentType : undefined,
      caseId: caseId !== "ALL" ? caseId : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [page, limit, sort, search, paymentMethod, paymentType, caseId, startDate, endDate]
  );

  // Queries
  const {
    data: client,
    isLoading: isClientLoading,
    isError: isClientError,
    error: clientError,
  } = useClientDetails(clientId);

  const {
    data: paymentsData,
    isLoading: isPaymentsLoading,
    isError: isPaymentsError,
    error: paymentsError,
    refetch,
    isFetching,
  } = useClientPaymentList(clientId, filterParams);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingPayment, setEditingPayment] = React.useState<ClientPaymentItemDto | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [deletingPayment, setDeletingPayment] = React.useState<ClientPaymentItemDto | null>(null);

  const handleRecordNew = () => {
    setEditingPayment(null);
    setIsFormOpen(true);
  };

  const handleEditPayment = (payment: ClientPaymentItemDto) => {
    setEditingPayment(payment);
    setIsFormOpen(true);
  };

  const handleDeletePayment = (payment: ClientPaymentItemDto) => {
    setDeletingPayment(payment);
    setIsDeleteOpen(true);
  };

  if (isClientLoading) {
    return <ClientPaymentsSkeleton />;
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
      {/* 1. Header Banner */}
      <FadeInUp delay={0.05}>
        <ClientPaymentsHeader
          client={client}
          totalPayments={paymentsData?.total ?? client.stats.totalPayments}
          onRecordClick={handleRecordNew}
        />
      </FadeInUp>

      {/* 2. Financial Summary Cards */}
      {paymentsData?.summary && (
        <FadeInUp delay={0.1}>
          <ClientPaymentsSummaryCards summary={paymentsData.summary} />
        </FadeInUp>
      )}

      {/* 3. Filter Toolbar */}
      <FadeInUp delay={0.15}>
        <ClientPaymentsToolbar />
      </FadeInUp>

      {/* 4. Main Payments Table */}
      {isPaymentsLoading ? (
        <ClientPaymentsSkeleton />
      ) : isPaymentsError ? (
        <FadeInUp delay={0.2}>
          <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">
              Unable to Load Payment Ledger
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {(paymentsError as Error)?.message || "Failed to retrieve payment records."}
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
        <FadeInUp delay={0.2} className="space-y-4">
          <ClientPaymentsTable
            payments={paymentsData?.items || []}
            isLoading={isFetching}
            onEditPayment={handleEditPayment}
            onDeletePayment={handleDeletePayment}
            onRecordNew={handleRecordNew}
            onResetFilters={resetFilters}
          />

          {paymentsData && paymentsData.total > 0 && (
            <ClientPaymentsPagination
              page={paymentsData.page}
              limit={paymentsData.limit}
              total={paymentsData.total}
              totalPages={paymentsData.totalPages}
              isLoading={isFetching}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </FadeInUp>
      )}

      {/* Payment Form Dialog (Create / Edit) */}
      <ClientPaymentFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPayment(null);
        }}
        clientId={client.id}
        payment={editingPayment}
        cases={client.recentCases}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <ClientPaymentDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeletingPayment(null);
        }}
        clientId={client.id}
        payment={deletingPayment}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
