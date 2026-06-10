"use client";

import { useToastStore, type ToastIcon, type ToastType } from "@/stores/toastStore";

const accentColors: Record<ToastType, string> = {
  success: "#10b981",
  error:   "#ef4444",
  info:    "#0ea5e9",
  warning: "#f59e0b",
};

const bgColors: Record<ToastType, string> = {
  success: "bg-emerald-50 border-emerald-200",
  error:   "bg-red-50 border-red-200",
  info:    "bg-sky-50 border-sky-200",
  warning: "bg-amber-50 border-amber-200",
};

const titleColors: Record<ToastType, string> = {
  success: "text-emerald-800",
  error:   "text-red-800",
  info:    "text-sky-800",
  warning: "text-amber-800",
};

const messageColors: Record<ToastType, string> = {
  success: "text-emerald-700",
  error:   "text-red-700",
  info:    "text-sky-700",
  warning: "text-amber-700",
};

const fallbackIcons: Record<ToastType, ToastIcon> = {
  success: "quest",
  error:   "battle",
  info:    "report",
  warning: "barbarian",
};

const iconPaths: Record<ToastIcon, string> = {
  mail:      "/assets/ui/notifications/mail.png",
  report:    "/assets/ui/notifications/report.png",
  battle:    "/assets/ui/notifications/battle.png",
  barbarian: "/assets/ui/notifications/barbarian.png",
  alliance:  "/assets/ui/notifications/alliance.png",
  market:    "/assets/ui/notifications/market.png",
  quest:     "/assets/ui/notifications/quest.png",
  spy:       "/assets/ui/notifications/spy.png",
  season:    "/assets/ui/notifications/season.png",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-20 max-md:bottom-[6.5rem] right-4 z-[80] flex w-[min(92vw,22rem)] flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => {
        const icon = iconPaths[toast.icon ?? fallbackIcons[toast.type]];
        const accent = accentColors[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-toast-in overflow-hidden rounded-2xl border shadow-lg shadow-stone-900/8 backdrop-blur-xl ${bgColors[toast.type]}`}
          >
            {/* Colored top accent bar */}
            <div className="h-0.5" style={{ background: accent }} />

            <div className="flex items-start gap-3 p-3.5">
              {/* Icon */}
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                style={{ background: accent + "1a" }}
              >
                <img src={icon} alt="" className="h-8 w-8 object-contain" draggable={false} />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-semibold leading-snug ${titleColors[toast.type]}`}>
                  {toast.title}
                </p>
                {toast.message && (
                  <p className={`mt-0.5 line-clamp-3 text-[12px] leading-relaxed ${messageColors[toast.type]}`}>
                    {toast.message}
                  </p>
                )}
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded-md p-1 text-stone-400 hover:text-stone-700 hover:bg-white/60 transition-colors"
                aria-label="Cerrar"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
