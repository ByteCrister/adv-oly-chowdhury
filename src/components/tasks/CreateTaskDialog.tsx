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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Initial Status</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/50">
              {TASK_STATUS_LIST.slice(0, 4).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    status === st
                      ? "bg-card text-foreground font-semibold shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {TASK_STATUS_LABELS[st]}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Priority Level</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/50">
              {TASK_PRIORITY_LIST.map((pr) => (
                <button
                  key={pr}
                  type="button"
                  onClick={() => setPriority(pr)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    priority === pr
                      ? pr === TASK_PRIORITIES.URGENT
                        ? "bg-red-500/15 text-red-600 dark:text-red-400 font-bold border border-red-500/30"
                        : pr === TASK_PRIORITIES.HIGH
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30"
                        : "bg-card text-foreground font-semibold shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {TASK_PRIORITY_LABELS[pr]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Due Date & Time */}
        <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-gold-500" />
            <span>Target Deadline (Optional)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-muted-foreground block mb-1">Due Date</span>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block mb-1">Due Time</span>
              <Input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={!dueDate}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="create-task-desc"
            className="text-xs font-semibold text-foreground flex items-center gap-1"
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
            className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-xs shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-all"
          />
        </div>

        {/* Linked Case & Client Selectors */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-gold-500" />
              <span>Link to Case Matter</span>
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CASE}
              value={caseId}
              onChange={handleCaseSelect}
              placeholder="Search case title or number..."
              searchPlaceholder="Type case title or ref..."
              className="h-10 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-gold-500" />
              <span>Link to Client</span>
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.CLIENT}
              value={clientId}
              onChange={(val) => setClientId(val)}
              placeholder="Search client name..."
              searchPlaceholder="Type client name..."
              className="h-10 text-xs"
            />
          </div>
        </div>
      </div>

      <SheetFooter className="p-6 pt-4 border-t border-border/60 dark:border-white/10 shrink-0 bg-background/60 dark:bg-card/30 backdrop-blur-md gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
          className="h-10 px-4 rounded-xl text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !title.trim()}
          className="h-10 px-5 rounded-xl text-xs bg-gold-500 hover:bg-gold-600 text-midnight-950 font-semibold gap-1.5 shadow-md shadow-gold-500/10"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{isPending ? "Creating Task..." : "Save Chamber Task"}</span>
        </Button>
      </SheetFooter>
    </form>
  );
}

export function CreateTaskDialog({ isOpen, onClose }: CreateTaskDialogProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col gap-0 overflow-hidden"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border/60 dark:border-white/10 shrink-0 bg-background/50 dark:bg-card/20 backdrop-blur-md">
          <div className="flex items-center gap-2 text-gold-500 mb-1">
            <CheckSquare className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wider uppercase font-mono">
              Chamber Task Management
            </span>
          </div>
          <SheetTitle className="font-serif text-xl sm:text-2xl text-foreground font-bold">
            Create New Chamber Task
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
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
