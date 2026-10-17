"use client";

import * as React from "react";
import { Loader2, Plus, Pencil, Building2 } from "lucide-react";
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
import { toast } from "@/components/shared";
import {
  COURT_TYPE_LIST,
  COURT_TYPE_LABELS,
  BANGLADESH_DIVISION_LIST,
  COURT_TYPES,
  CourtType,
} from "@/const/court.const";
import {
  useCreateCourtMutation,
  useUpdateCourtMutation,
} from "@/hooks/courts";
import { createCourtSchema } from "@/utils/zod/court.validation";
import type { CourtListItemDto, CreateCourtInput, UpdateCourtInput } from "@/types/court.types";

export interface CourtFormDialogProps {
  court?: CourtListItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (court: CourtListItemDto) => void;
}

interface FormState {
  name: string;
  courtType: CourtType;
  district: string;
  division: string;
  roomOrHall: string;
  address: string;
  presidingJudgeTitle: string;
  isActive: boolean;
}

const defaultFormState: FormState = {
  name: "",
  courtType: COURT_TYPES.DISTRICT_JUDGE_COURT,
  district: "Sylhet",
  division: "Sylhet",
  roomOrHall: "",
  address: "Judge's Court Complex, Sylhet, Bangladesh",
  presidingJudgeTitle: "",
  isActive: true,
};

export function CourtFormDialog({
  court,
  open,
  onOpenChange,
  onSuccess,
}: CourtFormDialogProps) {
  const isEditing = Boolean(court);

  const [formData, setFormData] = React.useState<FormState>(defaultFormState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // Synchronize state when editing a court or opening modal
  React.useEffect(() => {
    if (court && open) {
      setFormData({
        name: court.name,
        courtType: court.courtType,
        district: court.district || "Sylhet",
        division: court.division || "Sylhet",
        roomOrHall: court.roomOrHall || "",
        address: court.address || "",
        presidingJudgeTitle: court.presidingJudgeTitle || "",
        isActive: court.isActive,
      });
      setErrors({});
      setGeneralError(null);
    } else if (open) {
      setFormData(defaultFormState);
      setErrors({});
      setGeneralError(null);
    }
  }, [court, open]);

  const createMutation = useCreateCourtMutation();
  const updateMutation = useUpdateCourtMutation();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Validate with Zod
    const validationResult = createCourtSchema.safeParse({
      name: formData.name,
      courtType: formData.courtType,
      district: formData.district,
      division: formData.division || null,
      roomOrHall: formData.roomOrHall.trim() || null,
      address: formData.address.trim() || null,
      presidingJudgeTitle: formData.presidingJudgeTitle.trim() || null,
      isActive: formData.isActive,
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const fieldName = String(issue.path[0]);
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    const payload = validationResult.data;

    try {
      if (isEditing && court) {
        const updatePayload: UpdateCourtInput = {
          name: payload.name,
          courtType: payload.courtType,
          district: payload.district,
          division: payload.division,
          roomOrHall: payload.roomOrHall,
          address: payload.address,
          presidingJudgeTitle: payload.presidingJudgeTitle,
          isActive: payload.isActive,
        };

        const res = await updateMutation.mutateAsync({
          id: court.id,
          data: updatePayload,
        });

        toast.success(`Court "${res.data.name}" updated successfully.`);
        onSuccess?.(res.data);
        onOpenChange(false);
      } else {
        const createPayload: CreateCourtInput = {
          name: payload.name,
          courtType: payload.courtType,
          district: payload.district,
          division: payload.division,
          roomOrHall: payload.roomOrHall,
          address: payload.address,
          presidingJudgeTitle: payload.presidingJudgeTitle,
          isActive: payload.isActive,
        };

        const res = await createMutation.mutateAsync(createPayload);
        toast.success(`Court "${res.data.name}" registered successfully.`);
        onSuccess?.(res.data);
        onOpenChange(false);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error).message ||
        "An unexpected error occurred while saving the court record.";
      setGeneralError(message);
      toast.error("Operation Failed", { description: message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gold-500/10 text-gold-500 border border-gold-500/20">
                {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div>
                <DialogTitle>
                  {isEditing ? "Update Bench Information" : "Register New Judicial Bench"}
                </DialogTitle>
                <DialogDescription>
                  {isEditing
                    ? `Modify jurisdictional attributes and presiding details for ${court?.name}.`
                    : "Add a court, bench, or tribunal to the chamber's judicial registry."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* General Error Banner */}
          {generalError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20 font-medium">
              {generalError}
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="space-y-3.5 py-1 text-xs">
            {/* 1. Court Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                <span>Court / Bench Name *</span>
                <span className="text-muted-foreground font-normal text-[10px]">
                  {formData.name.length}/200
                </span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Court of Senior Assistant Judge (Sadar), Sylhet"
                value={formData.name}
                maxLength={200}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={errors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                required
              />
              {errors.name && (
                <p className="text-[11px] text-destructive">{errors.name}</p>
              )}
            </div>

            {/* 2. Court Type & Division (Two Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Court Classification *
                </label>
                <select
                  value={formData.courtType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      courtType: e.target.value as CourtType,
                    })
                  }
                  className="flex h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 cursor-pointer"
                >
                  {COURT_TYPE_LIST.map((type) => (
                    <option key={type} value={type}>
                      {COURT_TYPE_LABELS[type] || type}
                    </option>
                  ))}
                </select>
                {errors.courtType && (
                  <p className="text-[11px] text-destructive">{errors.courtType}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Administrative Division
                </label>
                <select
                  value={formData.division}
                  onChange={(e) =>
                    setFormData({ ...formData, division: e.target.value })
                  }
                  className="flex h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 cursor-pointer"
                >
                  {BANGLADESH_DIVISION_LIST.map((div) => (
                    <option key={div} value={div}>
                      {div} Division
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. District & Room/Hall (Two Columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  District *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Sylhet"
                  value={formData.district}
                  onChange={(e) =>
                    setFormData({ ...formData, district: e.target.value })
                  }
                  className={errors.district ? "border-destructive focus-visible:ring-destructive" : ""}
                  required
                />
                {errors.district && (
                  <p className="text-[11px] text-destructive">{errors.district}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-foreground">
                  Room / Court Hall
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Room No. 302 (3rd Floor)"
                  value={formData.roomOrHall}
                  onChange={(e) =>
                    setFormData({ ...formData, roomOrHall: e.target.value })
                  }
                />
              </div>
            </div>

            {/* 4. Presiding Officer Title */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                Presiding Judge / Magistrate Title
              </label>
              <Input
                type="text"
                placeholder="e.g. Learned Senior Assistant Judge, Learned Metropolitan Magistrate"
                value={formData.presidingJudgeTitle}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    presidingJudgeTitle: e.target.value,
                  })
                }
              />
            </div>

            {/* 5. Physical Address */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">
                Judicial Complex Address
              </label>
              <Input
                type="text"
                placeholder="e.g. District & Sessions Judge Court Complex, Sylhet"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>

            {/* 6. Active Toggle */}
            <div className="pt-1 flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground block">
                  Bench Active Status
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Active courts appear in daily cause list filings and case registration.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold-500"></div>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-semibold min-w-28"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : isEditing ? (
                "Update Bench"
              ) : (
                "Register Bench"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CourtFormDialog;
