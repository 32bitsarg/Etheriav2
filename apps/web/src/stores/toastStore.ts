import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  clearToasts: () => set({ toasts: [] }),
}));

export function toastSuccess(title: string, message?: string) {
  useToastStore.getState().addToast({ type: "success", title, message });
}

export function toastError(title: string, message?: string) {
  useToastStore.getState().addToast({ type: "error", title, message, duration: 6000 });
}

export function toastInfo(title: string, message?: string) {
  useToastStore.getState().addToast({ type: "info", title, message });
}

export function toastWarning(title: string, message?: string) {
  useToastStore.getState().addToast({ type: "warning", title, message, duration: 5000 });
}
