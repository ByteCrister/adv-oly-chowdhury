import type { Metadata } from "next";
import { DocumentsOverviewPage } from "@/components/documents";

export const instant = false;

export const metadata: Metadata = {
  title: "Legal Documents Vault | Advocate Oly Chowdhury",
  description:
    "Manage legal case documents, court filings, certified copies, exhibits, client KYC dossiers, and digital archives.",
};

export default function DocumentsPage() {
  return <DocumentsOverviewPage />;
}
