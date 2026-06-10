"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useI18n } from "@/i18n";
import Link from "next/link";
import Image from "next/image";

export default function MobileRegisterPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Completá todos los campos");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await auth.signUp(email, password, { name });
      if (res?.error) { setError(res.error.message ?? "Error al registrarse"); setLoading(false); return; }
      router.replace("/play");
    } catch {
      setError("Error de conexión");
      setLoading(false);
    }
  };

  return (
    <div className="mobile-login-root min-h-screen flex items-center justify-center bg-[#fafaf9] px-4 py-8">
      <div className="w-full max-w-sm">
        <Image src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.webp" alt="Etheria" width={120} height={60} className="mx-auto h-14 w-auto mb-8" priority />

        <h1 className="text-2xl font-bold text-[#1c1917] text-center" style={{ letterSpacing: "-0.03em" }}>Crear cuenta</h1>
        <p className="mt-2 text-center text-sm text-stone-500">Forjá tu destino en Etheria</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">Nombre de jugador</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="mobile-input w-full rounded-xl border bg-white px-4 py-4 text-base text-stone-900 placeholder:text-stone-400 transition-all focus:bg-white focus:outline-none focus:ring-2 border-stone-200 focus:border-amber-400 focus:ring-amber-400/30" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mobile-input w-full rounded-xl border bg-white px-4 py-4 text-base text-stone-900 placeholder:text-stone-400 transition-all focus:bg-white focus:outline-none focus:ring-2 border-stone-200 focus:border-amber-400 focus:ring-amber-400/30" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">Contraseña (mín. 6)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mobile-input w-full rounded-xl border bg-white px-4 py-4 text-base text-stone-900 placeholder:text-stone-400 transition-all focus:bg-white focus:outline-none focus:ring-2 border-stone-200 focus:border-amber-400 focus:ring-amber-400/30" />
          </div>

          {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3"><p className="text-sm text-red-700">{error}</p></div>}

          <button type="submit" disabled={loading}
            className="mobile-btn w-full rounded-xl bg-amber-500 px-4 py-4 text-base font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60">
            {loading ? "Creando cuenta..." : "CREAR CUENTA"}
          </button>

          <p className="text-center text-sm text-stone-500">
            ¿Ya tenés cuenta? <Link href="/mobile/login" className="font-semibold text-amber-600">Iniciar sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
