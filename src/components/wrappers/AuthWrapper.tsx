"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Scale, ShieldCheck, Loader2 } from "lucide-react";

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthWrapper provides client-side session authentication verification
 * for protected chamber dashboard routes.
 * 
 * - While session status is "loading": Renders an executive midnight & gold chamber loader.
 * - If status is "unauthenticated": Redirects to /signin with preservation of callbackUrl.
 * - If status is "authenticated": Seamlessly renders protected dashboard content.
 */
export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === "unauthenticated") {
      const returnUrl = encodeURIComponent(pathname || "/dashboard");
      router.replace(`/signin?callbackUrl=${returnUrl}`);
    }
  }, [status, router, pathname]);

  // Loading State: Luxury Chamber Loading Screen
  if (status === "loading") {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
        {/* Ambient Radial Background Glow */}
        <div
          aria-hidden="true"
          className="absolute -top-24 -left-24 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"
        />

        {/* Chamber Emblem & Status */}
        <div className="relative flex flex-col items-center text-center max-w-sm z-10 animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 via-primary/10 to-transparent border border-gold-500/40 flex items-center justify-center text-gold-500 shadow-xl shadow-gold-500/10">
              <Scale className="w-8 h-8 animate-pulse text-gold-500 dark:text-gold-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-500" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-[11px] font-semibold text-gold-600 dark:text-gold-400 uppercase tracking-wider mb-2.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Advocate Verification</span>
          </div>

          <h2 className="text-lg font-serif font-bold text-foreground tracking-tight">
            Chamber Management Portal
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Verifying credentials for Advocate Oly Chowdhury...
          </p>
        </div>
      </div>
    );
  }

  // If unauthenticated, return null while router.replace completes
  if (status === "unauthenticated" || !session) {
    return null;
  }

  // Authenticated state: render protected dashboard
  return <>{children}</>;
}

export default AuthWrapper;
