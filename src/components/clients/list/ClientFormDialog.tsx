"use client";

import * as React from "react";
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
  CLIENT_TYPES,
  CLIENT_STATUSES,
  ClientType,
  ClientStatus,
} from "@/const/client.const";
import {
  useCreateClientMutation,
  useUpdateClientMutation,
} from "@/hooks/clients";
import {
  createClientSchema,
  updateClientSchema,
} from "@/utils/zod/client.validation";
import type {
  ClientListItemDto,
  ClientDetailDto,
  CreateClientInput,
  UpdateClientInput,
} from "@/types/client.types";
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export interface ClientFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client?: ClientListItemDto | ClientDetailDto | null;
  onSuccess?: (clientId: string) => void;
}

export function ClientFormDialog({
  isOpen,
  onClose,
  client,
  onSuccess,
}: ClientFormDialogProps) {
  const isEditMode = Boolean(client);

  // Track previous props to synchronize form state during render
  const [prevClient, setPrevClient] = React.useState(client);
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);

  const initialDetailClient =
    client && "fatherOrSpouseName" in client ? (client as ClientDetailDto) : null;

  const [activeTab, setActiveTab] = React.useState<"identity" | "contact" | "address">("identity");

  // Form State
  const [clientType, setClientType] = React.useState<ClientType>(
    client?.clientType || CLIENT_TYPES.INDIVIDUAL
  );
  const [status, setStatus] = React.useState<ClientStatus>(
    client?.status || CLIENT_STATUSES.ACTIVE
  );
  const [name, setName] = React.useState(client?.name || "");
  const [organizationName, setOrganizationName] = React.useState(client?.organizationName || "");
  const [fatherOrSpouseName, setFatherOrSpouseName] = React.useState(
    initialDetailClient?.fatherOrSpouseName || ""
  );
  const [motherName, setMotherName] = React.useState(initialDetailClient?.motherName || "");
  const [dateOfBirth, setDateOfBirth] = React.useState(
    initialDetailClient?.dateOfBirth ? initialDetailClient.dateOfBirth.slice(0, 10) : ""
  );
  const [nationalId, setNationalId] = React.useState(client?.nationalId || "");
  const [phone, setPhone] = React.useState(client?.phone || "");
  const [alternatePhone, setAlternatePhone] = React.useState(
    initialDetailClient?.alternatePhone || ""
  );
  const [email, setEmail] = React.useState(client?.email || "");
  const [address, setAddress] = React.useState(client?.address || "");
  const [permanentAddress, setPermanentAddress] = React.useState(
    initialDetailClient?.permanentAddress || ""
  );
  const [notes, setNotes] = React.useState(initialDetailClient?.notes || "");

  // Validation Errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Mutations
  const createMutation = useCreateClientMutation();
  const updateMutation = useUpdateClientMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Sync state during render when client prop or isOpen status changes
  if (client !== prevClient || isOpen !== prevIsOpen) {
    setPrevClient(client);
    setPrevIsOpen(isOpen);
    if (client) {
      const detailClient = "fatherOrSpouseName" in client ? (client as ClientDetailDto) : null;
      setClientType(client.clientType || CLIENT_TYPES.INDIVIDUAL);
      setStatus(client.status || CLIENT_STATUSES.ACTIVE);
      setName(client.name || "");
      setOrganizationName(client.organizationName || "");
      setFatherOrSpouseName(detailClient?.fatherOrSpouseName || "");
      setMotherName(detailClient?.motherName || "");
      setDateOfBirth(detailClient?.dateOfBirth ? detailClient.dateOfBirth.slice(0, 10) : "");
      setNationalId(client.nationalId || "");
      setPhone(client.phone || "");
      setAlternatePhone(detailClient?.alternatePhone || "");
      setEmail(client.email || "");
      setAddress(client.address || "");
      setPermanentAddress(detailClient?.permanentAddress || "");
      setNotes(detailClient?.notes || "");
    } else {
      setClientType(CLIENT_TYPES.INDIVIDUAL);
      setStatus(CLIENT_STATUSES.ACTIVE);
      setName("");
      setOrganizationName("");
      setFatherOrSpouseName("");
      setMotherName("");
      setDateOfBirth("");
      setNationalId("");
      setPhone("");
      setAlternatePhone("");
      setEmail("");
      setAddress("");
      setPermanentAddress("");
      setNotes("");
    }
    setErrors({});
    setActiveTab("identity");
  }

  // Client-side validation using Zod schemas
  const validateForm = (): boolean => {
    const rawPayload = {
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

    const schema = isEditMode ? updateClientSchema : createClientSchema;
    const parseResult = schema.safeParse(rawPayload);
    const newErrors: Record<string, string> = {};

    if (!parseResult.success) {
      for (const issue of parseResult.error.issues) {
        const fieldName = String(issue.path[0]);
        if (!newErrors[fieldName]) {
          newErrors[fieldName] = issue.message;
        }
      }
    }

    if (clientType === CLIENT_TYPES.ORGANIZATION && !organizationName.trim()) {
      newErrors.organizationName = "Organization name is required for corporate clients";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // If validation fails on identity tab, stay there, otherwise notify user
      if (errors.name || errors.organizationName) {
        setActiveTab("identity");
      }
      return;
    }

    try {
      if (isEditMode && client?.id) {
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

        const res = await updateMutation.mutateAsync({
          id: client.id,
          data: payload,
        });

        toast.success("Client updated successfully", {
          description: `${res.data.name} has been updated in the registry.`,
        });

        onSuccess?.(res.data.id);
        onClose();
      } else {
        const payload: CreateClientInput = {
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

        const res = await createMutation.mutateAsync(payload);

        toast.success("Client enrolled successfully", {
          description: `Client ${res.data.clientNumber} has been added to the chamber directory.`,
        });

        onSuccess?.(res.data.id);
        onClose();
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "An unexpected error occurred while saving client details.";
      toast.error("Failed to save client", {
        description: errorMsg,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-gold-500 text-xs font-semibold uppercase tracking-wider">
            {clientType === CLIENT_TYPES.ORGANIZATION ? (
              <Building2 className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
            <span>{isEditMode ? "Modify Client Record" : "Enroll New Client"}</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl mt-1">
            {isEditMode ? `Edit ${client?.name}` : "Create Legal Client Dossier"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update identity details, case association settings, or contact points."
              : "Register an individual citizen or corporate entity into Advocate Oly Chowdhury's chamber management."}
          </DialogDescription>

          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-2 pt-4 border-t border-border/40 mt-3">
            <button
              type="button"
              onClick={() => setActiveTab("identity")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "identity"
                  ? "bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              1. Identity & Type
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contact")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "contact"
                  ? "bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              2. Contact & Family
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("address")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "address"
                  ? "bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              3. Address & Notes
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* TAB 1: IDENTITY & CLASSIFICATION */}
            {activeTab === "identity" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Client Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Client Classification <span className="text-destructive">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setClientType(CLIENT_TYPES.INDIVIDUAL)}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          clientType === CLIENT_TYPES.INDIVIDUAL
                            ? "border-gold-500 bg-gold-500/10 text-gold-600 dark:text-gold-400 shadow-sm"
                            : "border-border/80 bg-background/50 hover:bg-muted/60 text-muted-foreground"
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Individual</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setClientType(CLIENT_TYPES.ORGANIZATION)}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                          clientType === CLIENT_TYPES.ORGANIZATION
                            ? "border-gold-500 bg-gold-500/10 text-gold-600 dark:text-gold-400 shadow-sm"
                            : "border-border/80 bg-background/50 hover:bg-muted/60 text-muted-foreground"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Corporate</span>
                      </button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Account Status <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ClientStatus)}
                      className="h-10 w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 px-3 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-gold-500/40"
                    >
                      <option value={CLIENT_STATUSES.ACTIVE}>Active Clientele</option>
                      <option value={CLIENT_STATUSES.INACTIVE}>Inactive</option>
                      <option value={CLIENT_STATUSES.ARCHIVED}>Archived Dossier</option>
                    </select>
                  </div>
                </div>

                {/* Client Name */}
                <div className="space-y-1.5">
                  <label htmlFor="client-name" className="text-xs font-semibold text-foreground">
                    {clientType === CLIENT_TYPES.ORGANIZATION
                      ? "Authorized Contact Person / Representative"
                      : "Client Full Name"}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="client-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    placeholder={
                      clientType === CLIENT_TYPES.ORGANIZATION
                        ? "e.g. Mohammad Rafiqul Islam (Managing Director)"
                        : "e.g. Barrister / Mr. / Dr. Anisur Rahman"
                    }
                    className={errors.name ? "border-destructive focus-visible:ring-destructive/30" : ""}
                  />
                  {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
                </div>

                {/* Organization Name */}
                <div className="space-y-1.5">
                  <label htmlFor="org-name" className="text-xs font-semibold text-foreground">
                    Organization / Company Name{" "}
                    {clientType === CLIENT_TYPES.ORGANIZATION && (
                      <span className="text-destructive">*</span>
                    )}
                  </label>
                  <Input
                    id="org-name"
                    value={organizationName}
                    onChange={(e) => {
                      setOrganizationName(e.target.value);
                      if (errors.organizationName)
                        setErrors((prev) => ({ ...prev, organizationName: "" }));
                    }}
                    placeholder="e.g. Apex Holdings Ltd. / Eastern Housing Group"
                    className={
                      errors.organizationName
                        ? "border-destructive focus-visible:ring-destructive/30"
                        : ""
                    }
                  />
                  {errors.organizationName && (
                    <p className="text-[11px] text-destructive">{errors.organizationName}</p>
                  )}
                </div>

                {/* National ID / Registration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="nid-input" className="text-xs font-semibold text-foreground">
                      National ID / Smart Card / Reg. No.
                    </label>
                    <Input
                      id="nid-input"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="e.g. 19852691234567890"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dob-input" className="text-xs font-semibold text-foreground">
                      Date of Birth / Incorporation
                    </label>
                    <Input
                      id="dob-input"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CONTACT & FAMILY */}
            {activeTab === "contact" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label htmlFor="phone-input" className="text-xs font-semibold text-foreground">
                      Primary Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                      <Input
                        id="phone-input"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                        }}
                        placeholder="+880 1712-345678"
                        className="pl-9"
                      />
                    </div>
                    {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
                  </div>

                  {/* Alternate Phone */}
                  <div className="space-y-1.5">
                    <label htmlFor="alt-phone" className="text-xs font-semibold text-foreground">
                      Secondary / Emergency Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                      <Input
                        id="alt-phone"
                        value={alternatePhone}
                        onChange={(e) => setAlternatePhone(e.target.value)}
                        placeholder="+880 1912-876543"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label htmlFor="email-input" className="text-xs font-semibold text-foreground">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                      }}
                      placeholder="client.name@example.com"
                      className={`pl-9 ${errors.email ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                    />
                  </div>
                  {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
                </div>

                {/* Family details (for individuals) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                  <div className="space-y-1.5">
                    <label htmlFor="father-spouse" className="text-xs font-semibold text-foreground">
                      Father / Spouse Name
                    </label>
                    <Input
                      id="father-spouse"
                      value={fatherOrSpouseName}
                      onChange={(e) => setFatherOrSpouseName(e.target.value)}
                      placeholder="e.g. Late Al-Haj Abdul Latif"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="mother-name" className="text-xs font-semibold text-foreground">
                      Mother Name
                    </label>
                    <Input
                      id="mother-name"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      placeholder="e.g. Begum Rokeya Khatun"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ADDRESS & NOTES */}
            {activeTab === "address" && (
              <div className="space-y-4">
                {/* Present Address */}
                <div className="space-y-1.5">
                  <label htmlFor="address-input" className="text-xs font-semibold text-foreground">
                    Present / Operational Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                    <textarea
                      id="address-input"
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House #12, Road #4, Dhanmondi R/A, Dhaka-1205"
                      className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 pl-9 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-gold-500/40 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Permanent Address */}
                <div className="space-y-1.5">
                  <label htmlFor="perm-address" className="text-xs font-semibold text-foreground">
                    Permanent / Registered Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                    <textarea
                      id="perm-address"
                      rows={2}
                      value={permanentAddress}
                      onChange={(e) => setPermanentAddress(e.target.value)}
                      placeholder="Village: Rampur, P.O: Chandpur, District: Cumilla"
                      className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 pl-9 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-gold-500/40 transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Confidential Notes */}
                <div className="space-y-1.5">
                  <label htmlFor="notes-input" className="text-xs font-semibold text-foreground">
                    Legal Chamber Notes & History
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                    <textarea
                      id="notes-input"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Retainer terms, corporate background, special legal instructions, or fee arrangements..."
                      className="w-full rounded-xl border border-input bg-background/80 dark:bg-card/60 p-2.5 pl-9 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-gold-500/40 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancel
            </Button>

            {activeTab !== "address" ? (
              <Button
                type="button"
                variant="gold"
                onClick={() => {
                  if (activeTab === "identity") setActiveTab("contact");
                  else if (activeTab === "contact") setActiveTab("address");
                }}
                className="rounded-xl font-semibold"
              >
                Continue Next
              </Button>
            ) : (
              <Button
                type="submit"
                variant="gold"
                disabled={isSubmitting}
                className="rounded-xl font-semibold gap-1.5 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Client...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditMode ? "Save Changes" : "Register Client"}</span>
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
