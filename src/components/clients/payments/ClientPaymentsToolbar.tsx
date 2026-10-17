"use client";

import * as React from "react";
import { Search, X, RotateCcw, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PAYMENT_METHOD_LIST,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LIST,
  PAYMENT_TYPE_LABELS,
  CLIENT_PAYMENT_SORT_OPTIONS,
  CLIENT_PAYMENT_SORT_OPTION_LIST,
  PaymentMethod,
  PaymentType,
  ClientPaymentSortOption,
} from "@/const/client-payment.const";
import { useClientPaymentStore } from "@/store/useClientPaymentStore";
import { useDebounceCallback } from "@/hooks/ui/useDebounce";

const PAYMENT_SORT_LABELS: Record<ClientPaymentSortOption, string> = {
  [CLIENT_PAYMENT_SORT_OPTIONS.NEWEST_PAYMENT]: "Newest Payment Date",
  [CLIENT_PAYMENT_SORT_OPTIONS.OLDEST_PAYMENT]: "Oldest Payment Date",
  [CLIENT_PAYMENT_SORT_OPTIONS.AMOUNT_DESC]: "Highest Amount First",
  [CLIENT_PAYMENT_SORT_OPTIONS.AMOUNT_ASC]: "Lowest Amount First",
  [CLIENT_PAYMENT_SORT_OPTIONS.NEWEST_CREATED]: "Recently Added",
};

export function ClientPaymentsToolbar() {
  const search = useClientPaymentStore((s) => s.search);
  const paymentMethod = useClientPaymentStore((s) => s.paymentMethod);
  const paymentType = useClientPaymentStore((s) => s.paymentType);
  const sort = useClientPaymentStore((s) => s.sort);
  const startDate = useClientPaymentStore((s) => s.startDate);
  const endDate = useClientPaymentStore((s) => s.endDate);

  const setSearch = useClientPaymentStore((s) => s.setSearch);
  const setPaymentMethod = useClientPaymentStore((s) => s.setPaymentMethod);
  const setPaymentType = useClientPaymentStore((s) => s.setPaymentType);
  const setSort = useClientPaymentStore((s) => s.setSort);
  const setDateRange = useClientPaymentStore((s) => s.setDateRange);
  const resetFilters = useClientPaymentStore((s) => s.resetFilters);

  const [prevSearch, setPrevSearch] = React.useState(search);
  const [searchTerm, setSearchTerm] = React.useState(search);

  // Keep local search input in sync if store's search is updated externally (e.g. reset filters)
  if (search !== prevSearch) {
    setPrevSearch(search);
    setSearchTerm(search);
  }

  // Debounced search setter to avoid flooding API requests on keystrokes
  const debouncedSetSearch = useDebounceCallback((value: string) => {
    setSearch(value);
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSetSearch(value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    debouncedSetSearch.clear();
    setSearch("");
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    debouncedSetSearch.clear();
    resetFilters();
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    paymentMethod !== "ALL" ||
    paymentType !== "ALL" ||
    startDate !== null ||
    endDate !== null ||
    sort !== CLIENT_PAYMENT_SORT_OPTIONS.NEWEST_PAYMENT;

  return (
    <div className="p-4 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
          <Input
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by Money Receipt #, reference, notes..."
            className="pl-9 pr-8 h-10 rounded-xl"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-3 text-muted-foreground hover:text-foreground"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Method Filter */}
          <select
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as PaymentMethod | "ALL")
            }
            className="h-9 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
          >
            <option value="ALL">All Methods</option>
            {PAYMENT_METHOD_LIST.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={paymentType}
            onChange={(e) =>
              setPaymentType(e.target.value as PaymentType | "ALL")
            }
            className="h-9 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
          >
            <option value="ALL">All Fee Types</option>
            {PAYMENT_TYPE_LIST.map((t) => (
              <option key={t} value={t}>
                {PAYMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as ClientPaymentSortOption)
            }
            className="h-9 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40 cursor-pointer"
          >
            {CLIENT_PAYMENT_SORT_OPTION_LIST.map((val) => (
              <option key={val} value={val}>
                {PAYMENT_SORT_LABELS[val] || val}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-background/80 dark:bg-card/60 border border-input rounded-xl px-2.5 h-9 text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="date"
              value={startDate || ""}
              onChange={(e) => setDateRange(e.target.value || null, endDate)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer w-24"
              title="Filter from payment date"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={endDate || ""}
              onChange={(e) => setDateRange(startDate, e.target.value || null)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer w-24"
              title="Filter to payment date"
            />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 rounded-xl text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
