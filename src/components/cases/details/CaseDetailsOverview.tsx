"use client";

import * as React from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  User,
  Calendar,
  Clock,
  FileText,
  Users,
  Edit2,
  Trash2,
  ArrowLeft,
  ExternalLink,
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CaseDetailDto } from "@/types/case.types";
import { CaseStatus, CasePriority } from "@/const/case.const";

export interface CaseDetailsOverviewProps {
  caseData: CaseDetailDto;
  onEdit: () => void;
  onDelete: () => void;
}

const STATUS_BADGE_MAP: Record<CaseStatus, NonNullable<BadgeProps["variant"]>> = {
  DRAFT: "secondary",
  ACTIVE: "sapphire",
  HEARING_STAGED: "gold",
  ARGUMENTS_PENDING: "amber",
  JUDGMENT_RESERVED: "gold",
  ON_HOLD: "destructive",
  DISPOSED: "emerald",
  CLOSED: "secondary",
};

const PRIORITY_BADGE_MAP: Record<CasePriority, NonNullable<BadgeProps["variant"]>> = {
  LOW: "emerald",
  NORMAL: "secondary",
  HIGH: "gold",
  URGENT: "destructive",
};

export function CaseDetailsOverview({
  caseData,
  onEdit,
  onDelete,
}: CaseDetailsOverviewProps) {
  const statusVariant = STATUS_BADGE_MAP[caseData.caseStatus] || "secondary";
  const priorityVariant = PRIORITY_BADGE_MAP[caseData.priority] || "secondary";

  return (
    <div className="space-y-6">
      {/* 1. Header Card with Title, Identifiers & Primary Actions */}
      <div className="p-5 sm:p-6 rounded-2xl border border-border/70 dark:border-white/10 bg-card shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            {/* Badges & References */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/cases"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mr-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cases</span>
              </Link>

              <span className="text-border">/</span>

              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/25">
                {caseData.caseNumber || caseData.internalReference}
              </span>

              <Badge variant={statusVariant}>{caseData.caseStatusLabel}</Badge>
              <Badge variant={priorityVariant}>{caseData.priorityLabel} Priority</Badge>

              <span className="text-xs px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                {caseData.caseTypeLabel}
              </span>
            </div>

            {/* Case Title */}
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
              {caseData.title}
            </h1>

            {/* Sub-Category if available */}
            {caseData.caseCategory && (
              <p className="text-xs text-muted-foreground">
                Category: <span className="text-foreground/90 font-medium">{caseData.caseCategory}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="rounded-xl text-xs gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Case</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="rounded-xl text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Archive</span>
            </Button>
          </div>
        </div>

        {/* Next Hearing Banner if present */}
        {caseData.nextHearingDate && (
          <div className="p-3.5 rounded-xl bg-gold-500/10 border border-gold-500/25 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-gold-700 dark:text-gold-300">
              <Clock className="w-4 h-4 shrink-0 text-gold-500" />
              <span>
                <span className="font-semibold">Next Hearing Date:</span>{" "}
                {new Date(caseData.nextHearingDate).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <Link
              href={`/dashboard/hearings/new?caseId=${caseData.id}`}
              className="text-[11px] font-semibold text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1"
            >
              <span>Schedule Next</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* 2. Navigation Cards to Related Management Workspaces */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Documents Navigation Card */}
        <Link
          href={`/dashboard/cases/${caseData.id}/documents`}
          className="group block p-4 rounded-2xl border border-border/70 dark:border-white/10 bg-card hover:border-gold-500/40 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted/60 text-foreground group-hover:bg-gold-500/20 group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors">
              {caseData.counts.documents} Files
            </span>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-serif text-sm font-bold text-foreground group-hover:text-gold-600 dark:group-hover:text-gold-400 transition-colors flex items-center gap-1">
              <span>Document Vault</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Petitions, deeds, judgments & legal filings
            </p>
          </div>
        </Link>

        {/* Case Events Navigation Card */}
        <Link
          href={`/dashboard/cases/${caseData.id}/case-events`}
          className="group block p-4 rounded-2xl border border-border/70 dark:border-white/10 bg-card hover:border-sapphire-500/40 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-sapphire-500/10 text-sapphire-600 dark:text-sapphire-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted/60 text-foreground group-hover:bg-sapphire-500/20 group-hover:text-sapphire-600 dark:group-hover:text-sapphire-400 transition-colors">
              {caseData.counts.events} Events
            </span>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-serif text-sm font-bold text-foreground group-hover:text-sapphire-600 dark:group-hover:text-sapphire-400 transition-colors flex items-center gap-1">
              <span>Case Events Timeline</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Filing milestones, conferences & interlocutory orders
            </p>
          </div>
        </Link>

        {/* Case Parties Navigation Card */}
        <Link
          href={`/dashboard/cases/${caseData.id}/case-party`}
          className="group block p-4 rounded-2xl border border-border/70 dark:border-white/10 bg-card hover:border-emerald-500/40 transition-all shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted/60 text-foreground group-hover:bg-emerald-500/20 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {caseData.counts.parties} Parties
            </span>
          </div>
          <div className="space-y-0.5">
            <h3 className="font-serif text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1">
              <span>Case Parties</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Plaintiffs, respondents, petitioners & witnesses
            </p>
          </div>
        </Link>
      </div>

      {/* 3. Detailed Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Core Litigation Profile */}
        <div className="p-5 rounded-2xl border border-border/70 dark:border-white/10 bg-card shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Briefcase className="w-4 h-4 text-gold-500" />
            <h2 className="font-serif text-sm font-bold text-foreground uppercase tracking-wider">
              Litigation Profile
            </h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-muted-foreground text-[11px] block">Filing Date:</span>
              <p className="font-medium text-foreground">
                {caseData.filingDate
                  ? new Date(caseData.filingDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Pending filing"}
              </p>
            </div>

            <div>
              <span className="text-muted-foreground text-[11px] block">Matter Classification:</span>
              <p className="font-medium text-foreground">{caseData.caseTypeLabel}</p>
            </div>

            {caseData.description && (
              <div>
                <span className="text-muted-foreground text-[11px] block">Case Narrative:</span>
                <p className="text-foreground/90 leading-relaxed mt-0.5 whitespace-pre-line">
                  {caseData.description}
                </p>
              </div>
            )}

            {caseData.legalIssues && (
              <div>
                <span className="text-muted-foreground text-[11px] block">Legal Issues / Sections:</span>
                <p className="text-foreground/90 leading-relaxed mt-0.5 font-mono text-[11px]">
                  {caseData.legalIssues}
                </p>
              </div>
            )}

            {caseData.closedAt && (
              <div className="pt-2 border-t border-border/40 text-destructive">
                <span className="text-[11px] font-semibold block">Case Concluded / Closed:</span>
                <p className="font-medium">
                  {new Date(caseData.closedAt).toLocaleDateString("en-GB")} (
                  {caseData.closureReason || "Disposed"})
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Client & Presiding Court Details */}
        <div className="p-5 rounded-2xl border border-border/70 dark:border-white/10 bg-card shadow-sm space-y-4">
          {/* Client Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gold-500" />
                <h2 className="font-serif text-sm font-bold text-foreground uppercase tracking-wider">
                  Client Dossier
                </h2>
              </div>
              {caseData.client && (
                <Link
                  href={`/dashboard/clients/${caseData.client.id}`}
                  className="text-[11px] text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Profile</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {caseData.client ? (
              <div className="space-y-1.5 text-xs">
                <p className="font-bold text-foreground text-sm">{caseData.client.name}</p>
                <p className="text-muted-foreground font-mono text-[11px]">
                  ID: {caseData.client.clientNumber} • {caseData.client.clientType}
                </p>
                {caseData.client.phone && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-gold-500 shrink-0" />
                    <span>{caseData.client.phone}</span>
                  </p>
                )}
                {caseData.client.email && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-gold-500 shrink-0" />
                    <span>{caseData.client.email}</span>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No client associated with this case.</p>
            )}
          </div>

          {/* Court Jurisdiction */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-2 pb-1.5 border-b border-border/40">
              <Building2 className="w-4 h-4 text-gold-500" />
              <h2 className="font-serif text-sm font-bold text-foreground uppercase tracking-wider">
                Court Jurisdiction
              </h2>
            </div>

            {caseData.court ? (
              <div className="space-y-1 text-xs">
                <p className="font-bold text-foreground">{caseData.court.name}</p>
                <p className="text-muted-foreground">
                  District: {caseData.court.district} • {caseData.court.courtTypeLabel}
                </p>
                {caseData.court.roomOrHall && (
                  <p className="text-muted-foreground">Room / Bench: {caseData.court.roomOrHall}</p>
                )}
                {caseData.court.presidingJudgeTitle && (
                  <p className="text-muted-foreground">Judge: {caseData.court.presidingJudgeTitle}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No court jurisdiction assigned.</p>
            )}
          </div>
        </div>

        {/* Card 3: Opposing Details & Audit */}
        <div className="p-5 rounded-2xl border border-border/70 dark:border-white/10 bg-card shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <Users className="w-4 h-4 text-gold-500" />
            <h2 className="font-serif text-sm font-bold text-foreground uppercase tracking-wider">
              Opposing Details
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-muted-foreground text-[11px] block">Opposing Counsel:</span>
              <p className="font-medium text-foreground">
                {caseData.opposingCounsel || "Not specified"}
              </p>
            </div>

            <div>
              <span className="text-muted-foreground text-[11px] block">Opposing Parties:</span>
              {caseData.opposingParties && caseData.opposingParties.length > 0 ? (
                <ul className="list-disc list-inside space-y-0.5 text-foreground/90 mt-1">
                  {caseData.opposingParties.map((op, idx) => (
                    <li key={idx} className="truncate">{op}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground italic">None listed</p>
              )}
            </div>

            <div className="pt-3 border-t border-border/40 space-y-1 text-[11px] text-muted-foreground">
              <p>
                Registered: {new Date(caseData.createdAt).toLocaleDateString("en-GB")}
              </p>
              <p>
                Last Modified: {new Date(caseData.updatedAt).toLocaleDateString("en-GB")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CaseDetailsOverview;
