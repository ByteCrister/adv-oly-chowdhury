"use client";

import React, { useState, useEffect, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle, Lock, Mail } from "lucide-react";

interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

export function SignInForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isPending, startTransition] = useTransition();
  const [googlePending, setGooglePending] = useState(false);

  // Check URL query parameters for OAuth or server errors
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (!errorParam) return;

    if (errorParam === "AccountNotFound") {
      setErrors({
        form: "Access Restricted: This Google account is not authorized. Only the pre-approved chamber administrator can sign in.",
      });
    } else if (errorParam === "VerificationFailed") {
      setErrors({
        form: "Authentication verification failed. Please try again or use your password credentials.",
      });
    } else if (errorParam === "OAuthAccountNotLinked") {
      setErrors({
        form: "This email is registered with another sign-in method. Please sign in with your email and password.",
      });
    } else if (errorParam === "CredentialsSignin") {
      setErrors({
        form: "Invalid credentials. Please verify your email and password.",
      });
    } else if (errorParam === "AccessDenied") {
      setErrors({
        form: "Access denied. You do not have permission to access this resource.",
      });
    } else {
      setErrors({
        form: "Authentication error. Please try again.",
      });
    }
  }, [searchParams]);

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
    <div className="flex flex-col gap-6 w-full">
      {/* Top Banner Alert for Server / Rate-limit / Whitelist errors */}
      {errors.form && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-start gap-2.5 backdrop-blur-sm animate-in fade-in-50 duration-200"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span className="leading-snug">{errors.form}</span>
        </div>
      )}

      <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4" noValidate>
        {/* Email Field */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signin-email"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-primary" />
            Email Address
          </label>
          <div className="relative">
            <input
              id="signin-email"
              type="email"
              autoComplete="email"
              placeholder="advocate@example.com"
              disabled={isLoading}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
              }}
              className={`w-full h-11 px-3.5 rounded-xl border bg-background/60 dark:bg-card/40 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/60 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ${
                errors.email ? "border-red-500 ring-1 ring-red-500/30" : "border-border"
              }`}
            />
          </div>
          {errors.email && (
            <span className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
              • {errors.email}
            </span>
          )}
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="signin-password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-primary" />
              Password
            </label>
          </div>
          <div className="relative">
            <input
              id="signin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              disabled={isLoading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
              }}
              className={`w-full h-11 px-3.5 pr-11 rounded-xl border bg-background/60 dark:bg-card/40 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/60 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ${
                errors.password ? "border-red-500 ring-1 ring-red-500/30" : "border-border"
              }`}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <span className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
              • {errors.password}
            </span>
          )}
        </div>

        {/* Credentials Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 mt-1 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-primary/20 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying & Signing in…</span>
            </>
          ) : (
            <span>Sign In with Password</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border/70" />
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
          or continue with
        </span>
        <div className="flex-1 h-px bg-border/70" />
      </div>

      {/* Google OAuth Button */}
      <button
        type="button"
        disabled={isLoading}
        onClick={handleGoogleSignIn}
        className="w-full h-11 rounded-xl font-medium text-sm flex items-center justify-center gap-3 border border-border bg-card/60 hover:bg-muted/60 hover:border-border/80 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-sm"
      >
        {googlePending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-foreground" />
            <span>Connecting to Google…</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span className="text-foreground">Continue with Google</span>
          </>
        )}
      </button>
    </div>
  );
}

export default SignInForm;
