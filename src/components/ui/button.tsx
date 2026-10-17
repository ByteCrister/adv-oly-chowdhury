import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "gold";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const variantStyles = {
      default:
        "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
      destructive:
        "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
      outline:
        "border border-border/80 dark:border-white/10 bg-transparent hover:bg-muted/80 text-foreground",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost:
        "hover:bg-muted hover:text-foreground",
      link:
        "text-gold-600 dark:text-gold-400 underline-offset-4 hover:underline p-0 h-auto",
      gold:
        "btn-gold-gloss text-midnight-950 font-semibold shadow-sm",
    };

    const sizeStyles = {
      default: "h-9 px-4 py-2 text-xs rounded-xl",
      sm: "h-8 rounded-lg px-3 text-[11px]",
      lg: "h-11 rounded-xl px-6 text-sm",
      icon: "h-9 w-9 rounded-xl",
    };

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/40 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
