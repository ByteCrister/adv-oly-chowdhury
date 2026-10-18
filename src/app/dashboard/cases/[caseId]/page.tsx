import type { Metadata } from "next";
import { CaseDetailsPage } from "@/components/cases/details";

export const instant = false;

interface CaseDetailRouteProps {
  params: Promise<{
    caseId: string;
  }>;
}

export async function generateMetadata({
  params,
}: CaseDetailRouteProps): Promise<Metadata> {
  const { caseId } = await params;
  return {
    title: `Case Dossier (${caseId}) | Advocate Oly Chowdhury`,
    description:
      "Detailed legal case overview, litigation facts, court cause list, and filings.",
  };
}

export default async function CaseDetailPage({
  params,
}: CaseDetailRouteProps) {
  const { caseId } = await params;
  return <CaseDetailsPage caseId={caseId} />;
}
