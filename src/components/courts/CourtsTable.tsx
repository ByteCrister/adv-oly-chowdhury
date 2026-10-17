"use client";

import * as React from "react";
import {
  Building2,
  MapPin,
  UserCheck,
  Briefcase,
  Gavel,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CourtListItemDto } from "@/types/court.types";
import { COURT_TYPES } from "@/const/court.const";

export interface CourtsTableProps {
  courts: CourtListItemDto[];
  isLoading?: boolean;
  onViewDetails: (court: CourtListItemDto) => void;
  onEditCourt: (court: CourtListItemDto) => void;
  onDeleteCourt: (court: CourtListItemDto) => void;
  onAddNew: () => void;
  onResetFilters: () => void;
}

export function CourtsTable({
  courts,
  onViewDetails,
  onEditCourt,
  onDeleteCourt,
  onAddNew,
  onResetFilters,
}: CourtsTableProps) {
  if (courts.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-2xl bg-card/85 dark:bg-card/60 border border-border/70 dark:border-white/10 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gold-500/10 text-gold-500 border border-gold-500/20 flex items-center justify-center mx-auto shadow-inner">
          <Scale className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h3 className="font-serif text-lg font-bold text-foreground">
            No Courts or Benches Found
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No judicial bench records match your active search, court type, or district filter parameters.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="rounded-xl text-xs"
          >
            Reset Filters
          </Button>
          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={onAddNew}
            className="rounded-xl text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Add New Bench</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── 1. Desktop & Tablet Data Table (>= 640px) ── */}
      <div className="hidden sm:block overflow-hidden rounded-2xl border border-border/70 dark:border-white/10 bg-card/85 dark:bg-card/60 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/50 dark:bg-white/[0.03] border-b border-border/60 text-muted-foreground uppercase text-[10px] tracking-wider select-none">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Court / Judicial Bench</th>
                <th className="px-5 py-3.5 font-semibold">Classification & Location</th>
                <th className="px-5 py-3.5 font-semibold hidden md:table-cell">
                  Presiding Officer
                </th>
                <th className="px-5 py-3.5 font-semibold">Associated Records</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {courts.map((court) => {
                const isSupreme =
                  court.courtType === COURT_TYPES.SUPREME_COURT ||
                  court.courtType === COURT_TYPES.APPELLATE_DIVISION ||
                  court.courtType === COURT_TYPES.HIGH_COURT_DIVISION;

                const isTribunal =
                  court.courtType === COURT_TYPES.TAXES_BAR_TRIBUNAL ||
                  court.courtType === COURT_TYPES.CUSTOMS_EXCISE_VAT_TRIBUNAL ||
                  court.courtType === COURT_TYPES.ADMINISTRATIVE_TRIBUNAL ||
                  court.courtType === COURT_TYPES.SPECIAL_TRIBUNAL;

                const badgeVariant = isSupreme
                  ? "gold"
                  : isTribunal
                  ? "sapphire"
                  : "secondary";

                return (
                  <tr
                    key={court.id}
                    className="hover:bg-muted/40 transition-colors group"
                  >
                    {/* 1. Name & Bench Info */}
                    <td className="px-5 py-4 max-w-xs sm:max-w-sm">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-muted/80 text-muted-foreground group-hover:text-gold-500 group-hover:bg-gold-500/10 transition-colors shrink-0 mt-0.5">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => onViewDetails(court)}
                            className="font-medium text-foreground hover:text-gold-600 dark:hover:text-gold-400 text-left font-serif text-sm transition-colors truncate block max-w-full"
                            title={court.name}
                          >
                            {court.name}
                          </button>
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                            {court.roomOrHall && (
                              <span className="font-mono text-muted-foreground">
                                {court.roomOrHall}
                              </span>
                            )}
                            {court.roomOrHall && court.address && <span>•</span>}
                            {court.address && (
                              <span className="truncate max-w-[180px]" title={court.address}>
                                {court.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Type & Jurisdiction */}
                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        <Badge variant={badgeVariant} className="max-w-[180px] truncate">
                          {court.courtTypeLabel}
                        </Badge>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                          <span className="truncate">
                            {court.district}
                            {court.division && `, ${court.division}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Presiding Judge */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      {court.presidingJudgeTitle ? (
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                          <span className="truncate max-w-[160px]" title={court.presidingJudgeTitle}>
                            {court.presidingJudgeTitle}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-[11px]">
                          Not designated
                        </span>
                      )}
                    </td>

                    {/* 4. Caseload & Hearings Badges */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                            court.totalCases > 0
                              ? "bg-sapphire-500/10 text-sapphire-600 dark:text-sapphire-300 border-sapphire-500/20"
                              : "bg-muted text-muted-foreground border-transparent"
                          }`}
                          title={`${court.totalCases} active cases in this court`}
                        >
                          <Briefcase className="w-3 h-3" />
                          <span>{court.totalCases}</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                            court.totalHearings > 0
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-muted text-muted-foreground border-transparent"
                          }`}
                          title={`${court.totalHearings} hearings on cause list`}
                        >
                          <Gavel className="w-3 h-3" />
                          <span>{court.totalHearings}</span>
                        </span>
                      </div>
                    </td>

                    {/* 5. Status Pill */}
                    <td className="px-5 py-4">
                      {court.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-muted text-muted-foreground border border-border/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    {/* 6. Action Controls */}
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewDetails(court)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="View Bench Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditCourt(court)}
                          className="h-8 w-8 text-muted-foreground hover:text-gold-500 hover:bg-gold-500/10"
                          title="Edit Bench Information"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteCourt(court)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title={
                            court.isDeletable
                              ? "Delete Court"
                              : "Cannot delete: Court is referenced by active cases or hearings"
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 2. Mobile Responsive Card List (< 640px) ── */}
      <div className="block sm:hidden space-y-3">
        {courts.map((court) => (
          <div
            key={court.id}
            className="p-4 rounded-2xl bg-card border border-border/70 dark:border-white/10 shadow-sm space-y-3"
          >
            {/* Header: Name & Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => onViewDetails(court)}
                  className="font-serif font-bold text-sm text-foreground hover:text-gold-500 text-left"
                >
                  {court.name}
                </button>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{court.district}{court.division ? `, ${court.division}` : ""}</span>
                </div>
              </div>

              {court.isActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground shrink-0">
                  Inactive
                </span>
              )}
            </div>

            {/* Type & Room */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">
                {court.courtTypeLabel}
              </Badge>
              {court.roomOrHall && (
                <span className="text-[11px] font-mono bg-muted/60 px-2 py-0.5 rounded text-muted-foreground">
                  {court.roomOrHall}
                </span>
              )}
            </div>

            {/* Judge if present */}
            {court.presidingJudgeTitle && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                <span>{court.presidingJudgeTitle}</span>
              </div>
            )}

            {/* Metrics & Actions Row */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[11px]">
                  Cases: <strong className="text-foreground">{court.totalCases}</strong>
                </span>
                <span className="text-muted-foreground text-[11px]">•</span>
                <span className="text-muted-foreground text-[11px]">
                  Hearings: <strong className="text-foreground">{court.totalHearings}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewDetails(court)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditCourt(court)}
                  className="h-8 w-8 text-gold-500 hover:bg-gold-500/10"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteCourt(court)}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CourtsTable;
