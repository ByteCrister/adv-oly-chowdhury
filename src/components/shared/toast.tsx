"use client";

import * as React from "react";
import { motion, AnimatePresence, type HTMLMotionProps } from "framer-motion";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Gavel,
  Flame,
  X,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FadeIn,
  FadeInUp,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/wrappers/Motion";
import {
  type ToastVariant,
  type ToastActionElement,
  type ToasterToast,
} from "./use-toast";

// ============================================================
// Variant Configuration
// Following DESIGN.md rules:
// - Feedback bg + fg, 3px left border, icon required
// - Gold = sheen + trim, never big fills
// - Status never color alone → icon + label
// ============================================================

interface VariantStyle {
  leftBorder: string;
  bgTint: string;
  iconColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  progressColor: string;
  defaultIcon: React.ElementType;
}

const variantStyles: Record<ToastVariant, VariantStyle> = {
  default: {
    leftBorder: "border-l-primary dark:border-l-sapphire-400",
    bgTint: "bg-card hover:bg-card/95",
    iconColor: "text-sapphire-500 dark:text-sapphire-300",
    badgeBg: "bg-secondary",
    badgeBorder: "border-border",
    badgeText: "text-secondary-foreground",
    progressColor: "bg-sapphire-500/30 dark:bg-sapphire-400/40",
    defaultIcon: Scale,
  },
  gold: {
    leftBorder: "border-l-gold-500 dark:border-l-gold-400",
    bgTint: "bg-card hover:bg-card/95 shadow-md",
    iconColor: "text-gold-600 dark:text-gold-400",
    badgeBg: "bg-accent/70",
    badgeBorder: "border-gold-300 dark:border-gold-700/60",
    badgeText: "text-gold-text dark:text-gold-300",
    progressColor: "bg-gold-500/40 dark:bg-gold-400/50",
    defaultIcon: Award,
  },
  success: {
    leftBorder: "border-l-[#17623A] dark:border-l-[#6FCF97]",
    bgTint: "bg-card hover:bg-[#E2F3E8]/10 dark:hover:bg-[#12301F]/20",
    iconColor: "text-[#17623A] dark:text-[#6FCF97]",
    badgeBg: "bg-[#E2F3E8] dark:bg-[#12301F]",
    badgeBorder: "border-[#17623A]/20 dark:border-[#6FCF97]/25",
    badgeText: "text-[#17623A] dark:text-[#6FCF97]",
    progressColor: "bg-[#17623A]/30 dark:bg-[#6FCF97]/40",
    defaultIcon: CheckCircle2,
  },
  warning: {
    leftBorder: "border-l-[#6B4A0A] dark:border-l-[#F2C46D]",
    bgTint: "bg-card hover:bg-[#FBF1D9]/15 dark:hover:bg-[#3A2D0C]/25",
    iconColor: "text-[#6B4A0A] dark:text-[#F2C46D]",
    badgeBg: "bg-[#FBF1D9] dark:bg-[#3A2D0C]",
    badgeBorder: "border-[#6B4A0A]/20 dark:border-[#F2C46D]/25",
    badgeText: "text-[#6B4A0A] dark:text-[#F2C46D]",
    progressColor: "bg-[#6B4A0A]/30 dark:bg-[#F2C46D]/40",
    defaultIcon: AlertTriangle,
  },
  destructive: {
    leftBorder: "border-l-[#991B1B] dark:border-l-[#F0877E]",
    bgTint: "bg-card hover:bg-[#FBE0E0]/15 dark:hover:bg-[#3D1717]/25",
    iconColor: "text-[#991B1B] dark:text-[#F0877E]",
    badgeBg: "bg-[#FBE0E0] dark:bg-[#3D1717]",
    badgeBorder: "border-[#991B1B]/20 dark:border-[#F0877E]/25",
    badgeText: "text-[#991B1B] dark:text-[#F0877E]",
    progressColor: "bg-[#991B1B]/30 dark:bg-[#F0877E]/40",
    defaultIcon: AlertCircle,
  },
  info: {
    leftBorder: "border-l-[#1B4B82] dark:border-l-[#8DB6EC]",
    bgTint: "bg-card hover:bg-[#E6EEF8]/15 dark:hover:bg-[#13284A]/25",
    iconColor: "text-[#1B4B82] dark:text-[#8DB6EC]",
    badgeBg: "bg-[#E6EEF8] dark:bg-[#13284A]",
    badgeBorder: "border-[#1B4B82]/20 dark:border-[#8DB6EC]/25",
    badgeText: "text-[#1B4B82] dark:text-[#8DB6EC]",
    progressColor: "bg-[#1B4B82]/30 dark:bg-[#8DB6EC]/40",
    defaultIcon: Info,
  },
  hearing: {
    leftBorder: "border-l-sapphire-600 dark:border-l-sapphire-400",
    bgTint: "bg-card hover:bg-card/95 shadow-md",
    iconColor: "text-sapphire-600 dark:text-sapphire-300",
    badgeBg: "bg-sapphire-50 dark:bg-midnight-800",
    badgeBorder: "border-sapphire-200 dark:border-sapphire-600",
    badgeText: "text-sapphire-700 dark:text-sapphire-200",
    progressColor: "bg-sapphire-600/40 dark:bg-sapphire-400/50",
    defaultIcon: Gavel,
  },
  urgent: {
    leftBorder: "border-l-[#9A3412] dark:border-l-[#F5A97A]",
    bgTint: "bg-card hover:bg-[#FCE8E1]/15 dark:hover:bg-[#3D2113]/25 shadow-md",
    iconColor: "text-[#9A3412] dark:text-[#F5A97A]",
    badgeBg: "bg-[#FCE8E1] dark:bg-[#3D2113]",
    badgeBorder: "border-[#9A3412]/25 dark:border-[#F5A97A]/30",
    badgeText: "text-[#9A3412] dark:text-[#F5A97A]",
    progressColor: "bg-[#9A3412]/40 dark:bg-[#F5A97A]/50",
    defaultIcon: Flame,
  },
};

