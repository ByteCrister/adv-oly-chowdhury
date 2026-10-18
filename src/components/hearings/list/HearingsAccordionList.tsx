"use client";

import * as React from "react";
import Link from "next/link";
import {
  Clock,
  Building2,
  Briefcase,
  User,
  Gavel,
  Eye,
  Edit2,
  Trash2,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HEARING_STATUS_BADGE_VARIANTS } from "@/const/hearing.const";
import type { HearingListItemDto } from "@/types/hearing.types";

export interface HearingsAccordionListProps {
  hearings: HearingListItemDto[];
  isLoading?: boolean;
  onEdit: (hearing: HearingListItemDto) => void;
  onDelete: (hearing: HearingListItemDto) => void;
  onAddNew: () => void;
  onResetFilters?: () => void;
  isFiltered?: boolean;
}

export function HearingsAccordionList({
  hearings,
  isLoading = false,
  onEdit,
  onDelete,
  onAddNew,
  onResetFilters,
  isFiltered = false,
}: HearingsAccordionListProps) {
  // Empty states
  if (!isLoading && hearings.length === 0) {
    return (
      <div className="p-10 rounded-2xl border border-dashed border-border/80 bg-card/40 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center">
          <Gavel className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-foreground">
            {isFiltered ? "No Matching Hearings Found" : "No Hearings Scheduled Yet"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {isFiltered
              ? "We couldn't find any hearings matching your current search criteria or active filters. Try adjusting your parameters or clear all filters."
              : "Your chamber's court cause list is currently empty. Schedule a new hearing appearance to begin tracking court dates and cause list proceedings."}
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
              <Gavel className="w-3.5 h-3.5" />
              <span>Schedule First Hearing</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-3">
      {hearings.map((hearing) => {
        const hearingDate = new Date(hearing.hearingDate);
        const dayStr = hearingDate.toLocaleDateString("en-GB", { day: "2-digit" });
        const monthYearStr = hearingDate.toLocaleDateString("en-GB", {
          month: "short",
          year: "numeric",
        });
        const statusBadgeVariant =
          HEARING_STATUS_BADGE_VARIANTS[hearing.status] || "gold";

        return (
          <AccordionItem
            key={hearing.id}
            value={hearing.id}
            className="group hover:border-gold-500/40 transition-colors"
          >
            {/* Collapsed Trigger Summary Card */}
            <AccordionTrigger as="div" className="p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
                {/* Left Section: Date Box + Purpose + Case Details */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {/* Visual Date Badge Box */}
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gold-500/10 border border-gold-500/25 flex flex-col items-center justify-center shrink-0 text-center shadow-xs">
                    <span className="font-serif text-base sm:text-lg font-bold text-gold-600 dark:text-gold-400 leading-none">
                      {dayStr}
                    </span>
                    <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mt-0.5 leading-none">
                      {monthYearStr}
                    </span>
                  </div>

                  {/* Core Hearing & Case Details */}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-sm sm:text-base font-bold text-foreground truncate max-w-sm sm:max-w-md">
                        {hearing.hearingType || hearing.purpose || "Court Hearing"}
                      </span>

                      <Badge variant={statusBadgeVariant}>
                        {hearing.statusLabel}
                      </Badge>

                      {hearing.startTime && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-gold-500 shrink-0" />
                          <span>{hearing.startTime}</span>
                        </span>
                      )}
                    </div>

                    {/* Associated Case & Client Metadata line */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground/90 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-gold-500 shrink-0" />
                        <span>{hearing.case.caseNumber || hearing.case.internalReference}</span>
                        <span className="text-muted-foreground/50 font-normal">
                          • {hearing.case.title}
                        </span>
                      </span>

                      {hearing.client && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                          <span>{hearing.client.name}</span>
                        </span>
                      )}

                      {hearing.court && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Building2 className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                          <span>
                            {hearing.court.name}
                            {hearing.court.roomOrHall ? ` (${hearing.court.roomOrHall})` : ""}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Section: Action Buttons */}
                <div
                  className="flex items-center gap-1.5 self-end lg:self-center shrink-0 pt-2 lg:pt-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 rounded-xl text-xs gap-1 border-border/80 hover:border-gold-500/40 hover:text-gold-600 dark:hover:text-gold-400"
                  >
                    <Link href={`/dashboard/hearings/${hearing.id}`}>
                      <Eye className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Details</span>
                    </Link>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(hearing)}
                    className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-gold-600 hover:bg-gold-500/10"
                    title="Edit hearing"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(hearing)}
                    className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete hearing"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </AccordionTrigger>

            {/* Expanded Content Section */}
            <AccordionContent className="pt-3 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* Column 1: Hearing Purpose, Outcome, & Schedule Notes */}
                <div className="space-y-3 p-3.5 rounded-xl bg-background/50 border border-border/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <FileText className="w-3.5 h-3.5 text-gold-500" />
                    <span>Proceedings & Outcome</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground/80 block text-[10px] uppercase font-semibold">
                        Hearing Purpose
                      </span>
                      <p className="text-foreground mt-0.5">
                        {hearing.purpose || "Regular hearing appearance."}
                      </p>
                    </div>

                    {hearing.outcome && (
                      <div>
                        <span className="text-muted-foreground/80 block text-[10px] uppercase font-semibold">
                          Outcome / Order Summary
                        </span>
                        <p className="text-foreground font-medium mt-0.5">
                          {hearing.outcome}
                        </p>
                      </div>
                    )}

                    {hearing.nextDate && (
                      <div>
                        <span className="text-muted-foreground/80 block text-[10px] uppercase font-semibold">
                          Next Hearing Date
                        </span>
                        <p className="text-gold-600 dark:text-gold-400 font-semibold mt-0.5">
                          {new Date(hearing.nextDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    )}

                    {hearing.adjournmentReason && (
                      <div>
                        <span className="text-muted-foreground/80 block text-[10px] uppercase font-semibold">
                          Adjournment Reason
                        </span>
                        <p className="text-amber-600 dark:text-amber-400 mt-0.5">
                          {hearing.adjournmentReason}
                        </p>
                      </div>
                    )}

                    {hearing.notes && (
                      <div>
                        <span className="text-muted-foreground/80 block text-[10px] uppercase font-semibold">
                          Chamber Preparation Notes
                        </span>
                        <p className="text-muted-foreground mt-0.5 whitespace-pre-wrap">
                          {hearing.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 2: Associated Case Dossier Details */}
                <div className="space-y-3 p-3.5 rounded-xl bg-background/50 border border-border/60">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Briefcase className="w-3.5 h-3.5 text-gold-500" />
                    <span>Case Dossier</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Internal Ref:</span>
                      <span className="font-semibold text-foreground font-mono">
                        {hearing.case.internalReference}
                      </span>
                    </div>

                    {hearing.case.caseNumber && (
                      <div className="flex justify-between py-1 border-b border-border/40">
                        <span className="text-muted-foreground">Case Number:</span>
                        <span className="font-semibold text-foreground">
                          {hearing.case.caseNumber}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Case Type:</span>
                      <span className="text-foreground">{hearing.case.caseType}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Case Status:</span>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {hearing.case.caseStatus}
                      </Badge>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Priority:</span>
                      <span className="font-medium text-foreground">
                        {hearing.case.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Client & Court Information + Fast Actions */}
                <div className="space-y-3 p-3.5 rounded-xl bg-background/50 border border-border/60 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Building2 className="w-3.5 h-3.5 text-gold-500" />
                      <span>Bench & Client</span>
                    </div>

                    {/* Client Box */}
                    {hearing.client ? (
                      <div className="p-2 rounded-lg bg-card border border-border/50 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {hearing.client.name}
                          </span>
                          <Link
                            href={`/dashboard/clients/${hearing.client.id}`}
                            className="text-[10px] text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-0.5"
                          >
                            <span>Dossier</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {hearing.client.clientNumber}
                          {hearing.client.phone ? ` • ${hearing.client.phone}` : ""}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No client attached to this case.
                      </p>
                    )}

                    {/* Court Box */}
                    {hearing.court && (
                      <div className="p-2 rounded-lg bg-card border border-border/50 text-xs space-y-1">
                        <span className="font-semibold text-foreground block">
                          {hearing.court.name}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          {hearing.court.district} District
                          {hearing.court.roomOrHall ? ` • ${hearing.court.roomOrHall}` : ""}
                        </p>
                        {hearing.court.presidingJudgeTitle && (
                          <p className="text-[11px] text-muted-foreground italic">
                            Judge: {hearing.court.presidingJudgeTitle}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer inside accordion */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="gold"
                      size="sm"
                      asChild
                      className="rounded-xl text-xs h-8 font-semibold gap-1.5"
                    >
                      <Link href={`/dashboard/hearings/${hearing.id}`}>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Open Complete File</span>
                      </Link>
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

export default HearingsAccordionList;
