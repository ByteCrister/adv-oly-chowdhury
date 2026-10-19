"use client";

import * as React from "react";
import {
  MapPin,
  UserCheck,
  Briefcase,
  Gavel,
  FileText,
  Calendar,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CourtListItemDto } from "@/types/court.types";

export interface CourtDetailDialogProps {
  court: CourtListItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (court: CourtListItemDto) => void;
  onDelete: (court: CourtListItemDto) => void;
}

export function CourtDetailDialog({
  court,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: CourtDetailDialogProps) {
  if (!court) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="gold">{court.courtTypeLabel}</Badge>
            {court.isActive ? (
              <Badge variant="emerald">Active Bench</Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-serif">
            {court.name}
          </DialogTitle>
          <DialogDescription>
            Judicial registry overview, presiding magistrate assignments & active caseload.
          </DialogDescription>
        </DialogHeader>

        {/* Bench Details Grid */}
        <div className="space-y-4 py-2 text-xs">
          {/* 1. Location & Room Information */}
          <div className="p-4 rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border/60 space-y-3">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Bench Jurisdiction & Address
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  District & Division:
                </span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                  <span>
                    {court.district}
                    {court.division ? `, ${court.division}` : ""}
                  </span>
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Room / Court Hall:
                </span>
                <span className="font-semibold text-foreground font-mono mt-0.5 block">
                  {court.roomOrHall || "Not designated"}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-muted-foreground block text-[11px]">
                  Judicial Complex Address:
                </span>
                <span className="text-foreground mt-0.5 block leading-relaxed">
                  {court.address || "Judge's Court Complex, Sylhet, Bangladesh"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Presiding Officer */}
          <div className="p-4 rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border/60 space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Presiding Officer Designation
            </h4>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gold-500/10 text-gold-500">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-serif font-bold text-sm text-foreground">
                  {court.presidingJudgeTitle || "Presiding Judge Title Pending"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {court.courtTypeLabel}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Associated Records & Caseload Breakdown */}
          <div className="p-4 rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border/60 space-y-3">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Associated Chamber Records
            </h4>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <div className="flex items-center justify-center text-sapphire-500">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="text-lg font-bold font-serif text-foreground">
                  {court.totalCases}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  Active Cases
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <div className="flex items-center justify-center text-amber-500">
                  <Gavel className="w-4 h-4" />
                </div>
                <div className="text-lg font-bold font-serif text-foreground">
                  {court.totalHearings}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  Hearings
                </div>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1">
                <div className="flex items-center justify-center text-gold-500">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-lg font-bold font-serif text-foreground">
                  {court.totalAssets}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">
                  Documents
                </div>
              </div>
            </div>

            {/* Deletion Eligibility Notice */}
            <div
              className={`p-3 rounded-lg flex items-start gap-2.5 text-[11px] border ${
                court.isDeletable
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20"
              }`}
            >
              {court.isDeletable ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">
                {court.isDeletable ? (
                  <span>
                    <strong>Eligible for deletion:</strong> No litigation cases, cause list
                    hearings, or exhibits are currently linked to this bench.
                  </span>
                ) : (
                  <span>
                    <strong>Protected bench:</strong> This court is referenced by active
                    proceedings. It cannot be permanently deleted until all matters are
                    reassigned.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Metadata Timestamps */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground/70 px-1 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Registered: {court.createdAt ? new Date(court.createdAt).toLocaleDateString() : "N/A"}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Last Updated: {court.updatedAt ? new Date(court.updatedAt).toLocaleDateString() : "N/A"}</span>
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onDelete(court);
              }}
              className="text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Delete Bench</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(court);
                }}
                className="text-xs font-semibold"
              >
                <Pencil className="w-3.5 h-3.5 mr-1" />
                <span>Edit Bench</span>
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CourtDetailDialog;
