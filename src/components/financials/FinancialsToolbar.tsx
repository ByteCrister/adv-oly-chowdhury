"use client";

import * as React from "react";
import {
  Search,
  X,
  Filter,
  RotateCcw,
  Coins,
  Receipt,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemSelect } from "@/components/shared/ItemSelect";
import { DROPDOWN_TYPES } from "@/const/dropdown.const";
import {
  FINANCIAL_RECORD_TYPES,
  FINANCIAL_SORT_OPTIONS,
  FinancialRecordType,
  FinancialSortOption,
} from "@/const/financial.const";
import {
  PAYMENT_METHOD_LIST,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
} from "@/const/client-payment.const";
import {
  CASE_EXPENSE_CATEGORY_LIST,
  CASE_EXPENSE_CATEGORY_LABELS,
  CaseExpenseCategory,
} from "@/const/case-expense.const";
import { useDebounce } from "@/hooks/ui";

export interface FinancialsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  recordType: FinancialRecordType;
  onRecordTypeChange: (value: FinancialRecordType) => void;
  clientId: string | "ALL";
  onClientChange: (value: string) => void;
  caseId: string | "ALL";
  onCaseChange: (value: string) => void;
  paymentMethod: PaymentMethod | "ALL";
  onPaymentMethodChange: (value: PaymentMethod | "ALL") => void;
  expenseCategory: CaseExpenseCategory | "ALL";
  onExpenseCategoryChange: (value: CaseExpenseCategory | "ALL") => void;
  startDate: string | null;
  endDate: string | null;
  onDateRangeChange: (start: string | null, end: string | null) => void;
  sort: FinancialSortOption;
  onSortChange: (sort: FinancialSortOption) => void;
  onResetFilters: () => void;
  totalResults?: number;
}

