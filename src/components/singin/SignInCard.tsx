"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck, Scale, ArrowLeft, Loader2 } from "lucide-react";
import { SignInForm } from "./SignInForm";

export function SignInCard() {
  return (
    <div className="relative w-full max-w-[440px] mx-auto">
      {/* Ambient Radial Background Glow */}
      <div
        aria-hidden="true"
        className="absolute -top-16 -left-16 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse duration-1000"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-16 -right-16 w-72 h-72 bg-amber-500/15 dark:bg-amber-400/10 rounded-full blur-3xl pointer-events-none -z-10"
      />

      {/* Glassmorphism Card Container */}
      <div className="relative backdrop-blur-xl bg-card/85 dark:bg-card/70 border border-border/70 dark:border-white/10 shadow-2xl shadow-primary/5 rounded-3xl p-7 sm:p-9 transition-all">
        {/* Top Header & Emblem */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mb-4 shadow-sm">
            <Scale className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Restricted Access</span>
          </div>

          <h1 className="text-2xl font-serif font-bold text-foreground tracking-tight">
            Advocate Portal
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Advocate Aminul Islam Chowdhury Oly
            <br />
            <span className="text-[11px] text-muted-foreground/80">
              Judge&apos;s Court, Sylhet • Chamber Management
            </span>
          </p>
        </div>

        {/* Interactive Sign-In Form Wrapped in Suspense */}
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Loading authentication…</span>
            </div>
          }
        >
          <SignInForm />
        </Suspense>

        {/* Security Notice & Footer */}
        <div className="mt-8 pt-5 border-t border-border/60 flex flex-col items-center gap-3 text-center">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>Encrypted Session • Whitelist-Only Security</span>
          </p>

          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors group mt-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Return to Public Portfolio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SignInCard;
