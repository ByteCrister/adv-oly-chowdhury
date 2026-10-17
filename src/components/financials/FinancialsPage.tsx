"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FadeInUp } from "@/components/wrappers/Motion";
import { useFinancialStore } from "@/store/useFinancialStore";
import { useFinancialList } from "@/hooks/financials";
import { FinancialsHeader } from "./FinancialsHeader";
import { FinancialsSummaryCards } from "./FinancialsSummaryCards";
import { FinancialsToolbar } from "./FinancialsToolbar";
import { FinancialsAccordionList } from "./FinancialsAccordionList";
import { FinancialsPagination } from "./FinancialsPagination";
import { FinancialsPageSkeleton } from "./FinancialsSkeleton";
import { ClientPaymentFormDialog } from "@/components/clients/payments/ClientPaymentFormDialog";
import { ClientPaymentDeleteDialog } from "@/components/clients/payments/ClientPaymentDeleteDialog";
import { CaseExpenseDeleteDialog } from "./case-expense/CaseExpenseDeleteDialog";
import type { UnifiedFinancialRecordDto } from "@/types/financial.types";
import type { ClientPaymentItemDto } from "@/types/client-payment.types";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinancialsPage() {
  const router = useRouter();

  // Store params
  const search = useFinancialStore((s) => s.search);
  const recordType = useFinancialStore((s) => s.recordType);
  const clientId = useFinancialStore((s) => s.clientId);
  const caseId = useFinancialStore((s) => s.caseId);
  const paymentMethod = useFinancialStore((s) => s.paymentMethod);
  const expenseCategory = useFinancialStore((s) => s.expenseCategory);
  const startDate = useFinancialStore((s) => s.startDate);
  const endDate = useFinancialStore((s) => s.endDate);
  const sort = useFinancialStore((s) => s.sort);
  const page = useFinancialStore((s) => s.page);
  const limit = useFinancialStore((s) => s.limit);

  const setSearch = useFinancialStore((s) => s.setSearch);
  const setRecordType = useFinancialStore((s) => s.setRecordType);
  const setClientId = useFinancialStore((s) => s.setClientId);
  const setCaseId = useFinancialStore((s) => s.setCaseId);
  const setPaymentMethod = useFinancialStore((s) => s.setPaymentMethod);
  const setExpenseCategory = useFinancialStore((s) => s.setExpenseCategory);
  const setDateRange = useFinancialStore((s) => s.setDateRange);
  const setSort = useFinancialStore((s) => s.setSort);
  const setPage = useFinancialStore((s) => s.setPage);
  const setLimit = useFinancialStore((s) => s.setLimit);
  const resetFilters = useFinancialStore((s) => s.resetFilters);

  const filterParams = React.useMemo(
    () => ({
      page,
      limit,
      sort,
      search: search.trim() ? search.trim() : undefined,
      recordType: recordType !== "ALL" ? recordType : undefined,
      clientId: clientId !== "ALL" ? clientId : undefined,
      caseId: caseId !== "ALL" ? caseId : undefined,
      paymentMethod: paymentMethod !== "ALL" ? paymentMethod : undefined,
      expenseCategory: expenseCategory !== "ALL" ? expenseCategory : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [
      page,
      limit,
      sort,
      search,
      recordType,
      clientId,
      caseId,
      paymentMethod,
      expenseCategory,
      startDate,
      endDate,
    ]
  );

  // Unified Query
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useFinancialList(filterParams);

  // Dialog States
  const [isPaymentFormOpen, setIsPaymentFormOpen] = React.useState(false);
  const [editingPayment, setEditingPayment] = React.useState<ClientPaymentItemDto | null>(null);
  const [deletingPayment, setDeletingPayment] = React.useState<ClientPaymentItemDto | null>(null);
  const [deletingExpense, setDeletingExpense] = React.useState<UnifiedFinancialRecordDto | null>(null);

  const handleOpenRecordPayment = () => {
    setEditingPayment(null);
    setIsPaymentFormOpen(true);
  };

  const handleEditPayment = (payment: ClientPaymentItemDto) => {
    setEditingPayment(payment);
    setIsPaymentFormOpen(true);
  };

  const handleDeletePayment = (payment: ClientPaymentItemDto) => {
    setDeletingPayment(payment);
  };

  const handleEditExpense = (expenseId: string) => {
    router.push(`/dashboard/financials/case-expense/${expenseId}`);
  };

  const handleDeleteExpense = (record: UnifiedFinancialRecordDto) => {
    setDeletingExpense(record);
  };

  if (isLoading && !data) {
    return <FinancialsPageSkeleton />;
  }

  if (isError && !data) {
    return (
      <div className="p-12 text-center rounded-2xl bg-card/60 backdrop-blur-md border border-destructive/20 shadow-sm space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-foreground">
            Failed to Load Financial Ledger
          </h3>
          <p className="text-xs text-muted-foreground">
            {error?.message || "An unexpected error occurred while communicating with the financial accounting service."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="rounded-xl text-xs gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </Button>
      </div>
    );
  }

  const records = data?.items || [];
  const summary = data?.summary || {
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    paymentCount: 0,
    expenseCount: 0,
    totalCount: 0,
    methodBreakdown: {},
    categoryBreakdown: {},
  };
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <FadeInUp className="space-y-6">
      {/* 1. Dashboard Header */}
      <FinancialsHeader
        onRecordPayment={handleOpenRecordPayment}
        onRefresh={() => refetch()}
        isFetching={isFetching}
      />

      {/* 2. Statistical Highlights */}
      <FinancialsSummaryCards summary={summary} />

      {/* 3. Search & Multi-Criteria Filter Toolbar */}
      <FinancialsToolbar
        search={search}
        onSearchChange={setSearch}
        recordType={recordType}
        onRecordTypeChange={setRecordType}
        clientId={clientId}
        onClientChange={setClientId}
        caseId={caseId}
        onCaseChange={setCaseId}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        expenseCategory={expenseCategory}
        onExpenseCategoryChange={setExpenseCategory}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={setDateRange}
        sort={sort}
        onSortChange={setSort}
        onResetFilters={resetFilters}
        totalResults={total}
      />

      {/* 4. Unified Financial Records Accordion List */}
      <FinancialsAccordionList
        records={records}
        isLoading={isFetching}
        onEditPayment={handleEditPayment}
        onDeletePayment={handleDeletePayment}
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
        onRecordPayment={handleOpenRecordPayment}
        onRecordExpense={() => router.push("/dashboard/financials/case-expense/new")}
        onResetFilters={resetFilters}
      />

      {/* 5. Pagination Toolbar */}
      <FinancialsPagination
        page={page}
        limit={limit}
        total={total}
        totalPages={totalPages}
        isLoading={isFetching}
        onPageChange={setPage}
        onLimitChange={setLimit}
      />

      {/* Client Payment Form Dialog (Reused from src/components/clients/payments) */}
      <ClientPaymentFormDialog
        isOpen={isPaymentFormOpen}
        onClose={() => {
          setIsPaymentFormOpen(false);
          setEditingPayment(null);
        }}
        clientId={editingPayment?.clientId}
        payment={editingPayment}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Client Payment Delete Dialog (Reused from src/components/clients/payments) */}
      {deletingPayment && (
        <ClientPaymentDeleteDialog
          isOpen={Boolean(deletingPayment)}
          onClose={() => setDeletingPayment(null)}
          clientId={deletingPayment.clientId}
          payment={deletingPayment}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {/* Case Expense Delete Dialog */}
      {deletingExpense && (
        <CaseExpenseDeleteDialog
          isOpen={Boolean(deletingExpense)}
          onClose={() => setDeletingExpense(null)}
          expense={deletingExpense}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </FadeInUp>
  );
}

export default FinancialsPage;
