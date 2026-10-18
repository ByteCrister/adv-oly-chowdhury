"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  User,
  Building2,
  Phone,
  MapPin,
  ExternalLink,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, BadgeProps } from "@/components/ui/badge";
import type { CasePartyItemDto } from "@/types/case-party.types";
import { PartyRole } from "@/const/case-party.const";

export interface CasePartiesGridProps {
  parties: CasePartyItemDto[];
  isLoading?: boolean;
  onEdit: (party: CasePartyItemDto) => void;
  onDelete: (party: CasePartyItemDto) => void;
  onAddNew: () => void;
  onResetFilters?: () => void;
  isFiltered?: boolean;
}

const ROLE_BADGE_MAP: Record<PartyRole, NonNullable<BadgeProps["variant"]>> = {
  PLAINTIFF: "gold",
  DEFENDANT: "sapphire",
  PETITIONER: "gold",
  RESPONDENT: "sapphire",
  COMPLAINANT: "gold",
  ACCUSED: "destructive",
  APPELLANT: "amber",
  OPPOSITE_PARTY: "destructive",
  THIRD_PARTY: "secondary",
  WITNESS: "emerald",
  LEGAL_HEIR: "secondary",
  OTHER: "secondary",
};

export function CasePartiesGrid({
  parties,
  isLoading = false,
  onEdit,
  onDelete,
  onAddNew,
  onResetFilters,
  isFiltered = false,
}: CasePartiesGridProps) {
  if (!isLoading && parties.length === 0) {
    return (
      <div className="p-10 rounded-2xl border border-dashed border-border/80 bg-card/40 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Users className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-foreground">
            {isFiltered ? "No Matching Litigants Found" : "No Parties Recorded"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {isFiltered
              ? "We couldn't locate any parties matching your active search query or role filters. Try clearing your filters."
              : "Register plaintiffs, defendants, petitioners, respondents, opposite parties, or witnesses to maintain complete litigant records."}
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
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Party</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {parties.map((p) => {
        const isOrg = p.partyType === "ORGANIZATION";
        const badgeVariant = ROLE_BADGE_MAP[p.role] || "secondary";

        return (
          <div
            key={p.id}
            className="group p-5 rounded-2xl border border-border/70 dark:border-white/10 bg-card hover:border-gold-500/40 transition-all flex flex-col justify-between gap-4 shadow-sm"
          >
            {/* Header & Identity */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center shrink-0">
                    {isOrg ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-serif text-sm sm:text-base font-bold text-foreground line-clamp-1">
                      {p.name}
                    </h3>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      {p.partyTypeLabel}
                    </span>
                  </div>
                </div>

                <Badge variant={badgeVariant}>{p.roleLabel}</Badge>
              </div>

              {/* Linked Client Banner if present */}
              {p.clientId && p.client && (
                <div className="p-2.5 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] font-medium text-gold-700 dark:text-gold-300 truncate">
                    Linked: {p.client.name}
                  </span>
                  <Link
                    href={`/dashboard/clients/${p.clientId}`}
                    className="text-[10px] text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-0.5 shrink-0"
                  >
                    <span>Dossier</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>
              )}

              {/* Contact Information */}
              <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                {p.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                    <span className="font-mono text-foreground/90">{p.phone}</span>
                  </p>
                )}

                {p.address && (
                  <p className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{p.address}</span>
                  </p>
                )}

                {p.notes && (
                  <div className="pt-1.5 border-t border-border/40">
                    <p className="text-[11px] text-muted-foreground/90 italic line-clamp-2">
                      &ldquo;{p.notes}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEdit(p)}
                className="rounded-xl text-xs gap-1 border-border/70 text-muted-foreground hover:text-foreground h-7"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDelete(p)}
                className="rounded-xl text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 h-7"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CasePartiesGrid;
