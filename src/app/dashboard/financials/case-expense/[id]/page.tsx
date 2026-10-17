import type { Metadata } from "next";
import { CaseExpenseFormPage } from "@/components/financials";

interface CaseExpenseRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: CaseExpenseRouteProps): Promise<Metadata> {
  const { id } = await params;
  const isCreate = id === "new";

  return {
    title: `${isCreate ? "Record New Expense" : "Manage Case Expense"} | Advocate Oly Chowdhury`,
    description:
      "Manage litigation expenses, court fees, talbana, and chamber disbursements.",
  };
}

export default async function CaseExpenseDetailPage({
  params,
}: CaseExpenseRouteProps) {
  const { id } = await params;
  return <CaseExpenseFormPage id={id} />;
}
