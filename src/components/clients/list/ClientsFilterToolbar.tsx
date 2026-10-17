"use client";

import * as React from "react";
import { Search, X, SlidersHorizontal, ArrowUpDown, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useClientStore } from "@/store/useClientStore";
import { useDebounceCallback } from "@/hooks/ui/useDebounce";
import {
  CLIENT_TYPES,
  CLIENT_STATUSES,
  CLIENT_SORT_OPTIONS,
  ClientStatus,
  ClientSortOption,
} from "@/const/client.const";

export function ClientsFilterToolbar() {
  const store = useClientStore();
  const [prevSearch, setPrevSearch] = React.useState(store.search);
  const [searchInput, setSearchInput] = React.useState(store.search);
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  // Sync external reset with local input during render
  if (store.search !== prevSearch) {
    setPrevSearch(store.search);
    setSearchInput(store.search);
  }

  // Debounced search setter to avoid flooding API requests on keystrokes
  const debouncedSetSearch = useDebounceCallback((value: string) => {
    store.setSearch(value);
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSetSearch(value);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    debouncedSetSearch.clear();
    store.setSearch("");
  };

  const handleResetFilters = () => {
    setSearchInput("");
    debouncedSetSearch.clear();
    store.resetFilters();
  };

  const hasActiveFilters =
    store.search.trim() !== "" ||
    store.clientType !== "ALL" ||
    store.status !== "ALL" ||
    store.startDate !== null ||
    store.endDate !== null ||
    store.sort !== CLIENT_SORT_OPTIONS.NEWEST;

  return (
    <div className="space-y-3 p-4 rounded-2xl border border-border/70 dark:border-white/10 bg-card/60 backdrop-blur-md shadow-sm">
      {/* Primary Toolbar Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by client name, organization, number (CL-2026), phone, NID..."
            value={searchInput}
            onChange={handleSearchChange}
            className="pl-9 pr-9 h-9 text-xs rounded-xl"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Buttons & Sort */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Client Type Toggle */}
          <div className="inline-flex rounded-xl p-0.5 border border-border/60 bg-muted/40 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => store.setClientType("ALL")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                store.clientType === "ALL"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => store.setClientType(CLIENT_TYPES.INDIVIDUAL)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                store.clientType === CLIENT_TYPES.INDIVIDUAL
                  ? "bg-background text-foreground shadow-xs font-semibold text-sapphire-600 dark:text-sapphire-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => store.setClientType(CLIENT_TYPES.ORGANIZATION)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                store.clientType === CLIENT_TYPES.ORGANIZATION
                  ? "bg-background text-foreground shadow-xs font-semibold text-gold-600 dark:text-gold-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Corporate
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 border border-border/60 bg-background/80 dark:bg-card/60 px-2.5 py-1 rounded-xl text-xs text-muted-foreground">
            <ArrowUpDown className="w-3.5 h-3.5 text-gold-500 shrink-0" />
            <select
              value={store.sort}
              onChange={(e) => store.setSort(e.target.value as ClientSortOption)}
              className="bg-transparent text-xs text-foreground focus:outline-none cursor-pointer pr-1"
              aria-label="Sort clients by"
            >
              <option value={CLIENT_SORT_OPTIONS.NEWEST}>Newest First</option>
              <option value={CLIENT_SORT_OPTIONS.OLDEST}>Oldest First</option>
              <option value={CLIENT_SORT_OPTIONS.NAME_ASC}>Name (A–Z)</option>
              <option value={CLIENT_SORT_OPTIONS.NAME_DESC}>Name (Z–A)</option>
              <option value={CLIENT_SORT_OPTIONS.CLIENT_NUMBER_ASC}>Client # Asc</option>
              <option value={CLIENT_SORT_OPTIONS.CLIENT_NUMBER_DESC}>Client # Desc</option>
            </select>
          </div>

          {/* Advanced Filters Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`h-9 px-2.5 text-xs rounded-xl gap-1.5 ${
              showAdvancedFilters || store.status !== "ALL" || store.startDate
                ? "border-gold-500/50 text-gold-600 dark:text-gold-400 bg-gold-500/5"
                : "border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </Button>

          {/* Reset Action */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2 text-xs rounded-xl text-muted-foreground hover:text-destructive"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Collapsible Row */}
      {showAdvancedFilters && (
        <div className="pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Client Status</label>
            <select
              value={store.status}
              onChange={(e) => store.setStatus(e.target.value as ClientStatus | "ALL")}
              className="w-full h-8 px-2.5 rounded-lg border border-border/70 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value={CLIENT_STATUSES.ACTIVE}>Active Retainers</option>
              <option value={CLIENT_STATUSES.INACTIVE}>Inactive</option>
              <option value={CLIENT_STATUSES.ARCHIVED}>Archived</option>
            </select>
          </div>

          {/* Date Range: Start Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gold-500" />
              <span>Registration From</span>
            </label>
            <input
              type="date"
              value={store.startDate || ""}
              onChange={(e) => store.setDateRange(e.target.value || null, store.endDate)}
              className="w-full h-8 px-2.5 rounded-lg border border-border/70 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/50"
            />
          </div>

          {/* Date Range: End Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gold-500" />
              <span>Registration To</span>
            </label>
            <input
              type="date"
              value={store.endDate || ""}
              onChange={(e) => store.setDateRange(store.startDate, e.target.value || null)}
              className="w-full h-8 px-2.5 rounded-lg border border-border/70 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientsFilterToolbar;
