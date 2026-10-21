"use client";

import * as React from "react";
import { FadeInUp } from "@/components/wrappers/Motion";
import { CaseBreadcrumbHeader } from "@/components/cases/shared/CaseBreadcrumbHeader";
import {
  CaseForm,
  defaultCaseFormState,
  type CaseFormState,
} from "@/components/cases/shared/CaseForm";
import {
  Briefcase,
  ShieldCheck,
  Scale,
  FileCheck2,
  Building2,
  Lock,
  Users,
  Calendar,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  CASE_TYPE_LABELS,
  CASE_STATUS_LABELS,
  CASE_PRIORITY_LABELS,
  CasePriority,
  CaseStatus,
} from "@/const/case.const";

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

export function CreateCasePage() {
  const [liveState, setLiveState] = React.useState<CaseFormState>(defaultCaseFormState);

  const opposingCount = React.useMemo(() => {
    return liveState.opposingPartiesText
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean).length;
  }, [liveState.opposingPartiesText]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Breadcrumb & Top Header ─────────────────────────────────── */}
      <FadeInUp delay={0.05}>
        <CaseBreadcrumbHeader
          title="Register New Legal Case"
          subtitle="Open a new litigation matter, associate client and court jurisdiction, and track proceeding status."
          backHref="/dashboard/cases"
          backLabel="Return to Cases Directory"
          crumbs={[{ label: "New Case" }]}
          badge={
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/25 shadow-xs">
              <Briefcase className="w-3.5 h-3.5 text-gold-500" />
              <span>Chamber Dossier</span>
            </span>
          }
        />
      </FadeInUp>

      {/* ── Main Layout: Form (2 cols) + Chamber Guide (1 col) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Case Creation Form */}
        <div className="lg:col-span-2">
          <FadeInUp delay={0.1}>
            <CaseForm isDialog={false} onFormChange={setLiveState} />
          </FadeInUp>
        </div>

        {/* Right Column: Live Overview & Registry Assistance */}
        <div className="space-y-6">
          {/* Card 1: Live Dossier Overview */}
          <FadeInUp delay={0.15}>
            <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-card p-5 shadow-xs space-y-4">
              <div
                className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="font-serif text-sm font-bold text-foreground">
                    Live Matter Overview
                  </h4>
                </div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-gold-600 dark:text-gold-400 font-semibold">
                  Preview
                </span>
              </div>

              <div className="space-y-3">
                {/* Title */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block">
                    Case Subject
                  </span>
                  <p className="text-xs font-serif font-bold text-foreground line-clamp-2 mt-0.5">
                    {liveState.title.trim() ? (
                      liveState.title.trim()
                    ) : (
                      <span className="text-muted-foreground italic font-sans font-normal">
                        Untitled Legal Matter...
                      </span>
                    )}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="gold" className="text-[10px] px-2 py-0.5">
                    {CASE_TYPE_LABELS[liveState.caseType]}
                  </Badge>

                  <Badge
                    variant={PRIORITY_BADGE_MAP[liveState.priority]}
                    className="text-[10px] px-2 py-0.5"
                  >
                    {CASE_PRIORITY_LABELS[liveState.priority]}
                  </Badge>

                  <Badge
                    variant={STATUS_BADGE_MAP[liveState.caseStatus]}
                    className="text-[10px] px-2 py-0.5"
                  >
                    {CASE_STATUS_LABELS[liveState.caseStatus]}
                  </Badge>
                </div>

                {/* Key metadata grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      Internal Ref
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-foreground truncate block">
                      {liveState.internalReference.trim()
                        ? liveState.internalReference.trim()
                        : `CASE-${liveState.filingYear || new Date().getFullYear()}-XXXX`}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      Docket No
                    </span>
                    <span className="text-[11px] font-medium text-foreground truncate block">
                      {liveState.caseNumber.trim() || "Not Assigned"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      Filing Year
                    </span>
                    <span className="text-[11px] font-medium text-foreground block">
                      {liveState.filingYear || new Date().getFullYear()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block">
                      Opposing Parties
                    </span>
                    <span className="text-[11px] font-medium text-foreground block">
                      {opposingCount > 0 ? `${opposingCount} Adverse` : "None Specified"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </FadeInUp>

          {/* Card 2: Chamber Registry Standards */}
          <FadeInUp delay={0.2}>
            <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-card p-5 shadow-xs space-y-4">
              <div
                className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
                <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center border border-gold-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif text-sm font-bold text-foreground">
                    Case Registry Standards
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Audit Trail &amp; Judicial Due Diligence
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground font-semibold">Sequential Case Coding:</strong> An official chamber reference (e.g. <span className="font-mono text-gold-600 dark:text-gold-400">CASE-2026-XXXX</span>) is generated automatically if left blank.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground font-semibold">Client &amp; Court Association:</strong> Every case must bind to an enrolled client and a specific presiding jurisdiction before cause dates can be scheduled.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <Users className="w-4 h-4 text-sapphire-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground font-semibold">Conflict Prevention:</strong> Listing adverse parties and opposing counsel immediately flags conflicting representations across the chamber.
                  </p>
                </div>

                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground font-semibold">Advocate-Client Privilege:</strong> Fact narratives, litigation memos, and statutory notes are protected under confidential chamber access.
                  </p>
                </div>
              </div>
            </div>
          </FadeInUp>

          {/* Card 3: Chamber Practice & Jurisdiction */}
          <FadeInUp delay={0.25}>
            <div className="relative overflow-hidden rounded-2xl border border-border/80 dark:border-white/10 bg-card/60 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-4 h-4 text-gold-500" />
                <span className="text-xs font-semibold text-foreground">
                  Chamber Practice &amp; Court Benches
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Advocate Aminul Islam Chowdhury Oly
                <br />
                Judge&apos;s Court, Sylhet District Judiciary
                <br />
                Supreme Court of Bangladesh (High Court Division)
                <br />
                Civil, Criminal, Writ &amp; Revenue Litigation
              </p>

              <div className="pt-2 border-t border-border/40 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Instant cause list scheduling &amp; hearings linkage enabled</span>
              </div>
            </div>
          </FadeInUp>
        </div>
      </div>
    </div>
  );
}

export default CreateCasePage;
