"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Briefcase,
  Building2,
  Users,
  FileText,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ItemSelect } from "@/components/shared";
import { toast } from "@/components/shared/use-toast";
import {
  CASE_TYPE_LIST,
  CASE_TYPE_LABELS,
  CASE_TYPES,
  CASE_STATUS_LIST,
  CASE_STATUS_LABELS,
  CASE_STATUSES,
  CASE_PRIORITY_LIST,
  CASE_PRIORITY_LABELS,
  CASE_PRIORITIES,
  CaseType,
  CaseStatus,
  CasePriority,
} from "@/const/case.const";
import {
  useCreateCaseMutation,
  useUpdateCaseMutation,
} from "@/hooks/cases";
import type {
  CaseListItemDto,
  CaseDetailDto,
  CreateCaseInput,
  UpdateCaseInput,
} from "@/types/case.types";

export interface CaseFormState {
  title: string;
  caseNumber: string;
  internalReference: string;
  filingYear: string;
  caseType: CaseType;
  caseCategory: string;
  caseStatus: CaseStatus;
  priority: CasePriority;
  courtId: string;
  clientId: string;
  filingDate: string;
  description: string;
  legalIssues: string;
  opposingCounsel: string;
  opposingPartiesText: string;
  closureReason: string;
}

export interface CaseFormProps {
  caseItem?: CaseListItemDto | CaseDetailDto | null;
  isDialog?: boolean;
  onSuccess?: (caseId: string) => void;
  onCancel?: () => void;
  onFormChange?: (state: CaseFormState) => void;
  className?: string;
}

export const defaultCaseFormState: CaseFormState = {
  title: "",
  caseNumber: "",
  internalReference: "",
  filingYear: new Date().getFullYear().toString(),
  caseType: CASE_TYPES.CIVIL,
  caseCategory: "",
  caseStatus: CASE_STATUSES.ACTIVE,
  priority: CASE_PRIORITIES.NORMAL,
  courtId: "",
  clientId: "",
  filingDate: "",
  description: "",
  legalIssues: "",
  opposingCounsel: "",
  opposingPartiesText: "",
  closureReason: "",
};

