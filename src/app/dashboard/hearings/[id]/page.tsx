import type { Metadata } from "next";
import { HearingDetailsPage } from "@/components/hearings/details";

export const instant = false;

interface HearingDetailRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: HearingDetailRouteProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Hearing Dossier (${id}) | Advocate Oly Chowdhury`,
    description:
      "Detailed court hearing schedule, proceedings outcome, bench details, and case links.",
  };
}

export default async function HearingDetailPage({
  params,
}: HearingDetailRouteProps) {
  const { id } = await params;
  return <HearingDetailsPage id={id} />;
}
