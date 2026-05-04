"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import Link from "next/link";

const REMEMBER_EMAIL_KEY = "etheria_remember_email";

export default function RegistroPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();

  const [name, setName] = useState("Commander");
  const [cityName, setCityName] = useState("Etheria");
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
      const res = await auth.signUp(email, password, { name });
      if ((res as any)?.error) throw new Error((res as any).error.message ?? "Register failed");
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      localStorage.setItem("etheria_pending_city_name", cityName.trim());
      router.replace("/play");
    } catch {
      setError("No se pudo registrar. Revisá el email o la contraseña.");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-12">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 text-center">
          <div className="text-[11px] uppercase tracking-[0.3em] text-etheria-gold-soft/70">Conquest of Etheria</div>
          <h1 className="mt-3 font-display text-3xl font-bold text-[#f1e2bd]">Crear cuenta</h1>
          <p className="mt-2 text-sm text-etheria-text-muted">Se crea tu aldea automáticamente en una isla con cupo.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1.5 text-xs font-medium text-etheria-text-muted">Nombre</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-etheria-border bg-etheria-panel/60 px-4 py-2.5 text-sm text-[#e7dcc2] outline-none transition-colors focus:border-etheria-gold/50 focus:bg-etheria-panel"
                placeholder="Commander"
                required
              />
            </label>
            <label className="block">
              <div className="mb-1.5 text-xs font-medium text-etheria-text-muted">Nombre de aldea</div>
              <input
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                className="w-full rounded-xl border border-etheria-border bg-etheria-panel/60 px-4 py-2.5 text-sm text-[#e7dcc2] outline-none transition-colors focus:border-etheria-gold/50 focus:bg-etheria-panel"
                placeholder="Etheria"
                required
              />
            </label>
          </div>

          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-etheria-text-muted">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-etheria-border bg-etheria-panel/60 px-4 py-2.5 text-sm text-[#e7dcc2] outline-none transition-colors focus:border-etheria-gold/50 focus:bg-etheria-panel"
              placeholder="tu@email.com"
              required
            />
          </label>

          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-etheria-text-muted">Contraseña</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-etheria-border bg-etheria-panel/60 px-4 py-2.5 text-sm text-[#e7dcc2] outline-none transition-colors focus:border-etheria-gold/50 focus:bg-etheria-panel"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </label>

          <label className="flex items-center gap-2.5 pt-1 text-sm text-[#cfc3a8]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-etheria-border bg-etheria-panel/60 accent-etheria-gold-soft"
            />
            Recordar usuario
          </label>

          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!auth.ready}
            className="w-full rounded-xl border border-etheria-border-gold bg-[linear-gradient(180deg,rgba(190,150,70,.22),rgba(60,40,10,.22))] px-4 py-2.5 text-sm font-medium text-[#f1e2bd] transition-all hover:bg-[linear-gradient(180deg,rgba(190,150,70,.30),rgba(60,40,10,.30))] disabled:opacity-60"
          >
            {!auth.ready ? "Cargando..." : "Crear cuenta"}
          </button>

          <div className="pt-2 text-center text-sm text-etheria-text-muted">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-etheria-gold hover:text-etheria-gold-soft transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
