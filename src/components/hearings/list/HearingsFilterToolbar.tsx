"use client";

import * as React from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { useHearingStore } from "@/store/useHearingStore";
import { useDebounceCallback } from "@/hooks/ui";
import {
  HEARING_STATUS_LIST,
  HEARING_STATUS_LABELS,
  COMMON_HEARING_TYPE_LIST,
  HEARING_SORT_OPTIONS,
  HEARING_SORT_LABELS,
  type HearingStatus,
  type HearingSortOption,
} from "@/const/hearing.const";
import { DROPDOWN_TYPES } from "@/const/dropdown.const";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ItemSelect } from "@/components/shared/ItemSelect";

export function HearingsFilterToolbar() {
  const {
    search,
    status,
    courtId,
    caseId,
    hearingType,
    startDate,
    endDate,
    sort,
    setSearch,
    setStatus,
    setCourtId,
    setCaseId,
    setHearingType,
    setDateRange,
    setSort,
    resetFilters,
  } = useHearingStore();

  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [prevSearch, setPrevSearch] = React.useState(search);
  const [searchTerm, setSearchTerm] = React.useState(search);

  // Sync internal search state if store changes externally (e.g. reset)
  if (search !== prevSearch) {
    setPrevSearch(search);
    setSearchTerm(search);
  }

  const debouncedSetSearch = useDebounceCallback((value: string) => {
    setSearch(value);
  }, 350);

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

  // Calculate active filter count
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (status !== "ALL") count++;
    if (courtId !== "ALL" && courtId.trim()) count++;
    if (caseId.trim()) count++;
    if (hearingType !== "ALL" && hearingType.trim()) count++;
    if (startDate || endDate) count++;
    if (sort !== HEARING_SORT_OPTIONS.UPCOMING_FIRST) count++;
    return count;
  }, [search, status, courtId, caseId, hearingType, startDate, endDate, sort]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-card/85 dark:bg-card/60 border border-border/70 dark:border-white/10 shadow-sm space-y-4">
      {/* 1. Primary Filter Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="sm:col-span-2 lg:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search purpose, case title, case no, client, court..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-9 pr-8 h-10 text-xs rounded-xl"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="lg:col-span-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as HearingStatus | "ALL")}
            className="w-full h-10 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40"
          >
            <option value="ALL">All Hearing Statuses</option>
            {HEARING_STATUS_LIST.map((st) => (
              <option key={st} value={st}>
                {HEARING_STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Filter */}
        <div className="lg:col-span-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as HearingSortOption)}
            className="w-full h-10 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40"
          >
            {Object.entries(HEARING_SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Filters & Reset Buttons */}
        <div className="lg:col-span-2 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-full h-10 rounded-xl text-xs gap-1.5 transition-all ${
              showAdvanced || activeFilterCount > 0
                ? "border-gold-500/40 bg-gold-500/10 text-gold-600 dark:text-gold-400"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge
                variant="gold"
                className="ml-0.5 px-1.5 py-0 h-4 text-[10px] font-bold"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-10 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 2. Collapsible Advanced Filters Drawer */}
      {showAdvanced && (
        <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Case Selector */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Filter by Case
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CASE}
              value={caseId}
              onChange={(val) => setCaseId(val)}
              placeholder="All Cases..."
              searchPlaceholder="Type case title or number..."
              clearable
            />
          </div>

          {/* Court Selector */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Filter by Court Bench
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.COURT}
              value={courtId === "ALL" ? "" : courtId}
              onChange={(val) => setCourtId(val || "ALL")}
              placeholder="All Court Benches..."
              searchPlaceholder="Search court by name..."
              clearable
            />
          </div>

          {/* Hearing Type Selector */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Proceedings Type
            </label>
            <select
              value={hearingType}
              onChange={(e) => setHearingType(e.target.value)}
              className="w-full h-10 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            >
              <option value="ALL">All Proceeding Types</option>
              {COMMON_HEARING_TYPE_LIST.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Controls */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <Input
                type="date"
                value={startDate || ""}
                onChange={(e) => setDateRange(e.target.value || null, endDate)}
                className="h-10 text-[11px] px-2 rounded-xl"
                title="Start Date"
              />
              <Input
                type="date"
                value={endDate || ""}
                onChange={(e) => setDateRange(startDate, e.target.value || null)}
                className="h-10 text-[11px] px-2 rounded-xl"
                title="End Date"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HearingsFilterToolbar;
