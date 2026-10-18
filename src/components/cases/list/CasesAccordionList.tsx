"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Calendar,
  Building2,
  User,
  Clock,
  ExternalLink,
  Edit2,
  Trash2,
  FileText,
  Users,
  ChevronRight,
  Gavel,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CaseListItemDto } from "@/types/case.types";
import { CaseStatus, CasePriority } from "@/const/case.const";

export interface CasesAccordionListProps {
  cases: CaseListItemDto[];
  isLoading?: boolean;
  onEdit: (c: CaseListItemDto) => void;
  onDelete: (c: CaseListItemDto) => void;
  onAddNew: () => void;
  onResetFilters?: () => void;
  isFiltered?: boolean;
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

export function CasesAccordionList({
  cases,
  isLoading = false,
  onEdit,
  onDelete,
  onAddNew,
  onResetFilters,
  isFiltered = false,
}: CasesAccordionListProps) {
  const router = useRouter();

  // Empty state handling
  if (!isLoading && cases.length === 0) {
    return (
      <div className="p-10 rounded-2xl border border-dashed border-border/80 bg-card/40 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
          <Briefcase className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-foreground">
            {isFiltered ? "No Matching Cases Found" : "No Cases Registered Yet"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {isFiltered
              ? "We could not locate any legal matters matching your search query or active filter combination. Try clearing your filters."
              : "Your chamber case repository is currently empty. Register a new legal case to start managing hearings, documents, parties, and proceedings."}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          {isFiltered && onResetFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="rounded-xl text-xs"
            >
              Clear Active Filters
            </Button>
          ) : (
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={onAddNew}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Register First Case</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-3">
      {cases.map((c) => {
        const statusVariant = STATUS_BADGE_MAP[c.caseStatus] || "secondary";
        const priorityVariant = PRIORITY_BADGE_MAP[c.priority] || "secondary";

        return (
          <AccordionItem
            key={c.id}
            value={c.id}
            className="group hover:border-gold-500/40 transition-colors"
          >
            {/* Collapsed Item Summary */}
            <AccordionTrigger as="div" className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
                {/* Left: Case Identifiers, Title, and Badges */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {/* Visual Reference Box */}
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gold-500/10 border border-gold-500/25 flex flex-col items-center justify-center shrink-0 text-center shadow-xs">
                    <Briefcase className="w-5 h-5 text-gold-600 dark:text-gold-400" />
                    <span className="text-[9px] font-mono font-bold tracking-tight text-muted-foreground uppercase mt-1 leading-none truncate max-w-12">
                      {c.filingYear ? c.filingYear : "CASE"}
                    </span>
                  </div>

                  {/* Core Case Information */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Clicking the case title/number directly opens the dossier */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/cases/${c.id}`);
                        }}
                        className="font-serif text-sm sm:text-base font-bold text-foreground hover:text-gold-600 dark:hover:text-gold-400 transition-colors text-left truncate max-w-sm sm:max-w-md cursor-pointer"
                        title="Open Case Dossier"
                      >
                        {c.title}
                      </button>

                      <Badge variant={statusVariant}>{c.caseStatusLabel}</Badge>

                      <Badge variant={priorityVariant}>
                        {c.priorityLabel}
                      </Badge>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/50">
                        {c.caseNumber || c.internalReference}
                      </span>
                    </div>

                    {/* Metadata line: Client, Court, Next Hearing */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {c.client && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gold-500 shrink-0" />
                          <span className="font-medium text-foreground/90">
                            {c.client.name}
                          </span>
                        </span>
                      )}

                      {c.court && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                          <span>{c.court.name}</span>
                        </span>
                      )}

                      {c.nextHearingDate && (
                        <span className="flex items-center gap-1 text-gold-600 dark:text-gold-400 font-medium">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            Next: {new Date(c.nextHearingDate).toLocaleDateString("en-GB")}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Counts + Open Dossier Action */}
                <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 pt-2 lg:pt-0">
                  {/* Relation badges */}
                  <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground pr-2 border-r border-border/50">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40">
                      <Gavel className="w-3 h-3" />
                      <span>{c.hearingsCount}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40">
                      <FileText className="w-3 h-3" />
                      <span>{c.documentsCount}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40">
                      <Users className="w-3 h-3" />
                      <span>{c.partiesCount}</span>
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/cases/${c.id}`);
                    }}
                    className="rounded-xl text-xs gap-1 border-border/70 hover:border-gold-500/40 hover:text-gold-600 dark:hover:text-gold-400"
                  >
                    <span>View Dossier</span>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </AccordionTrigger>

            {/* Expanded Content Drawer */}
            <AccordionContent className="px-4 pb-5 sm:px-5">
              <div className="pt-3 border-t border-border/60 dark:border-white/10 space-y-4">
                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Column 1: Description & Issues */}
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2">
                    <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                      Case Summary & Description
                    </span>
                    <p className="text-muted-foreground line-clamp-3 leading-relaxed">
                      {c.description || "No case narrative or notes recorded."}
                    </p>
                    {c.legalIssues && (
                      <div className="pt-1.5 border-t border-border/40">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                          Legal Issues:
                        </span>
                        <p className="text-foreground/90 line-clamp-2">
                          {c.legalIssues}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Column 2: Opposing Details & Counsel */}
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2">
                    <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                      Opposing Information
                    </span>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Opposing Counsel:
                      </span>
                      <p className="font-medium text-foreground">
                        {c.opposingCounsel || "Not specified"}
                      </p>
                    </div>
                    {c.opposingParties && c.opposingParties.length > 0 && (
                      <div>
                        <span className="text-[10px] text-muted-foreground block">
                          Opposing Parties:
                        </span>
                        <p className="text-foreground/90">
                          {c.opposingParties.join(", ")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Court & Registration Details */}
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2">
                    <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
                      Registry & Jurisdiction
                    </span>
                    <div className="space-y-1 text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">Matter Type:</span>{" "}
                        {c.caseTypeLabel}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">Filing Date:</span>{" "}
                        {c.filingDate
                          ? new Date(c.filingDate).toLocaleDateString("en-GB")
                          : "Pending filing"}
                      </p>
                      {c.closedAt && (
                        <p className="text-destructive font-medium">
                          Closed: {new Date(c.closedAt).toLocaleDateString("en-GB")} (
                          {c.closureReason || "Concluded"})
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/cases/${c.id}/documents`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Documents ({c.documentsCount})</span>
                    </Link>
                    <span className="text-border">•</span>
                    <Link
                      href={`/dashboard/cases/${c.id}/case-events`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Events ({c.eventsCount})</span>
                    </Link>
                    <span className="text-border">•</span>
                    <Link
                      href={`/dashboard/cases/${c.id}/case-party`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      <span>Parties ({c.partiesCount})</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(c);
                      }}
                      className="rounded-xl text-xs gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c);
                      }}
                      className="rounded-xl text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </Button>

                    <Button
                      type="button"
                      variant="gold"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/cases/${c.id}`);
                      }}
                      className="rounded-xl text-xs gap-1.5 font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Dossier</span>
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
