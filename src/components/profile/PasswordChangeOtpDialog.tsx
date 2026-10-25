"use client";

import * as React from "react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Lock,
  ArrowRight,
  Mail,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/shared/use-toast";
import { profileKeys } from "@/hooks/profile/queries/useProfile";
import { AUDIT_QUERY_KEYS } from "@/const/audit-log.const";

export interface PasswordChangeOtpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  requestId: string;
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
  onSuccess: () => void;
}

/**
 * Masks an email address for privacy (e.g. ad***e@example.com)
 */
function maskEmail(rawEmail: string): string {
  if (!rawEmail) return "";
  const parts = rawEmail.split("@");
  if (parts.length !== 2) return rawEmail;
  const [name, domain] = parts;
  const maskedName =
    name.length <= 2 ? `${name}***` : `${name.slice(0, 2)}***${name.slice(-1)}`;
  return `${maskedName}@${domain}`;
}

function PasswordChangeOtpContent({
  onOpenChange,
  email,
  requestId,
  currentPassword,
  newPassword,
  confirmPassword,
  onSuccess,
}: PasswordChangeOtpDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeRequestId, setActiveRequestId] = React.useState(requestId);
  const [otpDigits, setOtpDigits] = React.useState<string[]>([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const otpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);
  const [countdown, setCountdown] = React.useState(60);

  // Auto-focus on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Resend cooldown timer
  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Handle single digit input or full paste
  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];

    // Handle paste of 6 digits
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split("");
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || "";
      }
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      setError(null);
      return;
    }

    newDigits[index] = value;
    setOtpDigits(newDigits);
    setError(null);

    // Auto-advance
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Resend verification code
  const handleResendOtp = async () => {
    if (countdown > 0 || isResending || isLoading) return;

    setIsResending(true);
    setError(null);
    setInfoMessage(null);

    try {
      const response = await axios.post("/api/v1/users/me/password/request-otp", {
        currentPassword: currentPassword || "",
      });

      const nextRequestId = response.data?.data?.requestId;
      if (nextRequestId) {
        setActiveRequestId(nextRequestId);
      }

      setCountdown(60);
      setOtpDigits(["", "", "", "", "", ""]);
      setInfoMessage(
        "A fresh verification code has been dispatched to your chamber email."
      );
      otpInputRefs.current[0]?.focus();

      toast({
        title: "Code Dispatched",
        description: "A new 6-digit verification code was sent to your email.",
        variant: "gold",
      });
    } catch (err: unknown) {
      let msg = "Failed to resend verification code. Please try again.";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsResending(false);
    }
  };

  // Verify OTP and confirm password update
  const handleVerifyAndCommit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter all 6 digits of the verification code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Verify OTP code
      const verifyRes = await axios.post("/api/auth/password-reset/verify", {
        requestId: activeRequestId,
        otp: fullOtp,
      });

      const resetToken = verifyRes.data?.data?.resetToken;
      if (!resetToken) {
        throw new Error(
          "Verification succeeded but no authorization token was received."
        );
      }

      // Step 2: Commit new password
      await axios.post("/api/auth/password-reset/confirm", {
        requestId: activeRequestId,
        resetToken,
        newPassword,
        confirmPassword,
      });

      // Step 3: Invalidate caches
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileKeys.all }),
        queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all }),
      ]);

      toast({
        title: "Password Changed Successfully",
        description: "Your chamber account password has been updated and secured.",
        variant: "gold",
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      let msg = "Invalid verification code or code has expired.";
      if (axios.isAxiosError(err)) {
        msg = err.response?.data?.message || err.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isComplete = otpDigits.join("").length === 6;

  return (
    <DialogContent className="max-w-md p-6 sm:p-7 gap-5">
      {/* Header */}
      <DialogHeader className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-gold-600 dark:text-gold-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-base sm:text-lg font-serif font-bold text-foreground">
              Authorize Password Change
            </DialogTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <Mail className="w-3.5 h-3.5 text-gold-500 shrink-0" />
              <span>
                Sent to:{" "}
                <strong className="text-foreground font-mono">
                  {maskEmail(email)}
                </strong>
              </span>
            </div>
          </div>
        </div>
        <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
          To ensure the security of your chamber records, enter the 6-digit
          one-time verification code dispatched to your email address. Valid for
          10 minutes.
        </DialogDescription>
      </DialogHeader>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed font-medium">{error}</div>
        </div>
      )}

      {/* Info Alert */}
      {infoMessage && !error && (
        <div
          role="status"
          className="p-3 rounded-xl bg-gold-500/10 border border-gold-500/25 text-gold-800 dark:text-gold-300 text-xs flex items-start gap-2 animate-in fade-in duration-200"
        >
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-gold-500" />
          <div className="flex-1 leading-relaxed">{infoMessage}</div>
        </div>
      )}

      {/* Verification Form */}
      <form onSubmit={handleVerifyAndCommit} className="space-y-5" noValidate>
        {/* Segmented Inputs */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            6-Digit Verification Code
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
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                aria-label={`Digit ${idx + 1} of verification code`}
                className="w-10 sm:w-12 h-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold rounded-xl border border-border/80 bg-muted/40 text-foreground focus:border-gold-500 focus:ring-4 focus:ring-gold-500/15 focus:outline-none transition-all shadow-xs"
              />
            ))}
          </div>
        </div>

        {/* Resend Cooldown Line */}
        <div className="flex items-center justify-between text-xs px-1">
          <button
            type="button"
            disabled={isLoading || isResending || countdown > 0}
            onClick={handleResendOtp}
            className="inline-flex items-center gap-1.5 font-semibold text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isResending ? "animate-spin" : ""}`}
            />
            <span>
              {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
            </span>
          </button>

          <span className="text-[11px] text-muted-foreground">
            Single-use authorization
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-2 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
            className="text-xs rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="gold"
            disabled={isLoading || !isComplete}
            className="text-xs rounded-xl font-semibold gap-1.5 shadow-sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying &amp; Updating...</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm Password Change</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export function PasswordChangeOtpDialog(props: PasswordChangeOtpDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <PasswordChangeOtpContent {...props} />}
    </Dialog>
  );
}

export default PasswordChangeOtpDialog;
