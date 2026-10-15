"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { useToast } from "./use-toast";
import { Toast, ToastViewport, type ToastViewportProps } from "./toast";

export interface ToasterProps {
  position?: ToastViewportProps["position"];
  className?: string;
}

/**
 * Global Toaster component for mounting in root layout or dashboard layout.
 * Listens to useToast events and renders animated toast notifications.
 */
export function Toaster({ position = "top-right", className }: ToasterProps) {
  const { toasts, dismiss } = useToast();

  return (
    <ToastViewport position={position} className={className}>
      <AnimatePresence mode="popLayout">
        {toasts
          .filter((t) => t.open)
          .map((t) => (
            <Toast key={t.id} toast={t} onDismiss={dismiss} />
          ))}
      </AnimatePresence>
    </ToastViewport>
  );
}
