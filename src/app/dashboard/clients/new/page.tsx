import type { Metadata } from "next";
import { CreateClientPage } from "@/components/clients/create";

export const instant = false;

export const metadata: Metadata = {
  title: "Create New Client | Advocate Oly Chowdhury",
  description:
    "Enroll a new legal clientele dossier, contact records, and identity profile into the chamber management system.",
};

export default function NewClientRoute() {
  return <CreateClientPage />;
}
