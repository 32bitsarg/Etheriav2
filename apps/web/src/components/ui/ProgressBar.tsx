interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  color?: "gold" | "green" | "red" | "blue";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const colorMap = {
  gold: "from-amber-600 to-amber-400",
  green: "from-emerald-600 to-emerald-400",
  red: "from-red-600 to-red-400",
  blue: "from-blue-600 to-blue-400",
};

const sizeMap = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function ProgressBar({ value, max, className = "", color = "gold", showLabel = false, size = "md" }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${sizeMap[size]} bg-etheria-bg-light rounded-full overflow-hidden border border-etheria-border/50`}>
        <div
          className={`h-full bg-gradient-to-r ${colorMap[color]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-etheria-text-dim">{value.toLocaleString()}</span>
          <span className="text-[10px] text-etheria-text-dim">{max.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
