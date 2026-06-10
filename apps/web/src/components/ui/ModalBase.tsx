"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { useIsMobile } from "@/hooks/useIsMobile";

type ModalSize = "xs" | "sm" | "md" | "lg" | "xl" | "3xl" | "5xl" | "full";
type ModalVariant = "desktop" | "mobile";

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Visual theme. Defaults to auto: bottom sheet on mobile, centered on desktop */
  variant?: ModalVariant;
  /** Max-width on desktop */
  size?: ModalSize;
  /** Optional header title */
  title?: string;
  /** Optional header subtitle */
  subtitle?: string;
  /** Header gradient class, default: from-stone-800 to-stone-900 */
  headerGradient?: string;
  /** Header icon (emoji or element) */
  headerIcon?: ReactNode;
  /** Content class for custom padding / overflow */
  contentClass?: string;
  /** Close on backdrop click (default true) */
  closeOnBackdrop?: boolean;
  /** z-index override (default z-50) */
  zIndex?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
  full: "max-w-[calc(100vw-32px)]",
};

const MAX_HEIGHTS: Record<ModalSize, string> = {
  xs: "75dvh",
  sm: "82dvh",
  md: "85dvh",
  lg: "88dvh",
  xl: "90dvh",
  "3xl": "90dvh",
  "5xl": "90dvh",
  full: "94dvh",
};

export function ModalBase({
  isOpen,
  onClose,
  children,
  variant,
  size = "sm",
  title,
  subtitle,
  headerGradient = "from-stone-800 to-stone-900",
  headerIcon,
  contentClass = "",
  closeOnBackdrop = true,
  zIndex = "z-50",
}: ModalBaseProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const resolvedVariant: ModalVariant = variant ?? (isMobile ? "mobile" : "desktop");

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Mobile: bottom sheet ──
  if (resolvedVariant === "mobile") {
    return (
      <div
        className={`fixed inset-0 ${zIndex}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          onClick={closeOnBackdrop ? onClose : undefined}
        />

        {/* Sheet */}
        <div
          ref={ref}
          className={`absolute inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t border-white/10 bg-[#0b1111] shadow-[0_-8px_60px_rgba(0,0,0,0.6)] flex flex-col animate-slide-in-up`}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle pill */}
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          {(title || headerIcon) && (
            <div
              className={`shrink-0 px-5 py-3 bg-gradient-to-r ${headerGradient} flex items-center gap-3`}
            >
              {headerIcon && (
                <span className="text-lg">{headerIcon}</span>
              )}
              <div className="min-w-0 flex-1">
                {title && (
                  <h2 className="font-bold text-white text-base leading-snug">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-white/70 text-[11px] mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 min-h-[44px] min-w-[44px] rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white/90 text-sm font-bold transition-colors"
                aria-label={t("gallery.close")}
              >
                ✕
              </button>
            </div>
          )}

          {/* No header — just close button */}
          {!title && !headerIcon && (
            <div className="shrink-0 flex items-center justify-end px-3 py-2">
              <button
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors text-sm"
                aria-label={t("gallery.close")}
              >
                ✕
              </button>
            </div>
          )}

          {/* Content */}
          <div
            className={`flex-1 overflow-y-auto overscroll-contain px-5 py-4 ${contentClass}`}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop: centered modal ──
  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4`}
      role="dialog"
      aria-modal="true"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={ref}
        className={`relative w-full ${SIZE_CLASSES[size]} shadow-[0_28px_90px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden animate-modal-in`}
        style={{
          background: "rgb(11, 17, 17)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "var(--modal-radius, 20px)",
          maxHeight: MAX_HEIGHTS[size],
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || headerIcon) && (
          <div
            className={`shrink-0 px-5 py-4 bg-gradient-to-r ${headerGradient} flex items-start justify-between gap-3`}
          >
            <div className="min-w-0">
              {title && (
                <h2 className="font-bold text-white text-base leading-snug flex items-center gap-2">
                  {headerIcon && (
                    <span className="text-lg">{headerIcon}</span>
                  )}
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-white/70 text-[11px] mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 min-h-[44px] min-w-[44px] rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white/90 text-sm font-bold transition-colors"
              aria-label={t("gallery.close")}
            >
              ✕
            </button>
          </div>
        )}

        {/* No header — just close */}
        {!title && !headerIcon && (
          <div className="shrink-0 flex items-center justify-end px-3 py-2 bg-[#0b1111]">
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-full hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors text-sm"
              aria-label={t("gallery.close")}
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className={`flex-1 overflow-y-auto overscroll-contain px-5 py-4 bg-[#0b1111] ${contentClass}`}
        >
          {children}
        </div>

        {/* Footer slot — children can include a footer div */}
      </div>
    </div>
  );
}
