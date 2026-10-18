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
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-1 border border-red-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <AlertDialogTitle className="font-serif text-lg sm:text-xl font-bold text-foreground">
            Move Task to Trash?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to remove{" "}
            <strong className="text-foreground font-semibold">
              &ldquo;{task.title}&rdquo;
            </strong>
            ? This task will be soft-deleted and will no longer appear in your active chamber deadlines or statistics.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 pt-2">
          <AlertDialogCancel
            disabled={isPending}
            onClick={onClose}
            className="h-9 px-4 rounded-xl text-xs"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
            className="h-9 px-4 rounded-xl text-xs font-semibold gap-1.5"
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
