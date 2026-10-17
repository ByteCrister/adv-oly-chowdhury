import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "gold"
    | "emerald"
    | "amber"
    | "sapphire";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default:
      "bg-primary text-primary-foreground border-transparent shadow-sm",
    secondary:
      "bg-secondary text-secondary-foreground border-transparent",
    destructive:
      "bg-destructive/15 text-destructive border-destructive/25 dark:border-destructive/30",
    outline:
      "text-foreground border-border/70 dark:border-white/10",
    gold:
      "bg-gold-500/10 text-gold-600 dark:text-gold-400 border-gold-500/25 dark:border-gold-500/30",
    emerald:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 dark:border-emerald-500/30",
    amber:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 dark:border-amber-500/30",
    sapphire:
      "bg-sapphire-500/10 text-sapphire-600 dark:text-sapphire-300 border-sapphire-500/25 dark:border-sapphire-400/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
