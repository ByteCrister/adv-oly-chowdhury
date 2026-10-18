import type { Metadata } from "next";
import { HearingCreateForm } from "@/components/hearings/create";

export const instant = false;

export const metadata: Metadata = {
  title: "Schedule Court Hearing | Advocate Oly Chowdhury",
  description:
    "Schedule a new court appearance, bench cause-list entry, or interlocutory hearing.",
};

export default function NewHearingPage() {
  return <HearingCreateForm />;
}
