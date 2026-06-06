"use client";

import { type ReactNode, useEffect, useRef } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Tailwind gradient classes, e.g. "from-violet-600 to-purple-600" */
  headerGradient?: string;
  headerIcon?: string;
  size?: "xs" | "sm" | "md" | "lg";
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  /** Extra classes applied to the content scroll area */
  contentClass?: string;
}

const SIZE_CLASSES = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  headerGradient = "from-stone-700 to-stone-800",
  headerIcon,
  size = "sm",
  children,
  footer,
  closeOnBackdrop = true,
  contentClass = "",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={dialogRef}
        className={`
          relative w-full ${SIZE_CLASSES[size]}
          bg-white rounded-t-3xl sm:rounded-3xl
          shadow-2xl shadow-black/40
          flex flex-col
          max-h-[92dvh] sm:max-h-[88dvh]
          overflow-hidden
          animate-modal-in
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || headerIcon) && (
          <div className={`flex-shrink-0 px-5 py-4 bg-gradient-to-r ${headerGradient} flex items-start justify-between gap-3`}>
            <div className="min-w-0">
              {title && (
                <h2 className="font-bold text-white text-base leading-snug flex items-center gap-2">
                  {headerIcon && <span className="text-xl">{headerIcon}</span>}
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-white/70 text-xs mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center text-white/90 text-sm font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content — scrollable */}
        <div className={`flex-1 overflow-y-auto overscroll-contain ${contentClass}`}>
          {children}
        </div>

        {/* Footer — sticky at bottom */}
        {footer && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-stone-100 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
