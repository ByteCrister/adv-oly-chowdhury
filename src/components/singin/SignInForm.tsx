"use client";

import React, { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Lock,
  Mail,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

function getAuthErrorMessage(errorParam: string | null): string | undefined {
  if (!errorParam) return undefined;

  switch (errorParam) {
    case "AccountNotFound":
      return "Access Restricted: This Google account is not authorized. Only the pre-approved chamber administrator can sign in.";
    case "VerificationFailed":
      return "Authentication verification failed. Please try again or use your chamber password.";
    case "OAuthAccountNotLinked":
      return "This email is registered with another sign-in method. Please sign in with your email and password.";
    case "CredentialsSignin":
      return "Invalid credentials. Please verify your email and password.";
    case "AccessDenied":
      return "Access denied. You do not have permission to access this chamber portal.";
    default:
      return "Authentication error occurred. Please try again or contact chamber support.";
  }
}

export function SignInForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [prevErrorParam, setPrevErrorParam] = useState(errorParam);
  const [errors, setErrors] = useState<FormErrors>(() => {
    const initialError = getAuthErrorMessage(errorParam);
    return initialError ? { form: initialError } : {};
  });
  const [isPending, startTransition] = useTransition();
  const [googlePending, setGooglePending] = useState(false);

  // Synchronize state if URL query param changes during client navigation
  if (errorParam !== prevErrorParam) {
    setPrevErrorParam(errorParam);
    const newFormError = getAuthErrorMessage(errorParam);
    setErrors((prev) => ({
      ...prev,
      form: newFormError,
    }));
  }

  // Client Validation
  function validate(): FormErrors {
    const errs: FormErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address.";
    }

    if (!password) {
      errs.password = "Password is required.";
    }

    return errs;
  }

  // Handle Credentials Submit
  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      try {
        // Step 1: Pre-verification API call (checks rate limit, cooldown, and bcrypt hash)
        const res = await fetch("/api/auth/verify-credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          setErrors({
            form: json?.error || "Sign in failed. Please verify your credentials.",
          });
          return;
        }

        const userId: string = json?.data?.userId;
        if (!userId) {
          setErrors({ form: "Unexpected server response. Please try again." });
          return;
        }

        // Step 2: Establish NextAuth JWT session using pre-verified userId
        const result = await signIn("credentials", {
          verifiedUserId: userId,
          redirect: false,
        });

        if (result?.error) {
          setErrors({
            form: "Failed to establish secure session. Please try again.",
          });
          return;
        }

        // Step 3: Redirect to destination or dashboard
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        window.location.href = callbackUrl;
      } catch (err) {
        console.error("Sign in submission error:", err);
        setErrors({
          form: "A network error occurred. Please check your connection and try again.",
        });
      }
    });
  }

  // Handle Google OAuth Sign-In
  async function handleGoogleSignIn() {
    setGooglePending(true);
    setErrors({});
    try {
      const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error("Google sign-in error:", err);
      setErrors({ form: "Failed to initialize Google sign-in. Please try again." });
      setGooglePending(false);
    }
  }

  const isLoading = isPending || googlePending;

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full">
      {/* Top Banner Alert for Server / Rate-limit / Whitelist errors */}
      {errors.form && (
        <div
          role="alert"
          aria-live="polite"
          className="relative overflow-hidden p-4 bg-gradient-to-r from-red-500/10 via-red-500/[0.08] to-red-500/5 border border-red-500/30 text-red-700 dark:text-red-300 text-xs sm:text-sm rounded-2xl flex items-start gap-3 backdrop-blur-md shadow-sm animate-in fade-in-50 slide-in-from-top-2 duration-300"
        >
          {/* Subtle accent glow line */}
          <div
            aria-hidden="true"
            className="absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent"
          />
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
          <div className="flex-1 leading-relaxed">{errors.form}</div>
        </div>
      )}

      <form
        onSubmit={handleCredentialsSubmit}
        className="flex flex-col gap-4 sm:gap-4.5"
        noValidate
      >
        {/* Email Field */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signin-email"
            className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-gold-600 dark:text-gold-400 shrink-0" />
            <span>Chamber Email Address</span>
          </label>

          <div
            className={`relative rounded-xl transition-all duration-200 border ${
              errors.email
                ? "border-red-500/80 ring-2 ring-red-500/20 bg-red-500/[0.02]"
                : "border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-gold-500/80 dark:focus-within:border-gold-400 focus-within:ring-4 focus-within:ring-gold-500/15 dark:focus-within:ring-gold-400/20"
            } bg-slate-50/80 dark:bg-[#070E1E]/80 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]`}
          >
            {/* Top specular reflection line inside input */}
            <span
              aria-hidden="true"
              className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/10 to-transparent pointer-events-none rounded-t-xl"
            />

            <input
              id="signin-email"
              type="email"
              autoComplete="username"
              enterKeyHint="next"
              spellCheck={false}
              placeholder="advocate@example.com"
              disabled={isLoading}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  email: undefined,
                  form: undefined,
                }));
              }}
              className="w-full h-12 px-3.5 rounded-xl bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium transition-all focus:outline-none disabled:opacity-50"
            />
          </div>

          {errors.email && (
            <span className="text-xs text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-1 font-medium animate-in fade-in-50 duration-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.email}</span>
            </span>
          )}
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="signin-password"
              className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-gold-600 dark:text-gold-400 shrink-0" />
              <span>Master Password</span>
            </label>
            <span className="text-[10px] text-muted-foreground/80 font-medium">
              Encrypted Key
            </span>
          </div>

          <div
            className={`relative rounded-xl transition-all duration-200 border ${
              errors.password
                ? "border-red-500/80 ring-2 ring-red-500/20 bg-red-500/[0.02]"
                : "border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-gold-500/80 dark:focus-within:border-gold-400 focus-within:ring-4 focus-within:ring-gold-500/15 dark:focus-within:ring-gold-400/20"
            } bg-slate-50/80 dark:bg-[#070E1E]/80 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]`}
          >
            {/* Top specular reflection line inside input */}
            <span
              aria-hidden="true"
              className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/10 to-transparent pointer-events-none rounded-t-xl"
            />

            <input
              id="signin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              enterKeyHint="done"
              placeholder="••••••••••••"
              disabled={isLoading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  password: undefined,
                  form: undefined,
                }));
              }}
              className="w-full h-12 pl-3.5 pr-12 rounded-xl bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium transition-all focus:outline-none disabled:opacity-50"
            />

            <button
              type="button"
              aria-pressed={showPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-gold-300 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {errors.password && (
            <span className="text-xs text-red-600 dark:text-red-400 mt-0.5 flex items-center gap-1 font-medium animate-in fade-in-50 duration-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.password}</span>
            </span>
          )}
        </div>

        {/* Credentials Submit Button — Ultra Glossy Gold */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 mt-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 btn-gold-gloss active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-lg"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Verifying Chamber Credentials…</span>
            </>
          ) : (
            <>
              <span>Sign In to Chamber</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/15 to-transparent" />
        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10">
          or continue with
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/15 to-transparent" />
      </div>

      {/* Google OAuth Button — Glossy Secondary Card */}
      <button
        type="button"
        disabled={isLoading}
        onClick={handleGoogleSignIn}
        className="group relative w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 border transition-all duration-300 cursor-pointer overflow-hidden disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99] bg-white/90 hover:bg-white dark:bg-white/[0.05] dark:hover:bg-white/[0.09] text-slate-800 dark:text-slate-100 border-slate-200/90 hover:border-gold-500/50 dark:border-white/10 dark:hover:border-gold-400/40 shadow-xs hover:shadow-md dark:hover:shadow-black/40"
      >
        {/* Specular reflection line on top of Google button */}
        <span
          aria-hidden="true"
          className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent pointer-events-none"
        />

        {googlePending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-foreground" />
            <span>Connecting to Google OAuth…</span>
          </>
        ) : (
          <>
            <svg
              className="w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-105"
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="tracking-tight">Sign in with Google Account</span>
          </>
        )}
      </button>
    </div>
  );
}

export default SignInForm;
