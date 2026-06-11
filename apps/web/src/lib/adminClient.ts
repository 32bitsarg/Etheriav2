// Manejo compartido del secreto de administración para /editor.
// Vive en localStorage (persiste entre cierres de pestaña) y viaja como
// X-Admin-Secret; los routes de Next lo validan server-side contra ADMIN_SECRET.

const STORAGE_KEY = "etheria_admin_secret";

export function getAdminSecret(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setAdminSecret(value: string) {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(STORAGE_KEY, value);
  else window.localStorage.removeItem(STORAGE_KEY);
}

export function clearAdminSecret() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Admin-Secret": getAdminSecret(),
    ...(extra ?? {}),
  };
}
