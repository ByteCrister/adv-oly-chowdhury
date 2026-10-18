"use client";

import * as React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Flame,
  Briefcase,
  Users,
  Calendar,
  Edit2,
  Trash2,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TASK_STATUSES,
  TASK_STATUS_LIST,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  type TaskStatus,
} from "@/const/task.const";
import type { TaskItemDto } from "@/types/task.types";
import { useUpdateTaskMutation } from "@/hooks/tasks";
import { useToast } from "@/components/shared/use-toast";

export interface TaskAccordionListProps {
  tasks: TaskItemDto[];
  onEdit: (task: TaskItemDto) => void;
  onDelete: (task: TaskItemDto) => void;
}

export function TaskAccordionList({
  tasks,
  onEdit,
  onDelete,
}: TaskAccordionListProps) {
  const { mutate: updateTask } = useUpdateTaskMutation();
  const { toast } = useToast();
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);

  // Quick toggle status between COMPLETED and TODO
  const handleToggleComplete = (
    e: React.MouseEvent,
    task: TaskItemDto
  ) => {
    e.stopPropagation();
    const nextStatus: TaskStatus =
      task.status === TASK_STATUSES.COMPLETED
        ? TASK_STATUSES.TODO
        : TASK_STATUSES.COMPLETED;

    setUpdatingTaskId(task.id);
    updateTask(
      { id: task.id, payload: { status: nextStatus } },
      {
        onSuccess: () => {
          toast({
            title:
              nextStatus === TASK_STATUSES.COMPLETED
                ? "Task Completed"
                : "Task Reopened",
            description: `"${task.title}" has been marked as ${TASK_STATUS_LABELS[nextStatus].toLowerCase()}.`,
          });
        },
        onError: () => {
          toast({
            title: "Update Failed",
            description: "Unable to update task status. Please try again.",
            variant: "destructive",
          });
        },
        onSettled: () => setUpdatingTaskId(null),
      }
    );
  };

  // Change status from expanded quick-switcher
  const handleStatusChange = (
    e: React.MouseEvent,
    task: TaskItemDto,
    newStatus: TaskStatus
  ) => {
    e.stopPropagation();
    if (task.status === newStatus) return;

    setUpdatingTaskId(task.id);
    updateTask(
      { id: task.id, payload: { status: newStatus } },
      {
        onSuccess: () => {
          toast({
            title: "Status Updated",
            description: `Task status changed to ${TASK_STATUS_LABELS[newStatus]}.`,
          });
        },
        onError: () => {
          toast({
            title: "Update Failed",
            description: "Unable to update task status.",
            variant: "destructive",
          });
        },
        onSettled: () => setUpdatingTaskId(null),
      }
    );
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-border/80 dark:border-white/10 bg-card/30 backdrop-blur-md">
        <div className="w-12 h-12 rounded-2xl bg-gold-500/10 text-gold-500 flex items-center justify-center mb-3 border border-gold-500/20">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-lg font-bold text-foreground">
          No Chamber Tasks Found
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          No tasks match the selected filters or search query. Adjust the filters above or create a new chamber task.
        </p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-3">
      {tasks.map((task) => {
        const isCompleted = task.status === TASK_STATUSES.COMPLETED;
        const isCancelled = task.status === TASK_STATUSES.CANCELLED;
        const isCurrentUpdating = updatingTaskId === task.id;

        // Priority Visual Styles
        const priorityBadge = (() => {
          switch (task.priority) {
            case TASK_PRIORITIES.URGENT:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-semibold text-[11px] border border-red-500/30">
                  <Flame className="w-3 h-3" />
                  Urgent
                </span>
              );
            case TASK_PRIORITIES.HIGH:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[11px] border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  High
                </span>
              );
            case TASK_PRIORITIES.NORMAL:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium text-[11px] border border-blue-500/20">
                  Normal
                </span>
              );
            case TASK_PRIORITIES.LOW:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium text-[11px] border border-border/60">
                  Low
                </span>
              );
          }
        })();

        // Status Visual Styles
        const statusBadge = (() => {
          switch (task.status) {
            case TASK_STATUSES.COMPLETED:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  Completed
                </span>
              );
            case TASK_STATUSES.IN_PROGRESS:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold text-[11px] border border-blue-500/30">
                  <Clock className="w-3 h-3" />
                  In Progress
                </span>
              );
            case TASK_STATUSES.CANCELLED:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium text-[11px] border border-border/60 line-through">
                  Cancelled
                </span>
              );
            case TASK_STATUSES.TODO:
            default:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-[11px] border border-amber-500/20">
                  To Do
                </span>
              );
          }
        })();

        // Format Due Date
        const dueDateFormatted = task.dueAt
          ? new Date(task.dueAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : null;

        return (
          <AccordionItem
            key={task.id}
            value={task.id}
            className={`border transition-all duration-200 ${
              task.isOverdue
                ? "border-red-500/40 bg-red-500/[0.02]"
                : isCompleted
                ? "border-border/60 opacity-85"
                : "border-border/70 dark:border-white/10"
            }`}
          >
            <AccordionTrigger as="div" className="hover:bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                {/* Left: Quick complete toggle, Title, Badges */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  {/* Quick Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleComplete(e, task)}
                    disabled={isCurrentUpdating || isCancelled}
                    title={isCompleted ? "Mark as To Do" : "Mark as Completed"}
                    className="mt-0.5 sm:mt-0 text-muted-foreground hover:text-gold-500 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                    ) : (
                      <Circle className="w-5 h-5 hover:scale-105" />
                    )}
                  </button>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {priorityBadge}
                      {statusBadge}

                      {task.isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider animate-pulse border border-red-500/40">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}

                      {dueDateFormatted && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-mono ${
                            task.isOverdue
                              ? "text-red-600 dark:text-red-400 font-bold"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {dueDateFormatted}
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-sm sm:text-base font-semibold tracking-tight text-foreground line-clamp-1 ${
                        isCompleted ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </h4>

                    {/* Associated Case / Client inline tags */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                      {task.caseDetails && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-md border border-border/60">
                          <Briefcase className="w-3 h-3 text-gold-500 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {task.caseDetails.internalReference} • {task.caseDetails.title}
                          </span>
                        </span>
                      )}

                      {task.clientDetails && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium bg-muted/50 px-2 py-0.5 rounded-md border border-border/60">
                          <Users className="w-3 h-3 text-gold-500 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {task.clientDetails.name}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions menu */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                    title="Edit Task"
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task);
                    }}
                    title="Delete Task"
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Task Description */}
                <div>
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Task Instructions / Notes
                  </h5>
                  <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed bg-muted/20 p-3.5 rounded-xl border border-border/60">
                    {task.description || "No specific instructions provided for this task."}
                  </p>
                </div>

                {/* Grid: Context Dossiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Case Context Card */}
                  <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-gold-500" />
                        Case Matter
                      </span>
                      {task.caseDetails?.caseStatus && (
                        <span className="text-[10px] font-mono text-gold-600 dark:text-gold-400">
                          {task.caseDetails.caseStatus}
                        </span>
                      )}
                    </div>
                    {task.caseDetails ? (
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-foreground line-clamp-1">
                          {task.caseDetails.title}
                        </p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          Ref: {task.caseDetails.internalReference}
                          {task.caseDetails.caseNumber && ` • No: ${task.caseDetails.caseNumber}`}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Not associated with any legal case.
                      </p>
                    )}
                  </div>

                  {/* Client Context Card */}
                  <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gold-500" />
                        Client Context
                      </span>
                      {task.clientDetails?.clientNumber && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {task.clientDetails.clientNumber}
                        </span>
                      )}
                    </div>
                    {task.clientDetails ? (
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-foreground line-clamp-1">
                          {task.clientDetails.name}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          {task.clientDetails.organizationName
                            ? task.clientDetails.organizationName
                            : task.clientDetails.phone
                            ? `Phone: ${task.clientDetails.phone}`
                            : "Direct Client"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No client linked to this task.
                      </p>
                    )}
                  </div>

                  {/* Schedule & Dates */}
                  <div className="p-3 rounded-xl bg-card border border-border/70 dark:border-white/10 space-y-1.5">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gold-500" />
                      Schedule & Dates
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                        <span>Created: {new Date(task.createdAt).toLocaleDateString("en-GB")}</span>
                        {task.dueAt && (
                          <span>
                            • Due: {new Date(task.dueAt).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                      {task.completedAt ? (
                        <p className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                          Completed on {new Date(task.completedAt).toLocaleDateString("en-GB")}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-[11px]">
                          Chamber internal task
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Status Transition Bar */}
                <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-muted-foreground mr-1">
                      Change Status:
                    </span>
                    {TASK_STATUS_LIST.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={(e) => handleStatusChange(e, task, st)}
                        disabled={task.status === st || isCurrentUpdating}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          task.status === st
                            ? "bg-gold-500/20 text-gold-600 dark:text-gold-400 border border-gold-500/30 font-bold"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                        }`}
                      >
                        {TASK_STATUS_LABELS[st]}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(task)}
                      className="h-8 px-3 rounded-lg text-xs gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Details</span>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(task)}
                      className="h-8 px-3 rounded-lg text-xs gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export default TaskAccordionList;
