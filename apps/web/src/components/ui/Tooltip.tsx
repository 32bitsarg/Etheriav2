"use client";

import type { ReactNode } from "react";
import { useState, useRef, useEffect } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
}

export function Tooltip({ content, children, position = "top", delay = 200, className = "" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} ${className}`}
        >
          <div className="bg-etheria-panel border border-etheria-border rounded-lg shadow-xl px-3 py-2 text-xs text-etheria-text max-w-[240px] whitespace-normal">
            {content}
            <div
              className={`absolute w-2 h-2 bg-etheria-panel border-r border-b border-etheria-border rotate-45 ${
                position === "top" ? "bottom-[-5px] left-1/2 -translate-x-1/2 border-l-0 border-t-0" :
                position === "bottom" ? "top-[-5px] left-1/2 -translate-x-1/2 border-r-0 border-b-0" :
                position === "left" ? "right-[-5px] top-1/2 -translate-y-1/2 border-l-0 border-t-0" :
                "left-[-5px] top-1/2 -translate-y-1/2 border-r-0 border-b-0"
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
