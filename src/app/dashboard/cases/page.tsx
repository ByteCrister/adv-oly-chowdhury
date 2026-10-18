import type { Metadata } from "next";
import { CasesOverviewPage } from "@/components/cases/list";

export const instant = false;

export const metadata: Metadata = {
  title: "Cases & Files Repository | Advocate Oly Chowdhury",
  description:
    "Civil, criminal, writ, and taxation litigation dossiers, cause management, and case records.",
};

export default function CasesPage() {
  return <CasesOverviewPage />;
}
