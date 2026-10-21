"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Calendar,
} from "lucide-react";

export interface ClientFormProps {
  client?: ClientListItemDto | ClientDetailDto | null;
  onSuccess?: (clientId: string) => void;
  onCancel?: () => void;
  isDialog?: boolean;
  className?: string;
}

type FormTab = "identity" | "contact" | "address";

export function ClientForm({
  client,
  onSuccess,
  onCancel,
  isDialog = false,
  className = "",
}: ClientFormProps) {
  const router = useRouter();
  const isEditMode = Boolean(client);

  // Track previous client prop to synchronize form state during render
  const [prevClient, setPrevClient] = React.useState(client);

  const initialDetailClient =
    client && "fatherOrSpouseName" in client ? (client as ClientDetailDto) : null;

  const [activeTab, setActiveTab] = React.useState<FormTab>("identity");

  // Form State
  const [clientType, setClientType] = React.useState<ClientType>(
    client?.clientType || CLIENT_TYPES.INDIVIDUAL
  );
  const [status, setStatus] = React.useState<ClientStatus>(
    client?.status || CLIENT_STATUSES.ACTIVE
  );
  const [name, setName] = React.useState(client?.name || "");
  const [organizationName, setOrganizationName] = React.useState(
    client?.organizationName || ""
  );
  const [fatherOrSpouseName, setFatherOrSpouseName] = React.useState(
    initialDetailClient?.fatherOrSpouseName || ""
  );
  const [motherName, setMotherName] = React.useState(
    initialDetailClient?.motherName || ""
  );
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

  // Sync state during render when client prop changes
  if (client !== prevClient) {
    setPrevClient(client);
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

  // Derive initials for avatar/monogram preview
  const initials = React.useMemo(() => {
    const raw = (organizationName && clientType === CLIENT_TYPES.ORGANIZATION ? organizationName : name) || "";
    if (!raw.trim()) return "OC";
    const parts = raw.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name, organizationName, clientType]);

  // Check which tabs have validation errors
  const tabErrors = React.useMemo(() => {
    return {
      identity: Boolean(
        errors.name || errors.organizationName || errors.clientType || errors.status || errors.nationalId || errors.dateOfBirth
      ),
      contact: Boolean(
        errors.phone || errors.alternatePhone || errors.email || errors.fatherOrSpouseName || errors.motherName
      ),
      address: Boolean(errors.address || errors.permanentAddress || errors.notes),
    };
  }, [errors]);

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

    // If validation fails, navigate to the first tab that contains an error
    if (Object.keys(newErrors).length > 0) {
      if (
        newErrors.name ||
        newErrors.organizationName ||
        newErrors.clientType ||
        newErrors.status ||
        newErrors.nationalId ||
        newErrors.dateOfBirth
      ) {
        setActiveTab("identity");
      } else if (
        newErrors.phone ||
        newErrors.alternatePhone ||
        newErrors.email ||
        newErrors.fatherOrSpouseName ||
        newErrors.motherName
      ) {
        setActiveTab("contact");
      } else if (newErrors.address || newErrors.permanentAddress || newErrors.notes) {
        setActiveTab("address");
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please resolve highlighted form errors", {
        description: "One or more required fields are missing or formatted incorrectly.",
      });
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

        if (onSuccess) {
          onSuccess(res.data.id);
        } else {
          router.push(`/dashboard/clients/${res.data.id}`);
        }
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

        if (onSuccess) {
          onSuccess(res.data.id);
        } else {
          router.push(`/dashboard/clients/${res.data.id}`);
        }
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

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/dashboard/clients");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* ── Section Navigation Tabs ──────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-muted/50 dark:bg-card/40 border border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab("identity")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            activeTab === "identity"
              ? "bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeTab === "identity"
                ? "bg-gold-500 text-midnight-950"
                : "bg-muted-foreground/20 text-muted-foreground"
            }`}
          >
            1
          </span>
          <span className="font-semibold">Identity & Classification</span>
          {tabErrors.identity && (
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" title="Errors in this section" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contact")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            activeTab === "contact"
              ? "bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeTab === "contact"
                ? "bg-gold-500 text-midnight-950"
                : "bg-muted-foreground/20 text-muted-foreground"
            }`}
          >
            2
          </span>
          <span className="font-semibold">Contact & Family</span>
          {tabErrors.contact && (
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" title="Errors in this section" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("address")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            activeTab === "address"
              ? "bg-gold-500/15 text-gold-600 dark:text-gold-400 border border-gold-500/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeTab === "address"
                ? "bg-gold-500 text-midnight-950"
                : "bg-muted-foreground/20 text-muted-foreground"
            }`}
          >
            3
          </span>
          <span className="font-semibold">Address & Chamber Notes</span>
          {tabErrors.address && (
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" title="Errors in this section" />
          )}
        </button>
      </div>

      {/* ── Main Tabbed Content Card ─────────────────────────────── */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-card/90 shadow-sm transition-all ${
          isDialog ? "p-4 sm:p-6 max-h-[60vh] overflow-y-auto" : "p-6 sm:p-8"
        }`}
      >
        {/* Specular Top Ambient Hairline */}
        <div
          className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none"
          aria-hidden="true"
        />

        {/* ── TAB 1: IDENTITY & CLASSIFICATION ───────────────────── */}
        {activeTab === "identity" && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-border/40 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4 text-gold-500" />
                  <span>Primary Identity & Legal Classification</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Designate whether this record represents an individual citizen or corporate entity.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400">
                <span className="text-xs font-bold font-serif">{initials}</span>
                <span className="text-[10px] font-medium text-muted-foreground">Monogram</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Client Type */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Client Classification</span>
                  <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setClientType(CLIENT_TYPES.INDIVIDUAL)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      clientType === CLIENT_TYPES.INDIVIDUAL
                        ? "border-gold-500 bg-gold-500/10 text-gold-600 dark:text-gold-400 shadow-xs font-semibold"
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
                        ? "border-gold-500 bg-gold-500/10 text-gold-600 dark:text-gold-400 shadow-xs font-semibold"
                        : "border-border/80 bg-background/50 hover:bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Corporate</span>
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label htmlFor="client-status" className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Account Status</span>
                  <span className="text-destructive">*</span>
                </label>
                <select
                  id="client-status"
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
            <div className="space-y-2">
              <label htmlFor="client-name" className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>
                  {clientType === CLIENT_TYPES.ORGANIZATION
                    ? "Authorized Contact Person / Representative"
                    : "Client Full Name"}
                </span>
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
              {errors.name && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.name}</p>}
            </div>

            {/* Organization Name */}
            <div className="space-y-2">
              <label htmlFor="org-name" className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Organization / Corporate Entity Name</span>
                {clientType === CLIENT_TYPES.ORGANIZATION && (
                  <span className="text-destructive">*</span>
                )}
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                <Input
                  id="org-name"
                  value={organizationName}
                  onChange={(e) => {
                    setOrganizationName(e.target.value);
                    if (errors.organizationName)
                      setErrors((prev) => ({ ...prev, organizationName: "" }));
                  }}
                  placeholder="e.g. Apex Holdings Ltd. / Eastern Housing Group"
                  className={`pl-9 ${
                    errors.organizationName
                      ? "border-destructive focus-visible:ring-destructive/30"
                      : ""
                  }`}
                />
              </div>
              {errors.organizationName && (
                <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.organizationName}</p>
              )}
            </div>

            {/* National ID & Date of Birth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label htmlFor="nid-input" className="text-xs font-semibold text-foreground">
                  National ID / Smart Card / Incorporation Reg.
                </label>
                <Input
                  id="nid-input"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="e.g. 19852691234567890"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="dob-input" className="text-xs font-semibold text-foreground">
                  Date of Birth / Date of Incorporation
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    id="dob-input"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CONTACT & FAMILY ────────────────────────────── */}
        {activeTab === "contact" && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-border/40">
              <h3 className="font-serif text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-gold-500" />
                <span>Contact Points & Family Associations</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Register reachability channels, emergency phones, and familial lineage.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Primary Phone */}
              <div className="space-y-2">
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
                {errors.phone && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.phone}</p>}
              </div>

              {/* Alternate Phone */}
              <div className="space-y-2">
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
            <div className="space-y-2">
              <label htmlFor="email-input" className="text-xs font-semibold text-foreground">
                Official Email Address
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
              {errors.email && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.email}</p>}
            </div>

            {/* Family Details */}
            <div className="pt-4 border-t border-border/40 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lineage & Parentage (For Identity Verification)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
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

                <div className="space-y-2">
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
          </div>
        )}

        {/* ── TAB 3: ADDRESS & NOTES ─────────────────────────────── */}
        {activeTab === "address" && (
          <div className="space-y-6">
            <div className="pb-3 border-b border-border/40">
              <h3 className="font-serif text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold-500" />
                <span>Geographic Address & Legal Chamber Dossier Notes</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record official addresses for court notices, bail bonds, and privileged legal memos.
              </p>
            </div>

            {/* Present Address */}
            <div className="space-y-2">
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
            <div className="space-y-2">
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

            {/* Confidential Chamber Notes */}
            <div className="space-y-2">
              <label htmlFor="notes-input" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Legal Chamber Notes & History</span>
                <span className="text-[10px] text-muted-foreground font-normal">Confidential & Privileged</span>
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

      {/* ── Form Navigation & Submission Footer ──────────────────── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelClick}
            disabled={isSubmitting}
            className="rounded-xl w-full sm:w-auto text-xs"
          >
            Cancel
          </Button>

          {activeTab !== "identity" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (activeTab === "address") setActiveTab("contact");
                else if (activeTab === "contact") setActiveTab("identity");
              }}
              disabled={isSubmitting}
              className="rounded-xl w-full sm:w-auto text-xs gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Step</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab !== "address" ? (
            <Button
              type="button"
              variant="gold"
              onClick={() => {
                if (activeTab === "identity") setActiveTab("contact");
                else if (activeTab === "contact") setActiveTab("address");
              }}
              className="rounded-xl font-semibold w-full sm:w-auto text-xs gap-1.5"
            >
              <span>Continue Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="gold"
              disabled={isSubmitting}
              className="rounded-xl font-semibold gap-1.5 shadow-sm w-full sm:w-auto text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEditMode ? "Saving Changes..." : "Enrolling Client..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEditMode ? "Save Changes" : "Register Client"}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

export default ClientForm;
