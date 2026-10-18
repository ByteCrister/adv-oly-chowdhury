"use client";

import * as React from "react";
import { isAxiosError } from "axios";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useDeleteTaskMutation } from "@/hooks/tasks";
import { useToast } from "@/components/shared/use-toast";
import type { TaskItemDto } from "@/types/task.types";

export interface DeleteTaskDialogProps {
  task: TaskItemDto | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteTaskDialog({
  task,
  isOpen,
  onClose,
}: DeleteTaskDialogProps) {
  const { mutate: deleteTask, isPending } = useDeleteTaskMutation();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!task) return;

    deleteTask(task.id, {
      onSuccess: () => {
        toast({
          title: "Task Deleted",
          description: `"${task.title}" has been moved to trash and removed from chamber deadlines.`,
        });
        onClose();
      },
      onError: (err: unknown) => {
        const message = isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message || err.message
          : "Failed to delete task. Please try again.";
        toast({
          title: "Deletion Failed",
          description: message,
          variant: "destructive",
        });
      },
    });
  };

  if (!task) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md p-6 rounded-3xl bg-white/95 dark:bg-midnight-950/95 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-2xl relative overflow-hidden">
        {/* Specular hairline top sheen */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/35 to-transparent pointer-events-none" />

        <AlertDialogHeader className="space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 via-red-500/10 to-transparent border border-red-500/30 text-red-500 flex items-center justify-center mb-1 shadow-xs ring-1 ring-red-500/20">
            <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <AlertDialogTitle className="font-serif text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Move Task to Trash?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to remove{" "}
            <strong className="text-foreground font-semibold">
              &ldquo;{task.title}&rdquo;
            </strong>
            ? This action item will be soft-deleted and removed from active chamber deadlines, calendars, and performance statistics.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2.5 pt-4 border-t border-border/60 dark:border-white/10 mt-3">
          <AlertDialogCancel
            disabled={isPending}
            onClick={onClose}
            className="h-10 px-4.5 rounded-xl text-xs border-border/80 dark:border-white/10 hover:bg-muted/50 transition-colors"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
            className="h-10 px-5 rounded-xl text-xs font-bold gap-2 shadow-sm shadow-red-500/20 hover:brightness-105 transition-all"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isPending ? "Deleting..." : "Confirm Delete"}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteTaskDialog;
