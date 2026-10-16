import { ProfileTab } from "@/types/profile.ui.type";

export interface ProfileTabConfig {
  id: ProfileTab;
  label: string;
  description: string;
  iconName: string;
}

export const PROFILE_TABS: ProfileTabConfig[] = [
  {
    id: "general",
    label: "Identity & Title",
    description: "Official legal name, titles, tagline, and contact numbers",
    iconName: "User",
  },
  {
    id: "credentials",
    label: "Bar Registrations",
    description: "Bangladesh Bar Council sanad, Sylhet Bar & Taxes Bar memberships",
    iconName: "Award",
  },
  {
    id: "chamber",
    label: "Chamber & Court",
    description: "Chamber 323 location, court jurisdiction, and consultation hours",
    iconName: "Building2",
  },
  {
    id: "address",
    label: "Residential Address",
    description: "Present and permanent residences in Sylhet",
    iconName: "MapPin",
  },
  {
    id: "security",
    label: "Security & Access",
    description: "Admin password, active sessions, and authentication security",
    iconName: "Shield",
  },
];

export const PROFILE_DEFAULTS = {
  name: "Aminul Islam Chowdhury Oly",
  preferredName: "Advocate Oly Chowdhury",
  title: "Advocate",
  subtitle: "Advocate • Judge's Court, Sylhet",
  phone: "01712-459840",
  whatsappNumber: "+8801712459840",
  chamber: {
    room: "Chamber No. 323 (3rd Floor)",
    barHall: "Bar Hall No: 02",
    court: "Judge's Court",
    city: "Sylhet",
    district: "Sylhet",
    fullAddress: "Chamber No. 323 (3rd Floor), Bar Hall No: 02, Judge's Court, Sylhet, Bangladesh",
    consultationHours: "Saturday – Thursday (Court & Chamber Hours)",
  },
  homeAddress: {
    city: "Sylhet",
  },
};

export const PROFILE_QUERY_KEYS = {
  all: ["profile"] as const,
  me: () => [...PROFILE_QUERY_KEYS.all, "me"] as const,
};
