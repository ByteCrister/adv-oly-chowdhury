"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Gavel,
  Calendar,
  Clock,
  Briefcase,
  FileText,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Check,
} from "lucide-react";
import { DashboardBreadcrumb } from "@/components/shared/DashboardBreadcrumb";
import { FadeInUp } from "@/components/wrappers/Motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemSelect } from "@/components/shared/ItemSelect";
import { useToast } from "@/components/shared/use-toast";
import { useCreateHearingMutation } from "@/hooks/hearings";
import { createHearingSchema } from "@/utils/zod/hearing.validation";
import {
  HEARING_STATUSES,
  HEARING_STATUS_LIST,
  HEARING_STATUS_LABELS,
  COMMON_HEARING_TYPE_LIST,
  type HearingStatus,
} from "@/const/hearing.const";
import { DROPDOWN_TYPES } from "@/const/dropdown.const";
import type { DropdownItem } from "@/types/dropdown.types";

export function HearingCreateForm() {
  const router = useRouter();
  const { toast } = useToast();
  const createMutation = useCreateHearingMutation();

  // Form State
  const [caseId, setCaseId] = React.useState("");
  const [courtId, setCourtId] = React.useState("");
  const [hearingDate, setHearingDate] = React.useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [startTime, setStartTime] = React.useState("10:30 AM");
  const [hearingType, setHearingType] = React.useState<string>(
    COMMON_HEARING_TYPE_LIST[0]
  );
  const [isCustomHearingType, setIsCustomHearingType] = React.useState(false);
  const [customHearingType, setCustomHearingType] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [status, setStatus] = React.useState<HearingStatus>(
    HEARING_STATUSES.SCHEDULED
  );
  const [outcome, setOutcome] = React.useState("");
  const [nextDate, setNextDate] = React.useState("");
  const [adjournmentReason, setAdjournmentReason] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Validation & Server Errors
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  // When a case is selected, auto-populate court if not manually selected
  const handleCaseSelect = (selectedCaseId: string, item?: DropdownItem | null) => {
    setCaseId(selectedCaseId);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.caseId;
      return next;
    });

    if (item?.metadata && typeof item.metadata === "object") {
      const meta = item.metadata as Record<string, unknown>;
      if (meta.courtId && typeof meta.courtId === "string" && !courtId) {
        setCourtId(meta.courtId);
      }
    }
  };

  const handleHearingTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "CUSTOM") {
      setIsCustomHearingType(true);
      setHearingType("");
    } else {
      setIsCustomHearingType(false);
      setHearingType(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const effectiveHearingType = isCustomHearingType
      ? customHearingType.trim()
      : hearingType.trim();

    const payload = {
      caseId: caseId.trim(),
      courtId: courtId.trim() ? courtId.trim() : null,
      hearingDate,
      startTime: startTime.trim() || null,
      hearingType: effectiveHearingType || null,
      purpose: purpose.trim() || null,
      status,
      outcome: outcome.trim() || null,
      nextDate: nextDate.trim() || null,
      adjournmentReason: adjournmentReason.trim() || null,
      notes: notes.trim() || null,
    };

    // Validate payload against Zod schema
    const validationResult = createHearingSchema.safeParse(payload);
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
      const res = await createMutation.mutateAsync(payload);
      toast({
        title: "Hearing Appearance Scheduled",
        description: res.message || "New hearing record has been added to the cause list.",
        variant: "gold",
      });
      router.push(`/dashboard/hearings/${res.data.id}`);
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        "An unexpected error occurred while scheduling the hearing.";
      setServerError(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* 1. Breadcrumb navigation */}
      <DashboardBreadcrumb
        items={[
          { label: "Overview", href: "/dashboard" },
          { label: "Daily Cause List", href: "/dashboard/hearings" },
          { label: "Schedule New Hearing" },
        ]}
      />

      {/* 2. Form Card */}
      <FadeInUp delay={0.08}>
        <div className="relative rounded-2xl border border-border/80 dark:border-white/10 bg-card/85 dark:bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
          {/* Specular Top Hairline */}
          <div
            className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold-400/50 to-transparent pointer-events-none"
            aria-hidden="true"
          />

          {/* Form Header */}
          <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-600 dark:text-gold-400 shrink-0">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Schedule Court Hearing
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Record an upcoming appearance, bench cause-list entry, or interlocutory hearing.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
              className="rounded-xl text-xs gap-1.5 self-start sm:self-auto"
            >
              <Link href="/dashboard/hearings">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Cause List</span>
              </Link>
            </Button>
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <div className="mx-6 mt-6 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-semibold block">Failed to Save Hearing</strong>
                <span>{serverError}</span>
              </div>
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Section 1: Case & Court Association */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Briefcase className="w-3.5 h-3.5 text-gold-500" />
                <span>Case Dossier & Jurisdiction</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Case Selector */}
                <div>
                  <ItemSelect
                    id="hearing-case"
                    label="Associated Case *"
                    type={DROPDOWN_TYPES.CASE}
                    value={caseId}
                    onChange={handleCaseSelect}
                    placeholder="Search and select case dossier..."
                    searchPlaceholder="Type case title or internal reference..."
                    error={fieldErrors.caseId}
                    helperText="Select the litigation matter for this scheduled hearing appearance."
                    required
                  />
                </div>

                {/* Court Selector */}
                <div>
                  <ItemSelect
                    id="hearing-court"
                    label="Court Bench / Forum"
                    type={DROPDOWN_TYPES.COURT}
                    value={courtId}
                    onChange={(val) => setCourtId(val)}
                    placeholder="Defaults to case court, or select specific bench..."
                    searchPlaceholder="Search court by name or district..."
                    error={fieldErrors.courtId}
                    helperText="Optional override if hearing takes place before an appellate or special bench."
                    clearable
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Date, Time & Hearing Type */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 text-gold-500" />
                <span>Appearance Schedule & Type</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Hearing Date */}
                <div>
                  <label
                    htmlFor="hearing-date"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Hearing Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="hearing-date"
                    type="date"
                    value={hearingDate}
                    onChange={(e) => {
                      setHearingDate(e.target.value);
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.hearingDate;
                        return next;
                      });
                    }}
                    className={`h-10 text-xs rounded-xl ${
                      fieldErrors.hearingDate ? "border-destructive focus-visible:ring-destructive/30" : ""
                    }`}
                    required
                  />
                  {fieldErrors.hearingDate && (
                    <p className="text-[11px] text-destructive mt-1">
                      {fieldErrors.hearingDate}
                    </p>
                  )}
                </div>

                {/* Start Time */}
                <div>
                  <label
                    htmlFor="hearing-time"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Appearance Time / Bench Hour
                  </label>
                  <Input
                    id="hearing-time"
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 10:30 AM"
                    className="h-10 text-xs rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Standard morning cause list starts at 10:30 AM.
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label
                    htmlFor="hearing-status"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Initial Status
                  </label>
                  <select
                    id="hearing-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as HearingStatus)}
                    className="w-full h-10 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                  >
                    {HEARING_STATUS_LIST.map((st) => (
                      <option key={st} value={st}>
                        {HEARING_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hearing Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="hearing-type-select"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Proceedings Stage / Classification
                  </label>
                  <select
                    id="hearing-type-select"
                    value={isCustomHearingType ? "CUSTOM" : hearingType}
                    onChange={handleHearingTypeChange}
                    className="w-full h-10 rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                  >
                    {COMMON_HEARING_TYPE_LIST.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Specify Other Proceeding...</option>
                  </select>
                </div>

                {isCustomHearingType && (
                  <div>
                    <label
                      htmlFor="custom-hearing-type"
                      className="block text-xs font-medium text-foreground mb-1"
                    >
                      Custom Proceedings Description
                    </label>
                    <Input
                      id="custom-hearing-type"
                      type="text"
                      value={customHearingType}
                      onChange={(e) => setCustomHearingType(e.target.value)}
                      placeholder="e.g. Pre-Trial Conference, Section 138 Examination"
                      className="h-10 text-xs rounded-xl"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Purpose of Hearing */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="w-3.5 h-3.5 text-gold-500" />
                <span>Purpose & Scope of Hearing</span>
              </div>

              <div>
                <label
                  htmlFor="hearing-purpose"
                  className="block text-xs font-medium text-foreground mb-1"
                >
                  Purpose / Cause List Goal
                </label>
                <textarea
                  id="hearing-purpose"
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Submitting compliance with interlocutory order; cross-examination of PW-1; moved prayer for ad-interim injunction."
                  className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
            </div>

            {/* Section 4: Adjournment, Outcome & Next Date (Conditional / Optional) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-gold-500" />
                <span>Post-Hearing Outcome & Adjournment Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Outcome */}
                <div>
                  <label
                    htmlFor="hearing-outcome"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Outcome / Bench Order Summary
                  </label>
                  <Input
                    id="hearing-outcome"
                    type="text"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    placeholder="e.g. Injunction extended for 3 months; PW-1 examined in part."
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                {/* Next Hearing Date */}
                <div>
                  <label
                    htmlFor="hearing-next-date"
                    className="block text-xs font-medium text-foreground mb-1"
                  >
                    Next Date Fixed by Bench
                  </label>
                  <Input
                    id="hearing-next-date"
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Adjournment Reason (Highlighted if status is ADJOURNED) */}
              {(status === HEARING_STATUSES.ADJOURNED || adjournmentReason) && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1">
                  <label
                    htmlFor="hearing-adjournment-reason"
                    className="block text-xs font-semibold text-amber-700 dark:text-amber-400"
                  >
                    Adjournment Reason / Cause for Extension
                  </label>
                  <Input
                    id="hearing-adjournment-reason"
                    type="text"
                    value={adjournmentReason}
                    onChange={(e) => setAdjournmentReason(e.target.value)}
                    placeholder="e.g. Non-appearance of witness due to illness; presiding judge on leave."
                    className="h-10 text-xs rounded-xl bg-background border-amber-500/30"
                  />
                </div>
              )}
            </div>

            {/* Section 5: Chamber Preparation Notes */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="w-3.5 h-3.5 text-gold-500" />
                <span>Confidential Chamber Instructions</span>
              </div>

              <div>
                <label
                  htmlFor="hearing-notes"
                  className="block text-xs font-medium text-foreground mb-1"
                >
                  Internal Advocate Notes & Instructions
                </label>
                <textarea
                  id="hearing-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Ensure junior advocate brings certified copies of judgment; remind client to bring original land title deed."
                  className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
            </div>

            {/* Footer Form Controls */}
            <div className="pt-4 border-t border-border/50 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="rounded-xl text-xs"
              >
                <Link href="/dashboard/hearings">Cancel</Link>
              </Button>

              <Button
                type="submit"
                variant="gold"
                size="sm"
                disabled={createMutation.isPending}
                className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scheduling Appearance...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Schedule Hearing</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </FadeInUp>
    </div>
  );
}

export default HearingCreateForm;
