"use client";

import * as React from "react";
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import type { ClientDetailDto } from "@/types/client.types";
import { CLIENT_TYPES } from "@/const/client.const";
import { toast } from "@/components/shared/use-toast";

export interface ClientInfoCardProps {
  client: ClientDetailDto;
}

export function ClientInfoCard({ client }: ClientInfoCardProps) {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.info("Copied to clipboard", {
      description: `${label}: ${text}`,
      duration: 2000,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isCorporate = client.clientType === CLIENT_TYPES.ORGANIZATION;

  return (
    <div className="space-y-6">
      {/* 1. Identity & Family / Corporate Dossier */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20">
              {isCorporate ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-foreground">
                {isCorporate ? "Corporate Identity Dossier" : "Personal & Citizen Dossier"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Verified legal identification and chamber registry records.
              </p>
            </div>
          </div>

          <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground">
            {client.clientNumber}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          {/* Full Name */}
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">
              {isCorporate ? "Authorized Representative" : "Full Legal Name"}
            </span>
            <p className="text-sm font-semibold text-foreground">{client.name}</p>
          </div>

          {/* Organization */}
          {client.organizationName && (
            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">Organization / Entity</span>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                <span>{client.organizationName}</span>
              </p>
            </div>
          )}

          {/* National ID / Passport */}
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">
              {isCorporate ? "Trade License / BIN / Reg." : "National ID / Passport"}
            </span>
            {client.nationalId ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-foreground">{client.nationalId}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(client.nationalId!, "National ID")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Copy National ID"
                >
                  {copiedField === "National ID" ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Not provided</p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">
              {isCorporate ? "Incorporation Date" : "Date of Birth"}
            </span>
            <p className="text-foreground flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-gold-500/80 shrink-0" />
              <span>
                {client.dateOfBirth
                  ? new Date(client.dateOfBirth).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Not provided"}
              </span>
            </p>
          </div>

          {/* Father or Spouse */}
          {!isCorporate && (
            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">Father / Spouse Name</span>
              <p className="text-foreground font-medium">
                {client.fatherOrSpouseName || <span className="text-muted-foreground italic">Not provided</span>}
              </p>
            </div>
          )}

          {/* Mother Name */}
          {!isCorporate && (
            <div className="space-y-1">
              <span className="text-muted-foreground font-medium">Mother Name</span>
              <p className="text-foreground font-medium">
                {client.motherName || <span className="text-muted-foreground italic">Not provided</span>}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Contact Points */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Direct Contact Dossier
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Communication channels, phone numbers, and official correspondence email.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          {/* Primary Phone */}
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Primary Telephone</span>
            {client.phone ? (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${client.phone}`}
                  className="font-medium text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{client.phone}</span>
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(client.phone!, "Primary Phone")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Copy Phone"
                >
                  {copiedField === "Primary Phone" ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Not provided</p>
            )}
          </div>

          {/* Alternate Phone */}
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Secondary / Emergency Phone</span>
            {client.alternatePhone ? (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${client.alternatePhone}`}
                  className="font-medium text-foreground hover:underline flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{client.alternatePhone}</span>
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(client.alternatePhone!, "Alternate Phone")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Copy Alternate Phone"
                >
                  {copiedField === "Alternate Phone" ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Not provided</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Electronic Mail (Email)</span>
            {client.email ? (
              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${client.email}`}
                  className="font-medium text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1.5 truncate"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </a>
                <button
                  type="button"
                  onClick={() => copyToClipboard(client.email!, "Email")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  title="Copy Email"
                >
                  {copiedField === "Email" ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Not provided</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Address & Geographic Coordinates */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Geographic Locations & Addresses
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Service of process, jurisdiction residences, and corporate headquarters.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Present Address */}
          <div className="p-3.5 rounded-xl bg-background/50 border border-border/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                {isCorporate ? "Headquarters / Office Address" : "Present / Service Address"}
              </span>
              {client.address && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(client.address!, "Present Address")}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                  title="Copy Address"
                >
                  {copiedField === "Present Address" ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {client.address || "No present address recorded."}
            </p>
          </div>

          {/* Permanent Address */}
          <div className="p-3.5 rounded-xl bg-background/50 border border-border/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                {isCorporate ? "Registered Factory / Subsidiary" : "Permanent / Ancestral Residence"}
              </span>
              {client.permanentAddress && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(client.permanentAddress!, "Permanent Address")}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                  title="Copy Permanent Address"
                >
                  {copiedField === "Permanent Address" ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {client.permanentAddress || "No permanent address recorded."}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Chamber Notes & History */}
      {client.notes && (
        <div className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-foreground">
                Chamber Confidential Notes
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Privileged client observations, fee agreements, and historical relationship background.
              </p>
            </div>
          </div>
          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed bg-background/40 p-3.5 rounded-xl border border-border/40">
            {client.notes}
          </p>
        </div>
      )}

      {/* 5. Audit Timestamps */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-muted/40 text-[11px] text-muted-foreground border border-border/40">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gold-500" />
          <span>Enrolled on {new Date(client.createdAt).toLocaleString()}</span>
        </div>
        <div>
          <span>Last modified on {new Date(client.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
