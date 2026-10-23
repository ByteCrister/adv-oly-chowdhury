"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mail,
  Lock,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
} from "lucide-react";

type ResetStep = "REQUEST_EMAIL" | "VERIFY_OTP" | "NEW_PASSWORD" | "SUCCESS";

interface ForgotPasswordFlowProps {
  initialEmail?: string;
  onBackToSignIn: (prefilledEmail?: string) => void;
}

export function ForgotPasswordFlow({
  initialEmail = "",
  onBackToSignIn,
}: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<ResetStep>("REQUEST_EMAIL");
  const [email, setEmail] = useState(initialEmail);
  const [requestId, setRequestId] = useState("");
  const [resetToken, setResetToken] = useState("");

  // OTP inputs (6 separate digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password inputs
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Resend countdown
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle email submission to request OTP
  async function handleRequestOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Chamber email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed.toLowerCase() }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message || "Failed to process reset request. Please try again.");
        setIsLoading(false);
        return;
      }

      setRequestId(json?.data?.requestId || "");
      setInfoMessage(
        json?.message ||
          "A verification code has been dispatched to your email if an active chamber account matches."
      );
      setStep("VERIFY_OTP");
      setCountdown(60); // 60-second cooldown before resend
    } catch (err) {
      console.error("Password reset request error:", err);
      setError("A network error occurred. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle OTP digit entry
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    // Handle paste of multiple digits
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || "";
      }
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    newDigits[index] = value;
    setOtpDigits(newDigits);
    setError(null);

    // Auto-advance focus
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  // Handle OTP verification
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          otp: fullOtp,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message || "Invalid verification code.");
        setIsLoading(false);
        return;
      }

      setResetToken(json?.data?.resetToken || "");
      setStep("NEW_PASSWORD");
    } catch (err) {
      console.error("OTP verification error:", err);
      setError("A network error occurred during code verification. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle password reset confirmation
  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault();

    if (!newPassword) {
      setError("New password is required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters in length.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.message || "Failed to update password. Please try again.");
        setIsLoading(false);
        return;
      }

      setStep("SUCCESS");
    } catch (err) {
      console.error("Password reset confirmation error:", err);
      setError("A network error occurred while updating your password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Mask email for display: e.g. ad***e@example.com
  function getMaskedEmail(raw: string): string {
    const parts = raw.split("@");
    if (parts.length !== 2) return raw;
    const [name, domain] = parts;
    const masked = name.length <= 2 ? `${name}***` : `${name.slice(0, 2)}***${name.slice(-1)}`;
    return `${masked}@${domain}`;
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full animate-in fade-in-50 duration-300">
      {/* Alert Banner for errors */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="relative overflow-hidden p-4 bg-gradient-to-r from-red-500/10 via-red-500/[0.08] to-red-500/5 border border-red-500/30 text-red-700 dark:text-red-300 text-xs sm:text-sm rounded-2xl flex items-start gap-3 backdrop-blur-md shadow-sm"
        >
          <div
            aria-hidden="true"
            className="absolute top-0 inset-x-4 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent"
          />
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
          <div className="flex-1 leading-relaxed">{error}</div>
        </div>
      )}

      {/* Info Banner for Stage 1 confirmation */}
      {infoMessage && step === "VERIFY_OTP" && !error && (
        <div
          role="status"
          className="relative overflow-hidden p-3.5 bg-gold-500/10 border border-gold-500/30 text-gold-800 dark:text-gold-200 text-xs rounded-xl flex items-start gap-2.5 backdrop-blur-md"
        >
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-gold-600 dark:text-gold-400" />
          <div className="flex-1 leading-relaxed">{infoMessage}</div>
        </div>
      )}

      {/* STAGE 1: Request Email */}
      {step === "REQUEST_EMAIL" && (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4 sm:gap-4.5" noValidate>
          <div className="flex flex-col gap-1 text-center sm:text-left mb-1">
            <h2 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white">
              Recover Chamber Access
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enter your registered chamber email. We will send a secure 6-digit one-time code to
              verify your identity.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reset-email"
              className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-gold-600 dark:text-gold-400 shrink-0" />
              <span>Chamber Email Address</span>
            </label>

            <div className="relative rounded-xl border border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-gold-500/80 dark:focus-within:border-gold-400 focus-within:ring-4 focus-within:ring-gold-500/15 dark:focus-within:ring-gold-400/20 bg-slate-50/80 dark:bg-[#070E1E]/80 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all">
              <span
                aria-hidden="true"
                className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/10 to-transparent pointer-events-none rounded-t-xl"
              />

              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="advocate@example.com"
                disabled={isLoading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="w-full h-12 px-3.5 rounded-xl bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium transition-all focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-1 rounded-xl font-bold text-sm flex items-center justify-center gap-2 btn-gold-gloss active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Dispatching Verification Code…</span>
              </>
            ) : (
              <>
                <span>Send Verification Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onBackToSignIn(email)}
            className="w-full h-10 mt-1 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border bg-white/60 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Chamber Sign In</span>
          </button>
        </form>
      )}

      {/* STAGE 2: Verify OTP */}
      {step === "VERIFY_OTP" && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 sm:gap-4.5" noValidate>
          <div className="flex flex-col gap-1 text-center sm:text-left mb-1">
            <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-700 dark:text-gold-300 text-[10px] font-bold uppercase tracking-wider mb-1">
              <span>Stage 2 of 3 • Identity Verification</span>
            </div>
            <h2 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white">
              Enter Verification Code
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Dispatched to <span className="font-semibold text-slate-700 dark:text-slate-300">{getMaskedEmail(email)}</span>.
              Enter the 6-digit code below. Valid for 10 minutes.
            </p>
          </div>

          {/* 6 Digit Segmented Inputs */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              6-Digit Security Code
            </label>

            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  disabled={isLoading}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  aria-label={`Digit ${idx + 1} of verification code`}
                  className="w-11 sm:w-13 h-13 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/90 dark:bg-[#070E1E]/90 text-slate-900 dark:text-white focus:border-gold-500/80 dark:focus:border-gold-400 focus:ring-4 focus:ring-gold-500/15 focus:outline-none transition-all shadow-xs"
                />
              ))}
            </div>
          </div>

          {/* Resend Cooldown Section */}
          <div className="flex items-center justify-between text-xs px-1">
            <button
              type="button"
              disabled={isLoading || countdown > 0}
              onClick={() => handleRequestOtp()}
              className="inline-flex items-center gap-1.5 font-semibold text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("REQUEST_EMAIL");
                setError(null);
              }}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer underline-offset-4 hover:underline"
            >
              Change email
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || otpDigits.join("").length !== 6}
            className="w-full h-12 mt-1 rounded-xl font-bold text-sm flex items-center justify-center gap-2 btn-gold-gloss active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Verifying Security Code…</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Code</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onBackToSignIn(email)}
            className="w-full h-10 mt-1 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border bg-white/60 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel &amp; Return to Sign In</span>
          </button>
        </form>
      )}

      {/* STAGE 3: Set New Password */}
      {step === "NEW_PASSWORD" && (
        <form onSubmit={handleConfirmReset} className="flex flex-col gap-4 sm:gap-4.5" noValidate>
          <div className="flex flex-col gap-1 text-center sm:text-left mb-1">
            <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Identity Verified • Set Password</span>
            </div>
            <h2 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white">
              Create New Master Password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Choose a strong, confidential password with a minimum of 8 characters.
            </p>
          </div>

          {/* New Password Field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reset-new-password"
              className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-gold-600 dark:text-gold-400 shrink-0" />
              <span>New Master Password</span>
            </label>

            <div className="relative rounded-xl border border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-gold-500/80 dark:focus-within:border-gold-400 focus-within:ring-4 focus-within:ring-gold-500/15 dark:focus-within:ring-gold-400/20 bg-slate-50/80 dark:bg-[#070E1E]/80 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all">
              <span
                aria-hidden="true"
                className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/10 to-transparent pointer-events-none rounded-t-xl"
              />

              <input
                id="reset-new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••••"
                disabled={isLoading}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError(null);
                }}
                className="w-full h-12 pl-3.5 pr-12 rounded-xl bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium transition-all focus:outline-none disabled:opacity-50"
              />

              <button
                type="button"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-gold-300 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors focus:outline-none"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reset-confirm-password"
              className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-gold-600 dark:text-gold-400 shrink-0" />
              <span>Confirm Master Password</span>
            </label>

            <div className="relative rounded-xl border border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-gold-500/80 dark:focus-within:border-gold-400 focus-within:ring-4 focus-within:ring-gold-500/15 dark:focus-within:ring-gold-400/20 bg-slate-50/80 dark:bg-[#070E1E]/80 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all">
              <span
                aria-hidden="true"
                className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/10 to-transparent pointer-events-none rounded-t-xl"
              />

              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••••••"
                disabled={isLoading}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                className="w-full h-12 pl-3.5 pr-12 rounded-xl bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm font-medium transition-all focus:outline-none disabled:opacity-50"
              />

              <button
                type="button"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-gold-300 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !newPassword || !confirmPassword}
            className="w-full h-12 mt-1 rounded-xl font-bold text-sm flex items-center justify-center gap-2 btn-gold-gloss active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Updating Master Password…</span>
              </>
            ) : (
              <>
                <span>Commit New Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => onBackToSignIn(email)}
            className="w-full h-10 mt-1 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 border bg-white/60 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </form>
      )}

      {/* STAGE 4: Success */}
      {step === "SUCCESS" && (
        <div className="flex flex-col items-center text-center gap-4 py-2 animate-in zoom-in-95 duration-300">
          <div className="relative w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">
              Password Reset Complete
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm leading-relaxed">
              Your chamber master password has been successfully updated. You may now sign in using
              your new credentials.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onBackToSignIn(email)}
            className="w-full h-12 mt-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 btn-gold-gloss active:scale-[0.99] transition-all cursor-pointer shadow-lg"
          >
            <span>Proceed to Chamber Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default ForgotPasswordFlow;
