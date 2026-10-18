import type { Metadata } from "next";
import LandingLayoutWrapper from "@/components/wrappers/LandingLayoutWrapper";
import HeroSection from "@/components/landing/HeroSection";
import AffiliationsBar from "@/components/landing/AffiliationsBar";
import AboutSection from "@/components/landing/AboutSection";
import PracticeAreasSection from "@/components/landing/PracticeAreasSection";
import CredentialsSection from "@/components/landing/CredentialsSection";
import ChamberSection from "@/components/landing/ChamberSection";
import ContactSection from "@/components/landing/ContactSection";
import {
  CHAMBER_FAVICONS_METADATA,
  CHAMBER_MANIFEST_METADATA,
  CHAMBER_APPLE_WEB_APP_METADATA,
  CHAMBER_OTHER_METADATA,
} from "@/const";
import { getLandingPageData } from "@/lib/landing";

/**
 * Generate production-grade SEO metadata using authoritative public profile data.
 * Reuses the cached landing page dataset without duplicate database queries.
 */
export async function generateMetadata(): Promise<Metadata> {
  const landingData = await getLandingPageData();
  const { profile, meta } = landingData;

  const title = meta.title;
  const description = meta.description;

  const ogImageUrl = profile.avatarUrl.startsWith("http")
    ? profile.avatarUrl
    : `${meta.siteUrl.replace(/\/$/, "")}${profile.avatarUrl}`;

  return {
    title,
    description,
    alternates: {
      canonical: meta.canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: meta.canonicalUrl,
      siteName: `${profile.preferredName || profile.fullName} Legal Chambers`,
      images: [
        {
          url: ogImageUrl,
          width: 800,
          height: 800,
          alt: profile.fullName,
        },
      ],
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: CHAMBER_FAVICONS_METADATA,
    manifest: CHAMBER_MANIFEST_METADATA,
    appleWebApp: CHAMBER_APPLE_WEB_APP_METADATA,
    other: CHAMBER_OTHER_METADATA,
  };
}

/**
 * Primary Landing Page for Advocate Aminul Islam Chowdhury Oly.
 * Renders as a React Server Component with static prerendering support
 * and on-demand cache revalidation.
 */
export default async function Home() {
  const landingData = await getLandingPageData();
  const { profile, practiceAreas } = landingData;

  return (
    <LandingLayoutWrapper>
      {/* 1. Hero Section with Primary Headshot & Core Value Proposition */}
      <HeroSection profile={profile} />

      {/* 2. Official Bar Affiliations Ribbon */}
      <AffiliationsBar
        barRegistrations={profile.barRegistrations}
        chamber={profile.chamber}
      />

      {/* 3. Professional Introduction & Practice Pillars */}
      <AboutSection profile={profile} />

      {/* 4. Core Legal Practice Areas & Court Services */}
      <PracticeAreasSection practiceAreas={practiceAreas} />

      {/* 5. Academic Credentials & Official Bar Memberships */}
      <CredentialsSection
        barRegistrations={profile.barRegistrations}
        profile={profile}
      />

      {/* 6. Chamber Location & Courtroom Consultation Protocols */}
      <ChamberSection
        chamber={profile.chamber}
        phone={profile.phone}
        phoneInternational={profile.phoneInternational}
      />

      {/* 7. Direct Contact & Consultation Section with CTA Band */}
      <ContactSection profile={profile} />
    </LandingLayoutWrapper>
  );
}
