import type { Metadata } from "next";
import { ClientDocumentsPage } from "@/components/clients/documents";

export const instant = false;

interface ClientDocumentsRouteProps {
  params: Promise<{
    clientId: string;
  }>;
}

export async function generateMetadata({
  params,
}: ClientDocumentsRouteProps): Promise<Metadata> {
  const { clientId } = await params;
  return {
    title: `Client Documents (${clientId}) | Advocate Oly Chowdhury`,
    description: "Manage client document vault, legal deeds, and identity proofs.",
  };
}

export default async function ClientDocsPage({
  params,
}: ClientDocumentsRouteProps) {
  const { clientId } = await params;
  return <ClientDocumentsPage clientId={clientId} />;
}
