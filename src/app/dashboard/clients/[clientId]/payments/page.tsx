import type { Metadata } from "next";
import { ClientPaymentsPage } from "@/components/clients/payments";

export const instant = false;

interface ClientPaymentsRouteProps {
  params: Promise<{
    clientId: string;
  }>;
}

export async function generateMetadata({
  params,
}: ClientPaymentsRouteProps): Promise<Metadata> {
  const { clientId } = await params;
  return {
    title: `Client Payments (${clientId}) | Advocate Oly Chowdhury`,
    description: "Manage client payments, receipts, professional fees, and billing ledger.",
  };
}

export default async function ClientPayPage({
  params,
}: ClientPaymentsRouteProps) {
  const { clientId } = await params;
  return <ClientPaymentsPage clientId={clientId} />;
}
