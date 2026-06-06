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
    <div className={`flex items-center justify-between px-4 py-3 border-b border-stone-100 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-base leading-none">{icon}</span>}
        <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onClose && (
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors text-sm leading-none"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
