"use client";

import * as React from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/shared/use-toast";
import {
  CASE_EVENT_TYPE_LIST,
  CASE_EVENT_TYPE_LABELS,
  CASE_EVENT_TYPES,
  CaseEventType,
} from "@/const/case-event.const";
import {
  useCreateCaseEventMutation,
  useUpdateCaseEventMutation,
} from "@/hooks/cases";
import type { CaseEventItemDto, UpdateCaseEventInput } from "@/types/case-event.types";

export interface CaseEventFormDialogProps {
  caseId: string;
  eventItem?: CaseEventItemDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormState {
  title: string;
  eventType: CaseEventType;
  eventDate: string;
  description: string;
}

const defaultFormState: FormState = {
  title: "",
  eventType: CASE_EVENT_TYPES.APPLICATION_SUBMITTED,
  eventDate: new Date().toISOString().split("T")[0],
  description: "",
};

export function CaseEventFormDialog({
  caseId,
  eventItem,
  isOpen,
  onClose,
  onSuccess,
}: CaseEventFormDialogProps) {
  const isEditing = Boolean(eventItem);
  const [form, setForm] = React.useState<FormState>(defaultFormState);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  const createMutation = useCreateCaseEventMutation();
  const updateMutation = useUpdateCaseEventMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // React 19 pattern: sync form when modal opens or item changes
  const [prevEventKey, setPrevEventKey] = React.useState<string | null>(null);
  const currentKey = isOpen && eventItem ? `${eventItem.id}-${eventItem.updatedAt}` : isOpen ? "new" : null;

  if (currentKey !== prevEventKey) {
    setPrevEventKey(currentKey);
    if (eventItem && isOpen) {
      setForm({
        title: eventItem.title || "",
        eventType: eventItem.eventType || CASE_EVENT_TYPES.APPLICATION_SUBMITTED,
        eventDate: eventItem.eventDate ? eventItem.eventDate.split("T")[0] : "",
        description: eventItem.description || "",
      });
    } else if (isOpen) {
      setForm(defaultFormState);
    }
    setErrors({});
    setServerError(null);
  }

  const handleClose = () => {
    setErrors({});
    setServerError(null);
    onClose();
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};

    if (!form.title.trim()) {
      errs.title = "Event title is required.";
    }

    if (!form.eventDate.trim()) {
      errs.eventDate = "Please choose a milestone date.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    try {
      if (isEditing && eventItem) {
        const payload: UpdateCaseEventInput = {
          title: form.title.trim(),
          eventType: form.eventType,
          eventDate: form.eventDate,
          description: form.description.trim() || null,
        };

        await updateMutation.mutateAsync({
          caseId,
          eventId: eventItem.id,
          payload,
        });

        toast({
          title: "Milestone Updated",
          description: `Event "${form.title}" was updated successfully.`,
          variant: "gold",
        });
      } else {
        await createMutation.mutateAsync({
          caseId,
          payload: {
            title: form.title.trim(),
            eventType: form.eventType,
            eventDate: form.eventDate,
            description: form.description.trim() || null,
          },
        });

        toast({
          title: "Milestone Recorded",
          description: `Case event "${form.title}" has been added to the chronological timeline.`,
          variant: "gold",
        });
      }

      onSuccess?.();
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save the case milestone.";
      setServerError(msg);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg rounded-2xl border-border/80 dark:border-white/10 bg-card p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sapphire-500/10 text-sapphire-600 dark:text-sapphire-400 flex items-center justify-center">
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <DialogTitle className="font-serif text-lg font-bold text-foreground">
              {isEditing ? "Edit Case Event" : "Record Case Milestone"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Log procedural events, stay orders, certified copy submissions, or interlocutory decisions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {serverError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {serverError}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Event Title / Subject <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Interim Injunction Order Obtained"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-9 rounded-xl text-xs"
            />
            {errors.title && (
              <p className="text-[11px] text-destructive mt-1">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Event Classification <span className="text-destructive">*</span>
              </label>
              <select
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value as CaseEventType })}
                className="w-full h-9 rounded-xl text-xs bg-background border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-sapphire-500/30"
              >
                {CASE_EVENT_TYPE_LIST.map((t) => (
                  <option key={t} value={t}>
                    {CASE_EVENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Milestone Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="h-9 rounded-xl text-xs"
              />
              {errors.eventDate && (
                <p className="text-[11px] text-destructive mt-1">{errors.eventDate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Description & Notes
            </label>
            <textarea
              rows={3}
              placeholder="Record judicial findings, counsel appearance remarks, or next steps..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl text-xs bg-background border border-border/70 p-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-sapphire-500/30"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={isPending}
              className="rounded-xl text-xs gap-1.5 font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Milestone...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Record Event"}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CaseEventFormDialog;
