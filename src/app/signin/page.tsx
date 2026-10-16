import type { Metadata } from "next";
import SignInCard from "@/components/singin/SignInCard";

export const metadata: Metadata = {
  title: "Advocate Sign In | Advocate Aminul Islam Chowdhury Oly",
  description:
    "Secure single-user chamber authentication portal for Advocate Oly Chowdhury.",
};

export default function SignInPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-b from-background via-background/95 to-muted/30 relative overflow-hidden">
      {/* Decorative Grid Lines */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"
      />

      <SignInCard />
    </main>
  );
}
