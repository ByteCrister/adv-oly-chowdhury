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
            className="pl-10 pr-9 h-10 rounded-xl bg-card/70 border-border/70 dark:border-white/10 text-xs sm:text-sm focus:border-gold-500/50"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Segmented Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-xl bg-muted/40 border border-border/60 shrink-0">
          <button
            type="button"
            onClick={() => onStatusChange("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              status === "ALL"
                ? "bg-gold-500 text-midnight-950 font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-gold-500 text-midnight-950 font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
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
            className={`h-10 px-3.5 rounded-xl text-xs gap-1.5 border-border/70 ${
              showAdvancedFilters || activeSecondaryCount > 0
                ? "border-gold-500/40 bg-gold-500/10 text-gold-600 dark:text-gold-400 font-semibold"
                : ""
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeSecondaryCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-gold-500 text-midnight-950 font-bold text-[10px] flex items-center justify-center">
                {activeSecondaryCount}
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground hidden md:inline">
                <strong className="text-foreground font-mono">{totalMatching}</strong> found
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-10 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground gap-1"
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
        <div className="p-3.5 rounded-2xl bg-card/40 border border-border/70 dark:border-white/10 backdrop-blur-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Priority Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-gold-500" />
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => onPriorityChange(e.target.value as TaskPriority | "ALL")}
              className="w-full h-9 px-2.5 text-xs rounded-xl bg-card border border-border/70 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
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
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gold-500" />
              Deadline
            </label>
            <select
              value={dueFilter}
              onChange={(e) => onDueFilterChange(e.target.value as TaskDueFilter)}
              className="w-full h-9 px-2.5 text-xs rounded-xl bg-card border border-border/70 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            >
              {TASK_DUE_FILTER_LIST.map((df) => (
                <option key={df} value={df}>
                  {TASK_DUE_FILTER_LABELS[df]}
                </option>
              ))}
            </select>
          </div>

          {/* Associated Case Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-gold-500" />
              Associated Case
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CASE}
              value={caseId}
              onChange={(val) => onCaseChange(val)}
              placeholder="Filter by case..."
              searchPlaceholder="Type case title or number..."
              className="h-9 text-xs"
            />
          </div>

          {/* Associated Client Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3 text-gold-500" />
              Associated Client
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CLIENT}
              value={clientId}
              onChange={(val) => onClientChange(val)}
              placeholder="Filter by client..."
              searchPlaceholder="Type client name or number..."
              className="h-9 text-xs"
            />
          </div>

          {/* Sort Control */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-gold-500" />
              Sort By
            </label>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as TaskSortOption)}
              className="w-full h-9 px-2.5 text-xs rounded-xl bg-card border border-border/70 dark:border-white/10 text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
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
