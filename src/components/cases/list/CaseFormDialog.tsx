"use client";

import * as React from "react";
import { Loader2, Plus, Pencil, Briefcase, Building2, User } from "lucide-react";
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
import type { CaseListItemDto, CaseDetailDto, CreateCaseInput, UpdateCaseInput } from "@/types/case.types";

export interface CaseFormDialogProps {
  caseItem?: CaseListItemDto | CaseDetailDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormState {
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

const defaultFormState: FormState = {
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

export function CaseFormDialog({
  caseItem,
  isOpen,
  onClose,
  onSuccess,
}: CaseFormDialogProps) {
  const isEditing = Boolean(caseItem);
  const [form, setForm] = React.useState<FormState>(defaultFormState);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  const createMutation = useCreateCaseMutation();
  const updateMutation = useUpdateCaseMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Sync form when dialog opens or case changes (React 19 pattern)
  const [prevCaseKey, setPrevCaseKey] = React.useState<string | null>(null);
  const currentKey = isOpen && caseItem ? `${caseItem.id}-${caseItem.updatedAt}` : isOpen ? "new" : null;

  if (currentKey !== prevCaseKey) {
    setPrevCaseKey(currentKey);
    if (caseItem && isOpen) {
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
      errs.title = "Case title is required.";
    }

    if (!form.clientId.trim()) {
      errs.clientId = "Please associate a client dossier with this case.";
    }

    if (!form.courtId.trim()) {
      errs.courtId = "Please specify the presiding court / jurisdiction.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
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
            form.caseStatus === CASE_STATUSES.CLOSED || form.caseStatus === CASE_STATUSES.DISPOSED
              ? form.closureReason.trim() || "Concluded"
              : null,
        };

        await updateMutation.mutateAsync({
          id: caseItem.id,
          payload: updatePayload,
        });

        toast({
          title: "Case Updated",
          description: `Case dossier "${form.title}" was updated successfully.`,
          variant: "gold",
        });
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

        await createMutation.mutateAsync(createPayload);

        toast({
          title: "Case Registered",
          description: `Legal case "${form.title}" has been registered in the chamber repository.`,
          variant: "gold",
        });
      }

      onSuccess?.();
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save the case dossier.";
      setServerError(msg);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-border/80 dark:border-white/10 bg-card p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <DialogTitle className="font-serif text-lg font-bold text-foreground">
              {isEditing ? "Edit Case Dossier" : "Register New Legal Case"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Update litigation information, status, opposing details, and court jurisdiction."
              : "Create a new legal matter, assign the client and presiding court, and set proceeding priorities."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {serverError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {serverError}
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
                onChange={(e) => setForm({ ...form, title: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, caseNumber: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, internalReference: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, filingYear: e.target.value })}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Case Type <span className="text-destructive">*</span>
                </label>
                <select
                  value={form.caseType}
                  onChange={(e) => setForm({ ...form, caseType: e.target.value as CaseType })}
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
                  onChange={(e) => setForm({ ...form, caseStatus: e.target.value as CaseStatus })}
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
                  onChange={(e) => setForm({ ...form, priority: e.target.value as CasePriority })}
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
              <span>Client & Court Association</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Client Profile <span className="text-destructive">*</span>
                </label>
                <ItemSelect
                  type="client"
                  value={form.clientId}
                  onChange={(val) => setForm({ ...form, clientId: val })}
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
                  onChange={(val) => setForm({ ...form, courtId: val })}
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
                  onChange={(e) => setForm({ ...form, filingDate: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, caseCategory: e.target.value })}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Opposing Parties & Counsel */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gold-500" />
              <span>Opposing Counsel & Parties</span>
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
                  onChange={(e) => setForm({ ...form, opposingCounsel: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, opposingPartiesText: e.target.value })}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Case Narrative & Legal Notes */}
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Case Description & Facts
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of facts, background history, and client objectives..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl text-xs bg-background border border-border/70 p-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/30"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Legal Issues & Relevant Statutory Sections
              </label>
              <Input
                type="text"
                placeholder="e.g. Section 138 of NI Act; Article 102 of Constitution"
                value={form.legalIssues}
                onChange={(e) => setForm({ ...form, legalIssues: e.target.value })}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {/* Closure reason when closing/disposed */}
            {(form.caseStatus === CASE_STATUSES.CLOSED ||
              form.caseStatus === CASE_STATUSES.DISPOSED) && (
              <div>
                <label className="text-xs font-medium text-destructive block mb-1">
                  Closure Reason & Judgment Outcome
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Allowed with costs; Settled out of court"
                  value={form.closureReason}
                  onChange={(e) => setForm({ ...form, closureReason: e.target.value })}
                  className="h-9 rounded-xl text-xs border-destructive/40"
                />
              </div>
            )}
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
                  <span>Saving Dossier...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Register Case"}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CaseFormDialog;
