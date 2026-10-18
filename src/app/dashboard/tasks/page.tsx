import type { Metadata } from "next";
import { TasksOverviewPage } from "@/components/tasks";

export const instant = false;

export const metadata: Metadata = {
  title: "Chamber Tasks & Deadlines | Advocate Oly Chowdhury",
  description:
    "Manage court filing deadlines, certified copy follow-ups, case preparation tasks, legal drafting action items, and chamber assignments.",
};

export default function TasksPage() {
  return <TasksOverviewPage />;
}
