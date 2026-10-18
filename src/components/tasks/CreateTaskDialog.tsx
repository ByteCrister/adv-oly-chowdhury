"use client";

import * as React from "react";
import { isAxiosError } from "axios";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ItemSelect } from "@/components/shared";
import { DROPDOWN_TYPES } from "@/const/dropdown.const";
import {
  TASK_STATUSES,
  TASK_STATUS_LIST,
  TASK_STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LIST,
  TASK_PRIORITY_LABELS,
  type TaskStatus,
  type TaskPriority,
} from "@/const/task.const";
import { useCreateTaskMutation } from "@/hooks/tasks";
import { useToast } from "@/components/shared/use-toast";
import {
  CheckSquare,
  AlertCircle,
  Calendar,
  Briefcase,
  Users,
  FileText,
  Loader2,
} from "lucide-react";
import type { DropdownItem } from "@/types/dropdown.types";

export interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const { mutate: createTask, isPending } = useCreateTaskMutation();
  const { toast } = useToast();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<TaskPriority>(TASK_PRIORITIES.NORMAL);
  const [status, setStatus] = React.useState<TaskStatus>(TASK_STATUSES.TODO);
  const [dueDate, setDueDate] = React.useState("");
  const [dueTime, setDueTime] = React.useState("17:00");
  const [caseId, setCaseId] = React.useState("");
  const [clientId, setClientId] = React.useState("");

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // When a case is selected, auto-fill the client if available
  const handleCaseSelect = (selectedCaseId: string, item?: DropdownItem | null) => {
    setCaseId(selectedCaseId);
    if (item?.metadata?.clientId && typeof item.metadata.clientId === "string") {
      setClientId(item.metadata.clientId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = "Task title is required.";
    } else if (title.trim().length > 200) {
      newErrors.title = "Task title cannot exceed 200 characters.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Construct dueAt timestamp
    let dueAt: string | null = null;
    if (dueDate) {
      const timePart = dueTime || "17:00";
      const fullDate = new Date(`${dueDate}T${timePart}:00`);
      if (!isNaN(fullDate.getTime())) {
        dueAt = fullDate.toISOString();
      }
    }

    createTask(
      {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status,
        dueAt,
        caseId: caseId || null,
        clientId: clientId || null,
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Task Created",
            description: `"${data.data.title}" has been successfully added to chamber tasks.`,
          });
          onClose();
        },
        onError: (err: unknown) => {
          const message = isAxiosError(err)
            ? (err.response?.data as { message?: string })?.message || err.message
            : "Failed to create task. Please check the inputs.";
          toast({
            title: "Creation Error",
            description: message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 sidebar-scrollbar">
        {/* Title */}
        <div className="space-y-1.5">
          <label
            htmlFor="create-task-title"
            className="text-xs font-semibold text-foreground flex items-center justify-between"
          >
            <span>Task Title <strong className="text-red-500">*</strong></span>
            <span className="text-[10px] text-muted-foreground font-normal font-mono">
              {title.length}/200
            </span>
          </label>
          <Input
            id="create-task-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
            }}
            placeholder="e.g., File Bail Application before Session Judge..."
            className={`h-10 text-sm ${errors.title ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            autoFocus
          />
          {errors.title && (
            <p className="text-[11px] text-red-500 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Status & Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
              <span>Status</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 dark:bg-white/[0.04] rounded-xl border border-border/70 dark:border-white/10 shadow-inner">
              {TASK_STATUS_LIST.slice(0, 4).map((st) => {
                const isSelected = status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-1.5 px-2 rounded-lg text-xs transition-all duration-200 select-none ${
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
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
              <span>Priority</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 dark:bg-white/[0.04] rounded-xl border border-border/70 dark:border-white/10 shadow-inner">
              {TASK_PRIORITY_LIST.map((pr) => {
                const isSelected = priority === pr;
                return (
                  <button
                    key={pr}
                    type="button"
                    onClick={() => setPriority(pr)}
                    className={`py-1.5 px-2 rounded-lg text-xs transition-all duration-200 select-none ${
                      isSelected
                        ? pr === TASK_PRIORITIES.URGENT
                          ? "bg-gradient-to-r from-red-500/25 to-red-600/15 text-red-600 dark:text-red-400 font-bold border border-red-500/40 shadow-xs"
                          : pr === TASK_PRIORITIES.HIGH
                          ? "bg-gradient-to-r from-amber-500/25 to-amber-600/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/40 shadow-xs"
                          : "bg-card text-foreground font-bold shadow-xs border border-border/80 dark:border-white/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
                    }`}
                  >
                    {TASK_PRIORITY_LABELS[pr]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Due Date & Time */}
        <div className="relative overflow-hidden p-3.5 rounded-xl bg-white/60 dark:bg-card/40 border border-border/80 dark:border-white/10 shadow-2xs space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-gold-500" />
            <span>Target Deadline (Optional)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <span className="text-[10px] text-muted-foreground/80 block mb-1 font-mono uppercase tracking-wider">Due Date</span>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9.5 text-xs bg-card border-border/80 dark:border-white/10 focus-visible:ring-gold-500/40"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground/80 block mb-1 font-mono uppercase tracking-wider">Due Time</span>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={!dueDate}
                className="h-9.5 text-xs bg-card border-border/80 dark:border-white/10 focus-visible:ring-gold-500/40"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="create-task-desc"
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-gold-500" />
            <span>Task Brief & Instructions</span>
          </label>
          <textarea
            id="create-task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add relevant notes, court room numbers, document checklist, or instructions..."
            className="w-full rounded-xl border border-border/80 dark:border-white/10 bg-white/60 dark:bg-card/40 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-2xs placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50 focus-visible:border-gold-500/50 transition-all text-foreground"
          />
        </div>

        {/* Linked Case & Client Selectors */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-gold-500" />
              <span>Link to Case Matter</span>
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CASE}
              value={caseId}
              onChange={handleCaseSelect}
              placeholder="Search case title or number..."
              searchPlaceholder="Type case title or ref..."
              className="h-10 text-xs shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gold-500" />
              <span>Link to Client</span>
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CLIENT}
              value={clientId}
              onChange={(val) => setClientId(val)}
              placeholder="Search client name..."
              searchPlaceholder="Type client name..."
              className="h-10 text-xs shadow-2xs"
            />
          </div>
        </div>
      </div>

      <SheetFooter className="p-5 sm:p-6 border-t border-border/70 dark:border-white/10 shrink-0 bg-white/70 dark:bg-card/40 backdrop-blur-xl flex flex-row items-center justify-end gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
          className="h-10 px-4.5 rounded-xl text-xs border-border/80 dark:border-white/10 hover:bg-muted/50"
        >
          Cancel
        </Button>
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="btn-gold-gloss h-10 px-6 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{isPending ? "Creating Task..." : "Save Chamber Task"}</span>
        </button>
      </SheetFooter>
    </form>
  );
}

export function CreateTaskDialog({ isOpen, onClose }: CreateTaskDialogProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col gap-0 overflow-hidden bg-background/95 dark:bg-midnight-950/95 backdrop-blur-2xl border-l border-border/80 dark:border-white/10 shadow-2xl"
      >
        <SheetHeader className="relative p-6 pb-4 border-b border-border/70 dark:border-white/10 shrink-0 bg-white/70 dark:bg-card/30 backdrop-blur-xl">
          {/* Specular bottom hairline */}
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-gold-400/35 to-transparent pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold-400/25 via-gold-500/15 to-transparent border border-gold-400/40 text-gold-500 dark:text-gold-400 flex items-center justify-center shrink-0 shadow-[0_2px_12px_rgba(192,154,78,0.25)]">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-gold-600 dark:text-gold-400 block">
                Chamber Task Management
              </span>
              <SheetTitle className="font-serif text-xl sm:text-2xl text-foreground font-bold tracking-tight">
                Create New Chamber Task
              </SheetTitle>
            </div>
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            Schedule deadlines, court filings, certified copy follow-ups, or drafting assignments.
          </SheetDescription>
        </SheetHeader>

        {isOpen && <CreateTaskForm onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

export const CreateTaskDrawer = CreateTaskDialog;
export default CreateTaskDialog;
