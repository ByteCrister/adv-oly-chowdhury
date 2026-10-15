"use client";

import * as React from "react";

// ============================================================
// Toast Types & Constants tailored for Advocate Oly Chowdhury
// Legal Practice & Case Management Dashboard
// ============================================================

export type ToastVariant =
  | "default"
  | "gold"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "hearing"
  | "urgent";

export interface ToastActionElement {
  label: string;
  onClick: () => void | Promise<void>;
  altText?: string;
  variant?: "primary" | "secondary" | "outline" | "gold";
}

export interface ToastData {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  action?: ToastActionElement | React.ReactNode;
  /** Case reference number for Case Management Dashboard (e.g. "WP 1042/2026", "Crl. Misc. 402/2025") */
  caseNumber?: string;
  /** Court or Jurisdiction (e.g. "High Court Division", "Chamber Court", "District Court") */
  court?: string;
  /** Optional custom icon override */
  icon?: React.ReactNode;
  /** Auto-dismiss duration in ms (default 5000, 0 or null for persistent) */
  duration?: number;
  /** Timestamp display (defaults to formatted current time) */
  timestamp?: string;
  /** Dismiss callback */
  onDismiss?: () => void;
}

export type ToasterToast = ToastData & {
  open: boolean;
};

const TOAST_LIMIT = 4;
const TOAST_REMOVE_DELAY = 1000;

type ActionType =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: ActionType): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: ActionType) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type ToastProps = Omit<ToastData, "id"> & { id?: string };

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return `toast-${count}-${Date.now().toString(36)}`;
}

function formatCurrentTime(): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date());
  } catch {
    return "";
  }
}

/**
 * Main imperative toast dispatch function
 */
export function toast(props: ToastProps | string) {
  const normalizedProps: ToastProps =
    typeof props === "string" ? { title: props } : props;

  const id = normalizedProps.id || genId();

  const update = (updatedProps: Partial<ToastData>) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...updatedProps, id },
    });

  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      duration: 5000,
      variant: "default",
      timestamp: formatCurrentTime(),
      ...normalizedProps,
      id,
      open: true,
      onDismiss: () => {
        normalizedProps.onDismiss?.();
        dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

// ── Specialized Legal & Case Dashboard Helpers ──────────────

toast.success = (
  title: React.ReactNode,
  options?: Omit<ToastProps, "title" | "variant">
) => toast({ ...options, title, variant: "success" });

toast.error = (
  title: React.ReactNode,
  options?: Omit<ToastProps, "title" | "variant">
) => toast({ ...options, title, variant: "destructive" });

toast.warning = (
  title: React.ReactNode,
  options?: Omit<ToastProps, "title" | "variant">
) => toast({ ...options, title, variant: "warning" });

toast.info = (
  title: React.ReactNode,
  options?: Omit<ToastProps, "title" | "variant">
) => toast({ ...options, title, variant: "info" });

toast.gold = (
  title: React.ReactNode,
  options?: Omit<ToastProps, "title" | "variant">
) => toast({ ...options, title, variant: "gold" });

toast.hearing = (
  title: React.ReactNode,
  options?: Omit<ToastProps, "title" | "variant">
) =>
  toast({
    duration: 7000,
    ...options,
    title,
    variant: "hearing",
  });

toast.urgent = (
  title: React.ReactNode,
  options?: Omit<ToastProps, "title" | "variant">
) =>
  toast({
    duration: 8000,
    ...options,
    title,
    variant: "urgent",
  });

toast.dismiss = (toastId?: string) => {
  dispatch({ type: "DISMISS_TOAST", toastId });
};

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}
