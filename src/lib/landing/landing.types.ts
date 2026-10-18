/**
 * Strongly-typed data structures for Advocate Oly Chowdhury's public landing page.
 * Strictly separates sensitive database internals from public presentation data.
 */

export interface LandingChamberInfo {
  room: string;
  barHall: string;
  court: string;
  city: string;
  district: string;
  fullAddress: string;
  consultationHours: string;
}

export interface LandingBarRegistrations {
  barCouncilId: string | null;
  barAssociationMemberNo: string | null;
  taxesBarMemberNo: string | null;
}

export interface LandingProfile {
  fullName: string;
  preferredName: string;
  title: string;
  subtitle: string;
  tagline: string;
  heroDescription: string;
  avatarUrl: string;
  phone: string;
  phoneInternational: string;
  phoneDisplay: string;
  alternatePhone: string | null;
  whatsappNumber: string;
  whatsappUrl: string;
  email: string;
  barRegistrations: LandingBarRegistrations;
  chamber: LandingChamberInfo;
}

export interface LandingAffiliation {
  name: string;
  shortName: string;
  country: string;
  role: string;
  established?: string;
  description: string;
  highlight: string;
}

export interface LandingAcademicCredential {
  degree: string;
  title: string;
  field: string;
}

export interface LandingPracticeArea {
  id: string;
  title: string;
  summary: string;
  description: string;
  points: string[];
  icon: string;
}

export interface LandingPageData {
  profile: LandingProfile;
  affiliations: readonly LandingAffiliation[];
  credentials: readonly LandingAcademicCredential[];
  practiceAreas: readonly LandingPracticeArea[];
  meta: {
    siteUrl: string;
    canonicalUrl: string;
    title: string;
    description: string;
    ogImage: string;
    keywords: string[];
  };
}
