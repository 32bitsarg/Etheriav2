"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { matecito } from "@/lib/matecitoClient";

interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
}

function extractErrorMessage(data: any, fallback: string): string {
  const err = data?.error;
  if (!err) return data?.message ?? fallback;
  if (typeof err === "string") return err;
  // Zod validation error from Hono: { issues: [...], name: "ZodError" }
  if (Array.isArray(err?.issues)) return err.issues.map((i: any) => i.message).join(", ");
  if (typeof err?.message === "string") return err.message;
  return fallback;
}

const IS_DEV = process.env.NODE_ENV === "development";
const DEV_AUTO_LOGIN = IS_DEV && process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === "true";
const DEV_EMAIL = IS_DEV ? (process.env.NEXT_PUBLIC_DEV_EMAIL ?? "") : "";
const DEV_PASSWORD = IS_DEV ? (process.env.NEXT_PUBLIC_DEV_PASSWORD ?? "") : "";

async function devAutoLogin(applyUser: (u: AuthUser | null) => void) {
  if (!DEV_EMAIL || !DEV_PASSWORD) return;
  try {
    let res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD, remember: true }),
    });
    if (!res.ok) {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD, name: "Dev Player", remember: true }),
      }).catch(() => {});
      res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD, remember: true }),
      });
    }
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.user) applyUser(data.user);
    }
  } catch (e) {
    console.warn("[dev] auto-login failed:", e);
  }
}

export function useMatecitoAuth() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const applyUser = useCallback((u: AuthUser | null) => {
    setUser(u);
    matecito.auth._set(u ? u.id : null, u);
  }, []);

  useEffect(() => {
    apiFetch(`/auth/me?_t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (data?.user) {
          applyUser(data.user);
        } else if (DEV_AUTO_LOGIN) {
          await devAutoLogin(applyUser);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [applyUser]);

  return useMemo(
    () => ({
      ready,
      user,
      token: user ? user.id : null,
      isLoggedIn: !!user,
      signUp: async (email: string, password: string, extra?: { name?: string; username?: string }) => {
        const res = await apiFetch("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, name: extra?.name, remember: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { data: null, error: { message: extractErrorMessage(data, "Registration failed") } };
        applyUser(data.user);
        return { data, error: null };
      },
      signIn: async (email: string, password: string) => {
        const res = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password, remember: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { data: null, error: { message: extractErrorMessage(data, "Login failed") } };
        applyUser(data.user);
        return { data, error: null };
      },
      signOut: async () => {
        await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
        applyUser(null);
        return { error: null };
      },
    }),
    [ready, user, applyUser]
  );
}
