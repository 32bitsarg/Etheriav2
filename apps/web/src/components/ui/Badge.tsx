interface BadgeProps {
  children: React.ReactNode;
  variant?: "gold" | "red" | "green" | "blue" | "gray";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const variantStyles = {
  gold: "bg-amber-100 text-amber-700 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
  green: "bg-emerald-100 text-emerald-700 border-emerald-200",
  blue: "bg-sky-100 text-sky-700 border-sky-200",
  gray: "bg-stone-100 text-stone-600 border-stone-200",
};

const sizeStyles = {
  sm: "text-[9px] px-1.5 py-0.5",
  md: "text-[10px] px-2 py-0.5",
  lg: "text-xs px-2.5 py-1",
};

export function Badge({ children, variant = "gray", size = "md", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-semibold rounded-md border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
}
