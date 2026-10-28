import type { Metadata } from "next";
import SignInCard from "@/components/signin/SignInCard";

export const metadata: Metadata = {
  title: "Advocate Portal Sign In | Advocate Aminul Islam Chowdhury Oly",
  description:
    "Secure chamber authentication portal for Advocate Aminul Islam Chowdhury Oly, Judge's Court, Sylhet.",
};

export default function SignInPage() {
  return (
    <main className="min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden bg-[#F8F9FC] dark:bg-[#040915] transition-colors duration-500">
      {/* Ambient Radial Color Washes */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gold-400/10 dark:bg-gold-400/[0.07] rounded-full blur-[120px] pointer-events-none -z-10"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-sapphire-500/10 dark:bg-sapphire-500/[0.12] rounded-full blur-[140px] pointer-events-none -z-10"
      />

      {/* Subtle Geometric / Dot Matrix Grid Overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(rgba(16,28,51,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(216,184,112,0.08)_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none opacity-80"
      />

      {/* Elegant Architectural Vignette Gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/[0.04] dark:to-black/40 pointer-events-none"
      />

      {/* Main Glassmorphic Sign-in Card */}
      <SignInCard />
    </main>
  );
}
