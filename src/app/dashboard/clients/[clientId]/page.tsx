import type { Metadata } from "next";
import { ClientProfilePage } from "@/components/clients/details";

export const instant = false;

interface ClientProfileRouteProps {
  params: Promise<{
    clientId: string;
  }>;
}

export async function generateMetadata({
  params,
}: ClientProfileRouteProps): Promise<Metadata> {
  const { clientId } = await params;
  return {
    title: `Client Profile (${clientId}) | Advocate Oly Chowdhury`,
    description: "Detailed client identity dossier, litigation history, and accounts.",
  };
}

export default async function ClientDetailPage({
  params,
}: ClientProfileRouteProps) {
  const { clientId } = await params;
  return <ClientProfilePage clientId={clientId} />;
}
