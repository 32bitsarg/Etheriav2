"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "matecitodb";
import { matecito } from "@/lib/matecitoClient";

const SESSION_KEY = "etheria_matecito_session";

export function useMatecitoAuth() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(matecito.auth.user);
  const [token, setToken] = useState<string | null>(matecito.auth.token);

  useEffect(() => {
    let unsub: null | (() => void) = null;

    matecito.auth.sessionReady
      .then(() => {
        return (async () => {
        if (typeof window !== "undefined" && !matecito.auth.token) {
          const stored = window.localStorage.getItem(SESSION_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as {
                access_token?: string;
                refresh_token?: string | null;
                user?: AuthUser;
              };
              if (parsed?.access_token) {
                matecito.auth.setSession({
                  access_token: parsed.access_token,
                  refresh_token: parsed.refresh_token ?? undefined,
                  user: parsed.user,
                });
              }
            } catch {
              window.localStorage.removeItem(SESSION_KEY);
            }
          }
        }

        if (matecito.auth.token) {
          const me = await matecito.auth.getMe().catch(() => ({ data: null, error: { message: "Session validation failed" } }));
          if ((me as any)?.error || !(me as any)?.data?.id) {
            await matecito.auth.signOut();
            if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
          }
        }

        setReady(true);
        setUser(matecito.auth.user);
        setToken(matecito.auth.token);
        unsub = matecito.auth.onAuthChange((u) => {
          setUser(u);
          setToken(matecito.auth.token);
          if (typeof window === "undefined") return;
          if (matecito.auth.token) {
            window.localStorage.setItem(
              SESSION_KEY,
              JSON.stringify({
                access_token: matecito.auth.token,
                refresh_token: matecito.auth.refreshToken ?? null,
                user: matecito.auth.user,
              })
            );
          } else {
            window.localStorage.removeItem(SESSION_KEY);
          }
        });
        })();
      })
      .catch(() => setReady(true));

    return () => {
      unsub?.();
    };
  }, []);

  return useMemo(
    () => ({
      ready,
      user,
      token,
      isLoggedIn: !!user && !!token,
      signUp: async (email: string, password: string, extra?: { name?: string; username?: string }) => {
        const res = await matecito.auth.signUp(email, password, extra);
        if (res.data && typeof window !== "undefined") {
          window.localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
              access_token: res.data.access_token,
              refresh_token: res.data.refresh_token,
              user: res.data.user,
            })
          );
        }
        return res;
      },
      signIn: async (email: string, password: string) => {
        const res = await matecito.auth.signIn(email, password);
        if (res.data && typeof window !== "undefined") {
          window.localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
              access_token: res.data.access_token,
              refresh_token: res.data.refresh_token,
              user: res.data.user,
            })
          );
        }
        return res;
      },
      signOut: async () => {
        if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
        return matecito.auth.signOut();
      },
    }),
    [ready, user, token]
  );
}
