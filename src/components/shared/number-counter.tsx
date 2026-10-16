"use client";

import * as React from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export interface NumberCounterProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * The target number to count to.
   */
  value: number;
  /**
   * Starting number for the count. Defaults to 0.
   */
  from?: number;
  /**
   * Animation delay in seconds before counting starts. Defaults to 0.
   */
  delay?: number;
  /**
   * Direction of the counter: "up" (counts from -> value) or "down" (counts value -> 0).
   * Defaults to "up".
   */
  direction?: "up" | "down";
  /**
   * Number of decimal places to display. Defaults to 0.
   */
  decimalPlaces?: number;
  /**
   * Optional string prefix (e.g. "$", "৳", "+").
   */
  prefix?: string;
  /**
   * Optional string suffix (e.g. "+", "%", " M").
   */
  suffix?: string;
  /**
   * Locale string for number formatting (e.g. "en-US", "bn-BD").
   */
  locale?: string;
  /**
   * Damping strength for the spring physics. Higher values reduce bounce. Defaults to 45.
   */
  damping?: number;
  /**
   * Stiffness for the spring physics. Higher values make it faster. Defaults to 100.
   */
  stiffness?: number;
  /**
   * Custom value formatter function if special formatting is required.
   */
  formatter?: (val: number) => string;
}

export function NumberCounter({
  value,
  from = 0,
  direction = "up",
  delay = 0,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  locale = "en-US",
  damping = 45,
  stiffness = 100,
  formatter,
  className,
  ...props
}: NumberCounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);

  const startValue = direction === "down" ? value : from;
  const targetValue = direction === "down" ? from : value;

  const motionValue = useMotionValue(startValue);
  const springValue = useSpring(motionValue, {
    damping,
    stiffness,
  });

  const isInView = useInView(ref, { once: true, margin: "0px" });

  const formatNumber = React.useCallback(
    (val: number): string => {
      if (formatter) {
        return formatter(val);
      }
      const formattedNumber = Intl.NumberFormat(locale, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(val.toFixed(decimalPlaces)));

      return `${prefix}${formattedNumber}${suffix}`;
    },
    [decimalPlaces, formatter, locale, prefix, suffix]
  );

  React.useEffect(() => {
    if (!isInView) return;

    // Check for prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      if (ref.current) {
        ref.current.textContent = formatNumber(targetValue);
      }
      return;
    }

    const timer = setTimeout(() => {
      motionValue.set(targetValue);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [delay, formatNumber, isInView, motionValue, targetValue]);

  React.useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatNumber(latest);
      }
    });

    return () => unsubscribe();
  }, [formatNumber, springValue]);

  // Initial SSR / pre-animation display value
  const initialDisplay = formatNumber(startValue);
  const finalDisplay = formatNumber(targetValue);

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block tabular-nums tracking-tight font-sans select-none",
        className
      )}
      aria-label={finalDisplay}
      {...props}
    >
      {initialDisplay}
    </span>
  );
}

// Aliases for compatibility with different naming conventions
export const NumberTicker = NumberCounter;
export const AnimatedCounter = NumberCounter;

export default NumberCounter;
