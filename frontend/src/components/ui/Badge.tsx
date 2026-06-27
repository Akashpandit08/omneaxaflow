import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "brand" | "green" | "yellow" | "red" | "purple" | "slate" | "cyan";

const variants: Record<BadgeVariant, string> = {
  brand:  "badge-brand",
  green:  "badge-green",
  yellow: "badge-yellow",
  red:    "badge-red",
  purple: "badge-purple",
  slate:  "badge-slate",
  cyan:   "badge-cyan",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({ variant = "slate", dot, className, children, ...props }: BadgeProps) {
  const dotColors: Record<BadgeVariant, string> = {
    brand:  "bg-brand-400",
    green:  "bg-accent-green",
    yellow: "bg-accent-orange",
    red:    "bg-accent-red",
    purple: "bg-accent-purple",
    slate:  "bg-slate-400",
    cyan:   "bg-accent-cyan",
  };

  return (
    <span className={cn(variants[variant], className)} {...props}>
      {dot && (
        <span className={cn("status-dot", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

// ─── Status badge with automatic coloring ────────────────────────────────────
const statusMap: Record<string, BadgeVariant> = {
  draft:      "slate",
  rendering:  "yellow",
  processing: "yellow",
  queued:     "brand",
  completed:  "green",
  failed:     "red",
  active:     "green",
  canceled:   "red",
  past_due:   "yellow",
  trialing:   "cyan",
  free:       "slate",
  pro:        "brand",
  enterprise: "purple",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = statusMap[status] ?? "slate";
  return (
    <Badge variant={variant} dot>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
