"use client";

import * as React from "react";
import {
  Search,
  X,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemSelect } from "@/components/shared";
import { useCaseStore } from "@/store/useCaseStore";
import { useDebounce } from "@/hooks/ui";
import {
  CASE_STATUS_LIST,
  CASE_STATUS_LABELS,
  CASE_TYPE_LIST,
  CASE_TYPE_LABELS,
  CASE_PRIORITY_LIST,
  CASE_PRIORITY_LABELS,
  CASE_SORT_OPTION_LIST,
  CASE_SORT_LABELS,
  CASE_PAGE_LIMITS,
  CaseStatus,
  CaseType,
  CasePriority,
  CaseSortOption,
  CasePageLimit,
} from "@/const/case.const";

export function CasesFilterToolbar() {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Store bindings
  const search = useCaseStore((s) => s.search);
  const caseStatus = useCaseStore((s) => s.caseStatus);
  const caseType = useCaseStore((s) => s.caseType);
  const priority = useCaseStore((s) => s.priority);
  const courtId = useCaseStore((s) => s.courtId);
  const clientId = useCaseStore((s) => s.clientId);
  const filingYear = useCaseStore((s) => s.filingYear);
  const sort = useCaseStore((s) => s.sort);
  const limit = useCaseStore((s) => s.limit);

  const setSearch = useCaseStore((s) => s.setSearch);
  const setCaseStatus = useCaseStore((s) => s.setCaseStatus);
  const setCaseType = useCaseStore((s) => s.setCaseType);
  const setPriority = useCaseStore((s) => s.setPriority);
  const setCourtId = useCaseStore((s) => s.setCourtId);
  const setClientId = useCaseStore((s) => s.setClientId);
  const setFilingYear = useCaseStore((s) => s.setFilingYear);
  const setSort = useCaseStore((s) => s.setSort);
  const setLimit = useCaseStore((s) => s.setLimit);
  const resetFilters = useCaseStore((s) => s.resetFilters);

  // Debounced search text
  const [localSearch, setLocalSearch] = React.useState(search);
  const debouncedSearch = useDebounce(localSearch, 350);

  React.useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  // Keep local search in sync if store resets (React 19 pattern)
  const [prevSearch, setPrevSearch] = React.useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setLocalSearch(search);
  }

  const isFiltered = Boolean(
    search.trim() ||
      caseStatus !== "ALL" ||
      caseType !== "ALL" ||
      priority !== "ALL" ||
      (courtId !== "ALL" && courtId.trim()) ||
      (clientId !== "ALL" && clientId.trim()) ||
      filingYear.trim()
  );

  return (
    <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card p-3 sm:p-4 shadow-sm space-y-3">
      {/* Primary Row: Search Bar + Quick Status + Advanced Toggle + Reset */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by case title, case number, reference, client, or court..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 pr-8 h-9 rounded-xl text-xs bg-background/50 border-border/70 focus-visible:ring-gold-500/30"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch("");
                setSearch("");
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Dropdown */}
        <div className="w-full md:w-44">
          <select
            value={caseStatus}
            onChange={(e) => setCaseStatus(e.target.value as CaseStatus | "ALL")}
            className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          >
            <option value="ALL">All Case Statuses</option>
            {CASE_STATUS_LIST.map((st) => (
              <option key={st} value={st}>
                {CASE_STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div className="w-full md:w-44">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CaseSortOption)}
            className="w-full h-9 rounded-xl text-xs bg-background/50 border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
          >
            {CASE_SORT_OPTION_LIST.map((opt) => (
              <option key={opt} value={opt}>
                {CASE_SORT_LABELS[opt]}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle Advanced Filters Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className={`rounded-xl text-xs gap-1.5 shrink-0 ${
            showAdvanced || (isFiltered && caseStatus === "ALL")
              ? "border-gold-500/40 text-gold-600 dark:text-gold-400 bg-gold-500/5"
              : ""
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
          {isFiltered && (
            <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" />
          )}
        </Button>

        {/* Clear/Reset Button */}
        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalSearch("");
              resetFilters();
            }}
            className="rounded-xl text-xs gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
            title="Reset all filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        )}
      </div>

      {/* Advanced Filters Expandable Grid */}
      {showAdvanced && (
        <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Case Type Filter */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Case Type
            </label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as CaseType | "ALL")}
              className="w-full h-8 rounded-lg text-xs bg-background/50 border border-border/70 px-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
            >
              <option value="ALL">All Matters & Types</option>
              {CASE_TYPE_LIST.map((t) => (
                <option key={t} value={t}>
                  {CASE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as CasePriority | "ALL")}
              className="w-full h-8 rounded-lg text-xs bg-background/50 border border-border/70 px-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
            >
              <option value="ALL">All Priorities</option>
              {CASE_PRIORITY_LIST.map((p) => (
                <option key={p} value={p}>
                  {CASE_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          {/* Court Filter via ItemSelect */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Court Jurisdiction
            </label>
            <ItemSelect
              type="court"
              value={courtId === "ALL" ? "" : courtId}
              onChange={(val) => setCourtId(val || "ALL")}
              placeholder="All Courts & Benches"
              searchPlaceholder="Search court..."
              clearable
              className="h-8 text-xs rounded-lg"
            />
          </div>

          {/* Client Filter via ItemSelect */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Client Dossier
            </label>
            <ItemSelect
              type="client"
              value={clientId === "ALL" ? "" : clientId}
              onChange={(val) => setClientId(val || "ALL")}
              placeholder="All Client Profiles"
              searchPlaceholder="Search client..."
              clearable
              className="h-8 text-xs rounded-lg"
            />
          </div>

          {/* Filing Year Input */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Filing Year
            </label>
            <Input
              type="number"
              placeholder="e.g. 2024"
              value={filingYear}
              onChange={(e) => setFilingYear(e.target.value)}
              className="h-8 rounded-lg text-xs bg-background/50 border-border/70"
            />
          </div>

          {/* Page Limit Selector */}
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">
              Page Size
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) as CasePageLimit)}
              className="w-full h-8 rounded-lg text-xs bg-background/50 border border-border/70 px-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
            >
              {CASE_PAGE_LIMITS.map((size) => (
                <option key={size} value={size}>
                  Show {size} cases per page
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