export function FinancialsToolbar({
  search,
  onSearchChange,
  recordType,
  onRecordTypeChange,
  clientId,
  onClientChange,
  caseId,
  onCaseChange,
  paymentMethod,
  onPaymentMethodChange,
  expenseCategory,
  onExpenseCategoryChange,
  startDate,
  endDate,
  onDateRangeChange,
  sort,
  onSortChange,
  onResetFilters,
  totalResults,
}: FinancialsToolbarProps) {
  const [localSearch, setLocalSearch] = React.useState(search);
  const [prevSearch, setPrevSearch] = React.useState(search);

  // Sync state with incoming prop during render phase (avoids cascading render effect)
  if (search !== prevSearch) {
    setPrevSearch(search);
    setLocalSearch(search);
  }

  const debouncedSearch = useDebounce(localSearch, 350);
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  // Sync debounced search to parent
  React.useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const hasActiveFilters = Boolean(
    localSearch ||
      recordType !== FINANCIAL_RECORD_TYPES.ALL ||
      clientId !== "ALL" ||
      caseId !== "ALL" ||
      paymentMethod !== "ALL" ||
      expenseCategory !== "ALL" ||
      startDate ||
      endDate ||
      sort !== FINANCIAL_SORT_OPTIONS.NEWEST_DATE
  );

  return (
    <div className="space-y-3">
      {/* Top Bar: Search, Type Tabs, Filters Toggle & Sort */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Record Type Filter Pills */}
        <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/60 self-start sm:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => onRecordTypeChange(FINANCIAL_RECORD_TYPES.ALL)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              recordType === FINANCIAL_RECORD_TYPES.ALL
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Transactions
          </button>
          <button
            type="button"
            onClick={() => onRecordTypeChange(FINANCIAL_RECORD_TYPES.PAYMENT)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              recordType === FINANCIAL_RECORD_TYPES.PAYMENT
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Payments (Income)</span>
          </button>
          <button
            type="button"
            onClick={() => onRecordTypeChange(FINANCIAL_RECORD_TYPES.EXPENSE)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              recordType === FINANCIAL_RECORD_TYPES.EXPENSE
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Case Expenses</span>
          </button>
        </div>

        {/* Right Section: Search & Actions */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60" />
            <Input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search by client, case, receipt #, or memo..."
              className="pl-9 pr-8 text-xs h-9 rounded-xl bg-card/60 backdrop-blur-md"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Filter Panel Button */}
          <Button
            type="button"
            variant={showAdvancedFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`rounded-xl text-xs gap-1.5 h-9 shrink-0 ${
              (clientId !== "ALL" || caseId !== "ALL" || paymentMethod !== "ALL" || expenseCategory !== "ALL" || startDate || endDate)
                ? "border-gold-500/40 text-gold-600 dark:text-gold-400 bg-gold-500/5"
                : ""
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showAdvancedFilters ? "rotate-180" : ""}`}
            />
          </Button>

          {/* Sort Selection */}
          <div className="relative shrink-0">
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as FinancialSortOption)}
              className="h-9 rounded-xl border border-input bg-card/60 backdrop-blur-md px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
            >
              <option value={FINANCIAL_SORT_OPTIONS.NEWEST_DATE}>Date (Newest First)</option>
              <option value={FINANCIAL_SORT_OPTIONS.OLDEST_DATE}>Date (Oldest First)</option>
              <option value={FINANCIAL_SORT_OPTIONS.AMOUNT_DESC}>Amount (High to Low)</option>
              <option value={FINANCIAL_SORT_OPTIONS.AMOUNT_ASC}>Amount (Low to High)</option>
              <option value={FINANCIAL_SORT_OPTIONS.NEWEST_CREATED}>Recently Added</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel (Collapsible) */}
      {showAdvancedFilters && (
        <div className="p-4 rounded-2xl border border-border/70 dark:border-white/10 bg-card/40 backdrop-blur-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in-0 duration-200">
          {/* Client Select */}
          <div className="space-y-1">
            <ItemSelect
              id="filter-client"
              label="Client"
              type={DROPDOWN_TYPES.CLIENT}
              value={clientId === "ALL" ? "" : clientId}
              onChange={(val) => onClientChange(val || "ALL")}
              placeholder="All Clients"
              searchPlaceholder="Filter by client name or number..."
              emptyMessage="No matching clients found."
              clearable
            />
          </div>

          {/* Case Select */}
          <div className="space-y-1">
            <ItemSelect
              id="filter-case"
              label="Case / Matter"
              type={DROPDOWN_TYPES.CASE}
              filterParams={clientId !== "ALL" ? { clientId } : undefined}
              value={caseId === "ALL" ? "" : caseId}
              onChange={(val) => onCaseChange(val || "ALL")}
              placeholder="All Cases"
              searchPlaceholder="Filter by case title or number..."
              emptyMessage={clientId !== "ALL" ? "No cases found for this client" : "No matching cases found."}
              clearable
            />
          </div>

          {/* Date Range Start & End */}
          <div className="space-y-1 sm:col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="filter-start-date" className="text-xs font-semibold text-foreground block mb-1">
                From Date
              </label>
              <Input
                id="filter-start-date"
                type="date"
                value={startDate || ""}
                onChange={(e) => onDateRangeChange(e.target.value || null, endDate)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
            <div>
              <label htmlFor="filter-end-date" className="text-xs font-semibold text-foreground block mb-1">
                To Date
              </label>
              <Input
                id="filter-end-date"
                type="date"
                value={endDate || ""}
                onChange={(e) => onDateRangeChange(startDate, e.target.value || null)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Payment Method Filter (Visible for ALL or PAYMENT) */}
          {recordType !== FINANCIAL_RECORD_TYPES.EXPENSE && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod | "ALL")}
                className="h-9 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
              >
                <option value="ALL">All Payment Methods</option>
                {PAYMENT_METHOD_LIST.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Expense Category Filter (Visible for ALL or EXPENSE) */}
          {recordType !== FINANCIAL_RECORD_TYPES.PAYMENT && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground block">Expense Category</label>
              <select
                value={expenseCategory}
                onChange={(e) => onExpenseCategoryChange(e.target.value as CaseExpenseCategory | "ALL")}
                className="h-9 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
              >
                <option value="ALL">All Expense Categories</option>
                {CASE_EXPENSE_CATEGORY_LIST.map((c) => (
                  <option key={c} value={c}>
                    {CASE_EXPENSE_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters in Panel */}
          <div className="sm:col-span-2 lg:col-span-2 flex items-end">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-9"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
          <span className="font-medium text-[11px] uppercase tracking-wider">Active:</span>

          {recordType !== FINANCIAL_RECORD_TYPES.ALL && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs">
              Type: {recordType === "PAYMENT" ? "Client Payments" : "Case Expenses"}
              <button
                type="button"
                onClick={() => onRecordTypeChange(FINANCIAL_RECORD_TYPES.ALL)}
                className="hover:text-destructive p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {clientId !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20 text-xs">
              Client Filtered
              <button
                type="button"
                onClick={() => onClientChange("ALL")}
                className="hover:text-destructive p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {caseId !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20 text-xs">
              Case Filtered
              <button
                type="button"
                onClick={() => onCaseChange("ALL")}
                className="hover:text-destructive p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(startDate || endDate) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs">
              Date: {startDate || "Start"} to {endDate || "Present"}
              <button
                type="button"
                onClick={() => onDateRangeChange(null, null)}
                className="hover:text-destructive p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {paymentMethod !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs">
              Method: {PAYMENT_METHOD_LABELS[paymentMethod]}
              <button
                type="button"
                onClick={() => onPaymentMethodChange("ALL")}
                className="hover:text-destructive p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {expenseCategory !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs">
              Category: {CASE_EXPENSE_CATEGORY_LABELS[expenseCategory]}
              <button
                type="button"
                onClick={() => onExpenseCategoryChange("ALL")}
                className="hover:text-destructive p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>

          {typeof totalResults === "number" && (
            <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline font-medium">
              {totalResults} {totalResults === 1 ? "entry" : "entries"} found
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default FinancialsToolbar;
