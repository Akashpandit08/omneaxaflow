import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-4", className)}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-surface-border flex items-center justify-center mb-5 text-slate-500">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-white text-base mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed mb-6">{description}</p>
      )}
      {action}
    </div>
  );
}
