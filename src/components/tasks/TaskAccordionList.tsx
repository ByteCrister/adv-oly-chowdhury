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
      <div className="relative overflow-hidden flex flex-col items-center justify-center p-12 sm:p-16 text-center rounded-3xl border border-dashed border-border/80 dark:border-white/10 bg-white/50 dark:bg-card/20 backdrop-blur-xl shadow-xs">
        {/* Specular hairline top sheen */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gold-400/25 to-transparent pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400/20 via-gold-500/10 to-transparent border border-gold-500/30 text-gold-500 flex items-center justify-center mb-3.5 shadow-sm">
          <Inbox className="w-7 h-7" />
        </div>
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
          No Chamber Tasks Found
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md leading-relaxed">
          No action items match the active filters or search terms. Try resetting your filters above or schedule a new chamber task.
        </p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-3.5">
      {tasks.map((task) => {
        const isCompleted = task.status === TASK_STATUSES.COMPLETED;
        const isCancelled = task.status === TASK_STATUSES.CANCELLED;
        const isCurrentUpdating = updatingTaskId === task.id;

        // Priority Visual Styles & Left Accent Strip
        const { priorityBadge, priorityStrip } = (() => {
          switch (task.priority) {
            case TASK_PRIORITIES.URGENT:
              return {
                priorityStrip: "bg-gradient-to-b from-red-500 via-rose-500 to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
                priorityBadge: (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-bold text-[10px] sm:text-[11px] border border-red-500/30 shadow-2xs font-mono">
                    <Flame className="w-3 h-3" />
                    Urgent
                  </span>
                ),
              };
            case TASK_PRIORITIES.HIGH:
              return {
                priorityStrip: "bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]",
                priorityBadge: (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[10px] sm:text-[11px] border border-amber-500/30 shadow-2xs font-mono">
                    <AlertTriangle className="w-3 h-3" />
                    High
                  </span>
                ),
              };
            case TASK_PRIORITIES.NORMAL:
              return {
                priorityStrip: "bg-gradient-to-b from-blue-400 via-blue-500 to-sapphire-600",
                priorityBadge: (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[10px] sm:text-[11px] border border-blue-500/25 font-mono">
                    Normal
                  </span>
                ),
              };
            case TASK_PRIORITIES.LOW:
            default:
              return {
                priorityStrip: "bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 dark:from-slate-600 dark:to-slate-700",
                priorityBadge: (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/70 text-muted-foreground font-medium text-[10px] sm:text-[11px] border border-border/70 font-mono">
                    Low
                  </span>
                ),
              };
          }
        })();

        // Status Visual Styles
        const statusBadge = (() => {
          switch (task.status) {
            case TASK_STATUSES.COMPLETED:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] sm:text-[11px] border border-emerald-500/30 shadow-2xs font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  Completed
                </span>
              );
            case TASK_STATUSES.IN_PROGRESS:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px] sm:text-[11px] border border-blue-500/30 shadow-2xs font-mono">
                  <Clock className="w-3 h-3" />
                  In Progress
                </span>
              );
            case TASK_STATUSES.CANCELLED:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium text-[10px] sm:text-[11px] border border-border/70 line-through font-mono">
                  Cancelled
                </span>
              );
            case TASK_STATUSES.TODO:
            default:
              return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[10px] sm:text-[11px] border border-amber-500/25 font-mono">
                  To Do
                </span>
              );
          }
        })();

        // Format Due Date with relative indicator
        const dueDateInfo = (() => {
          if (!task.dueAt) return null;
          const due = new Date(task.dueAt);
          if (isNaN(due.getTime())) return null;

          const formatted = due.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          // Compute relative difference in days
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const dueDateOnly = new Date(due);
          dueDateOnly.setHours(0, 0, 0, 0);
          const diffMs = dueDateOnly.getTime() - now.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

          let relative = "";
          if (task.status === TASK_STATUSES.COMPLETED) {
            relative = "";
          } else if (diffDays < 0) {
            relative = `${Math.abs(diffDays)}d overdue`;
          } else if (diffDays === 0) {
            relative = "Due today";
          } else if (diffDays === 1) {
            relative = "Tomorrow";
          } else if (diffDays <= 7) {
            relative = `In ${diffDays}d`;
          }

          return { formatted, relative };
        })();

        return (
          <AccordionItem
            key={task.id}
            value={task.id}
            className={`relative rounded-2xl overflow-hidden border transition-all duration-300 bg-white/80 dark:bg-card/40 backdrop-blur-xl ${
              task.isOverdue
                ? "border-red-500/40 dark:border-red-500/45 bg-red-500/[0.03] shadow-[0_0_24px_-6px_rgba(239,68,68,0.22)]"
                : isCompleted
                ? "border-border/60 opacity-85 shadow-2xs"
                : "border-border/80 dark:border-white/10 shadow-[0_2px_14px_-4px_rgba(16,28,51,0.06)] dark:shadow-[0_4px_24px_-6px_rgba(0,0,0,0.5)] hover:border-gold-500/40 dark:hover:border-gold-400/40 hover:shadow-md"
            }`}
          >
            {/* Left Priority Color Indicator Strip */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1.25 z-10 ${priorityStrip}`}
              aria-hidden="true"
            />

            {/* Top specular hairline sheen */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/15 to-transparent pointer-events-none z-10" />

            <AccordionTrigger as="div" className="hover:bg-muted/20 pl-4 sm:pl-5 pr-4 py-3.5 sm:py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                {/* Left: Quick complete toggle, Title, Badges */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {/* Quick Toggle Button with halo */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleComplete(e, task)}
                    disabled={isCurrentUpdating || isCancelled}
                    title={isCompleted ? "Mark as To Do" : "Mark as Completed"}
                    className="mt-0.5 sm:mt-0 p-1 -m-1 rounded-full text-muted-foreground hover:text-gold-500 transition-all shrink-0 disabled:opacity-50 group/check focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20 drop-shadow-xs transition-transform group-hover/check:scale-110" />
                    ) : (
                      <Circle className="w-5 h-5 transition-transform group-hover/check:scale-110 group-hover/check:text-gold-500" />
                    )}
                  </button>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {priorityBadge}
                      {statusBadge}

                      {task.isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[10px] uppercase tracking-wider animate-pulse border border-red-500/40 shadow-xs font-mono">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}

                      {dueDateInfo && (
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-lg border ${
                            task.isOverdue
                              ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 font-bold"
                              : "bg-muted/40 border-border/60 text-muted-foreground"
                          }`}
                        >
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{dueDateInfo.formatted}</span>
                          {dueDateInfo.relative && (
                            <span className="font-bold opacity-90">• {dueDateInfo.relative}</span>
                          )}
                        </span>
                      )}
                    </div>

                    <h4
                      className={`text-sm sm:text-base font-semibold tracking-tight text-foreground line-clamp-1 transition-colors ${
                        isCompleted ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </h4>

                    {/* Associated Case / Client inline tags */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {task.caseDetails && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium bg-white/70 dark:bg-card/60 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-border/70 dark:border-white/10 shadow-2xs">
                          <Briefcase className="w-3 h-3 text-gold-500 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            <strong className="font-mono text-foreground/90">{task.caseDetails.internalReference}</strong> • {task.caseDetails.title}
                          </span>
                        </span>
                      )}

                      {task.clientDetails && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium bg-white/70 dark:bg-card/60 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-border/70 dark:border-white/10 shadow-2xs">
                          <Users className="w-3 h-3 text-gold-500 shrink-0" />
                          <span className="truncate max-w-[170px]">
                            {task.clientDetails.name}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions menu */}
                <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                    title="Edit Task"
                    className="h-8.5 w-8.5 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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
                    className="h-8.5 w-8.5 p-0 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Task Description / Briefing Slip */}
                <div className="relative overflow-hidden p-4 rounded-xl bg-white/50 dark:bg-card/30 border border-border/70 dark:border-white/10 border-l-4 border-l-gold-500/60 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90 font-mono">
                      Chamber Instructions & Notes
                    </h5>
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      ID: {task.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                    {task.description || "No specific instructions provided for this action item."}
                  </p>
                </div>

                {/* Grid: Context Dossiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Case Context Card */}
                  <div className="relative overflow-hidden p-3.5 rounded-xl bg-white/60 dark:bg-card/40 border border-border/80 dark:border-white/10 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-gold-500" />
                        Case Matter
                      </span>
                      {task.caseDetails?.caseStatus && (
                        <span className="text-[10px] font-mono text-gold-600 dark:text-gold-400 font-bold px-1.5 py-0.2 bg-gold-500/10 rounded-md border border-gold-500/20">
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
                          Ref: <strong className="text-foreground/90">{task.caseDetails.internalReference}</strong>
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
                  <div className="relative overflow-hidden p-3.5 rounded-xl bg-white/60 dark:bg-card/40 border border-border/80 dark:border-white/10 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gold-500" />
                        Client Record
                      </span>
                      {task.clientDetails?.clientNumber && (
                        <span className="text-[10px] font-mono text-muted-foreground font-semibold">
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
                            : "Direct Individual Client"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No client linked to this task.
                      </p>
                    )}
                  </div>

                  {/* Schedule & Dates */}
                  <div className="relative overflow-hidden p-3.5 rounded-xl bg-white/60 dark:bg-card/40 border border-border/80 dark:border-white/10 shadow-2xs space-y-1.5">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-gold-500" />
                      <span>Timeline & Audit</span>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                        <span>Created: {new Date(task.createdAt).toLocaleDateString("en-GB")}</span>
                        {task.dueAt && (
                          <span>
                            • Target: {new Date(task.dueAt).toLocaleDateString("en-GB")}
                          </span>
                        )}
                      </div>
                      {task.completedAt ? (
                        <p className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Concluded on {new Date(task.completedAt).toLocaleDateString("en-GB")}
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-[11px]">
                          Active chamber workflow
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Status Transition Bar */}
                <div className="pt-3 border-t border-border/60 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono mr-1">
                      Status:
                    </span>
                    {TASK_STATUS_LIST.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={(e) => handleStatusChange(e, task, st)}
                        disabled={task.status === st || isCurrentUpdating}
                        className={`px-3 py-1 rounded-lg text-xs transition-all duration-200 select-none ${
                          task.status === st
                            ? "bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 text-midnight-950 font-bold shadow-xs shadow-gold-500/30 scale-[1.02]"
                            : "bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/60 font-medium"
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
                      className="h-8.5 px-3 rounded-xl text-xs gap-1.5 border-border/70 dark:border-white/10 hover:border-gold-500/40"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gold-500" />
                      <span>Edit Details</span>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(task)}
                      className="h-8.5 px-3 rounded-xl text-xs gap-1.5 shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
