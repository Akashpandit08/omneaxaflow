"use client";

/**
 * Toast system built on react-hot-toast with custom styled notifications.
 * Usage:
 *   import { toast } from "@/components/ui/Toast"
 *   toast.success("Saved!")
 *   toast.error("Something went wrong")
 *   toast.loading("Rendering…")
 *   toast.promise(promise, { loading, success, error })
 */

import {
  toast as hotToast,
  Toaster as HotToaster,
  type ToastOptions,
} from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Custom toast renderer ────────────────────────────────────────────────────
function ToastBody({
  message,
  type,
}: {
  message: string;
  type: "success" | "error" | "warning" | "info" | "loading";
}) {
  const config = {
    success: {
      icon: <CheckCircle className="w-4 h-4 text-accent-green flex-shrink-0" />,
      bar:  "bg-accent-green",
    },
    error: {
      icon: <XCircle className="w-4 h-4 text-accent-red flex-shrink-0" />,
      bar:  "bg-accent-red",
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4 text-accent-orange flex-shrink-0" />,
      bar:  "bg-accent-orange",
    },
    info: {
      icon: <Info className="w-4 h-4 text-brand-400 flex-shrink-0" />,
      bar:  "bg-brand-500",
    },
    loading: {
      icon: <Loader2 className="w-4 h-4 text-brand-400 flex-shrink-0 animate-spin" />,
      bar:  "bg-brand-500",
    },
  }[type];

  return (
    <div className="flex items-start gap-3 min-w-[240px] max-w-[360px]">
      {config.icon}
      <p className="text-sm text-slate-200 leading-relaxed">{message}</p>
    </div>
  );
}

// ─── Toaster provider ─────────────────────────────────────────────────────────
export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1a2235",
          border:     "1px solid #1e2d45",
          borderRadius: "12px",
          color:      "#f1f5f9",
          padding:    "12px 16px",
          boxShadow:  "0 8px 32px rgba(0,0,0,0.5)",
          maxWidth:   "400px",
        },
      }}
    />
  );
}

// ─── Typed helpers ────────────────────────────────────────────────────────────
const defaultOpts: ToastOptions = { duration: 4000 };

export const toast = {
  success: (message: string, opts?: ToastOptions) =>
    hotToast.custom(
      () => <ToastBody message={message} type="success" />,
      { ...defaultOpts, ...opts }
    ),

  error: (message: string, opts?: ToastOptions) =>
    hotToast.custom(
      () => <ToastBody message={message} type="error" />,
      { ...defaultOpts, duration: 5000, ...opts }
    ),

  warning: (message: string, opts?: ToastOptions) =>
    hotToast.custom(
      () => <ToastBody message={message} type="warning" />,
      { ...defaultOpts, ...opts }
    ),

  info: (message: string, opts?: ToastOptions) =>
    hotToast.custom(
      () => <ToastBody message={message} type="info" />,
      { ...defaultOpts, ...opts }
    ),

  loading: (message: string, opts?: ToastOptions) =>
    hotToast.custom(
      () => <ToastBody message={message} type="loading" />,
      { duration: Infinity, ...opts }
    ),

  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
    opts?: ToastOptions
  ) =>
    hotToast.promise(promise, messages, {
      style: {
        background: "#1a2235",
        border:     "1px solid #1e2d45",
        borderRadius: "12px",
        color:      "#f1f5f9",
        padding:    "12px 16px",
      },
      ...opts,
    }),

  dismiss: hotToast.dismiss,
};
