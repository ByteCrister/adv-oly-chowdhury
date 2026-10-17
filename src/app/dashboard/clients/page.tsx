import type { Metadata } from "next";
import { ClientsOverviewPage } from "@/components/clients/list";

export const instant = false;

export const metadata: Metadata = {
  title: "Clients Directory | Advocate Oly Chowdhury",
  description:
    "Manage legal clientele, identity dossiers, case retainers, and client ledger records.",
};

export default function ClientsPage() {
  return <ClientsOverviewPage />;
}
