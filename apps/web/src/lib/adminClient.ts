// Manejo compartido del secreto de administración para /admin.
// El secreto vive en sessionStorage (se borra al cerrar la pestaña) y viaja
// como X-Admin-Secret; el API y los proxies de Next lo validan server-side.

const STORAGE_KEY = "etheria_admin_secret";

export function getAdminSecret(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
}

export function setAdminSecret(value: string) {
  if (typeof window === "undefined") return;
  if (value) window.sessionStorage.setItem(STORAGE_KEY, value);
  else window.sessionStorage.removeItem(STORAGE_KEY);
}

export function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Admin-Secret": getAdminSecret(),
    ...(extra ?? {}),
  };
}
