"use client";

import * as React from "react";
import Link from "next/link";
import { Gavel, Clock, Building2, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/wrappers/Motion";
import { NumberCounter } from "@/components/shared";
import {
  CASE_PRIORITIES,
  CASE_PRIORITY_LABELS,
  CASE_TYPE_LABELS,
  type CaseType,
} from "@/const/case.const";
import type { TodayHearingDto } from "@/types/dashboard.ui.type";

export interface TodayCauseListProps {
  hearings?: TodayHearingDto[];
}

export function TodayCauseList({ hearings = [] }: TodayCauseListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-5 h-5 text-gold-500" />
          <h3 className="font-serif text-lg font-bold text-foreground">
            Today&apos;s Judicial Cause List
          </h3>
          {hearings.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400 font-semibold text-[11px] border border-gold-500/20">
              <NumberCounter value={hearings.length} delay={0.2} />
              <span>Listed</span>
            </span>
          )}
        </div>
        <Link
          href="/dashboard/hearings"
          className="text-xs font-semibold text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1"
        >
          <span>Full Schedule</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {hearings.length === 0 ? (
        <div className="p-8 rounded-2xl bg-card border border-border/70 dark:border-white/10 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h4 className="text-sm font-semibold text-foreground">
            No Court Hearings Scheduled for Today
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            You have no cause list appearances scheduled for today. Chamber consultation hours and legal drafting remain active.
          </p>
        </div>
      ) : (
        <StaggerContainer delay={0.1} staggerDelay={0.06} className="space-y-3">
          {hearings.map((hearing) => (
            <StaggerItem key={hearing.id} yOffset={10}>
              <div
                className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 dark:border-white/10 hover:border-gold-500/40 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {hearing.caseId ? (
                      <Link
                        href={`/dashboard/cases/${hearing.caseId}`}
                        className="font-mono font-semibold px-2 py-0.5 rounded bg-muted text-foreground hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                      >
                        {hearing.caseRef}
                      </Link>
                    ) : (
                      <span className="font-mono font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                        {hearing.caseRef}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-gold-500/10 text-gold-600 dark:text-gold-400 font-semibold border border-gold-500/20">
                      {CASE_TYPE_LABELS[hearing.caseType as CaseType] || hearing.caseType}
                    </span>
                    {hearing.priority === CASE_PRIORITIES.URGENT && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20">
                        {CASE_PRIORITY_LABELS[CASE_PRIORITIES.URGENT]}
                      </span>
                    )}
                    {hearing.priority === CASE_PRIORITIES.HIGH && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                        {CASE_PRIORITY_LABELS[CASE_PRIORITIES.HIGH]}
                      </span>
                    )}
                  </div>

                  <h4 className="font-serif font-bold text-sm text-foreground truncate">
                    {hearing.caseId ? (
                      <Link
                        href={`/dashboard/cases/${hearing.caseId}`}
                        className="hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                      >
                        {hearing.caseTitle}
                      </Link>
                    ) : (
                      hearing.caseTitle
                    )}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{hearing.courtName}</span>
                    </span>
                    {hearing.room && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span>{hearing.room}</span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-foreground/80 font-medium">
                    <span className="text-muted-foreground">Purpose:</span>{" "}
                    {hearing.purpose}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-500/10 text-gold-600 dark:text-gold-400 font-bold text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{hearing.time}</span>
                  </div>

                  <Link
                    href={hearing.caseId ? `/dashboard/cases/${hearing.caseId}` : "/dashboard/cases"}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    View Dossier
                  </Link>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}

export default TodayCauseList;
