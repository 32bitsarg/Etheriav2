"use client";

import { useToastStore } from "@/stores/toastStore";

const typeStyles = {
  success: "border-l-emerald-500 bg-emerald-900/20",
  error: "border-l-red-500 bg-red-900/20",
  info: "border-l-blue-500 bg-blue-900/20",
  warning: "border-l-amber-500 bg-amber-900/20",
};

const typeIcons = {
  success: "✅",
  error: "❌",
  info: "ℹ️",
  warning: "⚠️",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto animate-toast-in border-l-4 rounded-lg shadow-xl p-3 ${typeStyles[toast.type]}`}
        >
          <div className="flex items-start gap-2">
            <span className="text-sm mt-0.5">{typeIcons[toast.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-etheria-text">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-etheria-text-muted mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-etheria-text-dim hover:text-etheria-text text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
