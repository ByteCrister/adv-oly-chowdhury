import type { Metadata } from "next";
import { FinancialsPage } from "@/components/financials";

export const metadata: Metadata = {
  title: "Fees & Financial Accounts | Advocate Oly Chowdhury",
  description:
    "Unified financial ledger and litigation accounting. Track client payments, retainers, and case disbursements.",
};

export default function FinancialsDashboardPage() {
  return <FinancialsPage />;
}
