"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export interface MotionWrapperProps {
  children?: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  viewport?: { once?: boolean; margin?: string; amount?: number | "some" | "all" };
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  viewport = { once: true, margin: "-50px" },
}: MotionWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={viewport}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeInUp({
  children,
  className,
  delay = 0,
  duration = 0.5,
  viewport = { once: true, margin: "-50px" },
}: MotionWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeInRight({
  children,
  className,
  delay = 0,
  duration = 0.5,
  viewport = { once: true, margin: "-50px" },
}: MotionWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={viewport}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function FadeInLeft({
  children,
  className,
  delay = 0,
  duration = 0.5,
  viewport = { once: true, margin: "-50px" },
}: MotionWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={viewport}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
  viewport = { once: true, margin: "-50px" },
}: MotionWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={viewport}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Container for staggered children animations
export function StaggerContainer({
  children,
  className,
  delay = 0,
  viewport = { once: true, margin: "-50px" },
}: MotionWrapperProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.1,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Item to be used strictly inside StaggerContainer
export function StaggerItem({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
