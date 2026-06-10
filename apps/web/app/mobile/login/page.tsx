"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useI18n } from "@/i18n";
import Link from "next/link";
import Image from "next/image";
import { isEmailOrUsername } from "@/lib/authValidation";
import { setCityId } from "@/lib/guestAuth";

const REMEMBER_IDENTIFIER_KEY = "etheria_remember_identifier";

export default function MobileLoginPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { t } = useI18n();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setShowPassword] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_IDENTIFIER_KEY);
    if (saved) setIdentifier(saved);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password.trim()) {
      setError("Completá todos los campos");
      return;
    }
    setLoading(true);
    try {
      const res = await auth.signIn(identifier, password);
      if (res?.error) {
        setError(res.error.message ?? "Error al iniciar sesión");
        setLoading(false);
        return;
      }
      localStorage.setItem(REMEMBER_IDENTIFIER_KEY, identifier.trim());
      router.replace("/play");
    } catch {
      setError("Error de conexión. Verificá tu internet.");
      setLoading(false);
    }
  };

  return (
    <div className="mobile-login-root min-h-screen flex items-center justify-center bg-[#fafaf9] px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.webp"
            alt="Etheria"
            width={120}
            height={60}
            className="mx-auto h-14 w-auto"
            priority
          />
        </div>

        <h1 className="text-2xl font-bold text-[#1c1917] text-center" style={{ letterSpacing: "-0.03em" }}>
          {t("login.title")}
        </h1>
        <p className="mt-2 text-center text-sm text-stone-500">
          {t("login.subtitle")}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">
              {t("login.emailOrUsername")}
            </label>
            <input
              type="text"
              autoComplete="username"
              placeholder={t("login.emailPlaceholder")}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="mobile-input w-full rounded-xl border bg-white px-4 py-4 text-base text-stone-900 placeholder:text-stone-400 transition-all focus:bg-white focus:outline-none focus:ring-2 border-stone-200 focus:border-amber-400 focus:ring-amber-400/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-stone-600">
              {t("login.password")}
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder={t("login.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mobile-input w-full rounded-xl border bg-white px-4 py-4 text-base text-stone-900 placeholder:text-stone-400 transition-all focus:bg-white focus:outline-none focus:ring-2 border-stone-200 focus:border-amber-400 focus:ring-amber-400/30"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mobile-btn w-full rounded-xl bg-amber-500 px-4 py-4 text-base font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? t("login.loading") : t("login.submit")}
          </button>

          <p className="text-center text-sm text-stone-500">
            {t("login.noAccount")}{" "}
            <Link href="/mobile/register" className="font-semibold text-amber-600 hover:text-amber-700">
              {t("login.createAccount")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
