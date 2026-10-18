import type { Metadata } from "next";
import { CasePartiesPage } from "@/components/cases/parties";

export const instant = false;

interface CasePartiesRouteProps {
  params: Promise<{
    caseId: string;
  }>;
}

export async function generateMetadata({
  params,
}: CasePartiesRouteProps): Promise<Metadata> {
  const { caseId } = await params;
  return {
    title: `Case Litigants & Parties (${caseId}) | Advocate Oly Chowdhury`,
    description: "Manage case plaintiffs, defendants, petitioners, respondents, and witnesses.",
  };
}

export default async function CasePartiesRoutePage({
  params,
}: CasePartiesRouteProps) {
  const { caseId } = await params;
  return <CasePartiesPage caseId={caseId} />;
}
