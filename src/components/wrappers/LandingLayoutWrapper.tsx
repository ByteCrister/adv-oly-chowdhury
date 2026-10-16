import * as React from "react";
import Heading from "@/components/layout/Heading";
import Footer from "@/components/layout/Footer";

export interface LandingLayoutWrapperProps {
  children: React.ReactNode;
}

/**
 * Dedicated Layout Wrapper for Advocate Public Landing Page.
 * Composes Heading, Page Content, and Footer.
 * Route-specific so it does not leak into future auth or dashboard routes.
 */
export default function LandingLayoutWrapper({
  children,
}: LandingLayoutWrapperProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-gold-300 selection:text-midnight-950">
      <Heading />
      <main className="flex-1 w-full flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
