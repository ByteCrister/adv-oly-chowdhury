import type { Metadata } from "next";
import { CreateCasePage } from "@/components/cases/create";

export const instant = false;

export const metadata: Metadata = {
  title: "Register New Legal Case | Advocate Oly Chowdhury",
  description:
    "Open a new litigation matter, associate client and court jurisdiction, and track proceeding status in the chamber management system.",
};

export default function NewCaseRoute() {
  return <CreateCasePage />;
}
