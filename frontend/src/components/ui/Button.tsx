import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
type Size    = "xs" | "sm" | "md" | "lg" | "xl" | "icon";

const variantClasses: Record<Variant, string> = {
  primary:   "btn-primary",
  secondary: "btn-secondary",
  ghost:     "btn-ghost",
  danger:    "btn-danger",
  success:   "btn-success",
  outline:   "btn-outline",
};

const sizeClasses: Record<Size, string> = {
  xs:   "btn-xs",
  sm:   "btn-sm",
  md:   "btn-md",
  lg:   "btn-lg",
  xl:   "btn-xl",
  icon: "btn-icon",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = "primary",
      size      = "md",
      loading   = false,
      leftIcon,
      rightIcon,
      fullWidth,
      disabled,
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" aria-hidden />
        ) : leftIcon ? (
          <span className="flex-shrink-0" aria-hidden>{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon && (
          <span className="flex-shrink-0" aria-hidden>{rightIcon}</span>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

/** LinkButton — renders an <a> tag with button styles. Use instead of asChild. */
export interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?:   Variant;
  size?:      Size;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ variant = "primary", size = "md", leftIcon, rightIcon, fullWidth, className, children, ...props }, ref) => (
    <a
      ref={ref}
      className={cn(variantClasses[variant], sizeClasses[size], fullWidth && "w-full", className)}
      {...props}
    >
      {leftIcon  && <span className="flex-shrink-0" aria-hidden>{leftIcon}</span>}
      {children}
      {rightIcon && <span className="flex-shrink-0" aria-hidden>{rightIcon}</span>}
    </a>
  )
);
LinkButton.displayName = "LinkButton";
