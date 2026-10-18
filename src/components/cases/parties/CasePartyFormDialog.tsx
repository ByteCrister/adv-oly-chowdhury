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
import { ItemSelect } from "@/components/shared";
import { toast } from "@/components/shared/use-toast";
import {
  PARTY_ROLE_LIST,
  PARTY_ROLE_LABELS,
  PARTY_ROLES,
  PARTY_TYPE_LIST,
  PARTY_TYPE_LABELS,
  PARTY_TYPES,
  PartyRole,
  PartyType,
} from "@/const/case-party.const";
import {
  useCreateCasePartyMutation,
  useUpdateCasePartyMutation,
} from "@/hooks/cases";
import type {
  CasePartyItemDto,
  UpdateCasePartyInput,
} from "@/types/case-party.types";

export interface CasePartyFormDialogProps {
  caseId: string;
  partyItem?: CasePartyItemDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormState {
  name: string;
  partyType: PartyType;
  role: PartyRole;
  clientId: string;
  phone: string;
  address: string;
  notes: string;
}

const defaultFormState: FormState = {
  name: "",
  partyType: PARTY_TYPES.INDIVIDUAL,
  role: PARTY_ROLES.PLAINTIFF,
  clientId: "",
  phone: "",
  address: "",
  notes: "",
};

export function CasePartyFormDialog({
  caseId,
  partyItem,
  isOpen,
  onClose,
  onSuccess,
}: CasePartyFormDialogProps) {
  const isEditing = Boolean(partyItem);
  const [form, setForm] = React.useState<FormState>(defaultFormState);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);

  const createMutation = useCreateCasePartyMutation();
  const updateMutation = useUpdateCasePartyMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // React 19 pattern: sync form when modal opens or item changes
  const [prevPartyKey, setPrevPartyKey] = React.useState<string | null>(null);
  const currentKey = isOpen && partyItem ? `${partyItem.id}-${partyItem.updatedAt}` : isOpen ? "new" : null;

  if (currentKey !== prevPartyKey) {
    setPrevPartyKey(currentKey);
    if (partyItem && isOpen) {
      setForm({
        name: partyItem.name || "",
        partyType: partyItem.partyType || PARTY_TYPES.INDIVIDUAL,
        role: partyItem.role || PARTY_ROLES.PLAINTIFF,
        clientId: partyItem.clientId || "",
        phone: partyItem.phone || "",
        address: partyItem.address || "",
        notes: partyItem.notes || "",
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

    if (!form.name.trim()) {
      errs.name = "Litigant / party name is required.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    try {
      if (isEditing && partyItem) {
        const payload: UpdateCasePartyInput = {
          name: form.name.trim(),
          partyType: form.partyType,
          role: form.role,
          clientId: form.clientId.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        };

        await updateMutation.mutateAsync({
          caseId,
          partyId: partyItem.id,
          payload,
        });

        toast({
          title: "Party Record Updated",
          description: `Litigant "${form.name}" has been updated.`,
          variant: "gold",
        });
      } else {
        await createMutation.mutateAsync({
          caseId,
          payload: {
            name: form.name.trim(),
            partyType: form.partyType,
            role: form.role,
            clientId: form.clientId.trim() || null,
            phone: form.phone.trim() || null,
            address: form.address.trim() || null,
            notes: form.notes.trim() || null,
          },
        });

        toast({
          title: "Party Recorded",
          description: `Litigant "${form.name}" has been added to the case.`,
          variant: "gold",
        });
      }

      onSuccess?.();
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save the litigant record.";
      setServerError(msg);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg rounded-2xl border-border/80 dark:border-white/10 bg-card p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <DialogTitle className="font-serif text-lg font-bold text-foreground">
              {isEditing ? "Edit Case Party" : "Add Litigant / Party"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Register plaintiffs, defendants, petitioners, respondents, opposite parties, or witnesses.
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
              Full Name / Entity Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Al-Haj Abdul Karim"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9 rounded-xl text-xs"
            />
            {errors.name && (
              <p className="text-[11px] text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Litigant Role <span className="text-destructive">*</span>
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as PartyRole })}
                className="w-full h-9 rounded-xl text-xs bg-background border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {PARTY_ROLE_LIST.map((r) => (
                  <option key={r} value={r}>
                    {PARTY_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Party Type <span className="text-destructive">*</span>
              </label>
              <select
                value={form.partyType}
                onChange={(e) => setForm({ ...form, partyType: e.target.value as PartyType })}
                className="w-full h-9 rounded-xl text-xs bg-background border border-border/70 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {PARTY_TYPE_LIST.map((t) => (
                  <option key={t} value={t}>
                    {PARTY_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Link to Chamber Client (Optional)
            </label>
            <ItemSelect
              type="client"
              value={form.clientId}
              onChange={(val) => setForm({ ...form, clientId: val })}
              placeholder="Select existing client profile..."
              searchPlaceholder="Search client by name or ID..."
              clearable
              className="h-9 text-xs rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Contact Phone Number
              </label>
              <Input
                type="text"
                placeholder="+8801700000000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-9 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Residential / Business Address
              </label>
              <Input
                type="text"
                placeholder="Village, Upazila, District"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              Notes / Submissions
            </label>
            <textarea
              rows={2}
              placeholder="Relationship to plaintiff, cross-examination notes, etc..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl text-xs bg-background border border-border/70 p-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
                  <span>Saving Litigant...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Register Litigant"}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CasePartyFormDialog;
