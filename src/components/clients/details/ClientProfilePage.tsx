"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FadeInUp } from "@/components/wrappers/Motion";
import { useClientDetails } from "@/hooks/clients";
import { ClientProfileHeader } from "./ClientProfileHeader";
import { ClientStatsOverview } from "./ClientStatsOverview";
import { ClientInfoCard } from "./ClientInfoCard";
import { ClientEditForm } from "./ClientEditForm";
import { ClientRecentCasesCard } from "./ClientRecentCasesCard";
import { ClientRecentDocsCard } from "./ClientRecentDocsCard";
import { ClientRecentPaymentsCard } from "./ClientRecentPaymentsCard";
import { ClientProfileSkeleton } from "./ClientProfileSkeleton";
import { ClientDeleteDialog } from "@/components/clients/list/ClientDeleteDialog";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ClientProfilePageProps {
  clientId: string;
}

export function ClientProfilePage({ clientId }: ClientProfilePageProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const {
    data: client,
    isLoading,
    isError,
    error,
    refetch,
  } = useClientDetails(clientId);

  if (isLoading) {
    return <ClientProfileSkeleton />;
  }

  if (isError || !client) {
    return (
      <div className="py-12 px-4 max-w-lg mx-auto text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground">
          Client Dossier Not Found
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {(error as Error)?.message ||
            `The requested client profile with identifier "${clientId}" could not be located in the database or has been deleted.`}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
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

          <Link href="/dashboard/clients">
            <Button
              type="button"
              variant="gold"
              size="sm"
              className="rounded-xl text-xs gap-1.5 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Directory</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <FadeInUp delay={0.05}>
        <ClientProfileHeader
          client={client}
          isEditing={isEditing}
          onToggleEdit={() => setIsEditing((prev) => !prev)}
          onDeleteClick={() => setIsDeleteDialogOpen(true)}
        />
      </FadeInUp>

      {/* 2. Key Metrics & Relation Summaries */}
      <FadeInUp delay={0.1}>
        <ClientStatsOverview stats={client.stats} />
      </FadeInUp>

      {/* 3. Main Content: View vs Edit Mode */}
      {isEditing ? (
        <FadeInUp delay={0.15}>
          <ClientEditForm
            client={client}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => {
              setIsEditing(false);
              refetch();
            }}
          />
        </FadeInUp>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Full Information Dossier (2 cols wide) */}
          <div className="lg:col-span-2 space-y-6">
            <FadeInUp delay={0.15}>
              <ClientInfoCard client={client} />
            </FadeInUp>

            <FadeInUp delay={0.2}>
              <ClientRecentCasesCard
                cases={client.recentCases}
                clientId={client.id}
              />
            </FadeInUp>
          </div>

          {/* Right Column: Documents & Payments Snapshot (1 col wide) */}
          <div className="space-y-6">
            <FadeInUp delay={0.25}>
              <ClientRecentDocsCard
                documents={client.recentDocuments}
                clientId={client.id}
              />
            </FadeInUp>

            <FadeInUp delay={0.3}>
              <ClientRecentPaymentsCard
                payments={client.recentPayments}
                clientId={client.id}
              />
            </FadeInUp>
          </div>
        </div>
      )}

      {/* Deletion Dialog */}
      <ClientDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        client={client}
        onSuccess={() => {
          router.push("/dashboard/clients");
        }}
      />
    </div>
  );
}
