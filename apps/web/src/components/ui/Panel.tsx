import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "parchment" | "wood";
  animation?: "slide-left" | "slide-right" | "slide-up" | "slide-down" | "fade" | "none";
}

const variantStyles = {
  default: "bg-white border border-stone-200 shadow-[0_4px_24px_rgba(0,0,0,0.08)]",
  parchment: "bg-[#fdf7ee] border border-[#e7e5e4] shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
  wood: "bg-white border border-stone-200 shadow-[0_4px_24px_rgba(0,0,0,0.08)]",
};

const animationStyles = {
  "slide-left": "animate-slide-in-left",
  "slide-right": "animate-slide-in-right",
  "slide-up": "animate-slide-in-up",
  "slide-down": "animate-slide-in-down",
  fade: "animate-fade-in",
  none: "",
};

export function Panel({ children, className = "", variant = "default", animation = "fade" }: PanelProps) {
  return (
    <div className={`rounded-2xl ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}>
      {children}
    </div>
  );
}
