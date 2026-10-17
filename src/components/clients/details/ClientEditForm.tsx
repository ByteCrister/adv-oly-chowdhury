"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/shared/use-toast";
import {
  CLIENT_TYPES,
  CLIENT_STATUSES,
  ClientType,
  ClientStatus,
} from "@/const/client.const";
import { updateClientSchema } from "@/utils/zod/client.validation";
import { useUpdateClientMutation } from "@/hooks/clients";
import type { ClientDetailDto, UpdateClientInput } from "@/types/client.types";
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Save,
  X,
  Loader2,
} from "lucide-react";

export interface ClientEditFormProps {
  client: ClientDetailDto;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ClientEditForm({ client, onCancel, onSuccess }: ClientEditFormProps) {
  // Form State
  const [clientType, setClientType] = React.useState<ClientType>(client.clientType);
  const [status, setStatus] = React.useState<ClientStatus>(client.status);
  const [name, setName] = React.useState(client.name || "");
  const [organizationName, setOrganizationName] = React.useState(client.organizationName || "");
  const [fatherOrSpouseName, setFatherOrSpouseName] = React.useState(
    client.fatherOrSpouseName || ""
  );
  const [motherName, setMotherName] = React.useState(client.motherName || "");
  const [dateOfBirth, setDateOfBirth] = React.useState(
    client.dateOfBirth ? client.dateOfBirth.slice(0, 10) : ""
  );
  const [nationalId, setNationalId] = React.useState(client.nationalId || "");
  const [phone, setPhone] = React.useState(client.phone || "");
  const [alternatePhone, setAlternatePhone] = React.useState(client.alternatePhone || "");
  const [email, setEmail] = React.useState(client.email || "");
  const [address, setAddress] = React.useState(client.address || "");
  const [permanentAddress, setPermanentAddress] = React.useState(client.permanentAddress || "");
  const [notes, setNotes] = React.useState(client.notes || "");

  // Errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const updateMutation = useUpdateClientMutation();
  const isSubmitting = updateMutation.isPending;

  const validate = (): boolean => {
    const rawPayload: UpdateClientInput = {
      clientType,
      status,
      name: name.trim(),
      organizationName: organizationName.trim() || null,
      fatherOrSpouseName: fatherOrSpouseName.trim() || null,
      motherName: motherName.trim() || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
      nationalId: nationalId.trim() || null,
      phone: phone.trim() || null,
      alternatePhone: alternatePhone.trim() || null,
      email: email.trim().toLowerCase() || null,
      address: address.trim() || null,
      permanentAddress: permanentAddress.trim() || null,
      notes: notes.trim() || null,
    };

    const parseResult = updateClientSchema.safeParse(rawPayload);
    const errs: Record<string, string> = {};

    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        const fieldName = String(issue.path[0]);
        if (!errs[fieldName]) {
          errs[fieldName] = issue.message;
        }
      }
    }

    // Domain business rule: corporate clients require organizationName
    if (clientType === CLIENT_TYPES.ORGANIZATION && !organizationName.trim()) {
      errs.organizationName = "Corporate entity name is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload: UpdateClientInput = {
        clientType,
        status,
        name: name.trim(),
        organizationName: organizationName.trim() || null,
        fatherOrSpouseName: fatherOrSpouseName.trim() || null,
        motherName: motherName.trim() || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        nationalId: nationalId.trim() || null,
        phone: phone.trim() || null,
        alternatePhone: alternatePhone.trim() || null,
        email: email.trim().toLowerCase() || null,
        address: address.trim() || null,
        permanentAddress: permanentAddress.trim() || null,
        notes: notes.trim() || null,
      };

      await updateMutation.mutateAsync({
        id: client.id,
        data: payload,
      });

      toast.success("Profile saved successfully", {
        description: `Changes to ${name} have been updated in the database.`,
      });

