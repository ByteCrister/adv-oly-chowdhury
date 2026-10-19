"use client";

import * as React from "react";
import { CheckSquare, Plus } from "lucide-react";
import { DashboardBreadcrumb } from "@/components/shared";
import { FadeInUp } from "@/components/wrappers/Motion";
import {
  TASK_DUE_FILTERS,
  TASK_SORT_OPTIONS,
  TASK_DEFAULT_PAGE_LIMIT,
  type TaskStatus,
  type TaskPriority,
  type TaskDueFilter,
  type TaskSortOption,
  type TaskPageLimit,
} from "@/const/task.const";
import { useTasksQuery } from "@/hooks/tasks";
import { useDebounce } from "@/hooks/ui";

import { TaskStatsCards } from "./TaskStatsCards";
import { TaskToolbar } from "./TaskToolbar";
import { TaskAccordionList } from "./TaskAccordionList";
import { TaskPagination } from "./TaskPagination";
import { TaskSkeleton } from "./TaskSkeleton";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { EditTaskDialog } from "./EditTaskDialog";
import { DeleteTaskDialog } from "./DeleteTaskDialog";
import type { TaskItemDto } from "@/types/task.types";

export function TasksOverviewPage() {
  // Query Filters & State
  const [searchTerm, setSearchTerm] = React.useState("");
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [status, setStatus] = React.useState<TaskStatus | "ALL">("ALL");
  const [priority, setPriority] = React.useState<TaskPriority | "ALL">("ALL");
  const [dueFilter, setDueFilter] = React.useState<TaskDueFilter>(TASK_DUE_FILTERS.ALL);
  const [caseId, setCaseId] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [sort, setSort] = React.useState<TaskSortOption>(TASK_SORT_OPTIONS.DUE_DATE_ASC);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState<TaskPageLimit>(TASK_DEFAULT_PAGE_LIMIT);

  // Dialog State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedEditTask, setSelectedEditTask] = React.useState<TaskItemDto | null>(null);
  const [selectedDeleteTask, setSelectedDeleteTask] = React.useState<TaskItemDto | null>(null);

  // Reset page to 1 whenever filters change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  const handleStatusChange = (val: TaskStatus | "ALL") => {
    setStatus(val);
    setPage(1);
  };

  const handlePriorityChange = (val: TaskPriority | "ALL") => {
    setPriority(val);
    setPage(1);
  };

  const handleDueFilterChange = (val: TaskDueFilter) => {
    setDueFilter(val);
    setPage(1);
  };

  const handleCaseChange = (val: string) => {
    setCaseId(val);
    setPage(1);
  };

  const handleClientChange = (val: string) => {
    setClientId(val);
    setPage(1);
  };

  const handleSortChange = (val: TaskSortOption) => {
    setSort(val);
    setPage(1);
  };

  const handleLimitChange = (val: TaskPageLimit) => {
    setLimit(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatus("ALL");
    setPriority("ALL");
    setDueFilter(TASK_DUE_FILTERS.ALL);
    setCaseId("");
    setClientId("");
    setSort(TASK_SORT_OPTIONS.DUE_DATE_ASC);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      status !== "ALL" ||
      priority !== "ALL" ||
      dueFilter !== TASK_DUE_FILTERS.ALL ||
      caseId ||
      clientId ||
      sort !== TASK_SORT_OPTIONS.DUE_DATE_ASC
  );

  // Fetch unified task list and filter-aware stats
  const {
    data: taskData,
    isLoading,
    isFetching,
  } = useTasksQuery({
    search: debouncedSearch.trim() || undefined,
    status: status !== "ALL" ? status : undefined,
    priority: priority !== "ALL" ? priority : undefined,
    dueFilter: dueFilter !== TASK_DUE_FILTERS.ALL ? dueFilter : undefined,
    caseId: caseId || undefined,
    clientId: clientId || undefined,
    sort,
    page,
    limit,
  });

  const tasks = taskData?.items ?? [];
  const stats = taskData?.stats;
  const total = taskData?.total ?? 0;
  const totalPages = taskData?.totalPages ?? 1;
  const hasMore = taskData?.hasMore ?? false;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <DashboardBreadcrumb />

      {/* Page Header */}
      <FadeInUp delay={0.05} duration={0.4}>
        <div className="relative pb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                {/* Chamber Emblem Medallion */}
                <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-gold-400/25 via-gold-500/15 to-transparent border border-gold-400/40 shadow-[0_2px_12px_rgba(192,154,78,0.25)] flex items-center justify-center text-gold-500 dark:text-gold-400 shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-radial from-white/30 to-transparent pointer-events-none" />
                  <CheckSquare className="w-5 h-5 relative" />
                </div>
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                    Chamber Tasks & Deadlines
                  </h1>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl leading-relaxed">
                Centralized registry for court filing deadlines, certified copy follow-ups, legal drafting action items, and chamber assignments.
              </p>
            </div>

            {/* Glossy Primary CTA Button */}
            <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="btn-gold-gloss h-10 px-5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-transform"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Create Task</span>
              </button>
            </div>
          </div>

          {/* Specular bottom hairline separator */}
          <div
            className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-gold-400/35 dark:via-gold-400/25 to-transparent pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </FadeInUp>

      {/* Filter-Aware Statistics Cards */}
      <FadeInUp delay={0.1} duration={0.4}>
        <TaskStatsCards stats={stats} isLoading={isLoading} />
      </FadeInUp>

      {/* Search, Filter Toolbar & Sorting */}
      <FadeInUp delay={0.15} duration={0.4}>
        <TaskToolbar
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          status={status}
          onStatusChange={handleStatusChange}
          priority={priority}
          onPriorityChange={handlePriorityChange}
          dueFilter={dueFilter}
          onDueFilterChange={handleDueFilterChange}
          caseId={caseId}
          onCaseChange={handleCaseChange}
          clientId={clientId}
          onClientChange={handleClientChange}
          sort={sort}
          onSortChange={handleSortChange}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          totalMatching={total}
        />
      </FadeInUp>

      {/* Expandable Accordion Task List */}
      <FadeInUp delay={0.2} duration={0.4}>
        <div className="space-y-4">
          {isLoading ? (
            <TaskSkeleton />
          ) : (
            <TaskAccordionList
              tasks={tasks}
              onEdit={(t) => setSelectedEditTask(t)}
              onDelete={(t) => setSelectedDeleteTask(t)}
            />
          )}

          {/* Pagination */}
          {!isLoading && (
            <TaskPagination
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              hasMore={hasMore}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
              isFetching={isFetching}
            />
          )}
        </div>
      </FadeInUp>

      {/* Dialogs */}
      <CreateTaskDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <EditTaskDialog
        task={selectedEditTask}
        isOpen={Boolean(selectedEditTask)}
        onClose={() => setSelectedEditTask(null)}
      />

      <DeleteTaskDialog
        task={selectedDeleteTask}
        isOpen={Boolean(selectedDeleteTask)}
        onClose={() => setSelectedDeleteTask(null)}
      />
    </div>
  );
}

export default TasksOverviewPage;
