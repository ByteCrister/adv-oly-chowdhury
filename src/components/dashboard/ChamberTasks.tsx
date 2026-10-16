"use client";

import * as React from "react";
import Link from "next/link";
import { CheckSquare, Clock, ArrowUpRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useUpdateTaskStatusMutation } from "@/hooks/dashboard";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type TaskStatus,
} from "@/const/task.const";
import type { ChamberTaskDto } from "@/types/dashboard.ui.type";

export interface ChamberTasksProps {
  tasks?: ChamberTaskDto[];
}

export function ChamberTasks({ tasks = [] }: ChamberTasksProps) {
  const { mutate: updateStatus, isPending } = useUpdateTaskStatusMutation();
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);

  function handleToggleTask(task: ChamberTaskDto) {
    if (task.id.startsWith("demo-")) {
      return; // demo tasks in preview mode
    }
    const isCompleted = task.status === TASK_STATUSES.COMPLETED;
    const nextStatus: TaskStatus = isCompleted ? TASK_STATUSES.TODO : TASK_STATUSES.COMPLETED;
    setUpdatingTaskId(task.id);
    updateStatus(
      { taskId: task.id, status: nextStatus },
      {
        onSettled: () => setUpdatingTaskId(null),
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-gold-500" />
          <h3 className="font-serif text-lg font-bold text-foreground">
            Chamber Deadlines
          </h3>
        </div>
        <Link
          href="/dashboard/tasks"
          className="text-xs font-semibold text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1"
        >
          <span>All Tasks</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="p-6 rounded-2xl bg-card border border-border/70 dark:border-white/10 text-center space-y-1.5">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
          <p className="text-xs font-semibold text-foreground">
            All Chamber Tasks Completed
          </p>
          <p className="text-[11px] text-muted-foreground">
            No pending court filing deadlines.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isTaskUpdating = isPending && updatingTaskId === task.id;
            const isCompleted = task.status === TASK_STATUSES.COMPLETED;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl bg-card border transition-all ${
                  isCompleted
                    ? "opacity-60 border-border/50 line-through"
                    : "border-border/70 dark:border-white/10 hover:border-gold-500/40"
                } space-y-2`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task)}
                      disabled={isTaskUpdating}
                      className="text-muted-foreground hover:text-gold-500 transition-colors focus:outline-none"
                      title={isCompleted ? "Mark incomplete" : "Mark as completed"}
                      aria-label="Toggle task status"
                    >
                      {isTaskUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4 hover:text-gold-500" />
                      )}
                    </button>
                    {task.caseRef && (
                      <span className="text-[10px] font-mono text-muted-foreground truncate">
                        {task.caseRef}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase shrink-0 ${
                      task.priority === TASK_PRIORITIES.URGENT
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : task.priority === TASK_PRIORITIES.HIGH
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {TASK_PRIORITY_LABELS[task.priority] || task.priority}
                  </span>
                </div>

                <p className="text-xs font-semibold text-foreground line-clamp-2">
                  {task.title}
                </p>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <Clock className="w-3 h-3 text-gold-500 shrink-0" />
                  <span className="truncate">Due: {task.due}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ChamberTasks;
