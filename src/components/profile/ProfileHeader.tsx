"use client";

import * as React from "react";
import Image from "next/image";
import {
  Camera,
  Edit2,
  Award,
  Phone,
  Mail,
  MessageSquare,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/shared/use-toast";
import type { ProfileApiResponse } from "@/types/profile.ui.type";

export interface ProfileHeaderProps {
  user: ProfileApiResponse["data"];
  isEditing: boolean;
  onToggleEdit: () => void;
  onOpenAvatarDialog: () => void;
  isRefetching?: boolean;
}

export function ProfileHeader({
  user,
  isEditing,
  onToggleEdit,
  onOpenAvatarDialog,
  isRefetching = false,
}: ProfileHeaderProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const avatarUrl = user.avatarUrl || user.avatar?.url || null;

  const copyToClipboard = React.useCallback(
    (text: string, label: string) => {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast({
        title: "Copied to clipboard",
        description: `${label}: ${text}`,
        variant: "gold",
        duration: 2500,
      });
      setTimeout(() => setCopiedField(null), 2000);
    },
    [toast]
  );

  return (
    <div className="relative overflow-hidden rounded-3xl bg-card/75 dark:bg-card/40 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-lg">
      {/* Top Hairline in Champagne Gold */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-gold-500/80 to-transparent" />

      {/* Subtle Background Radial Ambient Glow */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-gold-500/10 dark:bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-sapphire-500/10 dark:bg-sapphire-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="p-6 sm:p-8 space-y-6 relative">
        {/* Main Flex Layout: Avatar + Identity + Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Identity Details */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar with Camera Trigger Overlay */}
            <div className="relative group shrink-0">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-gold-500/40 dark:border-gold-500/50 bg-background/80 shadow-md transition-transform duration-300 group-hover:scale-[1.02]">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={user.preferredName || user.name}
                    fill
                    sizes="(max-width: 640px) 96px, 112px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gold-500/20 via-gold-500/10 to-transparent text-gold-600 dark:text-gold-400 font-serif font-bold text-2xl sm:text-3xl">
                    <span>OC</span>
                    <span className="text-[10px] font-sans font-medium uppercase tracking-widest text-muted-foreground mt-0.5">
                      Advocate
                    </span>
                  </div>
                )}

                {/* Hover overlay with button */}
                <button
                  type="button"
                  onClick={onOpenAvatarDialog}
                  aria-label="Change profile avatar"
                  className="absolute inset-0 bg-midnight-950/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white gap-1 cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-gold-400" />
                  <span className="text-[10px] font-semibold tracking-wide">
                    {avatarUrl ? "Change Photo" : "Upload Photo"}
                  </span>
                </button>
              </div>

              {/* Online / Active Verification Pill */}
              <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-background border border-gold-500/30 shadow-sm flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Active</span>
              </div>
            </div>

            {/* Advocate Credentials & Names */}
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Badge variant="gold" className="text-[10px] uppercase tracking-wider font-semibold gap-1">
                  <ShieldCheck className="w-3 h-3 text-gold-500" />
                  <span>Advocate • Judge&apos;s Court, Sylhet</span>
                </Badge>
                <Badge variant="emerald" className="text-[10px]">
                  Supreme Court Enrolled
                </Badge>
                {isRefetching && (
                  <span className="text-[10px] font-mono text-muted-foreground animate-pulse">
                    Refreshing...
                  </span>
                )}
              </div>

              <div className="space-y-0.5">
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                  {user.name}
                </h1>
                {user.preferredName && user.preferredName !== user.name && (
                  <p className="text-sm font-medium text-gold-600 dark:text-gold-400 flex items-center justify-center sm:justify-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Known as: {user.preferredName}</span>
                  </p>
                )}
              </div>

              {user.tagline && (
                <p className="text-xs sm:text-sm text-muted-foreground italic font-sans max-w-xl">
                  &ldquo;{user.tagline}&rdquo;
                </p>
              )}

              {/* Professional Registration Numbers */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {user.barCouncilId && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(user.barCouncilId!, "Bar Council Sanad")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted dark:bg-card/60 text-xs font-mono font-medium text-foreground border border-border/60 transition-colors cursor-pointer group"
                    title="Click to copy Bar Council ID"
                  >
                    <Award className="w-3.5 h-3.5 text-gold-500" />
                    <span>Sanad: {user.barCouncilId}</span>
                    {copiedField === "Bar Council Sanad" ? (
                      <Check className="w-3 h-3 text-emerald-500 ml-1" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    )}
                  </button>
                )}

                {user.barAssociationMemberNo && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 dark:bg-card/60 text-xs font-mono text-muted-foreground border border-border/60">
                    <span>Sylhet Bar #{user.barAssociationMemberNo}</span>
                  </span>
                )}

                {user.taxesBarMemberNo && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 dark:bg-card/60 text-xs font-mono text-muted-foreground border border-border/60">
                    <span>Taxes Bar #{user.taxesBarMemberNo}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 self-center lg:self-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenAvatarDialog}
              className="rounded-xl text-xs gap-1.5 border-border/80 text-foreground hover:border-gold-500/50 hover:bg-gold-500/10 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-gold-500" />
              <span>{avatarUrl ? "Change Avatar" : "Upload Avatar"}</span>
            </Button>

            <Button
              type="button"
              variant={isEditing ? "default" : "gold"}
              size="sm"
              onClick={onToggleEdit}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? "Cancel Editing" : "Edit Profile"}</span>
            </Button>
          </div>
        </div>

        {/* Quick Contact & Chamber Highlights Bar */}
        <div className="pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Phone */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 dark:bg-card/40 border border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-sapphire-500/10 border border-sapphire-500/20 flex items-center justify-center text-sapphire-600 dark:text-sapphire-400 shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  Direct Line
                </p>
                <p className="text-xs font-mono font-medium text-foreground truncate">
                  {user.phone || "01712-459840"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(user.phone || "01712-459840", "Phone")}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Copy phone number"
            >
              {copiedField === "Phone" ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* WhatsApp */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 dark:bg-card/40 border border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  WhatsApp Contact
                </p>
                <p className="text-xs font-mono font-medium text-foreground truncate">
                  {user.whatsappNumber || "+8801712459840"}
                </p>
              </div>
            </div>
            {user.whatsappNumber && (
              <a
                href={`https://wa.me/${user.whatsappNumber.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title="Open WhatsApp chat"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 dark:bg-card/40 border border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-600 dark:text-gold-400 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  Chamber Email
                </p>
                <p className="text-xs font-mono font-medium text-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(user.email, "Email")}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Copy email address"
            >
              {copiedField === "Email" ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeader;
