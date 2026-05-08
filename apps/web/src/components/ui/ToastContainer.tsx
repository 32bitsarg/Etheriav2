"use client";

import { useToastStore, type ToastIcon, type ToastType } from "@/stores/toastStore";

const typeStyles: Record<ToastType, string> = {
  success: "border-emerald-500/55 shadow-emerald-950/30",
  error: "border-red-500/65 shadow-red-950/40",
  info: "border-sky-500/50 shadow-sky-950/30",
  warning: "border-amber-500/65 shadow-amber-950/40",
};

const fallbackIcons: Record<ToastType, ToastIcon> = {
  success: "quest",
  error: "battle",
  info: "report",
  warning: "barbarian",
};

const iconPaths: Record<ToastIcon, string> = {
  mail: "/assets/ui/notifications/mail.png",
  report: "/assets/ui/notifications/report.png",
  battle: "/assets/ui/notifications/battle.png",
  barbarian: "/assets/ui/notifications/barbarian.png",
  alliance: "/assets/ui/notifications/alliance.png",
  market: "/assets/ui/notifications/market.png",
  quest: "/assets/ui/notifications/quest.png",
  spy: "/assets/ui/notifications/spy.png",
  season: "/assets/ui/notifications/season.png",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[80] flex w-[min(92vw,24rem)] flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const icon = iconPaths[toast.icon ?? fallbackIcons[toast.type]];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-toast-in overflow-hidden rounded-xl border bg-[#0b1111]/95 shadow-2xl backdrop-blur-md ${typeStyles[toast.type]}`}
          >
            <div className="h-1 bg-gradient-to-r from-[#d8ad5f] via-[#8c6b35] to-transparent" />
            <div className="flex items-start gap-3 p-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#d8ad5f]/35 bg-[#131c1b] shadow-inner">
                <img src={icon} alt="" className="h-10 w-10 object-contain" draggable={false} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-etheria-text">{toast.title}</p>
                {toast.message && (
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-etheria-text-muted">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded border border-transparent px-1.5 text-xs text-etheria-text-dim hover:border-etheria-border hover:text-etheria-text"
                aria-label="Close notification"
              >
                x
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
