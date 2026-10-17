"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  FileText,
  CreditCard,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientStatusBadge, ClientTypeBadge } from "@/components/clients/shared/ClientBadges";
import type { ClientDetailDto } from "@/types/client.types";
import { CLIENT_TYPES } from "@/const/client.const";

export interface ClientProfileHeaderProps {
  client: ClientDetailDto;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDeleteClick: () => void;
}

export function ClientProfileHeader({
  client,
  isEditing,
  onToggleEdit,
  onDeleteClick,
}: ClientProfileHeaderProps) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Top Back Nav & Quick Breadcrumb */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-gold-500" />
          <span>Back to Clients Directory</span>
        </Link>

        <span className="text-[11px] font-mono text-muted-foreground">
          ID: {client.id}
        </span>
      </div>

      {/* Main Profile Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Identity Details */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 via-gold-500/10 to-transparent border border-gold-500/30 flex items-center justify-center text-gold-600 dark:text-gold-400 font-serif font-bold text-xl sm:text-2xl shadow-inner shrink-0">
              {client.clientType === CLIENT_TYPES.ORGANIZATION ? (
                <Building2 className="w-7 h-7 sm:w-8 sm:h-8" />
              ) : (
                client.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20">
                  {client.clientNumber}
                </span>
                <ClientTypeBadge type={client.clientType} />
                <ClientStatusBadge status={client.status} />
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                {client.name}
              </h1>

              {client.organizationName && (
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                  <span className="truncate">{client.organizationName}</span>
                </p>
              )}
            </div>
          </div>

          {/* Right: Quick Action Links & Edit/Delete Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Quick Link to Documents */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/clients/${client.id}/documents`)}
              className="rounded-xl text-xs gap-1.5 border-border/80 text-foreground hover:bg-gold-500/10 hover:border-gold-500/40"
              title="Manage client documents and files"
            >
              <FileText className="w-3.5 h-3.5 text-gold-500" />
              <span>Documents</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-semibold text-foreground">
                {client.stats.totalDocuments}
              </span>
            </Button>

            {/* Quick Link to Payments */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/clients/${client.id}/payments`)}
              className="rounded-xl text-xs gap-1.5 border-border/80 text-foreground hover:bg-gold-500/10 hover:border-gold-500/40"
              title="Manage client payments and receipts"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              <span>Payments</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-semibold text-foreground">
                {client.stats.totalPayments}
              </span>
            </Button>

            <div className="h-6 w-px bg-border/60 mx-1 hidden sm:block" />

            {/* Toggle Edit Mode */}
            <Button
              type="button"
              variant={isEditing ? "default" : "gold"}
              size="sm"
              onClick={onToggleEdit}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditing ? "Cancel Editing" : "Edit Profile"}</span>
            </Button>

            {/* Delete Client */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDeleteClick}
              className="rounded-xl text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive/60"
              title={
                client.isDeletable
                  ? "Delete client record"
                  : "Client has active cases or payments"
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
