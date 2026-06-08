"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useI18n } from "@/i18n";
import Link from "next/link";
import Image from "next/image";
import { isEmailOrUsername } from "@/lib/authValidation";

const REMEMBER_IDENTIFIER_KEY = "etheria_remember_identifier";

export default function LoginPage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { t } = useI18n();

  const DEV_AUTO_LOGIN = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === "true";
  const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_EMAIL ?? "";
  const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD ?? "";

  const [identifier, setIdentifier] = useState(() => DEV_AUTO_LOGIN ? DEV_EMAIL : "");
  const [password, setPassword] = useState(() => DEV_AUTO_LOGIN ? DEV_PASSWORD : "");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ identifier: boolean; password: boolean }>({ identifier: false, password: false });

  useEffect(() => {
    if (auth.ready && auth.isLoggedIn) router.replace("/play");
  }, [auth.ready, auth.isLoggedIn, router]);

  useEffect(() => {
    if (DEV_AUTO_LOGIN) return;
    const remembered = typeof window !== "undefined" ? localStorage.getItem(REMEMBER_IDENTIFIER_KEY) : null;
    if (remembered) setIdentifier(remembered);
  }, [DEV_AUTO_LOGIN]);

  const validateIdentifier = useCallback((value: string) => {
    if (!value) return t("validation.identifier.required");
    if (!isEmailOrUsername(value) && value.length < 3) return t("validation.identifier.invalid");
    return undefined;
  }, [t]);

  const validatePassword = useCallback((value: string) => {
    if (!value) return t("validation.password.minLength");
    return undefined;
  }, [t]);

  const handleBlur = (field: "identifier" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "identifier") {
      setFieldErrors((prev) => ({ ...prev, identifier: validateIdentifier(identifier) }));
    } else {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const idError = validateIdentifier(identifier);
    const passError = validatePassword(password);
    setFieldErrors({ identifier: idError, password: passError });
    setTouched({ identifier: true, password: true });
    if (idError || passError) return;
    try {
      const res = await auth.signIn(identifier.trim(), password);
      if ((res as any)?.error) throw new Error((res as any).error.message ?? "Login failed");
      if (remember) localStorage.setItem(REMEMBER_IDENTIFIER_KEY, identifier.trim().toLowerCase());
      else localStorage.removeItem(REMEMBER_IDENTIFIER_KEY);
      router.replace("/play");
    } catch {
      setError(t("login.error"));
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left: imagery */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <Image
          src="/assets/landing/conquest-of-etheria/hero-conquest-of-etheria.webp"
          alt=""
          fill
          className="object-cover"
          priority
          quality={82}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-stone-950/85 via-stone-900/55 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.webp" width={112} height={56} className="h-14 w-auto" alt="Etheria" quality={82} />
          </Link>
          <div className="max-w-md">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-1.5 backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-[.05em] text-amber-200">
                En desarrollo activo · v0.2.4
              </span>
            </div>
            <h2 className="text-4xl font-bold leading-tight text-white" style={{ letterSpacing: "-0.03em" }}>
              Tu aldea te espera, comandante.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-300">
              Entrá para gestionar tu economía, mover ejércitos por el mapa mundial y coordinar con tu alianza.
            </p>
            <div className="mt-8 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-amber-300">🛠️ Acceso anticipado</p>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-300">
                El juego está en desarrollo. La HUD y las mecánicas pueden cambiar entre versiones.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/assets/landing/conquest-of-etheria/logo-conquest-of-etheria.webp" width={96} height={48} className="h-12 w-auto" alt="Etheria" quality={82} />
          </Link>

          {DEV_AUTO_LOGIN && (
            <div className="mb-4 rounded-lg border border-yellow-400/40 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
              <span className="font-semibold">Modo dev activo</span> — auto-login habilitado.{" "}
              <button
                type="button"
                className="underline hover:text-yellow-600"
                onClick={async () => {
                  const res = await auth.signIn(DEV_EMAIL, DEV_PASSWORD);
                  if (!(res as any)?.error) router.replace("/play");
                }}
              >
                Entrar como dev
              </button>
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-stone-900" style={{ letterSpacing: "-0.03em" }}>
              {t("login.title")}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-500">
              {t("login.subtitle")}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Identifier */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-stone-600">
                {t("login.identifier")}
              </label>
              <input
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (touched.identifier) setFieldErrors((p) => ({ ...p, identifier: validateIdentifier(e.target.value) }));
                }}
                onBlur={() => handleBlur("identifier")}
                type="text"
                autoComplete="username"
                placeholder={t("login.identifierPlaceholder")}
                className={`w-full rounded-lg border bg-stone-50 px-3.5 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:bg-white focus:outline-none focus:ring-1 ${
                  touched.identifier && fieldErrors.identifier
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                    : "border-stone-200 focus:border-amber-400 focus:ring-amber-400"
                }`}
              />
              {touched.identifier && fieldErrors.identifier && (
                <p className="mt-1.5 text-xs text-red-600">{t(fieldErrors.identifier)}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-stone-600">{t("login.password")}</label>
                <a href="#" className="text-[12px] font-medium text-amber-600 hover:text-amber-700">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password) setFieldErrors((p) => ({ ...p, password: validatePassword(e.target.value) }));
                  }}
                  onBlur={() => handleBlur("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t("login.passwordPlaceholder")}
                  className={`w-full rounded-lg border bg-stone-50 px-3.5 py-3 pr-10 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:bg-white focus:outline-none focus:ring-1 ${
                    touched.password && fieldErrors.password
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                      : "border-stone-200 focus:border-amber-400 focus:ring-amber-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  tabIndex={-1}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              {touched.password && fieldErrors.password && (
                <p className="mt-1.5 text-xs text-red-600">{t(fieldErrors.password)}</p>
              )}
            </div>

            {/* Remember */}
            <label className="flex items-center gap-2 text-[13px] text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300 accent-amber-500"
              />
              {t("login.rememberEmail")}
            </label>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!auth.ready}
              className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-amber-500/20 transition-colors hover:bg-amber-600 disabled:opacity-60"
            >
              {!auth.ready ? t("login.loading") : t("login.submit")}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-[12px] text-stone-400">o</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          <p className="mt-6 text-center text-[14px] text-stone-500">
            {t("login.noAccount")}{" "}
            <Link href="/registro" className="font-semibold text-amber-600 hover:text-amber-700">
              {t("login.registerLink")}
            </Link>
          </p>

          <p className="mt-8 text-center text-[12px] text-stone-400">
            <Link href="/" className="hover:text-stone-600">← Volver al inicio</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
