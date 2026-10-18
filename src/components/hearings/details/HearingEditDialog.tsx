"use client";

import * as React from "react";
import {
  Edit2,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
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
import { ItemSelect } from "@/components/shared/ItemSelect";
import { useToast } from "@/components/shared/use-toast";
import { useUpdateHearingMutation } from "@/hooks/hearings";
import { updateHearingSchema } from "@/utils/zod/hearing.validation";
import {
  HEARING_STATUSES,
  HEARING_STATUS_LIST,
  HEARING_STATUS_LABELS,
  type HearingStatus,
} from "@/const/hearing.const";
import { DROPDOWN_TYPES } from "@/const/dropdown.const";
import type { HearingDetailDto } from "@/types/hearing.types";

export interface HearingEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  hearing: HearingDetailDto;
  onSuccess?: (updated: HearingDetailDto) => void;
}

interface HearingEditFormInnerProps {
  hearing: HearingDetailDto;
  onClose: () => void;
  onSuccess?: (updated: HearingDetailDto) => void;
}

function HearingEditFormInner({
  hearing,
  onClose,
  onSuccess,
}: HearingEditFormInnerProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateHearingMutation();

  // Form State initialized fresh on mount
  const [courtId, setCourtId] = React.useState(hearing.courtId || "");
  const [hearingDate, setHearingDate] = React.useState(() => {
    return hearing.hearingDate ? hearing.hearingDate.split("T")[0] : "";
  });
  const [startTime, setStartTime] = React.useState(hearing.startTime || "");
  const [hearingType, setHearingType] = React.useState(hearing.hearingType || "");
  const [purpose, setPurpose] = React.useState(hearing.purpose || "");
  const [status, setStatus] = React.useState<HearingStatus>(hearing.status);
  const [outcome, setOutcome] = React.useState(hearing.outcome || "");
  const [nextDate, setNextDate] = React.useState(() => {
    return hearing.nextDate ? hearing.nextDate.split("T")[0] : "";
  });
  const [adjournmentReason, setAdjournmentReason] = React.useState(
    hearing.adjournmentReason || ""
  );
  const [notes, setNotes] = React.useState(hearing.notes || "");

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const payload = {
      courtId: courtId.trim() ? courtId.trim() : null,
      hearingDate,
      startTime: startTime.trim() || null,
      hearingType: hearingType.trim() || null,
      purpose: purpose.trim() || null,
      status,
      outcome: outcome.trim() || null,
      nextDate: nextDate.trim() || null,
      adjournmentReason: adjournmentReason.trim() || null,
      notes: notes.trim() || null,
    };

    const validationResult = updateHearingSchema.safeParse(payload);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (path && !errors[path]) {
          errors[path] = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    try {
      const res = await updateMutation.mutateAsync({
        id: hearing.id,
        payload,
      });

      toast({
        title: "Hearing Updated",
        description: res.message || "Hearing details have been updated successfully.",
        variant: "gold",
      });

      onSuccess?.(res.data);
      onClose();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        "Failed to update hearing details.";
      setServerError(msg);
    }
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center shrink-0">
            <Edit2 className="w-4 h-4" />
          </div>
          <div>
            <DialogTitle>Edit Hearing Appearance</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Updating hearing for {hearing.case.caseNumber || hearing.case.internalReference} (
              {hearing.case.title})
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {serverError && (
        <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Schedule Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label
              htmlFor="edit-hearing-date"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Hearing Date <span className="text-destructive">*</span>
            </label>
            <Input
              id="edit-hearing-date"
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              className="h-9 text-xs rounded-xl"
              required
            />
            {fieldErrors.hearingDate && (
              <p className="text-[10px] text-destructive mt-1">
                {fieldErrors.hearingDate}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-hearing-time"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Appearance Time
            </label>
            <Input
              id="edit-hearing-time"
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="e.g. 10:30 AM"
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div>
            <label
              htmlFor="edit-hearing-status"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Hearing Status
            </label>
            <select
              id="edit-hearing-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as HearingStatus)}
              className="w-full h-9 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
            >
              {HEARING_STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {HEARING_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Court & Hearing Type Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Court Bench / Forum Override
            </label>
            <ItemSelect
              type={DROPDOWN_TYPES.COURT}
              value={courtId}
              onChange={(val) => setCourtId(val)}
              placeholder="Select court bench..."
              searchPlaceholder="Search court by name..."
              clearable
            />
          </div>

          <div>
            <label
              htmlFor="edit-hearing-type"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Proceeding Type / Stage
            </label>
            <Input
              id="edit-hearing-type"
              type="text"
              value={hearingType}
              onChange={(e) => setHearingType(e.target.value)}
              placeholder="e.g. Final Arguments, Framing of Issues"
              className="h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Purpose */}
        <div>
          <label
            htmlFor="edit-hearing-purpose"
            className="block text-xs font-medium text-foreground mb-1"
          >
            Purpose of Appearance
          </label>
          <textarea
            id="edit-hearing-purpose"
            rows={2}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Submission of written statement..."
            className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
          />
        </div>

        {/* Outcome & Next Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="edit-hearing-outcome"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Outcome / Bench Order
            </label>
            <Input
              id="edit-hearing-outcome"
              type="text"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="e.g. Adjourned upon defendant prayer"
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div>
            <label
              htmlFor="edit-hearing-next-date"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Next Hearing Date
            </label>
            <Input
              id="edit-hearing-next-date"
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Adjournment Reason (if status is ADJOURNED or reason exists) */}
        {(status === HEARING_STATUSES.ADJOURNED || adjournmentReason) && (
          <div>
            <label
              htmlFor="edit-adjournment-reason"
              className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1"
            >
              Adjournment Reason
            </label>
            <Input
              id="edit-adjournment-reason"
              type="text"
              value={adjournmentReason}
              onChange={(e) => setAdjournmentReason(e.target.value)}
              placeholder="Reason for postponement"
              className="h-9 text-xs rounded-xl border-amber-500/30 bg-amber-500/5"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label
            htmlFor="edit-hearing-notes"
            className="block text-xs font-medium text-foreground mb-1"
          >
            Chamber Confidential Notes
          </label>
          <textarea
            id="edit-hearing-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal chamber notes, preparation checklist..."
            className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-gold-500/40"
          />
        </div>

        <DialogFooter className="pt-2 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="gold"
            size="sm"
            disabled={updateMutation.isPending}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Update Hearing</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function HearingEditDialog({
  isOpen,
  onClose,
  hearing,
  onSuccess,
}: HearingEditDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {isOpen && (
          <HearingEditFormInner
            key={`${hearing.id}-${hearing.updatedAt}`}
            hearing={hearing}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default HearingEditDialog;