// ============================================================
// Toast Viewport
// ============================================================

export interface ToastViewportProps extends React.HTMLAttributes<HTMLOListElement> {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center";
}

const positionClasses: Record<NonNullable<ToastViewportProps["position"]>, string> = {
  "top-right": "top-4 right-4 sm:top-6 sm:right-6 items-end",
  "top-left": "top-4 left-4 sm:top-6 sm:left-6 items-start",
  "bottom-right": "bottom-4 right-4 sm:bottom-6 sm:right-6 items-end",
  "bottom-left": "bottom-4 left-4 sm:bottom-6 sm:left-6 items-start",
  "top-center": "top-4 left-1/2 -translate-x-1/2 sm:top-6 items-center",
};

export const ToastViewport = React.forwardRef<HTMLOListElement, ToastViewportProps>(
  ({ className, position = "top-right", ...props }, ref) => {
    return (
      <ol
        ref={ref}
        tabIndex={-1}
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "fixed z-[9999] flex max-h-screen w-full flex-col gap-2.5 p-4 sm:max-w-[420px] pointer-events-none focus:outline-none",
          positionClasses[position],
          className
        )}
        {...props}
      />
    );
  }
);
ToastViewport.displayName = "ToastViewport";

// ============================================================
// Toast Item Component
// ============================================================

export interface ToastProps
  extends Omit<HTMLMotionProps<"li">, "ref"> {
  toast: ToasterToast;
  onDismiss?: (id: string) => void;
}

