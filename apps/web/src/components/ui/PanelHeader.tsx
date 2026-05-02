import type { ReactNode } from "react";

interface PanelHeaderProps {
  title: string;
  icon?: string;
  onClose?: () => void;
  className?: string;
  children?: ReactNode;
}

export function PanelHeader({ title, icon, onClose, className = "", children }: PanelHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-b border-etheria-border ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-base">{icon}</span>}
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-etheria-gold">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onClose && (
          <button
            onClick={onClose}
            className="text-etheria-text-dim hover:text-etheria-text transition-colors text-sm leading-none"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
