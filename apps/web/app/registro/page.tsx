"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";

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
      // Native Matecito auth. City creation happens server-side via /city/bootstrap on first app load.
      const res = await auth.signUp(email, password, { name });
      if ((res as any)?.error) throw new Error((res as any).error.message ?? "Register failed");
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      // Persist desired city name locally for bootstrap.
      localStorage.setItem("etheria_pending_city_name", cityName.trim());
      router.replace("/");
    } catch {
      setError("No se pudo registrar. Revisá el email o la contraseña.");
    }
  };

  return (
    <main className="min-h-screen bg-etheria-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[460px] rounded-2xl border border-etheria-border bg-black/55 backdrop-blur-[6px] shadow-[0_30px_90px_rgba(0,0,0,.6)] p-6">
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-etheria-gold-soft">Etheria</div>
          <h1 className="mt-2 font-serif text-2xl text-[#f1e2bd]">Crear cuenta</h1>
          <p className="mt-1 text-sm text-etheria-text-muted">Se crea tu aldea automáticamente en una isla con cupo.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-xs text-etheria-text-muted">Nombre</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-etheria-border bg-black/40 px-3 py-2 text-sm text-[#e7dcc2] outline-none focus:border-etheria-border-gold"
                placeholder="Commander"
                required
              />
            </label>
            <label className="block">
              <div className="mb-1 text-xs text-etheria-text-muted">Nombre de aldea</div>
              <input
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                className="w-full rounded-lg border border-etheria-border bg-black/40 px-3 py-2 text-sm text-[#e7dcc2] outline-none focus:border-etheria-border-gold"
                placeholder="Etheria"
                required
              />
            </label>
          </div>

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
              autoComplete="new-password"
              className="w-full rounded-lg border border-etheria-border bg-black/40 px-3 py-2 text-sm text-[#e7dcc2] outline-none focus:border-etheria-border-gold"
              placeholder="mínimo 6 caracteres"
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
            {!auth.ready ? "Cargando..." : "Crear cuenta"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full rounded-lg border border-etheria-border bg-black/30 px-4 py-2 text-sm text-[#cfc3a8] hover:bg-black/40"
          >
            Ya tengo cuenta
          </button>
        </form>
      </div>
    </main>
  );
}