export function CaseForm({
  caseItem,
  isDialog = false,
  onSuccess,
  onCancel,
  onFormChange,
  className = "",
}: CaseFormProps) {
  const router = useRouter();
  const isEditing = Boolean(caseItem);

  const [form, setForm] = React.useState<CaseFormState>(() => {
    if (caseItem) {
      return {
        title: caseItem.title || "",
        caseNumber: caseItem.caseNumber || "",
        internalReference: caseItem.internalReference || "",
        filingYear: caseItem.filingYear ? caseItem.filingYear.toString() : "",
        caseType: caseItem.caseType || CASE_TYPES.CIVIL,
        caseCategory: caseItem.caseCategory || "",
        caseStatus: caseItem.caseStatus || CASE_STATUSES.ACTIVE,
        priority: caseItem.priority || CASE_PRIORITIES.NORMAL,
        courtId: caseItem.courtId || "",
        clientId: caseItem.clientId || "",
        filingDate: caseItem.filingDate ? caseItem.filingDate.split("T")[0] : "",
        description: caseItem.description || "",
        legalIssues: caseItem.legalIssues || "",
        opposingCounsel: caseItem.opposingCounsel || "",
        opposingPartiesText: caseItem.opposingParties?.join(", ") || "",
        closureReason: caseItem.closureReason || "",
      };
    }
    return defaultCaseFormState;
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof CaseFormState, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  const createMutation = useCreateCaseMutation();
  const updateMutation = useUpdateCaseMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Sync form when caseItem changes
  const [prevCaseItem, setPrevCaseItem] = React.useState(caseItem);
  if (caseItem !== prevCaseItem) {
    setPrevCaseItem(caseItem);
    if (caseItem) {
      setForm({
        title: caseItem.title || "",
        caseNumber: caseItem.caseNumber || "",
        internalReference: caseItem.internalReference || "",
        filingYear: caseItem.filingYear ? caseItem.filingYear.toString() : "",
        caseType: caseItem.caseType || CASE_TYPES.CIVIL,
        caseCategory: caseItem.caseCategory || "",
        caseStatus: caseItem.caseStatus || CASE_STATUSES.ACTIVE,
        priority: caseItem.priority || CASE_PRIORITIES.NORMAL,
        courtId: caseItem.courtId || "",
        clientId: caseItem.clientId || "",
        filingDate: caseItem.filingDate ? caseItem.filingDate.split("T")[0] : "",
        description: caseItem.description || "",
        legalIssues: caseItem.legalIssues || "",
        opposingCounsel: caseItem.opposingCounsel || "",
        opposingPartiesText: caseItem.opposingParties?.join(", ") || "",
        closureReason: caseItem.closureReason || "",
      });
    } else {
      setForm(defaultCaseFormState);
    }
    setErrors({});
    setServerError(null);
  }

  const updateField = <K extends keyof CaseFormState>(key: K, value: CaseFormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      onFormChange?.(next);
      return next;
    });
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleReset = () => {
    if (isEditing && caseItem) {
      setForm({
        title: caseItem.title || "",
        caseNumber: caseItem.caseNumber || "",
        internalReference: caseItem.internalReference || "",
        filingYear: caseItem.filingYear ? caseItem.filingYear.toString() : "",
        caseType: caseItem.caseType || CASE_TYPES.CIVIL,
        caseCategory: caseItem.caseCategory || "",
        caseStatus: caseItem.caseStatus || CASE_STATUSES.ACTIVE,
        priority: caseItem.priority || CASE_PRIORITIES.NORMAL,
        courtId: caseItem.courtId || "",
        clientId: caseItem.clientId || "",
        filingDate: caseItem.filingDate ? caseItem.filingDate.split("T")[0] : "",
        description: caseItem.description || "",
        legalIssues: caseItem.legalIssues || "",
        opposingCounsel: caseItem.opposingCounsel || "",
        opposingPartiesText: caseItem.opposingParties?.join(", ") || "",
        closureReason: caseItem.closureReason || "",
      });
    } else {
      setForm(defaultCaseFormState);
    }
    setErrors({});
    setServerError(null);
    onFormChange?.(defaultCaseFormState);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/dashboard/cases");
    }
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof CaseFormState, string>> = {};

    if (!form.title.trim()) {
      errs.title = "Case title is required.";
    } else if (form.title.trim().length > 250) {
      errs.title = "Case title cannot exceed 250 characters.";
    }

    if (!form.clientId.trim()) {
      errs.clientId = "Please associate a client dossier with this case.";
    }

    if (!form.courtId.trim()) {
      errs.courtId = "Please specify the presiding court / jurisdiction.";
    }

    if (form.filingYear.trim()) {
      const year = parseInt(form.filingYear.trim(), 10);
      if (isNaN(year) || year < 1900 || year > 2100) {
        errs.filingYear = "Filing year must be between 1900 and 2100.";
      }
    }

    if (form.internalReference.trim() && form.internalReference.trim().length < 3) {
      errs.internalReference = "Internal reference must be at least 3 characters.";
    }

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      toast({
        title: "Incomplete Information",
        description: "Please resolve the highlighted fields before submitting.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    const opposingParties = form.opposingPartiesText
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    try {
      if (isEditing && caseItem) {
        const updatePayload: UpdateCaseInput = {
          title: form.title.trim(),
          caseNumber: form.caseNumber.trim() || null,
          internalReference: form.internalReference.trim() || undefined,
          filingYear: form.filingYear ? parseInt(form.filingYear, 10) : null,
          caseType: form.caseType,
          caseCategory: form.caseCategory.trim() || null,
          caseStatus: form.caseStatus,
          priority: form.priority,
          courtId: form.courtId,
          clientId: form.clientId,
          filingDate: form.filingDate || null,
          description: form.description.trim() || null,
          legalIssues: form.legalIssues.trim() || null,
          opposingCounsel: form.opposingCounsel.trim() || null,
          opposingParties,
          closureReason:
            form.caseStatus === CASE_STATUSES.CLOSED ||
            form.caseStatus === CASE_STATUSES.DISPOSED
              ? form.closureReason.trim() || "Concluded"
              : null,
        };

        const res = await updateMutation.mutateAsync({
          id: caseItem.id,
          payload: updatePayload,
        });

        toast({
          title: "Case Updated",
          description: `Case dossier "${form.title}" was updated successfully.`,
          variant: "gold",
        });

        const targetId = res?.data?.id || caseItem.id;
        if (onSuccess) {
          onSuccess(targetId);
        } else {
          router.push(`/dashboard/cases/${targetId}`);
        }
      } else {
        const createPayload: CreateCaseInput = {
          title: form.title.trim(),
          caseNumber: form.caseNumber.trim() || null,
          internalReference: form.internalReference.trim() || undefined,
          filingYear: form.filingYear ? parseInt(form.filingYear, 10) : null,
          caseType: form.caseType,
          caseCategory: form.caseCategory.trim() || null,
          caseStatus: form.caseStatus,
          priority: form.priority,
          courtId: form.courtId,
          clientId: form.clientId,
          filingDate: form.filingDate || null,
          description: form.description.trim() || null,
          legalIssues: form.legalIssues.trim() || null,
          opposingCounsel: form.opposingCounsel.trim() || null,
          opposingParties,
        };

        const res = await createMutation.mutateAsync(createPayload);

        toast({
          title: "Case Registered",
          description: `Legal case "${form.title}" has been registered in the chamber repository.`,
          variant: "gold",
        });

        const targetId = res?.data?.id;
        if (onSuccess) {
          onSuccess(targetId || "");
        } else if (targetId) {
          router.push(`/dashboard/cases/${targetId}`);
        } else {
          router.push("/dashboard/cases");
        }
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const msg =
        axiosError?.response?.data?.message ||
        (err instanceof Error ? err.message : "Failed to save the case dossier.");
      setServerError(msg);
    }
  };

  const parsedOpposingParties = React.useMemo(() => {
    return form.opposingPartiesText
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  }, [form.opposingPartiesText]);

  // ─────────────────────────────────────────────────────────────
  // DIALOG MODE LAYOUT (compact modal representation)
  // ─────────────────────────────────────────────────────────────
  if (isDialog) {
    return (
      <form onSubmit={handleSubmit} className={`space-y-4 pt-2 ${className}`}>
        {serverError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Core Case Information */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-gold-500" />
            <span>Core Matter Information</span>
          </h4>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Case Title / Subject <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Al-Haj Abdul vs. Bangladesh & Others"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
            {errors.title && (
              <p className="text-[11px] text-destructive mt-1">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Case Number
              </label>
              <Input
                type="text"
                placeholder="e.g. Writ Petition 142/2024"
                value={form.caseNumber}
                onChange={(e) => updateField("caseNumber", e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Internal Reference
              </label>
              <Input
                type="text"
                placeholder="Auto-generated if empty"
                value={form.internalReference}
                onChange={(e) => updateField("internalReference", e.target.value)}
                className="h-9 rounded-xl text-xs uppercase font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Filing Year
              </label>
              <Input
                type="number"
                placeholder="2024"
                value={form.filingYear}
                onChange={(e) => updateField("filingYear", e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
              {errors.filingYear && (
                <p className="text-[11px] text-destructive mt-1">{errors.filingYear}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Case Type <span className="text-destructive">*</span>
              </label>
              <select
                value={form.caseType}
                onChange={(e) => updateField("caseType", e.target.value as CaseType)}
                className="w-full h-9 rounded-xl text-xs bg-background border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
              >
                {CASE_TYPE_LIST.map((t) => (
                  <option key={t} value={t}>
                    {CASE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Case Status
              </label>
              <select
                value={form.caseStatus}
                onChange={(e) => updateField("caseStatus", e.target.value as CaseStatus)}
                className="w-full h-9 rounded-xl text-xs bg-background border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
              >
                {CASE_STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {CASE_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => updateField("priority", e.target.value as CasePriority)}
                className="w-full h-9 rounded-xl text-xs bg-background border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
              >
                {CASE_PRIORITY_LIST.map((p) => (
                  <option key={p} value={p}>
                    {CASE_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Client & Court Association */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-gold-500" />
            <span>Client &amp; Court Association</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Client Profile <span className="text-destructive">*</span>
              </label>
              <ItemSelect
                type="client"
                value={form.clientId}
                onChange={(val) => updateField("clientId", val)}
                placeholder="Select Client..."
                searchPlaceholder="Search client by name or ID..."
                className="h-9 text-xs rounded-xl"
              />
              {errors.clientId && (
                <p className="text-[11px] text-destructive mt-1">{errors.clientId}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Court Jurisdiction <span className="text-destructive">*</span>
              </label>
              <ItemSelect
                type="court"
                value={form.courtId}
                onChange={(val) => updateField("courtId", val)}
                placeholder="Select Court..."
                searchPlaceholder="Search court by name..."
                className="h-9 text-xs rounded-xl"
              />
              {errors.courtId && (
                <p className="text-[11px] text-destructive mt-1">{errors.courtId}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Filing Date
              </label>
              <Input
                type="date"
                value={form.filingDate}
                onChange={(e) => updateField("filingDate", e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Sub-Category / Bench
              </label>
              <Input
                type="text"
                placeholder="e.g. Land Revenue, Cheque Dishonour"
                value={form.caseCategory}
                onChange={(e) => updateField("caseCategory", e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Opposing Parties & Counsel */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-gold-500" />
            <span>Opposing Counsel &amp; Parties</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Opposing Counsel
              </label>
              <Input
                type="text"
                placeholder="e.g. Adv. M. Rahman, Supreme Court"
                value={form.opposingCounsel}
                onChange={(e) => updateField("opposingCounsel", e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Opposing Parties (comma separated)
              </label>
              <Input
                type="text"
                placeholder="e.g. Agrani Bank Ltd, Ministry of Land"
                value={form.opposingPartiesText}
                onChange={(e) => updateField("opposingPartiesText", e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Case Narrative & Legal Notes */}
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Case Description &amp; Facts
            </label>
            <textarea
              rows={3}
              placeholder="Brief summary of facts, background history, and client objectives..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="w-full rounded-xl text-xs bg-background border border-border/70 p-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Legal Issues &amp; Relevant Statutory Sections
            </label>
            <Input
              type="text"
              placeholder="e.g. Section 138 of NI Act; Article 102 of Constitution"
              value={form.legalIssues}
              onChange={(e) => updateField("legalIssues", e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
          </div>

          {(form.caseStatus === CASE_STATUSES.CLOSED ||
            form.caseStatus === CASE_STATUSES.DISPOSED) && (
            <div>
              <label className="text-xs font-medium text-destructive block mb-1">
                Closure Reason &amp; Judgment Outcome
              </label>
              <Input
                type="text"
                placeholder="e.g. Allowed with costs; Settled out of court"
                value={form.closureReason}
                onChange={(e) => updateField("closureReason", e.target.value)}
                className="h-9 rounded-xl text-xs border-destructive/40"
              />
            </div>
          )}
        </div>

        {/* Footer actions for Dialog mode */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
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
                <span>Saving Dossier...</span>
              </>
            ) : (
              <span>{isEditing ? "Save Changes" : "Register Case"}</span>
            )}
          </Button>
        </div>
      </form>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // FULL PAGE MODE LAYOUT (Dedicated, polished, multi-card form)
  // ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {serverError && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-destructive" />
          <div className="space-y-1">
            <h5 className="font-semibold text-destructive">Submission Error</h5>
            <p className="text-destructive/90 leading-relaxed">{serverError}</p>
          </div>
        </div>
      )}

      {/* ── CARD 1: Core Litigation Matter Details ──────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-card p-6 sm:p-7 shadow-xs space-y-6">
        <div
          className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="pb-3 border-b border-border/40 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gold-500" />
              <span>Core Litigation Matter Details</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Essential identification, judicial reference codes, case classification, and proceeding priorities.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20">
            <Sparkles className="w-3 h-3 text-gold-500" />
            <span>Primary Information</span>
          </span>
        </div>

        {/* Case Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1">
            <span>Case Title / Cause Subject</span>
            <span className="text-destructive">*</span>
          </label>
          <Input
            type="text"
            placeholder="e.g. Al-Haj Abdul vs. Government of Bangladesh & Others"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="h-10 rounded-xl text-xs sm:text-sm"
          />
          {errors.title ? (
            <p className="text-[11px] text-destructive mt-1 font-medium">{errors.title}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Full title of the legal proceeding as it appears or will appear on judicial filings.
            </p>
          )}
        </div>

        {/* Case Number, Reference, Filing Year */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Judicial Docket / Case No.
            </label>
            <Input
              type="text"
              placeholder="e.g. Writ Petition 142/2024"
              value={form.caseNumber}
              onChange={(e) => updateField("caseNumber", e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
            <p className="text-[10px] text-muted-foreground">Official court registry number</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Internal Reference Code
            </label>
            <Input
              type="text"
              placeholder="Auto-generated if blank"
              value={form.internalReference}
              onChange={(e) => updateField("internalReference", e.target.value)}
              className="h-9 rounded-xl text-xs uppercase font-mono tracking-wider"
            />
            {errors.internalReference ? (
              <p className="text-[10px] text-destructive">{errors.internalReference}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                Sequential code: <span className="font-mono text-gold-600 dark:text-gold-400">CASE-{form.filingYear || "2026"}-XXXX</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Judicial Filing Year
            </label>
            <Input
              type="number"
              placeholder="2026"
              value={form.filingYear}
              onChange={(e) => updateField("filingYear", e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
            {errors.filingYear ? (
              <p className="text-[10px] text-destructive">{errors.filingYear}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground">Calendar year of institution</p>
            )}
          </div>
        </div>

        {/* Case Type, Priority, Case Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>Litigation Nature (Type)</span>
              <span className="text-destructive">*</span>
            </label>
            <select
              value={form.caseType}
              onChange={(e) => updateField("caseType", e.target.value as CaseType)}
              className="w-full h-9 rounded-xl text-xs bg-background border border-border/80 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30 transition-all font-medium"
            >
              {CASE_TYPE_LIST.map((t) => (
                <option key={t} value={t}>
                  {CASE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Proceeding Priority
            </label>
            <select
              value={form.priority}
              onChange={(e) => updateField("priority", e.target.value as CasePriority)}
              className="w-full h-9 rounded-xl text-xs bg-background border border-border/80 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30 transition-all font-medium"
            >
              {CASE_PRIORITY_LIST.map((p) => (
                <option key={p} value={p}>
                  {CASE_PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Initial Matter Status
            </label>
            <select
              value={form.caseStatus}
              onChange={(e) => updateField("caseStatus", e.target.value as CaseStatus)}
              className="w-full h-9 rounded-xl text-xs bg-background border border-border/80 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30 transition-all font-medium"
            >
              {CASE_STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {CASE_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── CARD 2: Client & Court Jurisdiction ─────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-card p-6 sm:p-7 shadow-xs space-y-6">
        <div
          className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="pb-3 border-b border-border/40">
          <h3 className="font-serif text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gold-500" />
            <span>Client &amp; Court Jurisdiction Binding</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Associate the chamber client dossier and select the presiding court or tribunal jurisdiction.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>Client Profile</span>
              <span className="text-destructive">*</span>
            </label>
            <ItemSelect
              type="client"
              value={form.clientId}
              onChange={(val) => updateField("clientId", val)}
              placeholder="Search or Select Client..."
              searchPlaceholder="Search client by name, phone, or client number..."
              className="h-10 text-xs rounded-xl"
            />
            {errors.clientId ? (
              <p className="text-[11px] text-destructive mt-1 font-medium">{errors.clientId}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Client on whose behalf Advocate Oly Chowdhury appears.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>Court / Judicial Bench</span>
              <span className="text-destructive">*</span>
            </label>
            <ItemSelect
              type="court"
              value={form.courtId}
              onChange={(val) => updateField("courtId", val)}
              placeholder="Search or Select Court Jurisdiction..."
              searchPlaceholder="Search court by name, district, or type..."
              className="h-10 text-xs rounded-xl"
            />
            {errors.courtId ? (
              <p className="text-[11px] text-destructive mt-1 font-medium">{errors.courtId}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Presiding court room, judge title, and judicial bench.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Formal Filing Date
            </label>
            <Input
              type="date"
              value={form.filingDate}
              onChange={(e) => updateField("filingDate", e.target.value)}
              className="h-10 rounded-xl text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Date the petition or plaint was officially accepted by court registry.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Sub-Category / Bench Specialization
            </label>
            <Input
              type="text"
              placeholder="e.g. Land Revenue, Cheque Dishonour, Criminal Revision"
              value={form.caseCategory}
              onChange={(e) => updateField("caseCategory", e.target.value)}
              className="h-10 rounded-xl text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Optional topical category or specific bench designation.
            </p>
          </div>
        </div>
      </div>

      {/* ── CARD 3: Opposing Representation & Adverse Parties ──── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-card p-6 sm:p-7 shadow-xs space-y-6">
        <div
          className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="pb-3 border-b border-border/40">
          <h3 className="font-serif text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-gold-500" />
            <span>Opposing Counsel &amp; Adverse Parties</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record adverse respondents or defendants and opposing counsel for conflict checking and notice tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Opposing Counsel / Advocate
            </label>
            <Input
              type="text"
              placeholder="e.g. Adv. M. Rahman, Supreme Court of Bangladesh"
              value={form.opposingCounsel}
              onChange={(e) => updateField("opposingCounsel", e.target.value)}
              className="h-10 rounded-xl text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Primary attorney or law firm representing the adverse parties.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Opposing Parties (comma separated)
            </label>
            <Input
              type="text"
              placeholder="e.g. Agrani Bank Ltd, Ministry of Land, ADC Revenue"
              value={form.opposingPartiesText}
              onChange={(e) => updateField("opposingPartiesText", e.target.value)}
              className="h-10 rounded-xl text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Separate multiple individuals or organizations with commas.
            </p>
          </div>
        </div>

        {/* Dynamic opposing parties badge chip preview */}
        {parsedOpposingParties.length > 0 && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Parsed Opposing Parties ({parsedOpposingParties.length})
            </span>
            <div className="flex flex-wrap gap-1.5">
              {parsedOpposingParties.map((party, index) => (
                <Badge
                  key={`${party}-${index}`}
                  variant="outline"
                  className="bg-card text-foreground border-border/80 text-[11px] px-2.5 py-0.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-500 mr-1.5" />
                  <span>{party}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CARD 4: Case Facts, Legal Grounds & Disposition ────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-card p-6 sm:p-7 shadow-xs space-y-6">
        <div
          className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        <div className="pb-3 border-b border-border/40">
          <h3 className="font-serif text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-gold-500" />
            <span>Case Facts, Legal Grounds &amp; Disposition</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Factual background summary, statutory legal provisions, and disposition details if concluding.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground block">
            Factual Background &amp; Proceeding Summary
          </label>
          <textarea
            rows={4}
            placeholder="Detailed summary of facts, litigation history, client objectives, relief prayed for, and chamber notes..."
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="w-full rounded-xl text-xs bg-background border border-border/80 p-3 text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-gold-500/30 transition-all resize-y"
          />
          <p className="text-[11px] text-muted-foreground">
            Privileged legal notes accessible only to authorized chamber associates.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground block">
            Legal Issues &amp; Relevant Statutory Sections
          </label>
          <Input
            type="text"
            placeholder="e.g. Section 138 of Negotiable Instruments Act; Article 102 of Bangladesh Constitution"
            value={form.legalIssues}
            onChange={(e) => updateField("legalIssues", e.target.value)}
            className="h-10 rounded-xl text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Applicable statutes, constitutional provisions, or precedent references for research.
          </p>
        </div>

        {/* Conditional Closure Reason */}
        {(form.caseStatus === CASE_STATUSES.CLOSED ||
          form.caseStatus === CASE_STATUSES.DISPOSED) && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-1.5">
            <label className="text-xs font-semibold text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Closure Reason &amp; Final Judgment Outcome</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Suit decreed with costs; Writ Petition discharged; Compromised out of court"
              value={form.closureReason}
              onChange={(e) => updateField("closureReason", e.target.value)}
              className="h-10 rounded-xl text-xs bg-background border-destructive/40 focus:ring-destructive/30"
            />
            <p className="text-[11px] text-destructive/80">
              Required for closed or disposed dossiers to record final judicial disposition.
            </p>
          </div>
        )}
      </div>

      {/* ── Form Navigation & Submission Action Bar ────────────── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-xl w-full sm:w-auto text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel &amp; Return</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={isPending}
            className="rounded-xl w-full sm:w-auto text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Form</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="submit"
            variant="gold"
            disabled={isPending}
            className="rounded-xl font-semibold gap-2 shadow-sm w-full sm:w-auto text-xs h-10 px-6"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEditing ? "Updating Dossier..." : "Registering Legal Case..."}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEditing ? "Save Case Changes" : "Register Legal Case"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default CaseForm;
