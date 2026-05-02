interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "red" | "green" | "blue" | "gray";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const variantStyles = {
  gold: "bg-amber-900/40 text-amber-400 border-amber-700/50",
  red: "bg-red-900/40 text-red-400 border-red-700/50",
  green: "bg-emerald-900/40 text-emerald-400 border-emerald-700/50",
  blue: "bg-blue-900/40 text-blue-400 border-blue-700/50",
  gray: "bg-slate-800/50 text-slate-400 border-slate-700/50",
};

const sizeStyles = {
  sm: "text-[9px] px-1.5 py-0.5",
  md: "text-[10px] px-2 py-0.5",
  lg: "text-xs px-2.5 py-1",
};

export function Badge({ children, variant = "gray", size = "md", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-bold uppercase tracking-wider rounded border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}
