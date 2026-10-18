import type { Metadata } from "next";
import { CaseDocumentsPage } from "@/components/cases/documents";

export const instant = false;

interface CaseDocumentsRouteProps {
  params: Promise<{
    caseId: string;
  }>;
}

export async function generateMetadata({
  params,
}: CaseDocumentsRouteProps): Promise<Metadata> {
  const { caseId } = await params;
  return {
    title: `Case Documents Vault (${caseId}) | Advocate Oly Chowdhury`,
    description: "Manage legal case documents, petitions, exhibits, and evidence records.",
  };
}

export default async function CaseDocsRoutePage({
  params,
}: CaseDocumentsRouteProps) {
  const { caseId } = await params;
  return <CaseDocumentsPage caseId={caseId} />;
}
