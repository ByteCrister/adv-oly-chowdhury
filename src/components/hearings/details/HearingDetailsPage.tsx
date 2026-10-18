"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  Building2,
  Briefcase,
  User,
  FileText,
  AlertCircle,
  ArrowLeft,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Phone,
  Mail,
} from "lucide-react";
import { DashboardBreadcrumb } from "@/components/shared/DashboardBreadcrumb";
import { FadeInUp } from "@/components/wrappers/Motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHearingDetail } from "@/hooks/hearings";
import { HearingDetailsSkeleton } from "./HearingDetailsSkeleton";
import { HearingEditDialog } from "./HearingEditDialog";
import { HearingDeleteDialog } from "../list/HearingDeleteDialog";
import { HEARING_STATUS_BADGE_VARIANTS } from "@/const/hearing.const";

export interface HearingDetailsPageProps {
  id: string;
}

export function HearingDetailsPage({ id }: HearingDetailsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data, isLoading, isError, error, refetch, isFetching } = useHearingDetail(id);
  const hearing = data?.data;

  // Edit & Delete dialog states
  const [isEditOpen, setIsEditOpen] = React.useState(
    () => searchParams.get("edit") === "true"
  );
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  if (isLoading) {
    return <HearingDetailsSkeleton />;
  }

  if (isError || !hearing) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <DashboardBreadcrumb
          items={[
            { label: "Overview", href: "/dashboard" },
            { label: "Daily Cause List", href: "/dashboard/hearings" },
            { label: "Hearing Dossier" },
          ]}
        />
        <div className="p-10 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-foreground">
              Hearing Record Not Found
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {(error as Error)?.message ||
                "The requested hearing schedule could not be located in the database. It may have been deleted or moved."}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="rounded-xl text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
            <Button
              type="button"
              variant="gold"
              size="sm"
              asChild
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              <Link href="/dashboard/hearings">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Cause List</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const hearingDateObj = new Date(hearing.hearingDate);
  const dayStr = hearingDateObj.toLocaleDateString("en-GB", { day: "2-digit" });
  const monthStr = hearingDateObj.toLocaleDateString("en-GB", { month: "short" });
  const yearStr = hearingDateObj.toLocaleDateString("en-GB", { year: "numeric" });
  const weekdayStr = hearingDateObj.toLocaleDateString("en-GB", { weekday: "long" });

  const statusBadgeVariant =
    HEARING_STATUS_BADGE_VARIANTS[hearing.status] || "gold";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* 1. Breadcrumb navigation */}
      <DashboardBreadcrumb
        items={[
          { label: "Overview", href: "/dashboard" },
          { label: "Daily Cause List", href: "/dashboard/hearings" },
          {
            label: `${hearing.case.caseNumber || hearing.case.internalReference} (${dayStr} ${monthStr})`,
          },
        ]}
      />

      {/* 2. Primary Header Banner */}
      <FadeInUp delay={0.06}>
        <div className="relative rounded-2xl border border-border/80 dark:border-white/10 bg-card/85 dark:bg-card/60 backdrop-blur-md shadow-sm p-6 overflow-hidden">
          {/* Specular Top Hairline */}
          <div
            className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold-400/50 to-transparent pointer-events-none"
            aria-hidden="true"
          />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Left: Date Badge Box + Title + Badges */}
            <div className="flex items-start sm:items-center gap-4">
              {/* Date Box */}
              <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex flex-col items-center justify-center shrink-0 text-center shadow-xs">
                <span className="font-serif text-2xl font-bold text-gold-600 dark:text-gold-400 leading-none">
                  {dayStr}
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mt-0.5 leading-none">
                  {monthStr} {yearStr}
                </span>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate max-w-md sm:max-w-xl">
                    {hearing.hearingType || hearing.purpose || "Court Hearing"}
                  </h1>
                  <Badge variant={statusBadgeVariant} className="px-2.5 py-0.5">
                    {hearing.statusLabel}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-foreground font-medium">
                    <Calendar className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                    <span>{weekdayStr}</span>
                  </span>

                  {hearing.startTime && (
                    <span className="flex items-center gap-1 text-foreground font-medium">
                      <Clock className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                      <span>{hearing.startTime}</span>
                    </span>
                  )}

                  {hearing.court && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span>
                        {hearing.court.name}
                        {hearing.court.roomOrHall ? ` • ${hearing.court.roomOrHall}` : ""}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 pt-2 md:pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-xl text-xs gap-1.5"
                title="Refresh details"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-gold-500" : ""}`}
                />
              </Button>

              <Button
                type="button"
                variant="gold"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Hearing</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                className="rounded-xl text-xs text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      </FadeInUp>

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Hearing Scope, Outcome, Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Proceedings Overview & Purpose */}
          <FadeInUp delay={0.1}>
            <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="w-4 h-4 text-gold-500" />
                <span>Proceedings & Cause Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                    Proceedings Stage
                  </span>
                  <p className="font-semibold text-foreground text-sm mt-0.5">
                    {hearing.hearingType || "Regular Proceeding"}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                    Current Status
                  </span>
                  <div className="mt-1">
                    <Badge variant={statusBadgeVariant}>
                      {hearing.statusLabel}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                  Purpose of Appearance
                </span>
                <p className="text-foreground text-xs leading-relaxed mt-1 p-3 rounded-xl bg-muted/30 border border-border/40">
                  {hearing.purpose || "Standard court hearing appearance."}
                </p>
              </div>

              {/* Outcome or Bench Order */}
              {hearing.outcome && (
                <div className="pt-2">
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[11px] uppercase font-semibold">
                    Delivered Outcome / Bench Order
                  </span>
                  <p className="text-foreground text-xs leading-relaxed mt-1 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 font-medium">
                    {hearing.outcome}
                  </p>
                </div>
              )}

              {/* Adjournment Reason */}
              {hearing.adjournmentReason && (
                <div className="pt-2">
                  <span className="text-amber-600 dark:text-amber-400 block text-[11px] uppercase font-semibold">
                    Postponement / Adjournment Reason
                  </span>
                  <p className="text-foreground text-xs leading-relaxed mt-1 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    {hearing.adjournmentReason}
                  </p>
                </div>
              )}

              {/* Next Hearing Date */}
              {hearing.nextDate && (
                <div className="pt-2 flex items-center gap-3 p-3 rounded-xl bg-gold-500/5 border border-gold-500/20 text-xs">
                  <Calendar className="w-4 h-4 text-gold-500 shrink-0" />
                  <div>
                    <span className="text-gold-600 dark:text-gold-400 font-semibold block text-[11px] uppercase">
                      Subsequent Hearing Date Fixed
                    </span>
                    <span className="font-serif text-sm font-bold text-foreground">
                      {new Date(hearing.nextDate).toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </FadeInUp>

          {/* Card: Confidential Chamber Notes */}
          <FadeInUp delay={0.14}>
            <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-card p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-gold-500" />
                  <span>Advocate Confidential Instructions</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Internal Chamber Only</span>
              </div>

              {hearing.notes ? (
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap p-4 rounded-xl bg-muted/30 border border-border/40">
                  {hearing.notes}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic p-3">
                  No internal chamber notes or preparation checklists recorded for this appearance.
                </p>
              )}
            </div>
          </FadeInUp>
        </div>

        {/* Right Column (1 Col): Case, Client, Court, Metadata */}
        <div className="space-y-6">
          {/* Card 1: Associated Case Dossier */}
          <FadeInUp delay={0.12}>
            <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-card p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-gold-500" />
                  <span>Litigation Matter</span>
                </div>
                <Badge variant="outline" className="text-[10px] py-0">
                  {hearing.case.caseStatus}
                </Badge>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Case Title</span>
                  <p className="font-serif font-bold text-foreground text-sm leading-snug mt-0.5">
                    {hearing.case.title}
                  </p>
                </div>

                <div className="flex justify-between py-1 border-t border-border/40">
                  <span className="text-muted-foreground">Internal Ref:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {hearing.case.internalReference}
                  </span>
                </div>

                {hearing.case.caseNumber && (
                  <div className="flex justify-between py-1 border-t border-border/40">
                    <span className="text-muted-foreground">Case Number:</span>
                    <span className="font-semibold text-foreground">
                      {hearing.case.caseNumber}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-t border-border/40">
                  <span className="text-muted-foreground">Case Category:</span>
                  <span className="text-foreground">{hearing.case.caseType}</span>
                </div>

                <div className="flex justify-between py-1 border-t border-border/40">
                  <span className="text-muted-foreground">Priority:</span>
                  <span className="font-medium text-foreground">{hearing.case.priority}</span>
                </div>

                {hearing.case.filingDate && (
                  <div className="flex justify-between py-1 border-t border-border/40">
                    <span className="text-muted-foreground">Filing Date:</span>
                    <span className="text-foreground">
                      {new Date(hearing.case.filingDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </FadeInUp>

          {/* Card 2: Associated Client */}
          {hearing.client && (
            <FadeInUp delay={0.16}>
              <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-card p-5 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gold-500" />
                    <span>Client Dossier</span>
                  </div>
                  <Link
                    href={`/dashboard/clients/${hearing.client.id}`}
                    className="text-[11px] text-gold-600 dark:text-gold-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>View Dossier</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-serif font-bold text-foreground text-sm block">
                      {hearing.client.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {hearing.client.clientNumber}
                      {hearing.client.organizationName
                        ? ` • ${hearing.client.organizationName}`
                        : ""}
                    </span>
                  </div>

                  {hearing.client.phone && (
                    <div className="flex items-center gap-2 py-1 border-t border-border/40 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                      <span className="text-foreground">{hearing.client.phone}</span>
                    </div>
                  )}

                  {hearing.client.email && (
                    <div className="flex items-center gap-2 py-1 border-t border-border/40 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                      <span className="text-foreground truncate">{hearing.client.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </FadeInUp>
          )}

          {/* Card 3: Bench & Jurisdiction */}
          {hearing.court && (
            <FadeInUp delay={0.2}>
              <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-card p-5 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5 text-gold-500" />
                  <span>Court Bench & Forum</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-serif font-bold text-foreground text-sm block">
                      {hearing.court.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {hearing.court.courtTypeLabel} • {hearing.court.district} District
                    </span>
                  </div>

                  {hearing.court.roomOrHall && (
                    <div className="flex justify-between py-1 border-t border-border/40">
                      <span className="text-muted-foreground">Room / Bench Hall:</span>
                      <span className="font-semibold text-foreground">
                        {hearing.court.roomOrHall}
                      </span>
                    </div>
                  )}

                  {hearing.court.presidingJudgeTitle && (
                    <div className="flex justify-between py-1 border-t border-border/40">
                      <span className="text-muted-foreground">Presiding Judge:</span>
                      <span className="font-medium text-foreground">
                        {hearing.court.presidingJudgeTitle}
                      </span>
                    </div>
                  )}

                  {hearing.court.address && (
                    <div className="py-1 border-t border-border/40">
                      <span className="text-muted-foreground block text-[11px]">Address:</span>
                      <span className="text-foreground text-[11px] mt-0.5 block">
                        {hearing.court.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </FadeInUp>
          )}

          {/* Card 4: System Audit Details */}
          <FadeInUp delay={0.24}>
            <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-card p-4 shadow-sm space-y-2 text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Hearing Record ID:</span>
                <span className="font-mono text-foreground">{hearing.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Created Date:</span>
                <span className="text-foreground">
                  {new Date(hearing.createdAt).toLocaleString("en-GB")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="text-foreground">
                  {new Date(hearing.updatedAt).toLocaleString("en-GB")}
                </span>
              </div>
            </div>
          </FadeInUp>
        </div>
      </div>

      {/* Edit Dialog Modal */}
      <HearingEditDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        hearing={hearing}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <HearingDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        hearing={hearing}
        onSuccess={() => router.push("/dashboard/hearings")}
      />
    </div>
  );
}

export default HearingDetailsPage;
