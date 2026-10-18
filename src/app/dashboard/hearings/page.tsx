import type { Metadata } from "next";
import { HearingsOverviewPage } from "@/components/hearings/list";

export const instant = false;

export const metadata: Metadata = {
  title: "Daily Cause List | Advocate Oly Chowdhury",
  description:
    "Daily court hearings schedule, bench cause lists, appearance calendar, and case proceedings.",
};

export default function HearingsPage() {
  return <HearingsOverviewPage />;
}
