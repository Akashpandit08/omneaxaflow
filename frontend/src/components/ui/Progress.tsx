import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;    // 0–100
  max?: number;
  size?: "xs" | "sm" | "md";
  color?: "brand" | "green" | "yellow" | "red";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const sizeMap = { xs: "h-1", sm: "h-1.5", md: "h-2.5" };
const colorMap = {
  brand:  "from-brand-600 to-brand-400",
  green:  "from-accent-green to-emerald-400",
  yellow: "from-yellow-600 to-yellow-400",
  red:    "from-red-600 to-red-400",
};

export function Progress({
  value,
  max = 100,
  size = "sm",
  color = "brand",
  showLabel,
  label,
  className,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || showLabel) && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          {label && <span>{label}</span>}
          {showLabel && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={cn("progress-track", sizeMap[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn("progress-bar bg-gradient-to-r", colorMap[color])}
          style={{ width: `${pct}%`, height: "100%" }}
        />
      </div>
    </div>
  );
}
