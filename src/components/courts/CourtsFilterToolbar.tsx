"use client";

import * as React from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  Calendar,
  RotateCcw,
  Building,
  Filter,
} from "lucide-react";
import { useCourtStore } from "@/store/useCourtStore";
import { useDebounceCallback } from "@/hooks/ui";
import {
  COURT_TYPE_LIST,
  COURT_TYPE_LABELS,
  COURT_SORT_OPTIONS,
  COURT_SORT_LABELS,
  BANGLADESH_DIVISION_LIST,
  CourtType,
  CourtSortOption,
} from "@/const/court.const";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CourtsFilterToolbar() {
  const {
    search,
    courtType,
    district,
    division,
    isActive,
    startDate,
    endDate,
    sort,
    setSearch,
    setCourtType,
    setDistrict,
    setDivision,
    setIsActive,
    setDateRange,
    setSort,
    resetFilters,
  } = useCourtStore();

  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [prevSearch, setPrevSearch] = React.useState(search);
  const [searchTerm, setSearchTerm] = React.useState(search);

  // Keep local search input in sync if store's search is updated externally (e.g. reset filters)
  if (search !== prevSearch) {
    setPrevSearch(search);
    setSearchTerm(search);
  }

  // Debounce the store update so search queries don't flood on every keystroke
  const debouncedSetSearch = useDebounceCallback((value: string) => {
    setSearch(value);
  }, 350);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value); // Immediate local update -> typing is 100% fluid and uninterrupted
    debouncedSetSearch(value); // Debounced store update -> triggers query after typing stops
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    debouncedSetSearch.clear();
    setSearch("");
  };

  // Calculate active filter count (excluding default search/sort)
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (courtType !== "ALL") count++;
    if (district !== "ALL") count++;
    if (division !== "ALL") count++;
    if (isActive !== "ALL") count++;
    if (startDate || endDate) count++;
    if (sort !== COURT_SORT_OPTIONS.NEWEST) count++;
    return count;
  }, [search, courtType, district, division, isActive, startDate, endDate, sort]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-card/85 dark:bg-card/60 border border-border/70 dark:border-white/10 shadow-sm space-y-4">
      {/* 1. Primary Filter Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        {/* Search Input */}
        <div className="sm:col-span-2 lg:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search bench name, room, judge, district..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-9 pr-8 h-10 text-xs rounded-xl"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Court Type Dropdown */}
        <div className="lg:col-span-4">
          <select
            value={courtType}
            onChange={(e) => setCourtType(e.target.value as CourtType | "ALL")}
            className="flex h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-all cursor-pointer truncate"
          >
            <option value="ALL">All Court Types & Tribunals</option>
            {COURT_TYPE_LIST.map((type) => (
              <option key={type} value={type}>
                {COURT_TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Options Dropdown */}
        <div className="lg:col-span-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CourtSortOption)}
            className="flex h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 transition-all cursor-pointer"
          >
            {Object.entries(COURT_SORT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle Advanced Filters Button */}
        <div className="lg:col-span-1 flex items-center justify-end">
          <Button
            type="button"
            variant={showAdvanced || activeFilterCount > 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full h-10 rounded-xl px-2.5 text-xs flex items-center justify-center gap-1.5"
            title="More Filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-gold-500 text-midnight-950 font-bold text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* 2. Secondary Advanced Filters (Collapsible / Expandable) */}
      {showAdvanced && (
        <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in-50 duration-200">
          {/* District Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Building className="w-3 h-3" />
              <span>District</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="e.g. Sylhet, Moulvibazar..."
                value={district === "ALL" ? "" : district}
                onChange={(e) => setDistrict(e.target.value.trim() ? e.target.value : "ALL")}
                className="h-9 text-xs rounded-xl"
              />
              {district !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setDistrict("ALL")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Division Select */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Division
            </label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 cursor-pointer"
            >
              <option value="ALL">All Divisions</option>
              {BANGLADESH_DIVISION_LIST.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>

          {/* Active Status Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Bench Operational Status
            </label>
            <select
              value={isActive === "ALL" ? "ALL" : isActive ? "true" : "false"}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "ALL") setIsActive("ALL");
                else setIsActive(val === "true");
              }}
              className="flex h-9 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 py-1.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 cursor-pointer"
            >
              <option value="ALL">All Statuses (Active & Inactive)</option>
              <option value="true">Active Benches Only</option>
              <option value="false">Inactive / Discontinued</option>
            </select>
          </div>

          {/* Date Range Inputs */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Created Date Range</span>
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={startDate || ""}
                onChange={(e) => setDateRange(e.target.value || null, endDate)}
                className="h-9 text-[11px] px-2 rounded-xl"
                title="Start Date"
              />
              <span className="text-muted-foreground text-xs font-semibold">to</span>
              <Input
                type="date"
                value={endDate || ""}
                onChange={(e) => setDateRange(startDate, e.target.value || null)}
                className="h-9 text-[11px] px-2 rounded-xl"
                title="End Date"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Active Filter Badges & Quick Reset Bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-gold-500" />
              <span>Active filters:</span>
            </span>

            {search.trim() && (
              <Badge variant="gold" className="cursor-pointer" onClick={handleClearSearch}>
                Search: &quot;{search}&quot;
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}

            {courtType !== "ALL" && (
              <Badge
                variant="sapphire"
                className="cursor-pointer"
                onClick={() => setCourtType("ALL")}
              >
                Type: {COURT_TYPE_LABELS[courtType as CourtType] || courtType}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}

            {district !== "ALL" && (
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => setDistrict("ALL")}
              >
                District: {district}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}

            {division !== "ALL" && (
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => setDivision("ALL")}
              >
                Division: {division}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}

            {isActive !== "ALL" && (
              <Badge
                variant={isActive ? "emerald" : "outline"}
                className="cursor-pointer"
                onClick={() => setIsActive("ALL")}
              >
                Status: {isActive ? "Active Only" : "Inactive Only"}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}

            {(startDate || endDate) && (
              <Badge
                variant="amber"
                className="cursor-pointer"
                onClick={() => setDateRange(null, null)}
              >
                Date: {startDate || "Any"} → {endDate || "Any"}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            <span>Reset Filters</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export default CourtsFilterToolbar;
