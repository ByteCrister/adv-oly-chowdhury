"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, Calendar, Scale, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClientCaseSummaryDto } from "@/types/client.types";

export interface ClientRecentCasesCardProps {
  cases: ClientCaseSummaryDto[];
  clientId: string;
}

export function ClientRecentCasesCard({ cases, clientId }: ClientRecentCasesCardProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-card/60 backdrop-blur-md border border-border/70 dark:border-white/10 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center border border-gold-500/20">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-foreground">
              Associated Legal Cases
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Recent matters, litigation files, and pending hearings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400">
            {cases.length} records
          </span>
          <Link href={`/dashboard/cases?clientId=${clientId}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1 h-7 border-border/80 text-foreground hover:bg-gold-500/10 hover:border-gold-500/40 hidden sm:inline-flex"
            >
              <span>All Cases</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground">
            <Briefcase className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            No legal cases have been linked to this client yet.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {cases.map((c) => (
            <div
              key={c.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 first:pt-0 last:pb-0"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] font-semibold text-gold-600 dark:text-gold-400">
                    {c.internalReference}
                  </span>
                  {c.caseNumber && (
                    <span className="text-xs font-medium text-foreground">
                      • {c.caseNumber}
                    </span>
                  )}
                  <span className="px-2 py-0.2 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                    {c.caseStatus}
                  </span>
                </div>

                <p className="text-xs font-medium text-foreground truncate">{c.title}</p>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {c.courtName && (
                    <span className="flex items-center gap-1 truncate">
                      <Scale className="w-3 h-3 text-gold-500/80 shrink-0" />
                      <span>{c.courtName}</span>
                    </span>
                  )}
                  {c.nextHearingDate && (
                    <span className="flex items-center gap-1 text-gold-600 dark:text-gold-400 font-medium">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>
                        Hearing: {new Date(c.nextHearingDate).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <Link
                href={`/dashboard/cases/${c.id}`}
                className="self-end sm:self-center shrink-0"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-xs gap-1 h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  <span>View Case</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
