"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientStatusBadge, ClientTypeBadge } from "@/components/clients/shared/ClientBadges";
import type { ClientDetailDto } from "@/types/client.types";

export interface ClientDocumentsHeaderProps {
  client: ClientDetailDto;
  totalDocuments: number;
  onUploadClick: () => void;
}

export function ClientDocumentsHeader({
  client,
  totalDocuments,
  onUploadClick,
}: ClientDocumentsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Back to Client Profile */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <Link
          href={`/dashboard/clients/${client.id}`}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-gold-500" />
          <span>Back to {client.name}&apos;s Profile</span>
        </Link>

        <span className="text-[11px] font-mono text-muted-foreground">
          {client.clientNumber}
        </span>
      </div>

      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/70 backdrop-blur-xl border border-border/70 dark:border-white/10 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold text-xl shrink-0">
              <FileText className="w-6 h-6" />
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  Document Vault
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {totalDocuments} Files
                </span>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                <span>Client:</span>
                <strong className="text-foreground font-semibold">{client.name}</strong>
                {client.organizationName && <span>({client.organizationName})</span>}
                <ClientTypeBadge type={client.clientType} />
                <ClientStatusBadge status={client.status} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={onUploadClick}
              className="rounded-xl text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
