"use client";

import * as React from "react";
import { CheckSquare, Plus } from "lucide-react";
import { DashboardBreadcrumb } from "@/components/shared";
import { Button } from "@/components/ui/button";
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20">
                <CheckSquare className="w-4 h-4" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Tasks
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Court filing deadlines, legal drafting action items, certified copy follow-ups, and chamber assignments.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-gold-500 hover:bg-gold-600 text-midnight-950 shadow-sm gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </Button>
          </div>
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
