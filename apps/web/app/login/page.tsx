"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";

const REMEMBER_EMAIL_KEY = "etheria_remember_email";

export default function LoginPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const remembered = typeof window !== "undefined" ? localStorage.getItem(REMEMBER_EMAIL_KEY) : null;
    if (remembered) setEmail(remembered);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await auth.signIn(email, password);
      if ((res as any)?.error) throw new Error((res as any).error.message ?? "Login failed");
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      router.replace("/");
    } catch {
      setError((auth as any)?.error?.message ?? "Credenciales inválidas");
    }
  };

  return (
    <main className="min-h-screen bg-etheria-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] rounded-2xl border border-etheria-border bg-black/55 backdrop-blur-[6px] shadow-[0_30px_90px_rgba(0,0,0,.6)] p-6">
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-etheria-gold-soft">Etheria</div>
          <h1 className="mt-2 font-serif text-2xl text-[#f1e2bd]">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-etheria-text-muted">Entrá para ver tu aldea y el mapa mundial.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <div className="mb-1 text-xs text-etheria-text-muted">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="w-full rounded-lg border border-etheria-border bg-black/40 px-3 py-2 text-sm text-[#e7dcc2] outline-none focus:border-etheria-border-gold"
              placeholder="tu@email.com"
              required
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs text-etheria-text-muted">Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-etheria-border bg-black/40 px-3 py-2 text-sm text-[#e7dcc2] outline-none focus:border-etheria-border-gold"
              placeholder="••••••••"
              required
            />
          </label>

          <label className="flex items-center gap-2 pt-1 text-sm text-[#cfc3a8]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-etheria-gold-soft"
            />
            Recordar usuario
          </label>

          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!auth.ready}
            className="w-full rounded-lg border border-etheria-border-gold bg-[linear-gradient(180deg,rgba(190,150,70,.22),rgba(60,40,10,.22))] px-4 py-2 text-sm text-[#f1e2bd] hover:bg-[linear-gradient(180deg,rgba(190,150,70,.28),rgba(60,40,10,.28))] disabled:opacity-60"
          >
            {!auth.ready ? "Cargando..." : "Entrar"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/registro")}
            className="w-full rounded-lg border border-etheria-border bg-black/30 px-4 py-2 text-sm text-[#cfc3a8] hover:bg-black/40"
          >
            Crear cuenta
          </button>
        </form>
      </div>
    </main>
  );
}