export const Toast = React.forwardRef<HTMLLIElement, ToastProps>(
  ({ toast, onDismiss, className, ...props }, ref) => {
    const {
      id,
      title,
      description,
      variant = "default",
      action,
      caseNumber,
      court,
      icon: CustomIcon,
      duration = 5000,
      timestamp,
    } = toast;

    const [isPaused, setIsPaused] = React.useState(false);
    const [progress, setProgress] = React.useState(100);
    const style = variantStyles[variant] || variantStyles.default;
    const IconComponent = CustomIcon ? null : style.defaultIcon;

    // Countdown timer calculation with hover-pause
    React.useEffect(() => {
      if (!duration || duration <= 0) return;

      const startTime = Date.now();
      const endTime = startTime + duration;
      let remaining = duration;

      const interval = setInterval(() => {
        if (isPaused) return;

        remaining -= 50;
        const nextProgress = Math.max(0, (remaining / duration) * 100);
        setProgress(nextProgress);

        if (remaining <= 0) {
          clearInterval(interval);
          onDismiss?.(id);
        }
      }, 50);

      return () => clearInterval(interval);
    }, [id, duration, isPaused, onDismiss]);

    return (
      <motion.li
        ref={ref}
        layout
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, y: -15, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className={cn(
          // Base surface styling
          "group pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-lg backdrop-blur-md transition-all duration-200",
          // 3px Left Accent Border from DESIGN.md
          "border-l-[3px]",
          style.leftBorder,
          style.bgTint,
          className
        )}
        {...props}
      >
        {/* Inset top-sheen highlight (One light source, top-left rule) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10"
        />

        {/* Content Wrapper */}
        <div className="flex w-full items-start gap-3 p-3.5 sm:p-4">
          {/* Status Icon — animated with ScaleIn */}
          <ScaleIn
            duration={0.3}
            delay={0.05}
            viewport={{ once: true, margin: "0px" }}
            className="shrink-0"
          >
            <div
              className={cn(
                "mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-surface-1 dark:bg-surface-2 shadow-xs",
                style.iconColor
              )}
            >
              {CustomIcon ? (
                CustomIcon
              ) : IconComponent ? (
                <IconComponent className="h-4 w-4" aria-hidden="true" />
              ) : null}
            </div>
          </ScaleIn>

          {/* Core Body — animated with StaggerContainer and StaggerItem */}
          <StaggerContainer
            delay={0.05}
            viewport={{ once: true, margin: "0px" }}
            className="flex flex-1 flex-col gap-1 min-w-0"
          >
            {/* Header: Legal Metadata & Badges */}
            {(caseNumber || court || timestamp) && (
              <StaggerItem>
                <div className="flex flex-wrap items-center gap-1.5 pb-0.5 text-[11px]">
                  {caseNumber && (
                    <span
                      className={cn(
                        "inline-flex items-center font-mono font-semibold text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shadow-2xs tabular-nums",
                        style.badgeBg,
                        style.badgeBorder,
                        style.badgeText
                      )}
                    >
                      {caseNumber}
                    </span>
                  )}
                  {court && (
                    <span className="truncate font-medium text-muted-foreground text-[10.5px]">
                      {court}
                    </span>
                  )}
                  {timestamp && (
                    <span className="ml-auto text-[10px] text-muted-foreground/75 font-mono">
                      {timestamp}
                    </span>
                  )}
                </div>
              </StaggerItem>
            )}

            {/* Title */}
            {title && (
              <StaggerItem>
                <div className="text-sm font-semibold tracking-tight text-foreground leading-snug break-words">
                  {title}
                </div>
              </StaggerItem>
            )}

            {/* Description */}
            {description && (
              <StaggerItem>
                <div className="text-xs text-muted-foreground leading-relaxed break-words font-normal">
                  {description}
                </div>
              </StaggerItem>
            )}

            {/* Action Buttons */}
            {action && (
              <StaggerItem>
                <div className="pt-2 flex items-center gap-2">
                  {renderAction(action, () => onDismiss?.(id))}
                </div>
              </StaggerItem>
            )}
          </StaggerContainer>

          {/* Dismiss button — animated with FadeIn */}
          <FadeIn
            delay={0.15}
            duration={0.25}
            viewport={{ once: true, margin: "0px" }}
            className="shrink-0"
          >
            <button
              type="button"
              onClick={() => onDismiss?.(id)}
              aria-label="Close notification"
              className="-mr-1 -mt-1 p-1 rounded-md text-muted-foreground/60 transition-colors hover:text-foreground hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </FadeIn>
        </div>

        {/* Progress Bar (countdown until auto-dismiss) */}
        {duration > 0 && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 inset-x-0 h-[2px] bg-border/40"
          >
            <div
              className={cn("h-full transition-[width] ease-linear", style.progressColor)}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </motion.li>
    );
  }
);
Toast.displayName = "Toast";

// Helper to render action buttons cleanly
function renderAction(
  action: ToastActionElement | React.ReactNode,
  closeToast: () => void
): React.ReactNode {
  if (React.isValidElement(action)) {
    return action;
  }

  const actionObj = action as ToastActionElement;
  if (!actionObj?.label) return null;

  const handleClick = async () => {
    try {
      await actionObj.onClick();
    } finally {
      closeToast();
    }
  };

  const variantClass =
    actionObj.variant === "gold"
      ? "bg-gold-500 hover:bg-gold-600 text-midnight-950 font-semibold shadow-xs"
      : actionObj.variant === "secondary"
      ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
      : actionObj.variant === "outline"
      ? "border border-border text-foreground hover:bg-accent/40"
      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={actionObj.altText || actionObj.label}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-xs px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variantClass
      )}
    >
      {actionObj.label}
    </button>
  );
}

// ============================================================
// Composability Subcomponents (Shadcn UI Toast API compatibility)
// ============================================================

export function ToastTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("text-sm font-semibold tracking-tight text-foreground", className)}
      {...props}
    >
      {children}
    </h5>
  );
}

export function ToastDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xs text-muted-foreground leading-relaxed", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function ToastAction({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-md text-xs px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ToastClose({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
      {...props}
    >
      <X className="h-4 w-4" />
    </button>
  );
}

// Re-export motion components for custom toast compositions
export {
  FadeIn,
  FadeInUp,
  FadeInRight,
  FadeInLeft,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
} from "@/components/wrappers/Motion";
