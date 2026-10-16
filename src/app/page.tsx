import * as React from "react";
import LandingLayoutWrapper from "@/components/wrappers/LandingLayoutWrapper";
import HeroSection from "@/components/landing/HeroSection";
import AffiliationsBar from "@/components/landing/AffiliationsBar";
import AboutSection from "@/components/landing/AboutSection";
import PracticeAreasSection from "@/components/landing/PracticeAreasSection";
import CredentialsSection from "@/components/landing/CredentialsSection";
import ChamberSection from "@/components/landing/ChamberSection";
import ContactSection from "@/components/landing/ContactSection";

export default function Home() {
  return (
    <LandingLayoutWrapper>
      {/* 1. Hero Section with Primary Headshot & Core Value Proposition */}
      <HeroSection />

      {/* 2. Official Bar Affiliations Ribbon */}
      <AffiliationsBar />

      {/* 3. Professional Introduction & Practice Pillars */}
      <AboutSection />

      {/* 4. Core Legal Practice Areas & Court Services */}
      <PracticeAreasSection />

      {/* 5. Academic Credentials & Official Bar Memberships */}
      <CredentialsSection />

      {/* 6. Chamber Location & Courtroom Consultation Protocols */}
      <ChamberSection />

      {/* 7. Direct Contact & Consultation Section with CTA Band */}
      <ContactSection />
    </LandingLayoutWrapper>
  );
}
