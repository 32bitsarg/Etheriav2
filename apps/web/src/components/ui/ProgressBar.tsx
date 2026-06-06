interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  color?: "gold" | "green" | "red" | "blue";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const colorMap = {
  gold: "from-amber-500 to-amber-400",
  green: "from-emerald-500 to-emerald-400",
  red: "from-red-500 to-red-400",
  blue: "from-sky-500 to-sky-400",
};

const sizeMap = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

export function ProgressBar({ value, max, className = "", color = "gold", showLabel = false, size = "md" }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${sizeMap[size]} bg-stone-100 rounded-full overflow-hidden`}>
        <div
          className={`h-full bg-gradient-to-r ${colorMap[color]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-stone-400">{value.toLocaleString()}</span>
          <span className="text-[10px] text-stone-400">{max.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
