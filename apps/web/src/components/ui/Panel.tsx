import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "parchment" | "wood";
  animation?: "slide-left" | "slide-right" | "slide-up" | "slide-down" | "fade" | "none";
}

const variantStyles = {
  default: "bg-gradient-to-b from-etheria-panel to-etheria-panel-light border border-etheria-border shadow-[0_4px_24px_rgba(0,0,0,0.6),0_0_0_1px_rgba(146,112,47,0.15)]",
  parchment: "bg-gradient-to-b from-etheria-parchment to-etheria-parchment-light border border-etheria-parchment-border shadow-[0_4px_24px_rgba(0,0,0,0.6)]",
  wood: "bg-gradient-to-b from-etheria-wood-panel to-etheria-panel border border-etheria-border-gold shadow-[0_4px_24px_rgba(0,0,0,0.6)]",
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
    <div className={`rounded-lg ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}>
      {children}
    </div>
  );
}
