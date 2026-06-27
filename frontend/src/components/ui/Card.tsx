import * as React from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "hover" | "glass" | "elevated" | "gradient";

const variantClasses: Record<CardVariant, string> = {
  default:  "card",
  hover:    "card-hover cursor-pointer",
  glass:    "card-glass",
  elevated: "card bg-surface-elevated",
  gradient: "card bg-gradient-card",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  noPadding?: boolean;
}

export function Card({
  variant = "default",
  noPadding,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        variantClasses[variant],
        noPadding && "!p-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-semibold text-white text-base", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-slate-400", className)} {...props}>
      {children}
    </p>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 pt-4 mt-4 border-t border-surface-border", className)}
      {...props}
    >
      {children}
    </div>
  );
}
