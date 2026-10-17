import type { Metadata } from "next";
import { AuthWrapper } from "@/components/wrappers/AuthWrapper";
import { DashboardLayoutWrapper } from "@/components/wrappers/DashboardLayoutWrapper";

export const instant = false;

export const metadata: Metadata = {
  title: "Chamber Dashboard | Advocate Aminul Islam Chowdhury Oly",
  description:
    "Executive case management and chamber operations portal for Advocate Oly Chowdhury, Judge's Court, Sylhet.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthWrapper>
      <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>
    </AuthWrapper>
  );
}
