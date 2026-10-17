import type { Metadata } from "next";
import { ProfilePage } from "@/components/profile";

export const instant = false;

export const metadata: Metadata = {
  title: "Advocate Profile & Credentials | Advocate Oly Chowdhury",
  description:
    "Executive advocate profile, Bangladesh Bar Council sanad, Sylhet Bar credentials, chamber details, and profile headshot portrait.",
};

export default function DashboardProfilePage() {
  return <ProfilePage />;
}
