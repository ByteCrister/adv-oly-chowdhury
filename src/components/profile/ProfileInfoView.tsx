"use client";

import * as React from "react";
import {
  User,
  Award,
  Building2,
  MapPin,
  Shield,
  Clock,
  Mail,
  CheckCircle2,
  Lock,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shared/use-toast";
import {
  FadeIn,
  FadeInUp,
  StaggerContainer,
  StaggerItem,
} from "@/components/wrappers/Motion";
import type { ProfileApiResponse, ProfileTab } from "@/types/profile.ui.type";

export interface ProfileInfoViewProps {
  user: ProfileApiResponse["data"];
  activeTab: ProfileTab;
  onEditClick: () => void;
  onOpenAvatarDialog: () => void;
}

export function ProfileInfoView({
  user,
  activeTab,
  onEditClick,
  onOpenAvatarDialog,
}: ProfileInfoViewProps) {
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const copyValue = React.useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      setCopiedKey(label);
      toast({
        title: "Copied to clipboard",
        description: `${label}: ${text}`,
        variant: "gold",
        duration: 2000,
      });
      setTimeout(() => setCopiedKey(null), 1800);
    },
    [toast]
  );

  return (
    <div className="space-y-6">
      {/* ── Tab 1: General (Identity & Title) ────────────────── */}
      {activeTab === "general" && (
        <FadeIn duration={0.3} key="general">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-gold-500" />
                    <span>Advocate Identity & Titles</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Official name, honorific, courtroom subtitle, and contact numbers.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onEditClick}
                  className="text-xs rounded-xl border-border/70 text-foreground hover:bg-gold-500/10 hover:border-gold-500/40"
                >
                  Edit
                </Button>
              </div>

              <StaggerContainer
                delay={0.05}
                staggerDelay={0.03}
                viewport={{ once: true, margin: "0px" }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {/* Full Legal Name */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Full Legal Name
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {user.name}
                    </p>
                  </div>
                </StaggerItem>

                {/* Preferred Name */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Preferred / Display Name
                    </span>
                    <p className="text-sm font-semibold text-gold-600 dark:text-gold-400">
                      {user.preferredName || "Advocate Oly Chowdhury"}
                    </p>
                  </div>
                </StaggerItem>

                {/* Professional Title */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Professional Title
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {user.title || "Advocate"}
                    </p>
                  </div>
                </StaggerItem>

                {/* Subtitle */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Jurisdiction Subtitle
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {user.subtitle || "Advocate • Judge's Court, Sylhet"}
                    </p>
                  </div>
                </StaggerItem>

                {/* Tagline */}
                <StaggerItem yOffset={8} className="sm:col-span-2">
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Professional Tagline
                    </span>
                    <p className="text-sm text-foreground italic">
                      {user.tagline ? `"${user.tagline}"` : "Not set"}
                    </p>
                  </div>
                </StaggerItem>

                {/* Phone */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 flex items-center justify-between h-full">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Primary Mobile
                      </span>
                      <p className="text-sm font-mono font-medium text-foreground">
                        {user.phone || "01712-459840"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyValue(user.phone || "01712-459840", "Primary Phone")}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Copy Phone"
                    >
                      {copiedKey === "Primary Phone" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </StaggerItem>

                {/* Alternate Phone */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 flex items-center justify-between h-full">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Alternate Phone
                      </span>
                      <p className="text-sm font-mono font-medium text-foreground">
                        {user.alternatePhone || "None specified"}
                      </p>
                    </div>
                    {user.alternatePhone && (
                      <button
                        type="button"
                        onClick={() => copyValue(user.alternatePhone!, "Alternate Phone")}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Copy Alternate Phone"
                      >
                        {copiedKey === "Alternate Phone" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </StaggerItem>

                {/* WhatsApp */}
                <StaggerItem yOffset={8} className="sm:col-span-2">
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        WhatsApp Direct Line
                      </span>
                      <p className="text-sm font-mono font-medium text-foreground">
                        {user.whatsappNumber || "+8801712459840"}
                      </p>
                    </div>
                    {user.whatsappNumber && (
                      <a
                        href={`https://wa.me/${user.whatsappNumber.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-semibold hover:bg-emerald-500/20"
                      >
                        <span>Chat</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </div>

            {/* Right Summary Side Card */}
            <FadeInUp duration={0.35} delay={0.1} yOffset={10} viewport={{ once: true, margin: "0px" }} className="space-y-6">
              <div className="p-6 rounded-2xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-4">
                <h4 className="font-serif text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Verified Legal Profile</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This account represents the primary advocate credentials configured across the judicial cause list, client dossiers, and automated legal notices.
                </p>

                <div className="pt-2 border-t border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Account Status</span>
                    <Badge variant="emerald">Active Enrolled</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">System Role</span>
                    <span className="font-mono text-foreground font-semibold">Chamber Principal</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Avatar Status</span>
                    <span className="font-mono text-gold-600 dark:text-gold-400 font-semibold">
                      {user.avatarUrl ? "Cloudinary Linked" : "Initial Monogram"}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onOpenAvatarDialog}
                    className="w-full text-xs rounded-xl border-gold-500/30 text-gold-600 dark:text-gold-400 hover:bg-gold-500/10"
                  >
                    Manage Avatar Photo
                  </Button>
                </div>
              </div>
            </FadeInUp>
          </div>
        </FadeIn>
      )}

      {/* ── Tab 2: Credentials (Bar Registrations) ────────────── */}
      {activeTab === "credentials" && (
        <FadeIn duration={0.3} key="credentials">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                    <Award className="w-4 h-4 text-gold-500" />
                    <span>Professional Bar Registrations & Sanad</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Bangladesh Bar Council certification and recognized Bar Association membership enrollments.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onEditClick}
                  className="text-xs rounded-xl border-border/70 text-foreground hover:bg-gold-500/10 hover:border-gold-500/40"
                >
                  Edit
                </Button>
              </div>

              <StaggerContainer
                delay={0.05}
                staggerDelay={0.05}
                viewport={{ once: true, margin: "0px" }}
                className="space-y-4"
              >
                {/* Bar Council Sanad Card */}
                <StaggerItem yOffset={8}>
                  <div className="p-4 rounded-xl bg-gradient-to-r from-gold-500/10 via-gold-500/5 to-transparent border border-gold-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-600 dark:text-gold-400 shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-gold-600 dark:text-gold-400">
                          Apex Regulatory Body
                        </span>
                        <h4 className="text-sm font-bold text-foreground">
                          Bangladesh Bar Council Sanad
                        </h4>
                        <p className="text-xs font-mono font-semibold text-foreground pt-0.5">
                          {user.barCouncilId ? `Sanad ID: ${user.barCouncilId}` : "Not registered in system"}
                        </p>
                      </div>
                    </div>
                    {user.barCouncilId && (
                      <button
                        type="button"
                        onClick={() => copyValue(user.barCouncilId!, "Bar Council Sanad")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-gold-500/30 text-xs font-semibold text-gold-600 dark:text-gold-400 hover:bg-gold-500/10 transition-colors cursor-pointer self-start sm:self-center"
                      >
                        <span>{copiedKey === "Bar Council Sanad" ? "Copied" : "Copy Sanad"}</span>
                        {copiedKey === "Bar Council Sanad" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </StaggerItem>

                {/* Sylhet District Bar Association */}
                <StaggerItem yOffset={8}>
                  <div className="p-4 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                        District Bar Enrollment
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">
                        Sylhet District Bar Association
                      </h4>
                      <p className="text-xs font-mono text-muted-foreground pt-0.5">
                        {user.barAssociationMemberNo
                          ? `Member No: ${user.barAssociationMemberNo}`
                          : "Not set"}
                      </p>
                    </div>
                    {user.barAssociationMemberNo && (
                      <Badge variant="sapphire" className="self-start sm:self-center">
                        Active Member
                      </Badge>
                    )}
                  </div>
                </StaggerItem>

                {/* Sylhet Taxes Bar Association */}
                <StaggerItem yOffset={8}>
                  <div className="p-4 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                        Revenue & Tax Bar
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">
                        Sylhet Taxes Bar Association
                      </h4>
                      <p className="text-xs font-mono text-muted-foreground pt-0.5">
                        {user.taxesBarMemberNo
                          ? `Member No: ${user.taxesBarMemberNo}`
                          : "Not set"}
                      </p>
                    </div>
                    {user.taxesBarMemberNo && (
                      <Badge variant="emerald" className="self-start sm:self-center">
                        Tax Advocate
                      </Badge>
                    )}
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </div>

            {/* Right Credential Summary */}
            <FadeInUp duration={0.35} delay={0.1} yOffset={10} viewport={{ once: true, margin: "0px" }} className="space-y-6">
              <div className="p-6 rounded-2xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-4">
                <h4 className="font-serif text-sm font-bold text-foreground">
                  Judicial Standing
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Empowered to represent clients in civil litigation, criminal trials, bail petitions, and revenue tax hearings across Sylhet district courts and tribunals.
                </p>

                <div className="space-y-2 pt-2 border-t border-border/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Primary Court</span>
                    <span className="font-medium text-foreground">Judge&apos;s Court, Sylhet</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Jurisdiction</span>
                    <span className="font-medium text-foreground">Civil & Criminal</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bar Hall</span>
                    <span className="font-medium text-foreground">Hall No. 02</span>
                  </div>
                </div>
              </div>
            </FadeInUp>
          </div>
        </FadeIn>
      )}

      {/* ── Tab 3: Chamber (Chamber & Court) ────────────────── */}
      {activeTab === "chamber" && (
        <FadeIn duration={0.3} key="chamber">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gold-500" />
                    <span>Chamber & Judicial Complex Location</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Chamber 323 location, court jurisdiction, and client consultation schedule.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onEditClick}
                  className="text-xs rounded-xl border-border/70 text-foreground hover:bg-gold-500/10 hover:border-gold-500/40"
                >
                  Edit
                </Button>
              </div>

              <StaggerContainer
                delay={0.05}
                staggerDelay={0.03}
                viewport={{ once: true, margin: "0px" }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {/* Chamber Room */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Chamber Room
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {user.chamber?.room || "Chamber No. 323 (3rd Floor)"}
                    </p>
                  </div>
                </StaggerItem>

                {/* Bar Hall */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Bar Hall Assignment
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {user.chamber?.barHall || "Bar Hall No: 02"}
                    </p>
                  </div>
                </StaggerItem>

                {/* Court */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Court Complex
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {user.chamber?.court || "Judge's Court"}
                    </p>
                  </div>
                </StaggerItem>

                {/* City & District */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      City & District
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {user.chamber?.city || "Sylhet"}, {user.chamber?.district || "Sylhet"}
                    </p>
                  </div>
                </StaggerItem>

                {/* Full Address */}
                <StaggerItem yOffset={8} className="sm:col-span-2">
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Complete Chamber Address
                    </span>
                    <p className="text-sm text-foreground">
                      {user.chamber?.fullAddress ||
                        "Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge's Court, Sylhet, Bangladesh"}
                    </p>
                  </div>
                </StaggerItem>

                {/* Consultation Hours */}
                <StaggerItem yOffset={8} className="sm:col-span-2">
                  <div className="p-3.5 rounded-xl bg-gold-500/10 border border-gold-500/25 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gold-500" />
                        <span>Client Consultation Hours</span>
                      </span>
                      <p className="text-sm font-medium text-foreground">
                        {user.chamber?.consultationHours ||
                          "Saturday – Thursday (Court & Chamber Hours)"}
                      </p>
                    </div>
                    <Badge variant="gold" className="text-[10px]">
                      Regular Hours
                    </Badge>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </div>

            {/* Right Chamber Summary */}
            <FadeInUp duration={0.35} delay={0.1} yOffset={10} viewport={{ once: true, margin: "0px" }} className="space-y-6">
              <div className="p-6 rounded-2xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-4">
                <h4 className="font-serif text-sm font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gold-500" />
                  <span>Courtroom Vicinity</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Chamber 323 is situated on the 3rd floor adjacent to Bar Hall 02 within the Judge&apos;s Court premises, providing rapid access to the daily judicial cause list.
                </p>
                <div className="pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyValue(
                        user.chamber?.fullAddress ||
                          "Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge's Court, Sylhet, Bangladesh",
                        "Chamber Address"
                      )
                    }
                    className="w-full text-xs rounded-xl"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    <span>Copy Full Chamber Address</span>
                  </Button>
                </div>
              </div>
            </FadeInUp>
          </div>
        </FadeIn>
      )}

      {/* ── Tab 4: Address (Residential Address) ─────────────── */}
      {activeTab === "address" && (
        <FadeIn duration={0.3} key="address">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gold-500" />
                    <span>Residential Addresses</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Present and permanent residential locations in Sylhet.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onEditClick}
                  className="text-xs rounded-xl border-border/70 text-foreground hover:bg-gold-500/10 hover:border-gold-500/40"
                >
                  Edit
                </Button>
              </div>

              <StaggerContainer
                delay={0.05}
                staggerDelay={0.04}
                viewport={{ once: true, margin: "0px" }}
                className="space-y-4"
              >
                {/* Present Address */}
                <StaggerItem yOffset={8}>
                  <div className="p-4 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Present Residence Address
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {user.homeAddress?.presentAddress || "Not specified yet"}
                    </p>
                  </div>
                </StaggerItem>

                {/* Permanent Address */}
                <StaggerItem yOffset={8}>
                  <div className="p-4 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Permanent Address
                    </span>
                    <p className="text-sm font-medium text-foreground">
                      {user.homeAddress?.permanentAddress || "Not specified yet"}
                    </p>
                  </div>
                </StaggerItem>

                <StaggerItem yOffset={8}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* City */}
                    <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        City
                      </span>
                      <p className="text-sm font-semibold text-foreground">
                        {user.homeAddress?.city || "Sylhet"}
                      </p>
                    </div>

                    {/* Postal Code */}
                    <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Postal Code
                      </span>
                      <p className="text-sm font-mono font-medium text-foreground">
                        {user.homeAddress?.postalCode || "3100"}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </div>

            {/* Right Address Summary */}
            <FadeInUp duration={0.35} delay={0.1} yOffset={10} viewport={{ once: true, margin: "0px" }} className="space-y-6">
              <div className="p-6 rounded-2xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-4">
                <h4 className="font-serif text-sm font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold-500" />
                  <span>Geographic Jurisdiction</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Residential locations are kept strictly confidential and only referenced for formal statutory filings and notarized chamber documentation.
                </p>
                <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground space-y-1">
                  <p>Division: <strong>Sylhet</strong></p>
                  <p>Country: <strong>Bangladesh</strong></p>
                </div>
              </div>
            </FadeInUp>
          </div>
        </FadeIn>
      )}

      {/* ── Tab 5: Security (Security & Access) ──────────────── */}
      {activeTab === "security" && (
        <FadeIn duration={0.3} key="security">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-border/60">
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gold-500" />
                    <span>Security & Account Credentials</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Chamber admin authentication, active sessions, and password management.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="gold"
                  size="sm"
                  onClick={onEditClick}
                  className="text-xs rounded-xl gap-1.5 shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </Button>
              </div>

              <StaggerContainer
                delay={0.05}
                staggerDelay={0.03}
                viewport={{ once: true, margin: "0px" }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {/* Account Identifier */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Login Email</span>
                    </span>
                    <p className="text-sm font-mono font-medium text-foreground">
                      {user.email}
                    </p>
                  </div>
                </StaggerItem>

                {/* Password Status */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Password Status</span>
                    </span>
                    <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      •••••••••••• (Encrypted)
                    </p>
                  </div>
                </StaggerItem>

                {/* Account Status */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Account Status
                    </span>
                    <div className="pt-0.5">
                      <Badge variant="emerald" className="gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Active Account</span>
                      </Badge>
                    </div>
                  </div>
                </StaggerItem>

                {/* User ID */}
                <StaggerItem yOffset={8}>
                  <div className="p-3.5 rounded-xl bg-muted/30 dark:bg-card/50 border border-border/60 space-y-1 h-full">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Internal User Identifier
                    </span>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {user._id}
                    </p>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </div>

            {/* Right Security Advice */}
            <FadeInUp duration={0.35} delay={0.1} yOffset={10} viewport={{ once: true, margin: "0px" }} className="space-y-6">
              <div className="p-6 rounded-2xl bg-card/75 dark:bg-card/40 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-sm space-y-4">
                <h4 className="font-serif text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Security Recommendations</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  As the principal portal for client confidentiality and case filings, keep your password secure and update it periodically.
                </p>
                <div className="pt-2 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Minimum 8 characters</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Bcrypt-hashed database storage</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>JWT session encryption</span>
                  </p>
                </div>
              </div>
            </FadeInUp>
          </div>
        </FadeIn>
      )}
    </div>
  );
}

export default ProfileInfoView;
