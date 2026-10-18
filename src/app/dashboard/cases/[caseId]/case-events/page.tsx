import type { Metadata } from "next";
import { CaseEventsPage } from "@/components/cases/events";

export const instant = false;

interface CaseEventsRouteProps {
  params: Promise<{
    caseId: string;
  }>;
}

export async function generateMetadata({
  params,
}: CaseEventsRouteProps): Promise<Metadata> {
  const { caseId } = await params;
  return {
    title: `Case Events Timeline (${caseId}) | Advocate Oly Chowdhury`,
    description: "Chronological litigation milestones, stay orders, and procedural history.",
  };
}

export default async function CaseEventsRoutePage({
  params,
}: CaseEventsRouteProps) {
  const { caseId } = await params;
  return <CaseEventsPage caseId={caseId} />;
}
