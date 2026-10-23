"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Scale, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { SignInForm } from "./SignInForm";
import { ForgotPasswordFlow } from "./ForgotPasswordFlow";

export function SignInCard() {
  const [view, setView] = useState<"signin" | "forgot_password">("signin");
  const [prefilledEmail, setPrefilledEmail] = useState<string>("");

  return (
    <div className="relative w-full max-w-[460px] mx-auto z-10">
      {/* Top Floating Navigation: Back to Public Portfolio or Sign In */}
      <div className="flex items-center justify-between mb-4 px-1.5 sm:px-2">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-gold-700 dark:hover:text-gold-300 bg-white/70 dark:bg-white/[0.05] hover:bg-white dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs transition-all duration-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
          <span>Return to Public Portfolio</span>
        </Link>

        {view === "forgot_password" && (
          <button
            type="button"
            onClick={() => setView("signin")}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gold-700 dark:text-gold-300 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 transition-all duration-200 cursor-pointer"
          >
            <span>Back to Sign In</span>
          </button>
        )}
      </div>

      {/* Ambient Multi-Layer Radial Glow Orbs */}
      <div
        aria-hidden="true"
        className="absolute -top-16 -left-16 w-72 h-72 bg-gradient-to-br from-sapphire-400/25 to-primary/20 dark:from-sapphire-500/20 dark:to-primary/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse duration-1000"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-20 -right-16 w-80 h-80 bg-gradient-to-tl from-gold-400/25 to-amber-500/20 dark:from-gold-400/15 dark:to-amber-500/10 rounded-full blur-3xl pointer-events-none -z-10"
      />

      {/* Main Luxury Glassmorphism Card Container */}
      <div className="relative backdrop-blur-2xl bg-white/85 dark:bg-[#070E1E]/85 border border-slate-200/90 dark:border-white/12 shadow-[0_20px_60px_-15px_rgba(16,28,51,0.12),0_8px_24px_-8px_rgba(192,154,78,0.14)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7),0_0_40px_-10px_rgba(216,184,112,0.15)] rounded-[28px] sm:rounded-[32px] p-6 sm:p-9 transition-all duration-300 overflow-hidden">
        {/* Specular Top Sheen Edge Highlight */}
        <div
          aria-hidden="true"
          className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/90 dark:via-gold-300/50 to-transparent pointer-events-none"
        />

        {/* Ambient Top Light Flare */}
        <div
          aria-hidden="true"
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-gold-400/20 dark:from-gold-300/15 to-transparent rounded-full blur-2xl pointer-events-none"
        />

        {/* Top Header & Chamber Emblem */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-7">
          {/* Medallion with 3D Gloss Sheen */}
          <div className="relative mb-4 group">
            <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-gold-400/30 via-sapphire-400/20 to-gold-500/30 blur-md opacity-75 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="relative w-16 h-16 rounded-2xl sidebar-emblem-gloss flex items-center justify-center text-gold-700 dark:text-gold-300 shadow-md">
              <div
                aria-hidden="true"
                className="absolute inset-x-2 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-2xl pointer-events-none"
              />
              {view === "signin" ? (
                <Scale className="w-8 h-8 drop-shadow-sm transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <KeyRound className="w-8 h-8 drop-shadow-sm transition-transform duration-300 group-hover:scale-105" />
              )}
            </div>
          </div>

          {/* Chamber Restricted Status Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 dark:bg-gold-400/10 border border-gold-500/25 dark:border-gold-400/25 text-[10.5px] sm:text-[11px] font-bold text-gold-800 dark:text-gold-300 uppercase tracking-widest mb-2.5 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500 dark:bg-gold-400" />
            </span>
            <span>
              {view === "signin"
                ? "Restricted Access • Chamber Portal"
                : "Security Recovery • Chamber Portal"}
            </span>
          </div>

          {/* Heading with Serif Distinction */}
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
            {view === "signin" ? "Chamber Authentication" : "Password Recovery"}
          </h1>

          <div className="mt-1.5 flex flex-col items-center gap-0.5">
            <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
              Advocate Aminul Islam Chowdhury Oly
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              Judge&apos;s Court, Sylhet • Chamber Management
            </p>
          </div>

          {/* Decorative hairline */}
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent mt-4 mb-1" />
        </div>

        {/* Interactive Form Wrapped in Suspense */}
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground text-sm">
              <div className="relative">
                <div className="w-10 h-10 rounded-full border-2 border-gold-500/20 border-t-gold-500 animate-spin" />
                <Loader2 className="w-5 h-5 animate-spin text-gold-600 dark:text-gold-400 absolute inset-0 m-auto" />
              </div>
              <span className="text-xs font-medium tracking-wide">
                Loading secure authentication gateway…
              </span>
            </div>
          }
        >
          {view === "signin" ? (
            <SignInForm
              initialEmail={prefilledEmail}
              onForgotPassword={() => setView("forgot_password")}
            />
          ) : (
            <ForgotPasswordFlow
              initialEmail={prefilledEmail}
              onBackToSignIn={(email) => {
                setView("signin");
                if (email) setPrefilledEmail(email);
              }}
            />
          )}
        </Suspense>

        {/* Security Notice & Footer */}
        <div className="mt-7 pt-5 border-t border-slate-200/80 dark:border-white/10 flex flex-col items-center gap-2.5 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-600 dark:text-gold-400 shrink-0" />
            <span>256-Bit SSL Encrypted • Whitelist-Only Authorization</span>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Authorized for Advocate Aminul Islam Chowdhury Oly &amp; designated officers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignInCard;
