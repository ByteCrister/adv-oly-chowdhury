"use client";

import * as React from "react";
import {
  Search,
  X,
  ArrowUpDown,
  RotateCcw,
  Briefcase,
  Users,
  Calendar,
  AlertCircle,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemSelect } from "@/components/shared";
import { DROPDOWN_TYPES } from "@/const/dropdown.const";
import {
  TASK_STATUS_LIST,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LIST,
  TASK_PRIORITY_LABELS,
  TASK_DUE_FILTERS,
  TASK_DUE_FILTER_LIST,
  TASK_DUE_FILTER_LABELS,
  TASK_SORT_OPTION_LIST,
  TASK_SORT_LABELS,
  TaskStatus,
  TaskPriority,
  TaskDueFilter,
  TaskSortOption,
} from "@/const/task.const";

export interface TaskToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  status: TaskStatus | "ALL";
  onStatusChange: (status: TaskStatus | "ALL") => void;
  priority: TaskPriority | "ALL";
  onPriorityChange: (priority: TaskPriority | "ALL") => void;
  dueFilter: TaskDueFilter;
  onDueFilterChange: (filter: TaskDueFilter) => void;
  caseId: string;
  onCaseChange: (caseId: string) => void;
  clientId: string;
  onClientChange: (clientId: string) => void;
  sort: TaskSortOption;
  onSortChange: (sort: TaskSortOption) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  totalMatching: number;
}

export function TaskToolbar({
  searchTerm,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  dueFilter,
  onDueFilterChange,
  caseId,
  onCaseChange,
  clientId,
  onClientChange,
  sort,
  onSortChange,
  onResetFilters,
  hasActiveFilters,
  totalMatching,
}: TaskToolbarProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

  // Count active secondary filters
  const activeSecondaryCount = [
    priority !== "ALL",
    dueFilter !== TASK_DUE_FILTERS.ALL,
    Boolean(caseId),
    Boolean(clientId),
  ].filter(Boolean).length;

  return (
    <div className="space-y-3.5">
      {/* Primary Toolbar: Search Bar, Status Pills & Filter Toggle */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id="task-search-input"
            type="text"
            placeholder="Search by task title, description, case, or client..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-9 h-10.5 rounded-xl bg-white/75 dark:bg-card/40 backdrop-blur-xl border-border/70 dark:border-white/10 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-gold-500/50 focus-visible:border-gold-500/50 shadow-2xs placeholder:text-muted-foreground/60 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Segmented Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-muted/40 dark:bg-white/[0.04] border border-border/70 dark:border-white/10 shrink-0 shadow-inner backdrop-blur-md">
          <button
            type="button"
            onClick={() => onStatusChange("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-200 select-none ${
              status === "ALL"
                ? "bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 text-midnight-950 font-bold shadow-xs shadow-gold-500/25 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
            }`}
          >
            All Statuses
          </button>
          {TASK_STATUS_LIST.map((st) => {
            const isSelected = status === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => onStatusChange(st)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-200 whitespace-nowrap select-none ${
                  isSelected
                    ? "bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 text-midnight-950 font-bold shadow-xs shadow-gold-500/25 scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
                }`}
              >
                {TASK_STATUS_LABELS[st]}
              </button>
            );
          })}
        </div>

        {/* Filter Toggle & Clear Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`h-10.5 px-3.5 rounded-xl text-xs gap-1.5 border-border/70 dark:border-white/10 transition-all duration-200 ${
              showAdvancedFilters || activeSecondaryCount > 0
                ? "border-gold-500/40 bg-gold-500/10 text-gold-600 dark:text-gold-400 font-bold shadow-xs"
                : "bg-white/70 dark:bg-card/40 hover:bg-card hover:border-gold-500/30 text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeSecondaryCount > 0 && (
              <span className="w-4.5 h-4.5 rounded-full bg-gold-500 text-midnight-950 font-bold text-[10px] flex items-center justify-center shadow-xs">
                {activeSecondaryCount}
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground hidden md:inline font-mono">
                <strong className="text-foreground">{totalMatching}</strong> found
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-10.5 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 gap-1.5 transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Filter Bar (Collapsible or visible if filters are active) */}
      {(showAdvancedFilters || activeSecondaryCount > 0) && (
        <div className="relative overflow-hidden p-4 rounded-2xl bg-white/75 dark:bg-card/40 border border-border/80 dark:border-white/10 backdrop-blur-xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Specular hairline top sheen */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gold-400/35 to-transparent pointer-events-none" />

          {/* Priority Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
              <AlertCircle className="w-3.5 h-3.5 text-gold-500 shrink-0" />
              <span>Priority</span>
            </label>
            <select
              value={priority}
              onChange={(e) => onPriorityChange(e.target.value as TaskPriority | "ALL")}
              className="w-full h-9.5 px-3 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/50 shadow-2xs transition-all"
            >
              <option value="ALL">All Priorities</option>
              {TASK_PRIORITY_LIST.map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          {/* Deadline / Due Date Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-gold-500 shrink-0" />
              <span>Deadline</span>
            </label>
            <select
              value={dueFilter}
              onChange={(e) => onDueFilterChange(e.target.value as TaskDueFilter)}
              className="w-full h-9.5 px-3 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/50 shadow-2xs transition-all"
            >
              {TASK_DUE_FILTER_LIST.map((df) => (
                <option key={df} value={df}>
                  {TASK_DUE_FILTER_LABELS[df]}
                </option>
              ))}
            </select>
          </div>

          {/* Associated Case Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
              <Briefcase className="w-3.5 h-3.5 text-gold-500 shrink-0" />
              <span>Case Matter</span>
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CASE}
              value={caseId}
              onChange={(val) => onCaseChange(val)}
              placeholder="Filter by case matter..."
              searchPlaceholder="Type case title or number..."
              className="h-9.5 text-xs shadow-2xs"
            />
          </div>

          {/* Associated Client Filter */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
              <Users className="w-3.5 h-3.5 text-gold-500 shrink-0" />
              <span>Client Record</span>
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CLIENT}
              value={clientId}
              onChange={(val) => onClientChange(val)}
              placeholder="Filter by client..."
              searchPlaceholder="Type client name or number..."
              className="h-9.5 text-xs shadow-2xs"
            />
          </div>

          {/* Sort Control */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
              <ArrowUpDown className="w-3.5 h-3.5 text-gold-500 shrink-0" />
              <span>Sort Order</span>
            </label>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as TaskSortOption)}
              className="w-full h-9.5 px-3 text-xs rounded-xl bg-card border border-border/80 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/50 shadow-2xs transition-all"
            >
              {TASK_SORT_OPTION_LIST.map((st) => (
                <option key={st} value={st}>
                  {TASK_SORT_LABELS[st]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskToolbar;
