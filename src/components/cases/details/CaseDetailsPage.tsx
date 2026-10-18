"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { DashboardBreadcrumb } from "@/components/shared/DashboardBreadcrumb";
import { FadeInUp } from "@/components/wrappers/Motion";
import { Button } from "@/components/ui/button";
import { useCaseDetail } from "@/hooks/cases";
import { CaseDetailsSkeleton } from "./CaseDetailsSkeleton";
import { CaseDetailsOverview } from "./CaseDetailsOverview";
import { CaseHearingsSection } from "./CaseHearingsSection";
import { CaseFormDialog } from "../list/CaseFormDialog";
import { CaseDeleteDialog } from "../list/CaseDeleteDialog";

export interface CaseDetailsPageProps {
  caseId: string;
}

export function CaseDetailsPage({ caseId }: CaseDetailsPageProps) {
  const router = useRouter();
  const { data: caseData, isLoading, isError, error, refetch } = useCaseDetail(caseId);

  // Dialog state
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  if (isLoading) {
    return <CaseDetailsSkeleton />;
  }

  if (isError || !caseData) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16">
        <DashboardBreadcrumb
          items={[
            { label: "Overview", href: "/dashboard" },
            { label: "Cases & Files", href: "/dashboard/cases" },
            { label: "Case Dossier" },
          ]}
        />
        <div className="p-10 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-foreground">
              Case Dossier Not Found
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {(error as Error)?.message ||
                `The requested case dossier (${caseId}) could not be located in the repository. It may have been archived or deleted.`}
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link href="/dashboard/cases">
              <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Cases</span>
              </Button>
            </Link>
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={() => refetch()}
              className="rounded-xl text-xs gap-1.5 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb Navigation */}
      <FadeInUp delay={0.05}>
        <DashboardBreadcrumb
          items={[
            { label: "Overview", href: "/dashboard" },
            { label: "Cases & Files", href: "/dashboard/cases" },
            {
              label: caseData.caseNumber || caseData.internalReference,
            },
          ]}
        />
      </FadeInUp>

      {/* Case Overview & Details */}
      <FadeInUp delay={0.1}>
        <CaseDetailsOverview
          caseData={caseData}
          onEdit={() => setIsEditOpen(true)}
          onDelete={() => setIsDeleteOpen(true)}
        />
      </FadeInUp>

      {/* Case-Scoped Hearings & Cause List Section */}
      <FadeInUp delay={0.15}>
        <CaseHearingsSection caseId={caseId} />
      </FadeInUp>

      {/* Edit Dialog */}
      <CaseFormDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        caseItem={caseData}
        onSuccess={() => refetch()}
      />

      {/* Archive / Delete Dialog */}
      <CaseDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        caseItem={caseData}
        onSuccess={() => {
          router.push("/dashboard/cases");
        }}
      />
    </div>
  );
}

export default CaseDetailsPage;
