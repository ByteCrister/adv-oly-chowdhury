"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, ArrowUpRight, FolderPlus } from "lucide-react";
import { NumberCounter } from "@/components/shared";
import {
  CASE_STATUSES,
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  type CaseStatus,
  type CaseType,
} from "@/const/case.const";
import type { RecentCaseDto } from "@/types/dashboard.ui.type";

export interface RecentCasesTableProps {
  cases?: RecentCaseDto[];
}

export function RecentCasesTable({ cases = [] }: RecentCasesTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-gold-500" />
          <h3 className="font-serif text-lg font-bold text-foreground">
            Recent Case Matters
          </h3>
          {cases.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400 font-semibold text-[11px] border border-gold-500/20">
              <NumberCounter value={cases.length} delay={0.3} />
              <span>Matters</span>
            </span>
          )}
        </div>
        <Link
          href="/dashboard/cases"
          className="text-xs font-semibold text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1"
        >
          <span>View All Matters</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {cases.length === 0 ? (
        <div className="p-8 rounded-2xl bg-card border border-border/70 dark:border-white/10 text-center space-y-3">
          <Briefcase className="w-8 h-8 text-muted-foreground mx-auto" />
          <h4 className="text-sm font-semibold text-foreground">
            No Recent Case Files Found
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Get started by registering a new litigation matter for civil, criminal, or taxation courts.
          </p>
          <Link
            href="/dashboard/cases/new"
            className="btn-gold-gloss inline-flex items-center gap-2 px-4 py-2 rounded-xl text-midnight-950 text-xs font-semibold shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Register First Case</span>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/70 dark:border-white/10 bg-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Reference</th>
                <th className="px-4 py-3.5 font-semibold">Case Title</th>
                <th className="px-4 py-3.5 font-semibold">Client</th>
                <th className="px-4 py-3.5 font-semibold">Type</th>
                <th className="px-4 py-3.5 font-semibold">Court / Bench</th>
                <th className="px-4 py-3.5 font-semibold">Filing Date</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {cases.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-muted/40 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3.5 font-mono font-semibold text-foreground">
                    <Link
                      href={`/dashboard/cases/${encodeURIComponent(c.ref)}`}
                      className="hover:text-gold-500 hover:underline"
                    >
                      {c.ref}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-foreground max-w-xs truncate">
                    {c.title}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{c.client}</td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded bg-muted text-foreground font-medium">
                      {CASE_TYPE_LABELS[c.type as CaseType] || c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">{c.court}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{c.filingDate}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] border ${
                        c.status === CASE_STATUSES.ACTIVE
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : c.status === CASE_STATUSES.DISPOSED || c.status === CASE_STATUSES.CLOSED
                          ? "bg-muted text-muted-foreground border-border/50"
                          : "bg-gold-500/10 text-gold-600 dark:text-gold-400 border-gold-500/20"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          c.status === CASE_STATUSES.ACTIVE
                            ? "bg-emerald-500"
                            : c.status === CASE_STATUSES.DISPOSED || c.status === CASE_STATUSES.CLOSED
                            ? "bg-muted-foreground"
                            : "bg-gold-500"
                        }`}
                      />
                      <span>{CASE_STATUS_LABELS[c.status as CaseStatus] || c.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RecentCasesTable;