      onSuccess();
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "An unexpected error occurred while saving.";
      toast.error("Failed to update profile", {
        description: errorMsg,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Identity & Classification */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/70 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
        <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border/40">
          <User className="w-4 h-4 text-gold-500" />
          <span>Edit Identity & Status</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Client Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Client Type</label>
            <select
              value={clientType}
              onChange={(e) => setClientType(e.target.value as ClientType)}
              className="h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            >
              <option value={CLIENT_TYPES.INDIVIDUAL}>Individual Citizen</option>
              <option value={CLIENT_TYPES.ORGANIZATION}>Corporate Entity</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
              className="h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            >
              <option value={CLIENT_STATUSES.ACTIVE}>Active</option>
              <option value={CLIENT_STATUSES.INACTIVE}>Inactive</option>
              <option value={CLIENT_STATUSES.ARCHIVED}>Archived</option>
            </select>
          </div>

          {/* National ID / Registration */}
          <div className="space-y-1.5">
            <label htmlFor="edit-nid" className="text-xs font-semibold text-foreground">
              National ID / Reg. No.
            </label>
            <Input
              id="edit-nid"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="e.g. 19852691234567890"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="edit-name" className="text-xs font-semibold text-foreground">
              {clientType === CLIENT_TYPES.ORGANIZATION
                ? "Authorized Representative Name"
                : "Full Legal Name"}{" "}
              <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                className={`pl-9 ${errors.name ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
              />
            </div>
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>

          {/* Organization Name */}
          <div className="space-y-1.5">
            <label htmlFor="edit-org" className="text-xs font-semibold text-foreground">
              Organization Name{" "}
              {clientType === CLIENT_TYPES.ORGANIZATION && (
                <span className="text-destructive">*</span>
              )}
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
              <Input
                id="edit-org"
                value={organizationName}
                onChange={(e) => {
                  setOrganizationName(e.target.value);
                  if (errors.organizationName)
                    setErrors((prev) => ({ ...prev, organizationName: "" }));
                }}
                placeholder="e.g. Eastern Housing Ltd. / Apex Holdings"
                className={`pl-9 ${
                  errors.organizationName ? "border-destructive focus-visible:ring-destructive/30" : ""
                }`}
              />
            </div>
            {errors.organizationName && (
              <p className="text-[11px] text-destructive">{errors.organizationName}</p>
            )}
          </div>
        </div>

        {/* Date of Birth, Father/Spouse, Mother */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-dob" className="text-xs font-semibold text-foreground">
              Date of Birth / Incorp.
            </label>
            <Input
              id="edit-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-father" className="text-xs font-semibold text-foreground">
              Father / Spouse Name
            </label>
            <Input
              id="edit-father"
              value={fatherOrSpouseName}
              onChange={(e) => setFatherOrSpouseName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-mother" className="text-xs font-semibold text-foreground">
              Mother Name
            </label>
            <Input
              id="edit-mother"
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. Contact Points */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/70 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
        <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border/40">
          <Phone className="w-4 h-4 text-emerald-500" />
          <span>Edit Contact Channels</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-phone" className="text-xs font-semibold text-foreground">
              Primary Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
              <Input
                id="edit-phone"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                }}
                placeholder="+880 1..."
                className={`pl-9 ${errors.phone ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
              />
            </div>
            {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-alt-phone" className="text-xs font-semibold text-foreground">
              Alternate Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
              <Input
                id="edit-alt-phone"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                placeholder="+880 1..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-email" className="text-xs font-semibold text-foreground">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                }}
                placeholder="client@example.com"
                className={`pl-9 ${errors.email ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
              />
            </div>
            {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
          </div>
        </div>
      </div>

      {/* 3. Addresses & Notes */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/70 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
        <h3 className="font-serif text-base font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border/40">
          <MapPin className="w-4 h-4 text-blue-500" />
          <span>Edit Addresses & Confidential Chamber Notes</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="edit-addr" className="text-xs font-semibold text-foreground">
              Present / Office Address
            </label>
            <textarea
              id="edit-addr"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-perm-addr" className="text-xs font-semibold text-foreground">
              Permanent Address
            </label>
            <textarea
              id="edit-perm-addr"
              rows={3}
              value={permanentAddress}
              onChange={(e) => setPermanentAddress(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-notes" className="text-xs font-semibold text-foreground">
            Privileged Chamber Notes
          </label>
          <textarea
            id="edit-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-gold-500/40 resize-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl text-xs gap-1.5"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </Button>

        <Button
          type="submit"
          variant="gold"
          disabled={isSubmitting}
          className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
