import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Spinner ──────────────────────────────────────────────────────────────────
export interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const spinnerSizes = {
  xs: "w-3 h-3 border",
  sm: "w-4 h-4 border",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-2",
  xl: "w-12 h-12 border-[3px]",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "rounded-full border-brand-600/30 border-t-brand-500 animate-spin",
        spinnerSizes[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

// ─── Full-page loader ─────────────────────────────────────────────────────────
export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-slate-500 animate-pulse">{message}</p>
    </div>
  );
}

// ─── Inline content loader ────────────────────────────────────────────────────
export function ContentLoader({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-4 rounded" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("card space-y-4", className)} aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 rounded w-3/4" />
          <div className="skeleton h-3 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="skeleton h-3 rounded w-full" />
        <div className="skeleton h-3 rounded w-5/6" />
        <div className="skeleton h-3 rounded w-4/6" />
      </div>
    </div>
  );
}

// ─── Skeleton table row ───────────────────────────────────────────────────────
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-surface-border/50" aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Overlay loader ───────────────────────────────────────────────────────────
export function OverlayLoader({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface/80 backdrop-blur-sm rounded-2xl">
      <Spinner size="lg" />
      {message && <p className="text-sm text-slate-400">{message}</p>}
    </div>
  );
}

// ─── Dots loader ─────────────────────────────────────────────────────────────
export function DotsLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)} aria-label="Loading" role="status">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-brand-500"
          style={{ animation: `bounceSoft 1.5s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}
